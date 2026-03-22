import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { calcBill } from '@/utils/calcBill';
import { printer, formatReceipt, numberToWords } from '@/utils/printer';
import { playSuccess } from '@/utils/sounds';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import {
  ChevronLeft, Banknote, Smartphone,
  CheckCircle2, Home, X, Loader2, Printer, FileText,
} from 'lucide-react';

const PRESETS = [0, 5, 10, 15];

function triggerPrint(mode: 'receipt' | 'invoice') {
  document.body.setAttribute('data-print', mode);
  const cleanup = () => {
    document.body.removeAttribute('data-print');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 80);
}

const ReviewScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  const { tables } = useTables();
  const { getActiveOrder, updateOrderStatus, addPayment } = useOrders();
  const settings = usePOSStore((s) => s.settings);
  const resetTable = usePOSStore((s) => s.resetTable);
  const getNextBillNumber = usePOSStore((s) => s.getNextBillNumber);

  const table = tables.find((t) => t.id === tableId);
  const order = tableId ? getActiveOrder(tableId) : undefined;

  // Snapshot items and order ID so they survive order state changes on payment
  const itemsRef = useRef(order?.items || []);
  const orderIdRef = useRef(order?.id || '');
  useEffect(() => {
    if (order?.items.length) {
      itemsRef.current = [...order.items];
      orderIdRef.current = order.id;
    }
  }, [order]);
  const items = itemsRef.current;

  // ── Review state ──────────────────────────────────────────────
  const [discountMode, setDiscountMode] = useState<'percent' | 'fixed'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(0);

  const discountValue = useMemo(() => {
    const n = parseFloat(discountInput);
    return isNaN(n) || n < 0 ? 0 : n;
  }, [discountInput]);

  const bill = useMemo(
    () => calcBill(items, settings, discountMode, discountValue),
    [items, settings, discountMode, discountValue]
  );

  // ── Payment state ─────────────────────────────────────────────
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paid, setPaid] = useState(false);
  const [billNum, setBillNum] = useState(0);
  const [paidAt, setPaidAt] = useState(0);
  const [paidMethod, setPaidMethod] = useState('');
  const [reprinting, setReprinting] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // ── Discount handlers ─────────────────────────────────────────
  const handlePreset = (pct: number) => {
    setActivePreset(pct);
    setDiscountMode('percent');
    setDiscountInput(pct === 0 ? '' : String(pct));
  };
  const handleInputChange = (val: string) => {
    setDiscountInput(val);
    setActivePreset(null);
  };
  const handleModeToggle = (mode: 'percent' | 'fixed') => {
    setDiscountMode(mode);
    setDiscountInput('');
    setActivePreset(mode === 'percent' ? 0 : null);
  };

  // ── Payment helpers ───────────────────────────────────────────
  const tableNumber = table?.number ?? 0;
  const reference = `${settings.cafeName.replace(/\s/g, '')}-T${tableNumber}-B${settings.billCounter + 1}`;

  const methods = [
    { id: 'cash', label: 'Cash', isQR: false },
    ...(settings.wallets.esewa.enabled ? [{ id: 'esewa', label: 'eSewa', isQR: true }] : []),
    ...(settings.wallets.khalti.enabled ? [{ id: 'khalti', label: 'Khalti', isQR: true }] : []),
    ...(settings.wallets.fonepay.enabled ? [{ id: 'fonepay', label: 'Fonepay', isQR: true }] : []),
  ];
  const qrMethods = methods.filter((m) => m.isQR);

  const getQRData = (method: string) => {
    if (method === 'esewa')
      return `eSewa://pay?eSewaID=${settings.esewaPhone || settings.esewaId}&amount=${bill.total}&table=${tableNumber}&ref=${reference}`;
    return `pay://${method}?amount=${bill.total}&ref=${reference}`;
  };

  const getQRImage = (method: string) => {
    const k = method as 'esewa' | 'khalti' | 'fonepay';
    return settings.wallets[k]?.qrImage || null;
  };

  const handleConfirmPayment = async (method: string) => {
    const bn = getNextBillNumber();
    const now = Date.now();
    setBillNum(bn);
    setPaidAt(now);
    setPaidMethod(method);

    addPayment({
      orderId: orderIdRef.current,
      tableNumber,
      items: [...items],
      subtotal: bill.subtotal,
      discount: discountValue,
      discountType: discountMode,
      vatAmount: bill.vatAmount,
      vatRate: bill.vatRate,
      vatMode: bill.vatMode,
      vatEnabled: bill.vatEnabled,
      total: bill.total,
      method,
      reference,
      createdAt: now,
      cafeName: settings.cafeName,
      billNumber: bn,
    });

    updateOrderStatus(orderIdRef.current, 'paid');
    if (tableId) resetTable(tableId);
    playSuccess();
    setShowQRModal(false);
    setPaid(true);

    triggerPrint('receipt');

    if (printer.isConnected) {
      await printer.print(
        formatReceipt({
          cafeName: settings.cafeName,
          tableNumber,
          items,
          subtotal: bill.subtotal,
          discount: bill.discountAmount,
          vatAmount: bill.vatAmount,
          vatRate: bill.vatRate,
          vatEnabled: bill.vatEnabled,
          total: bill.total,
          method,
          date: format(now, 'yyyy-MM-dd HH:mm'),
          billNumber: bn,
        })
      );
    }
  };

  // ── Early exits ───────────────────────────────────────────────
  if (!table || !tableId || items.length === 0) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-sm text-center">No active order found.</p>
        <button
          onClick={() => navigate(tableId ? `/order/${tableId}` : '/')}
          className="px-5 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)' }}
        >
          Back to Order
        </button>
      </div>
    );
  }

  // ── Receipt portal ────────────────────────────────────────────
  const receiptPortal = paid
    ? createPortal(
        <div
          id="print-receipt"
          style={{
            display: 'none',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            lineHeight: 1.5,
            color: '#000',
            background: '#fff',
            padding: '6mm',
            width: '80mm',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{settings.cafeName}</div>
            {settings.cafeAddress && <div style={{ fontSize: 11 }}>{settings.cafeAddress}</div>}
            {settings.cafePhone && <div style={{ fontSize: 11 }}>{settings.cafePhone}</div>}
          </div>
          <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
          <div style={{ fontSize: 11, marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bill #{billNum}</span>
              <span>Table {tableNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{format(paidAt || Date.now(), 'dd MMM yyyy')}</span>
              <span>{format(paidAt || Date.now(), 'HH:mm')}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
          {items.map((item) => (
            <div key={item.menuItemId} style={{ marginBottom: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ flex: 1, paddingRight: 4 }}>{item.name}</span>
                <span style={{ whiteSpace: 'nowrap' }}>Rs. {item.price * item.quantity}</span>
              </div>
              <div style={{ fontSize: 11, color: '#333' }}>{item.quantity} × Rs. {item.price}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <span>Subtotal</span><span>Rs. {bill.subtotal}</span>
          </div>
          {bill.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span>Discount</span><span>-Rs. {bill.discountAmount}</span>
            </div>
          )}
          {bill.vatEnabled && bill.vatAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span>VAT ({Math.round(bill.vatRate * 100)}%)</span><span>Rs. {bill.vatAmount}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, marginTop: 4 }}>
            <span>TOTAL</span><span>Rs. {bill.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
            <span>Payment</span>
            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{paidMethod}</span>
          </div>
          <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
          <div style={{ textAlign: 'center', fontSize: 11 }}>
            {settings.billFooter || 'Thank you for visiting!'}
          </div>
        </div>,
        document.body
      )
    : null;

  // ── Invoice portal ────────────────────────────────────────────
  const invoicePortal = paid
    ? createPortal(
        <div id="print-invoice" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>{settings.cafeName}</div>
            {settings.cafeAddress && <div style={{ fontSize: 12 }}>{settings.cafeAddress}</div>}
            {settings.cafePhone && <div style={{ fontSize: 12 }}>Tel: {settings.cafePhone}</div>}
            {settings.cafePan && <div style={{ fontSize: 12 }}>PAN: {settings.cafePan}</div>}
          </div>
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 900, letterSpacing: 2, border: '2px solid #000', padding: '4px 0', marginBottom: 10 }}>
            TAX INVOICE
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
            <div>
              <div><strong>Bill No:</strong> #{billNum}</div>
              <div><strong>Table:</strong> {tableNumber}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><strong>Date:</strong> {format(paidAt || Date.now(), 'dd/MM/yyyy')}</div>
              <div><strong>Time:</strong> {format(paidAt || Date.now(), 'HH:mm')}</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 0', marginBottom: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 50px 60px 70px', gap: 4, fontSize: 11, fontWeight: 700 }}>
              <span>SN</span><span>Particulars</span>
              <span style={{ textAlign: 'center' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Rate</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
            </div>
          </div>
          {items.map((item, idx) => (
            <div key={item.menuItemId} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 50px 60px 70px', gap: 4, fontSize: 11, padding: '2px 0', borderBottom: '1px dashed #ccc' }}>
              <span>{idx + 1}</span>
              <span>{item.name}</span>
              <span style={{ textAlign: 'center' }}>{item.quantity}</span>
              <span style={{ textAlign: 'right' }}>{item.price.toFixed(2)}</span>
              <span style={{ textAlign: 'right' }}>{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #000', marginTop: 4, paddingTop: 6 }}>
            {[
              { label: 'Basic Amount', value: `Rs. ${bill.subtotal.toFixed(2)}` },
              ...(bill.discountAmount > 0 ? [{ label: 'Discount', value: `-Rs. ${bill.discountAmount.toFixed(2)}` }] : []),
              { label: 'Taxable Amount', value: `Rs. ${(bill.subtotal - bill.discountAmount).toFixed(2)}` },
              ...(bill.vatEnabled && bill.vatAmount > 0 ? [{ label: `VAT (${Math.round(bill.vatRate * 100)}%)`, value: `Rs. ${bill.vatAmount.toFixed(2)}` }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span>{label}</span><span>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, borderTop: '1px solid #000', paddingTop: 4, marginTop: 4 }}>
              <span>Total Amount</span><span>Rs. {bill.total.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #000', marginTop: 8, paddingTop: 6, fontSize: 11 }}>
            <strong>Amount in Words:</strong> {numberToWords(bill.total)}
          </div>
          <div style={{ borderTop: '1px solid #000', marginTop: 8, paddingTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <div>
                <div><strong>Payment Method:</strong> {paidMethod.toUpperCase()}</div>
                <div><strong>Cashier:</strong> {settings.cafeName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><strong>Ref:</strong> {reference}</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>
              {settings.billFooter || 'Thank you for your visit!'}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  // ── Success screen ────────────────────────────────────────────
  if (paid) {
    const displayItems = items.slice(0, 3);
    const extraCount = items.length - displayItems.length;

    const handleReprint = async () => {
      if (reprinting) return;
      setReprinting(true);
      triggerPrint('receipt');
      if (printer.isConnected) {
        await printer.print(
          formatReceipt({
            cafeName: settings.cafeName,
            tableNumber,
            items,
            subtotal: bill.subtotal,
            discount: bill.discountAmount,
            vatAmount: bill.vatAmount,
            vatRate: bill.vatRate,
            vatEnabled: bill.vatEnabled,
            total: bill.total,
            method: paidMethod,
            date: format(paidAt || Date.now(), 'yyyy-MM-dd HH:mm'),
            billNumber: billNum,
          })
        );
      }
      setTimeout(() => setReprinting(false), 1800);
    };

    const handlePrintInvoice = () => {
      if (printingInvoice) return;
      setPrintingInvoice(true);
      triggerPrint('invoice');
      setTimeout(() => setPrintingInvoice(false), 1800);
    };

    return (
      <>
        {receiptPortal}
        {invoicePortal}
        <div className="h-screen bg-background flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4 overflow-hidden">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center shadow-[0_0_32px_-4px_hsl(var(--success)/0.4)]">
                <CheckCircle2 size={36} className="text-success" />
              </div>
              <h2 className="text-xl font-black text-foreground">Payment Successful</h2>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-foreground">Rs. {bill.total}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-xs font-bold uppercase">
                  {paidMethod}
                </span>
              </div>
              {bill.discountAmount > 0 && (
                <span className="text-xs text-success font-medium">Saved Rs. {bill.discountAmount}</span>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Printer size={12} />
                <span>Printing receipt...</span>
              </div>
            </div>

            <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 space-y-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
              <div className="text-center pb-1 border-b border-dashed border-border/60">
                <p className="font-black text-sm text-foreground">{settings.cafeName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  #{billNum} · Table {tableNumber}
                </p>
              </div>
              <div className="space-y-1">
                {displayItems.map((item) => (
                  <div key={item.menuItemId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate pr-2">
                      {item.name} <span className="text-foreground font-semibold">×{item.quantity}</span>
                    </span>
                    <span className="font-semibold text-foreground whitespace-nowrap">
                      Rs. {item.price * item.quantity}
                    </span>
                  </div>
                ))}
                {extraCount > 0 && (
                  <p className="text-xs text-muted-foreground">+{extraCount} more item{extraCount > 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="flex justify-between items-center border-t border-dashed border-border/60 pt-2">
                <span className="text-sm font-semibold text-muted-foreground">Total</span>
                <span className="text-lg font-black text-foreground">Rs. {bill.total}</span>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleReprint}
                  disabled={reprinting}
                  className="py-3.5 rounded-2xl border border-border bg-secondary text-foreground font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:bg-secondary/80 disabled:opacity-60"
                >
                  <Printer size={15} />
                  {reprinting ? 'Reprinting...' : 'Reprint Receipt'}
                </button>
                <button
                  onClick={handlePrintInvoice}
                  disabled={printingInvoice}
                  className="py-3.5 rounded-2xl border border-border bg-secondary text-foreground font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:bg-secondary/80 disabled:opacity-60"
                >
                  <FileText size={15} />
                  {printingInvoice ? 'Printing...' : 'Full Invoice'}
                </button>
              </div>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-4 rounded-2xl bg-success text-white font-black text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.4)]"
              >
                <Home size={18} /> Back to Tables
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main review + payment screen ──────────────────────────────
  return (
    <>
      {receiptPortal}
      {invoicePortal}
      <div
        className="h-screen flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0d1525 0%, #060e1a 100%)' }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(13,21,37,0.9)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <button
            onClick={() => navigate(`/order/${tableId}`)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <div>
            <p className="font-black text-white text-sm leading-tight">Review Order</p>
            <p className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Table {table.number}
            </p>
          </div>
        </div>

        {/* Body — flex column, items scroll, bottom is fixed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="max-w-[460px] mx-auto w-full flex flex-col flex-1 min-h-0 px-4 pt-4 pb-3 gap-3">

            {/* ── Items card (scrollable) ── */}
            <div
              className="flex-1 min-h-0 rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.5)',
              }}
            >
              <div className="overflow-y-auto flex-1 min-h-0">
                {items.map((item, idx) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={idx < items.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate leading-snug" style={{ color: 'rgba(255,255,255,0.95)' }}>
                        {item.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {item.quantity} × Rs. {item.price}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.88)' }}>
                      Rs. {item.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Fixed bottom section ── */}
            <div className="flex-shrink-0 flex flex-col gap-3">

              {/* Billing summary + total */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Subtotal</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      Rs. {bill.subtotal}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Discount</span>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: bill.discountAmount > 0 ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.28)' }}
                    >
                      −Rs. {bill.discountAmount}
                    </span>
                  </div>
                  {bill.vatEnabled && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        VAT ({Math.round(bill.vatRate * 100)}%)
                      </span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Rs. {bill.vatAmount}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Total
                  </span>
                  <span className="text-[34px] font-black tracking-tight leading-none tabular-nums" style={{ color: '#ffffff' }}>
                    Rs. {bill.total}
                  </span>
                </div>
              </div>

            {/* ── Discount card ── */}
            <div
              className="rounded-2xl px-4 py-3 space-y-2"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Discount
              </p>
              <div className="flex gap-1.5">
                {PRESETS.map((pct) => {
                  const isActive = activePreset === pct && discountMode === 'percent';
                  return (
                    <button
                      key={pct}
                      onClick={() => handlePreset(pct)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                      style={
                        isActive
                          ? { background: 'rgba(59,130,246,0.22)', color: 'rgba(147,197,253,0.95)', border: '1px solid rgba(59,130,246,0.38)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 items-center">
                <div
                  className="flex rounded-lg overflow-hidden flex-shrink-0 text-[11px] font-bold"
                  style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <button
                    onClick={() => handleModeToggle('percent')}
                    className="px-3 py-1.5 transition-colors"
                    style={
                      discountMode === 'percent'
                        ? { background: 'rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.95)' }
                        : { color: 'rgba(255,255,255,0.36)' }
                    }
                  >%</button>
                  <button
                    onClick={() => handleModeToggle('fixed')}
                    className="px-3 py-1.5 transition-colors"
                    style={
                      discountMode === 'fixed'
                        ? { background: 'rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.95)' }
                        : { color: 'rgba(255,255,255,0.36)', borderLeft: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >Rs</button>
                </div>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder={discountMode === 'percent' ? 'Custom %' : 'Custom Rs.'}
                  value={discountInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
              </div>
            </div>

            {/* ── Payment Method card ── */}
            <div
              className="rounded-2xl px-4 py-3 space-y-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 4px 20px -6px rgba(0,0,0,0.4)',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Payment Method
              </p>

              {/* Cash */}
              <button
                onClick={() => handleConfirmPayment('cash')}
                data-testid="button-payment-method-cash"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.97]"
                style={{
                  background: 'rgba(52,211,153,0.07)',
                  border: '1px solid rgba(52,211,153,0.25)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(52,211,153,0.12)' }}
                >
                  <Banknote size={18} className="text-success" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>Cash</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>Tap to complete payment</p>
                </div>
                <span className="text-sm font-black text-success tabular-nums">Rs. {bill.total}</span>
              </button>

              {/* Digital wallets */}
              {qrMethods.length > 0 && (
                <div className={`grid gap-2 ${qrMethods.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {qrMethods.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => { setSelectedMethod(id); setShowQRModal(true); }}
                      data-testid={`button-payment-method-${id}`}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.97]"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                      >
                        <Smartphone size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.88)' }}>{label}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Scan QR</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            </div>{/* end flex-shrink-0 bottom section */}
          </div>{/* end max-w-[460px] container */}
        </div>{/* end body */}
      </div>{/* end main wrapper */}

      {/* QR Modal */}
      {showQRModal && selectedMethod && selectedMethod !== 'cash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-card rounded-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-black text-foreground text-base">
                {selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} Payment
              </h3>
              <button
                onClick={() => { setShowQRModal(false); setSelectedMethod(null); setConfirming(false); }}
                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90"
              >
                <X size={17} />
              </button>
            </div>
            <div className="px-6 pt-5 pb-6 flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Amount Due</p>
                <p className="text-5xl font-black text-foreground mt-1 tabular-nums">Rs. {bill.total}</p>
                {bill.discountAmount > 0 && (
                  <p className="text-xs text-success font-semibold mt-1">Saved Rs. {bill.discountAmount}</p>
                )}
              </div>
              <div
                className="p-4 bg-white rounded-2xl"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 20px -4px rgba(0,0,0,0.3)' }}
              >
                {getQRImage(selectedMethod) ? (
                  <img src={getQRImage(selectedMethod)!} alt={`${selectedMethod} QR`} className="w-56 h-56 object-contain" />
                ) : (
                  <QRCodeSVG value={getQRData(selectedMethod)} size={224} bgColor="#ffffff" fgColor="#000000" level="M" />
                )}
              </div>
              <p className="text-sm font-semibold text-foreground text-center">
                Scan QR and confirm after payment
              </p>
              <button
                onClick={async () => {
                  if (confirming) return;
                  setConfirming(true);
                  await handleConfirmPayment(selectedMethod);
                }}
                disabled={confirming}
                data-testid="button-confirm-payment"
                className="w-full py-4 rounded-2xl text-white font-black text-base transition-all active:scale-[0.97] disabled:opacity-80 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)',
                  boxShadow: '0 4px 16px -4px rgba(59,130,246,0.5)',
                }}
              >
                {confirming ? (
                  <><Loader2 size={18} className="animate-spin" /> Processing...</>
                ) : (
                  'Confirm Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewScreen;
