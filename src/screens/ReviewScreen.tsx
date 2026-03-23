import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { calcBill } from '@/utils/calcBill';
import { fmt, resolvePaymentLabel } from '@/utils/format';
import { triggerPrint } from '@/utils/print';
import { playSuccess } from '@/utils/sounds';
import { QRCodeSVG } from 'qrcode.react';
import {
  ChevronLeft, ChevronDown, ChevronUp, Banknote, Smartphone,
  CheckCircle2, Home, X, Loader2, Printer,
} from 'lucide-react';
import ThermalReceiptLayout from '@/components/ThermalReceiptLayout';

const PRESETS = [0, 5, 10, 15];

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
  const [confirming, setConfirming] = useState(false);
  const [billDetailsOpen, setBillDetailsOpen] = useState(false);

  // Landscape detection — matches OrderScreen logic
  const detectLandscape = () => window.innerWidth > window.innerHeight && window.innerHeight < 600;
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(detectLandscape);
  useEffect(() => {
    const update = () => setIsLandscapeMobile(detectLandscape());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

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
    ...(settings.customWallets || []).filter((w) => w.enabled).map((w) => ({ id: w.id, label: w.name, isQR: true })),
  ];
  const qrMethods = methods.filter((m) => m.isQR);

  const getQRData = (method: string) => {
    if (method === 'esewa')
      return `eSewa://pay?eSewaID=${settings.esewaPhone || settings.esewaId}&amount=${bill.total}&table=${tableNumber}&ref=${reference}`;
    return `pay://${method}?amount=${bill.total}&ref=${reference}`;
  };

  const getQRImage = (method: string) => {
    const builtIn = ['esewa', 'khalti', 'fonepay'] as const;
    if (builtIn.includes(method as 'esewa' | 'khalti' | 'fonepay')) {
      return settings.wallets[method as 'esewa' | 'khalti' | 'fonepay']?.qrImage || null;
    }
    const custom = (settings.customWallets || []).find((w) => w.id === method);
    return custom?.qrImage || null;
  };

  const handleConfirmPayment = async (method: string) => {
    const bn = getNextBillNumber();
    const now = Date.now();
    setBillNum(bn);
    setPaidAt(now);
    setPaidMethod(resolvePaymentLabel(method, settings));

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
  };

  // ── Early exits ───────────────────────────────────────────────
  if (!table || !tableId || items.length === 0) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-6">
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
          <ThermalReceiptLayout
            cafeName={settings.cafeName}
            cafeLogo={settings.cafeLogo}
            cafeAddress={settings.cafeAddress}
            cafePan={settings.cafePan}
            billFooter={settings.billFooter}
            tableNumber={tableNumber}
            billNumber={billNum}
            createdAt={paidAt || Date.now()}
            items={items}
            subtotal={bill.subtotal}
            discountAmount={bill.discountAmount}
            vatEnabled={bill.vatEnabled}
            vatAmount={bill.vatAmount}
            vatRate={bill.vatRate}
            total={bill.total}
            method={paidMethod}
          />
        </div>,
        document.body
      )
    : null;

  // ── Success screen ────────────────────────────────────────────
  if (paid) {
    const displayItems = items.slice(0, 3);
    const extraCount = items.length - displayItems.length;

    const handleReprint = () => {
      if (reprinting) return;
      setReprinting(true);
      triggerPrint('receipt');
      setTimeout(() => setReprinting(false), 1800);
    };

    /* ── Shared receipt card content ── */
    const receiptCard = (compact = false) => (
      <div
        className={`w-full bg-card border border-border rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] ${compact ? 'p-3 space-y-1.5' : 'p-4 space-y-2'}`}
      >
        <div className={`text-center border-b border-dashed border-border/60 ${compact ? 'pb-1' : 'pb-1'}`}>
          <p className={`font-black text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{settings.cafeName}</p>
          <p className="text-xs text-muted-foreground font-mono">#{billNum} · Table {tableNumber}</p>
        </div>
        <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
          {displayItems.map((item) => (
            <div key={item.menuItemId} className={`flex justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-muted-foreground truncate pr-2">
                {item.name} <span className="text-foreground font-semibold">×{item.quantity}</span>
              </span>
              <span className="font-semibold text-foreground whitespace-nowrap">Rs. {fmt(item.price * item.quantity)}</span>
            </div>
          ))}
          {extraCount > 0 && (
            <p className="text-xs text-muted-foreground">+{extraCount} more item{extraCount > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex justify-between items-center border-t border-dashed border-border/60 pt-1.5">
          <span className={`font-semibold text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>Total</span>
          <span className={`font-black text-foreground ${compact ? 'text-base' : 'text-lg'}`}>Rs. {fmt(bill.total)}</span>
        </div>
      </div>
    );

    return (
      <>
        {receiptPortal}
        <div className="h-[100dvh] bg-background overflow-hidden">

          {isLandscapeMobile ? (
            /* ── LANDSCAPE: 2-column layout ── */
            <div className="h-full flex flex-row">

              {/* Left (40%): success icon + amount + badge */}
              <div
                className="flex flex-col items-center justify-center gap-2 px-5"
                style={{ width: '40%', borderRight: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center shadow-[0_0_32px_-4px_hsl(var(--success)/0.4)]">
                  <CheckCircle2 size={30} className="text-success" />
                </div>
                <h2 className="text-base font-black text-foreground text-center leading-tight">Payment Successful</h2>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className="text-2xl font-black text-foreground tabular-nums">Rs. {fmt(bill.total)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-bold uppercase">
                    {paidMethod}
                  </span>
                </div>
                {bill.discountAmount > 0 && (
                  <span className="text-xs text-success font-medium">Saved Rs. {fmt(bill.discountAmount)}</span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Printer size={11} />
                  <span>Printing receipt...</span>
                </div>
              </div>

              {/* Right (60%): receipt + buttons */}
              <div
                className="flex flex-col justify-between pt-4 px-4 gap-2"
                style={{ width: '60%', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
              >
                {receiptCard(true)}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleReprint}
                    disabled={reprinting}
                    className="w-full py-2.5 rounded-2xl border border-border bg-secondary text-foreground font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:bg-secondary/80 disabled:opacity-60"
                  >
                    <Printer size={14} />
                    {reprinting ? 'Reprinting...' : 'Reprint Receipt'}
                  </button>
                  <button
                    onClick={() => navigate('/', { replace: true })}
                    className="w-full py-3 rounded-2xl bg-success text-white font-black text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.4)]"
                  >
                    <Home size={16} /> Back to Tables
                  </button>
                </div>
              </div>

            </div>

          ) : (
            /* ── PORTRAIT: original stacked layout ── */
            <div className="flex-1 h-full flex flex-col items-center justify-center p-5 gap-4 overflow-hidden">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center shadow-[0_0_32px_-4px_hsl(var(--success)/0.4)]">
                  <CheckCircle2 size={36} className="text-success" />
                </div>
                <h2 className="text-xl font-black text-foreground">Payment Successful</h2>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-foreground">Rs. {fmt(bill.total)}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-xs font-bold uppercase">
                    {paidMethod}
                  </span>
                </div>
                {bill.discountAmount > 0 && (
                  <span className="text-xs text-success font-medium">Saved Rs. {fmt(bill.discountAmount)}</span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Printer size={12} />
                  <span>Printing receipt...</span>
                </div>
              </div>

              {receiptCard()}

              <div className="w-full max-w-sm space-y-2.5">
                <button
                  onClick={handleReprint}
                  disabled={reprinting}
                  className="w-full py-3.5 rounded-2xl border border-border bg-secondary text-foreground font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:bg-secondary/80 disabled:opacity-60"
                >
                  <Printer size={15} />
                  {reprinting ? 'Reprinting...' : 'Reprint Receipt'}
                </button>
                <button
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full py-4 rounded-2xl bg-success text-white font-black text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.4)]"
                >
                  <Home size={18} /> Back to Tables
                </button>
              </div>
            </div>
          )}

        </div>
      </>
    );
  }

  // ── Shared JSX sections (used in both portrait and landscape) ────

  const itemsCard = (
    <div
      className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 16px -8px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="flex-shrink-0 px-3 py-1.5 flex items-center"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Order Items
        </span>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="overflow-y-auto h-full">
          {items.map((item, idx) => (
            <div
              key={item.menuItemId}
              className="flex items-center gap-3 px-3 py-2"
              style={idx < items.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate leading-snug" style={{ color: 'rgba(255,255,255,0.95)' }}>
                  {item.name}
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {item.quantity} × Rs. {fmt(item.price)}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.88)' }}>
                Rs. {fmt(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div
          className="absolute bottom-0 inset-x-0 h-8 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(9,14,28,0.95))' }}
        />
      </div>
    </div>
  );

  const getBillCard = (compact = false) => (
    <div
      className="rounded-2xl overflow-hidden flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      <div className={`px-4 ${compact ? 'pt-1.5 pb-1 space-y-1' : 'pt-2 pb-1.5 space-y-1.5'}`}>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>Subtotal</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.94)' }}>
            Rs. {fmt(bill.subtotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>Discount</span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: bill.discountAmount > 0 ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.22)' }}
          >
            −Rs. {fmt(bill.discountAmount)}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex gap-1.5">
            {PRESETS.map((pct) => {
              const isActive = activePreset === pct && discountMode === 'percent';
              return (
                <button
                  key={pct}
                  onClick={() => handlePreset(pct)}
                  className={`flex-1 ${compact ? 'py-0.5' : 'py-1'} rounded-md text-[11px] font-bold transition-all active:scale-95`}
                  style={
                    isActive
                      ? { background: 'rgba(59,130,246,0.22)', color: 'rgba(147,197,253,0.95)', border: '1px solid rgba(59,130,246,0.38)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                >
                  {pct}%
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5 items-center">
            <div
              className="flex rounded-md overflow-hidden flex-shrink-0 text-[11px] font-bold"
              style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }}
            >
              <button
                onClick={() => handleModeToggle('percent')}
                className={`px-2.5 ${compact ? 'py-0.5' : 'py-1'} transition-colors`}
                style={discountMode === 'percent' ? { background: 'rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.95)' } : { color: 'rgba(255,255,255,0.36)' }}
              >%</button>
              <button
                onClick={() => handleModeToggle('fixed')}
                className={`px-2.5 ${compact ? 'py-0.5' : 'py-1'} transition-colors`}
                style={discountMode === 'fixed' ? { background: 'rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.95)' } : { color: 'rgba(255,255,255,0.36)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
              >Rs</button>
            </div>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder={discountMode === 'percent' ? 'Custom %' : 'Custom Rs.'}
              value={discountInput}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`flex-1 px-3 ${compact ? 'py-0.5' : 'py-1'} rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all`}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />
          </div>
        </div>
        {bill.vatEnabled && (
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>
              VAT ({Math.round(bill.vatRate * 100)}%)
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.94)' }}>
              Rs. {fmt(bill.vatAmount)}
            </span>
          </div>
        )}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
      <div className={`flex items-center justify-between px-4 ${compact ? 'py-1.5' : 'py-2'}`}>
        <span className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Total
        </span>
        <span
          className={`${compact ? 'text-[22px]' : 'text-[26px]'} font-black tracking-tight leading-none tabular-nums`}
          style={{ color: '#ffffff' }}
        >
          Rs. {fmt(bill.total)}
        </span>
      </div>
    </div>
  );
  const billCard = getBillCard();

  const getPaymentCard = (compact = false) => (
    <div
      className="rounded-2xl px-4 flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 20px -6px rgba(0,0,0,0.4)',
        paddingTop: compact ? '8px' : '6px',
        paddingBottom: compact ? '8px' : '8px',
      }}
    >
      <p
        className="font-black uppercase tracking-[0.14em]"
        style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginBottom: compact ? 6 : 6 }}
      >
        Payment Method
      </p>
      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>

              {/* Cash */}
              <button
                onClick={() => handleConfirmPayment('cash')}
                data-testid="button-payment-method-cash"
                className={`w-full flex items-center gap-3 px-4 ${compact ? 'py-1.5' : 'py-2'} rounded-xl transition-all active:scale-[0.97]`}
                style={{
                  background: 'rgba(52,211,153,0.07)',
                  border: '1px solid rgba(52,211,153,0.25)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(52,211,153,0.12)' }}
                >
                  <Banknote size={16} className="text-success" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>Cash</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>Tap to complete payment</p>
                </div>
                <span className="text-sm font-black text-success tabular-nums">Rs. {fmt(bill.total)}</span>
              </button>

              {/* Digital wallets */}
              {qrMethods.length > 0 && (
                <div className={`grid ${compact ? 'gap-1' : 'gap-1.5'} ${qrMethods.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {qrMethods.map(({ id, label }) => {
                    const builtInKeys = ['esewa', 'khalti', 'fonepay'] as const;
                    const isBuiltIn = builtInKeys.includes(id as 'esewa' | 'khalti' | 'fonepay');
                    const logoImage = isBuiltIn
                      ? settings.wallets[id as 'esewa' | 'khalti' | 'fonepay']?.logoImage
                      : (settings.customWallets || []).find((w) => w.id === id)?.logoImage;
                    const brandColor =
                      id === 'esewa' ? '#16a34a' :
                      id === 'khalti' ? '#7c3aed' :
                      id === 'fonepay' ? '#dc2626' :
                      '#3b82f6';
                    return (
                      <button
                        key={id}
                        onClick={() => { setSelectedMethod(id); setShowQRModal(true); }}
                        data-testid={`button-payment-method-${id}`}
                        className={`flex items-center gap-2.5 px-3 ${compact ? 'py-1.5' : 'py-2'} rounded-xl transition-all active:scale-[0.97]`}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.09)',
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.07)' }}
                        >
                          {logoImage ? (
                            <img src={logoImage} alt={label} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <Smartphone size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-bold text-sm" style={{ color: brandColor }}>{label}</p>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Scan QR</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
      </div>
    </div>
  );
  const paymentCard = getPaymentCard();

  // ── Main review + payment screen ──
  return (
    <>
      {receiptPortal}
      <div
        className="h-[100dvh] flex flex-col overflow-hidden"
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

        {/* Body — portrait: stacked column | landscape: 2-column side-by-side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLandscapeMobile ? (
            <div className="flex-1 flex flex-row overflow-hidden px-3 py-2 gap-3">

              {/* Left: items list (scrollable) */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {itemsCard}
              </div>

              {/* Right: Total → Payment (scrollable list) → Bill details (collapsible) */}
              <div
                className="w-[300px] flex-shrink-0 flex flex-col overflow-hidden gap-1.5"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '12px' }}
              >

                {/* 1. TOTAL — always visible, top */}
                <div
                  className="flex-shrink-0 flex items-center justify-between px-4 py-2 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Total
                  </span>
                  <span className="text-[24px] font-black tracking-tight leading-none tabular-nums" style={{ color: '#ffffff' }}>
                    Rs. {fmt(bill.total)}
                  </span>
                </div>

                {/* 2. PAYMENT METHODS — flex-1 so it fills available space; list scrolls if needed */}
                <div
                  className="flex-1 min-h-0 flex flex-col rounded-xl px-3 pt-2 pb-2"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: '0 4px 20px -6px rgba(0,0,0,0.4)',
                  }}
                >
                  <p className="flex-shrink-0 text-[9px] font-black uppercase tracking-[0.14em] mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Payment Method
                  </p>
                  {/* Scrollable list — only this scrolls when there are many options */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
                    {/* Cash — pinned first, always prominent */}
                    <button
                      onClick={() => handleConfirmPayment('cash')}
                      data-testid="button-payment-method-cash"
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all active:scale-[0.97]"
                      style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.25)' }}
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.12)' }}>
                        <Banknote size={14} className="text-success" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm leading-none" style={{ color: 'rgba(255,255,255,0.92)' }}>Cash</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Tap to complete</p>
                      </div>
                      <span className="text-xs font-black text-success tabular-nums">Rs. {fmt(bill.total)}</span>
                    </button>

                    {/* Digital wallets */}
                    {qrMethods.map(({ id, label }) => {
                      const builtInKeys = ['esewa', 'khalti', 'fonepay'] as const;
                      const isBuiltIn = builtInKeys.includes(id as 'esewa' | 'khalti' | 'fonepay');
                      const logoImage = isBuiltIn
                        ? settings.wallets[id as 'esewa' | 'khalti' | 'fonepay']?.logoImage
                        : (settings.customWallets || []).find((w) => w.id === id)?.logoImage;
                      const brandColor =
                        id === 'esewa' ? '#16a34a' :
                        id === 'khalti' ? '#7c3aed' :
                        id === 'fonepay' ? '#dc2626' : '#3b82f6';
                      return (
                        <button
                          key={id}
                          onClick={() => { setSelectedMethod(id); setShowQRModal(true); }}
                          data-testid={`button-payment-method-${id}`}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all active:scale-[0.97]"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                        >
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            {logoImage
                              ? <img src={logoImage} alt={label} className="w-full h-full object-contain p-0.5" />
                              : <Smartphone size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                            }
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-bold text-sm leading-none" style={{ color: brandColor }}>{label}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Scan QR</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. BILL DETAILS — collapsible, default closed, pinned at bottom */}
                <div
                  className="flex-shrink-0 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Toggle header — always visible */}
                  <button
                    onClick={() => setBillDetailsOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 transition-all active:opacity-70"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        Bill Details
                      </span>
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color: bill.discountAmount > 0 ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.38)' }}>
                        {bill.discountAmount > 0 ? `−Rs. ${fmt(bill.discountAmount)}` : `Sub Rs. ${fmt(bill.subtotal)}`}
                        {bill.vatEnabled ? ` · VAT Rs. ${fmt(bill.vatAmount)}` : ''}
                      </span>
                    </div>
                    {billDetailsOpen
                      ? <ChevronUp size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    }
                  </button>

                  {/* Expandable body */}
                  {billDetailsOpen && (
                    <div className="px-3 pb-2 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>Subtotal</span>
                        <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.88)' }}>Rs. {fmt(bill.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>Discount</span>
                        <span
                          className="text-[11px] font-semibold tabular-nums"
                          style={{ color: bill.discountAmount > 0 ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.22)' }}
                        >
                          −Rs. {fmt(bill.discountAmount)}
                        </span>
                      </div>
                      {/* Discount controls */}
                      <div className="flex gap-1.5 items-center">
                        <div className="flex gap-1">
                          {PRESETS.map((pct) => {
                            const isActive = activePreset === pct && discountMode === 'percent';
                            return (
                              <button
                                key={pct}
                                onClick={() => handlePreset(pct)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all active:scale-95"
                                style={
                                  isActive
                                    ? { background: 'rgba(59,130,246,0.22)', color: 'rgba(147,197,253,0.95)', border: '1px solid rgba(59,130,246,0.38)' }
                                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }
                                }
                              >
                                {pct}%
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex rounded overflow-hidden flex-shrink-0 text-[10px] font-bold" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }}>
                          <button
                            onClick={() => handleModeToggle('percent')}
                            className="px-1.5 py-0.5 transition-colors"
                            style={discountMode === 'percent' ? { background: 'rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.95)' } : { color: 'rgba(255,255,255,0.36)' }}
                          >%</button>
                          <button
                            onClick={() => handleModeToggle('fixed')}
                            className="px-1.5 py-0.5 transition-colors"
                            style={discountMode === 'fixed' ? { background: 'rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.95)' } : { color: 'rgba(255,255,255,0.36)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                          >Rs</button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          placeholder={discountMode === 'percent' ? '%' : 'Rs'}
                          value={discountInput}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className="flex-1 min-w-0 px-2 py-0.5 rounded text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        />
                      </div>
                      {bill.vatEnabled && (
                        <div className="flex justify-between items-center">
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                            VAT ({Math.round(bill.vatRate * 100)}%)
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.88)' }}>
                            Rs. {fmt(bill.vatAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="max-w-[460px] mx-auto w-full flex flex-col flex-1 min-h-0 px-4 pt-2.5 pb-2 gap-1.5">
              {itemsCard}
              <div className="flex-shrink-0 flex flex-col gap-1.5">
                {billCard}
                {paymentCard}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQRModal && selectedMethod && selectedMethod !== 'cash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">

          {isLandscapeMobile ? (
            /* ── LANDSCAPE: 2-column layout ── */
            <div
              className="bg-card border border-border shadow-2xl overflow-hidden flex flex-row w-full"
              style={{ borderRadius: 20, maxWidth: 640, maxHeight: 'calc(100dvh - 24px)' }}
            >
              {/* Left — QR code, centered, fills column */}
              <div
                className="flex items-center justify-center p-4"
                style={{ width: '55%', borderRight: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.15)' }}
              >
                <div
                  className="p-3 bg-white rounded-2xl"
                  style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 20px -4px rgba(0,0,0,0.3)' }}
                >
                  {getQRImage(selectedMethod) ? (
                    <img
                      src={getQRImage(selectedMethod)!}
                      alt={`${selectedMethod} QR`}
                      style={{ width: 160, height: 160, objectFit: 'contain' }}
                    />
                  ) : (
                    <QRCodeSVG value={getQRData(selectedMethod)} size={160} bgColor="#ffffff" fgColor="#000000" level="M" />
                  )}
                </div>
              </div>

              {/* Right — info + confirm button */}
              <div className="flex flex-col justify-between p-4" style={{ width: '45%' }}>
                {/* Top: close + wallet name + amount */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-foreground text-sm leading-tight">
                      {resolvePaymentLabel(selectedMethod, settings)} Payment
                    </h3>
                    <button
                      onClick={() => { setShowQRModal(false); setSelectedMethod(null); setConfirming(false); }}
                      className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90 flex-shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Amount Due</p>
                    <p className="text-3xl font-black text-foreground tabular-nums leading-tight">Rs. {fmt(bill.total)}</p>
                    {bill.discountAmount > 0 && (
                      <p className="text-xs text-success font-semibold mt-0.5">Saved Rs. {fmt(bill.discountAmount)}</p>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Scan the QR code and confirm after payment
                  </p>
                </div>

                {/* Bottom: confirm button */}
                <button
                  onClick={async () => {
                    if (confirming) return;
                    setConfirming(true);
                    await handleConfirmPayment(selectedMethod);
                  }}
                  disabled={confirming}
                  data-testid="button-confirm-payment"
                  className="w-full py-3 rounded-2xl text-white font-black text-sm transition-all active:scale-[0.97] disabled:opacity-80 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)',
                    boxShadow: '0 4px 16px -4px rgba(59,130,246,0.5)',
                  }}
                >
                  {confirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </div>

          ) : (
            /* ── PORTRAIT: original stacked layout ── */
            <div className="bg-card rounded-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-black text-foreground text-base">
                  {resolvePaymentLabel(selectedMethod, settings)} Payment
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
                  <p className="text-5xl font-black text-foreground mt-1 tabular-nums">Rs. {fmt(bill.total)}</p>
                  {bill.discountAmount > 0 && (
                    <p className="text-xs text-success font-semibold mt-1">Saved Rs. {fmt(bill.discountAmount)}</p>
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
          )}

        </div>
      )}
    </>
  );
};

export default ReviewScreen;
