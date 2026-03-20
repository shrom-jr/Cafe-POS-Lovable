import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Banknote, Smartphone, CheckCircle2, Home, X, Loader2 } from 'lucide-react';
import { printer, formatReceipt } from '@/utils/printer';
import { format } from 'date-fns';
import { OrderItem } from '@/types/pos';
import { playSuccess } from '@/utils/sounds';


const PaymentScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { tables } = useTables();
  const { getActiveOrder, updateOrderStatus, addPayment } = useOrders();
  const resetTable = usePOSStore((s) => s.resetTable);
  const getNextBillNumber = usePOSStore((s) => s.getNextBillNumber);
  const settings = usePOSStore((s) => s.settings);

  const rawState = location.state as {
    discountValue?: number;
    discountType?: 'percent' | 'fixed';
    subtotal?: number;
    discountAmount?: number;
    vatAmount?: number;
    vatRate?: number;
    vatMode?: 'excluded' | 'included';
    vatEnabled?: boolean;
    total?: number;
  } | null;

  const table = tables.find((t) => t.id === tableId);
  const order = tableId ? getActiveOrder(tableId) : undefined;

  const orderSnapshot = useRef<{ id: string; items: OrderItem[]; tableNumber: number } | null>(null);
  useEffect(() => {
    if (order && !orderSnapshot.current) {
      orderSnapshot.current = { id: order.id, items: [...order.items], tableNumber: order.tableNumber };
    }
  }, [order]);

  const snap =
    orderSnapshot.current ||
    (order ? { id: order.id, items: order.items, tableNumber: order.tableNumber } : null);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paid, setPaid] = useState(false);
  const [billNum, setBillNum] = useState<number>(0);
  const [paidMethod, setPaidMethod] = useState<string>('');
  const [printing, setPrinting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!paid) return;
    const t = setTimeout(() => navigate('/', { replace: true }), 1800);
    return () => clearTimeout(t);
  }, [paid]);

  // All financial values come from ReviewScreen via navigation state — no recalculation here
  const subtotal = rawState?.subtotal ?? 0;
  const discountAmount = rawState?.discountAmount ?? 0;
  const discountValue = rawState?.discountValue ?? 0;
  const discountType = rawState?.discountType ?? 'percent';
  const vatAmount = rawState?.vatAmount ?? 0;
  const vatRate = rawState?.vatRate ?? 0.13;
  const vatMode = rawState?.vatMode ?? 'excluded';
  const vatEnabled = rawState?.vatEnabled ?? false;
  const finalTotal = rawState?.total ?? 0;

  if (!table || !snap || !rawState?.total) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-foreground">Please start an order before proceeding to payment.</p>
        <button
          onClick={() => navigate(tableId ? `/order/${tableId}` : '/')}
          className="px-6 py-3 rounded-xl bg-success text-white font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <Home size={18} /> Go to Order
        </button>
      </div>
    );
  }

  const reference = `${settings.cafeName.replace(/\s/g, '')}-T${snap.tableNumber}-B${settings.billCounter + 1}`;

  const methods = [
    { id: 'cash', label: 'Cash', icon: Banknote, isQR: false },
    ...(settings.wallets.esewa.enabled ? [{ id: 'esewa', label: 'eSewa', icon: Smartphone, isQR: true }] : []),
    ...(settings.wallets.khalti.enabled ? [{ id: 'khalti', label: 'Khalti', icon: Smartphone, isQR: true }] : []),
    ...(settings.wallets.fonepay.enabled ? [{ id: 'fonepay', label: 'Fonepay', icon: Smartphone, isQR: true }] : []),
  ];

  const getQRData = (method: string) => {
    if (method === 'esewa')
      return `eSewa://pay?eSewaID=${settings.esewaPhone || settings.esewaId}&amount=${finalTotal}&table=${snap.tableNumber}&ref=${reference}`;
    return `pay://${method}?amount=${finalTotal}&ref=${reference}`;
  };

  const getQRImage = (method: string) => {
    const k = method as 'esewa' | 'khalti' | 'fonepay';
    return settings.wallets[k]?.qrImage || null;
  };

  const handleConfirmPayment = async (method: string) => {
    const bn = getNextBillNumber();
    setBillNum(bn);
    setPaidMethod(method);

    addPayment({
      orderId: snap.id,
      tableNumber: snap.tableNumber,
      items: [...snap.items],
      subtotal,
      discount: discountValue,
      discountType,
      vatAmount,
      vatRate,
      vatMode,
      vatEnabled,
      total: finalTotal,
      method,
      reference,
      createdAt: Date.now(),
      cafeName: settings.cafeName,
      billNumber: bn,
    });

    updateOrderStatus(snap.id, 'paid');
    if (tableId) resetTable(tableId);
    playSuccess();
    setShowQRModal(false);
    setPaid(true);

    // Trigger window.print for receipt
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 400);

    if (printer.isConnected) {
      await printer.print(
        formatReceipt({
          cafeName: settings.cafeName,
          tableNumber: snap.tableNumber,
          items: snap.items,
          subtotal,
          discount: discountAmount,
          vatAmount,
          vatRate,
          vatEnabled,
          total: finalTotal,
          method,
          date: format(Date.now(), 'yyyy-MM-dd HH:mm'),
          billNumber: bn,
        })
      );
    }
  };

  /* ── PORTAL RECEIPT (rendered directly on <body>, outside #root) ─── */
  const receiptPortal = paid
    ? createPortal(
        <div
          id="print-receipt"
          style={{
            display: 'none', // hidden in UI; @media print overrides to block
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            lineHeight: 1.5,
            color: '#000',
            background: '#fff',
            padding: '6mm',
            width: '80mm',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#000' }}>{settings.cafeName}</div>
            {settings.cafeAddress && (
              <div style={{ fontSize: 11, color: '#000' }}>{settings.cafeAddress}</div>
            )}
            {settings.cafePhone && (
              <div style={{ fontSize: 11, color: '#000' }}>{settings.cafePhone}</div>
            )}
            <div style={{ fontSize: 11, color: '#000', marginTop: 4 }}>
              #{billNum} · Table {snap.tableNumber} · {format(Date.now(), 'dd MMM yyyy, HH:mm')}
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          {/* Items */}
          {snap.items.map((item) => (
            <div
              key={item.menuItemId}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#000' }}
            >
              <span>{item.name} x{item.quantity}</span>
              <span>Rs. {item.price * item.quantity}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#000' }}>
            <span>Subtotal</span><span>Rs. {subtotal}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#000' }}>
              <span>Discount</span><span>-Rs. {discountAmount}</span>
            </div>
          )}
          {vatEnabled && vatAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#000' }}>
              <span>VAT ({Math.round(vatRate * 100)}%)</span><span>Rs. {vatAmount}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, marginTop: 4, color: '#000' }}>
            <span>TOTAL</span><span>Rs. {finalTotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2, color: '#000' }}>
            <span>Payment</span>
            <span style={{ textTransform: 'uppercase' }}>{paidMethod}</span>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#000' }}>
            {settings.billFooter || 'Thank you for visiting! ☕'}
          </div>
        </div>,
        document.body
      )
    : null;

  /* ── SUCCESS SCREEN ─────────────────────────────────────── */
  if (paid) {
    const displayItems = snap.items.slice(0, 3);
    const extraCount = snap.items.length - displayItems.length;

    return (
      <>
        {receiptPortal}
        <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4 overflow-hidden">
          {/* Success icon + amount */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center shadow-[0_0_32px_-4px_hsl(var(--success)/0.4)]">
              <CheckCircle2 size={36} className="text-success" />
            </div>
            <h2 className="text-xl font-black text-foreground">Payment Successful</h2>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-foreground">Rs. {finalTotal}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-xs font-bold uppercase">
                {paidMethod}
              </span>
            </div>
            {discountAmount > 0 && (
              <span className="text-xs text-success font-medium">Saved Rs. {discountAmount}</span>
            )}
          </div>

          {/* Compact receipt */}
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 space-y-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
            <div className="text-center pb-1 border-b border-dashed border-border/60">
              <p className="font-black text-sm text-foreground">{settings.cafeName}</p>
              <p className="text-xs text-muted-foreground font-mono">
                #{billNum} · Table {snap.tableNumber}
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
              <span className="text-lg font-black text-foreground">Rs. {finalTotal}</span>
            </div>
          </div>

          {/* Printing + auto-nav indicator */}
          <p className="text-xs text-muted-foreground animate-pulse">Printing receipt...</p>

          <button
            onClick={() => navigate('/', { replace: true })}
            data-testid="button-back-home"
            className="w-full max-w-sm py-4 rounded-2xl bg-success text-white font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.4)]"
          >
            <Home size={20} /> Back to Tables
          </button>
        </div>
        </div>
      </>
    );
  }

  /* ── PAYMENT SCREEN ─────────────────────────────────────── */
  const qrMethods = methods.filter((m) => m.isQR);

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={`Payment — Table ${snap.tableNumber}`} showBack onBack={() => navigate(`/review/${tableId}`)} />

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">

        {/* Total amount card */}
        <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-card/70 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center">Amount Due</p>
          <p className="text-6xl font-black text-foreground mt-1 tracking-tight text-center tabular-nums">
            Rs. {finalTotal}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-mono text-center">Table {snap.tableNumber}</p>

          {/* Breakdown */}
          <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-medium">Rs. {subtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-success font-semibold">-Rs. {discountAmount}</span>
              </div>
            )}
            {vatEnabled && vatAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT ({Math.round(vatRate * 100)}%)</span>
                <span className="text-foreground font-medium">Rs. {vatAmount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment methods */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</p>

          {/* Cash — prominent, full-width */}
          <button
            onClick={() => handleConfirmPayment('cash')}
            data-testid="button-payment-method-cash"
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-success/60 bg-success/8 transition-all active:scale-[0.97] hover:bg-success/12 hover:border-success shadow-[0_2px_16px_-6px_hsl(var(--success)/0.35)]"
          >
            <div className="w-11 h-11 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
              <Banknote size={22} className="text-success" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-base text-foreground">Cash</p>
              <p className="text-[11px] text-muted-foreground">Tap to complete payment</p>
            </div>
            <span className="text-sm font-black text-success">Rs. {finalTotal}</span>
          </button>

          {/* QR methods — grid */}
          {qrMethods.length > 0 && (
            <div className={`grid gap-2.5 ${qrMethods.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {qrMethods.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setSelectedMethod(id); setShowQRModal(true); }}
                  data-testid={`button-payment-method-${id}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card transition-all active:scale-[0.97] hover:scale-[1.015] hover:bg-secondary/50 hover:border-foreground/20 hover:shadow-sm"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Smartphone size={18} className="text-muted-foreground" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-sm text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">Scan QR</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QR MODAL ─────────────────────────────────────────── */}
      {showQRModal && selectedMethod && selectedMethod !== 'cash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-card rounded-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-black text-foreground text-base">
                {selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} Payment
              </h3>
              <button
                onClick={() => { setShowQRModal(false); setSelectedMethod(null); setConfirming(false); }}
                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-90"
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-6 pt-5 pb-6 flex flex-col items-center gap-4">

              {/* Amount — large, clear */}
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Amount Due</p>
                <p className="text-5xl font-black text-foreground mt-1 tabular-nums">Rs. {finalTotal}</p>
                {discountAmount > 0 && (
                  <p className="text-xs text-success font-semibold mt-1">Saved Rs. {discountAmount}</p>
                )}
              </div>

              {/* QR code — larger, with soft glow border */}
              <div
                className="p-4 bg-white rounded-2xl"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 20px -4px rgba(0,0,0,0.3)' }}
              >
                {getQRImage(selectedMethod) ? (
                  <img
                    src={getQRImage(selectedMethod)!}
                    alt={`${selectedMethod} QR`}
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={getQRData(selectedMethod)}
                    size={224}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                )}
              </div>

              {/* Instruction */}
              <p className="text-sm font-semibold text-foreground text-center">
                Scan QR and confirm after payment
              </p>

              {/* Confirm button with processing state */}
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
                  background: confirming
                    ? 'hsl(var(--success) / 0.7)'
                    : 'hsl(var(--success))',
                  boxShadow: '0 4px 16px -4px hsl(var(--success) / 0.5)',
                }}
              >
                {confirming ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentScreen;
