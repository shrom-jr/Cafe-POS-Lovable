import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Banknote, Smartphone, CheckCircle2, Home, X } from 'lucide-react';
import { printer, formatReceipt } from '@/utils/printer';
import { format } from 'date-fns';
import { OrderItem } from '@/types/pos';
import { playSuccess } from '@/utils/sounds';

const AUTO_REDIRECT_SECS = 3;

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
    discount?: number;
    discountType?: 'percent' | 'fixed';
    total?: number;
    subtotal?: number;
    discountAmount?: number;
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

  // Discount state — can be seeded from BillingScreen state
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(
    rawState?.discountType || 'percent'
  );
  const [discountValue, setDiscountValue] = useState<number>(rawState?.discount || 0);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paid, setPaid] = useState(false);
  const [billNum, setBillNum] = useState<number>(0);
  const [paidMethod, setPaidMethod] = useState<string>('');
  const [printing, setPrinting] = useState(false);

  // Auto-redirect countdown after payment
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECS);
  const [cancelRedirect, setCancelRedirect] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!paid || cancelRedirect) return;
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          navigate('/', { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [paid, cancelRedirect, navigate]);

  // Compute discount/total — must be before early return (hooks rules)
  const subtotalRaw = snap?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;
  const discountAmount = useMemo(() => {
    if (discountType === 'percent') return Math.round((subtotalRaw * discountValue) / 100);
    return Math.min(discountValue, subtotalRaw);
  }, [subtotalRaw, discountType, discountValue]);
  const finalTotalRaw = Math.max(0, subtotalRaw - discountAmount);

  if (!table || !snap) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-foreground">No active order for this table.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-success text-white font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <Home size={18} /> Go to Tables
        </button>
      </div>
    );
  }

  const subtotal = subtotalRaw;
  const finalTotal = finalTotalRaw;
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

  const handleSelectMethod = (id: string, isQR: boolean) => {
    setSelectedMethod(id);
    if (isQR) setShowQRModal(true);
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
          total: finalTotal,
          method,
          date: format(Date.now(), 'yyyy-MM-dd HH:mm'),
          billNumber: bn,
        })
      );
    }
  };

  /* ── PRINTABLE RECEIPT (hidden in UI, shown on print) ─── */
  const PrintableReceipt = () => {
    const dateStr = format(Date.now(), 'dd MMM yyyy, HH:mm');
    return (
      <div id="printable-receipt">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{settings.cafeName}</div>
          {settings.cafeAddress && <div style={{ fontSize: 11 }}>{settings.cafeAddress}</div>}
          {settings.cafePhone && <div style={{ fontSize: 11 }}>{settings.cafePhone}</div>}
          <div style={{ fontSize: 11, marginTop: 4 }}>
            #{billNum} · Table {snap.tableNumber} · {dateStr}
          </div>
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        {snap.items.map((item) => (
          <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span>{item.name} x{item.quantity}</span>
            <span>Rs. {item.price * item.quantity}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        {discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span>Subtotal</span><span>Rs. {subtotal}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span>Discount</span><span>-Rs. {discountAmount}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, marginTop: 4 }}>
          <span>TOTAL</span><span>Rs. {finalTotal}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
          <span>Payment</span><span style={{ textTransform: 'uppercase' }}>{paidMethod}</span>
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 11 }}>
          {settings.billFooter || 'Thank you for visiting! ☕'}
        </div>
      </div>
    );
  };

  /* ── SUCCESS SCREEN ─────────────────────────────────────── */
  if (paid) {
    const displayItems = snap.items.slice(0, 3);
    const extraCount = snap.items.length - displayItems.length;

    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Hidden printable receipt */}
        <div className="hidden print:block">
          <PrintableReceipt />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4 overflow-hidden non-print">
          {/* Success icon + amount */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center shadow-[0_0_32px_-4px_hsl(var(--success)/0.4)]">
              <CheckCircle2 size={36} className="text-success" />
            </div>
            <h2 className="text-xl font-black text-foreground">Payment Received!</h2>
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

          {/* Printing indicator */}
          {printing && (
            <p className="text-xs text-muted-foreground animate-pulse">Printing receipt...</p>
          )}

          {/* Auto-redirect countdown */}
          {!cancelRedirect ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Returning to tables in {countdown}s...</span>
              <button
                onClick={() => { setCancelRedirect(true); if (countdownRef.current) clearInterval(countdownRef.current); }}
                className="text-accent font-semibold hover:text-accent/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/', { replace: true })}
              data-testid="button-back-home"
              className="w-full max-w-sm py-4 rounded-2xl bg-success text-white font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.4)]"
            >
              <Home size={20} /> Back to Tables
            </button>
          )}

          {cancelRedirect && (
            <p className="text-xs text-muted-foreground -mt-2">Auto-return cancelled</p>
          )}
        </div>
      </div>
    );
  }

  /* ── PAYMENT SCREEN ─────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <TopBar title={`Payment — Table ${snap.tableNumber}`} showBack onBack={() => navigate(-1)} />

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">

        {/* Total amount card */}
        <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-card/70 p-5 text-center shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Amount Due</p>
          <p className="text-6xl font-black text-foreground mt-1 tracking-tight">
            Rs. {finalTotal}
          </p>
          {discountAmount > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground line-through">Rs. {subtotal}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold">
                Saved Rs. {discountAmount}
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 font-mono">Table {snap.tableNumber}</p>
        </div>

        {/* Discount section */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discount</p>
            {discountValue > 0 && (
              <button
                onClick={() => setDiscountValue(0)}
                className="text-xs text-danger/70 hover:text-danger transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {/* Quick % buttons */}
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((v) => (
              <button
                key={v}
                onClick={() => { setDiscountType('percent'); setDiscountValue(discountValue === v && discountType === 'percent' ? 0 : v); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                  discountValue === v && discountType === 'percent'
                    ? 'bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)]'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {v}%
              </button>
            ))}
          </div>

          {/* Manual input */}
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden flex-1">
              <button
                onClick={() => setDiscountType('percent')}
                className={`px-3 py-2 text-xs font-bold transition-colors ${discountType === 'percent' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                %
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`px-3 py-2 text-xs font-bold transition-colors border-l border-border ${discountType === 'fixed' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                Rs.
              </button>
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : subtotal}
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                placeholder={discountType === 'percent' ? 'Custom %' : 'Amount'}
                data-testid="input-discount-value"
                className="flex-1 px-3 py-2 bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none border-l border-border"
              />
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</p>
          <div className="grid grid-cols-2 gap-2.5">
            {methods.map(({ id, label, icon: Icon, isQR }) => (
              <button
                key={id}
                onClick={() => handleSelectMethod(id, isQR)}
                data-testid={`button-payment-method-${id}`}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.97] ${
                  selectedMethod === id
                    ? 'border-success bg-success/10 shadow-[0_2px_12px_-4px_hsl(var(--success)/0.3)]'
                    : 'border-border bg-card hover:bg-secondary/40'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedMethod === id ? 'bg-success/15' : 'bg-secondary'
                }`}>
                  <Icon size={20} className={selectedMethod === id ? 'text-success' : 'text-muted-foreground'} />
                </div>
                <div className="text-left min-w-0">
                  <p className={`font-semibold text-sm ${selectedMethod === id ? 'text-success' : 'text-foreground'}`}>
                    {label}
                  </p>
                  {isQR && <p className="text-[10px] text-muted-foreground">Opens QR</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cash confirm button */}
        {selectedMethod === 'cash' && (
          <button
            onClick={() => handleConfirmPayment('cash')}
            data-testid="button-confirm-payment"
            className="w-full py-5 rounded-2xl bg-success text-white font-black text-xl transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_20px_-4px_hsl(var(--success)/0.5)]"
          >
            Confirm Payment Rs. {finalTotal}
          </button>
        )}

        {!selectedMethod && (
          <div className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-center text-muted-foreground text-sm font-medium">
            Select a payment method above
          </div>
        )}
      </div>

      {/* ── QR MODAL ─────────────────────────────────────────── */}
      {showQRModal && selectedMethod && selectedMethod !== 'cash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-card rounded-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-black text-foreground text-base">
                {selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} Payment
              </h3>
              <button
                onClick={() => { setShowQRModal(false); setSelectedMethod(null); }}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount Due</p>
                <p className="text-5xl font-black text-foreground mt-1">Rs. {finalTotal}</p>
                {discountAmount > 0 && (
                  <span className="text-xs text-success font-medium">Saved Rs. {discountAmount}</span>
                )}
              </div>

              <div className="p-4 bg-white rounded-2xl shadow-inner">
                {getQRImage(selectedMethod) ? (
                  <img src={getQRImage(selectedMethod)!} alt={`${selectedMethod} QR`} className="w-52 h-52 object-contain" />
                ) : (
                  <QRCodeSVG value={getQRData(selectedMethod)} size={208} bgColor="#ffffff" fgColor="#000000" level="M" />
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Scan with {selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} app
                </p>
                <p className="text-xs text-muted-foreground font-mono">{reference}</p>
              </div>

              <button
                onClick={() => handleConfirmPayment(selectedMethod)}
                data-testid="button-confirm-payment"
                className="w-full py-4 rounded-2xl bg-success text-white font-black text-lg transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.5)]"
              >
                Confirm Payment Rs. {finalTotal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentScreen;
