import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import { QRCodeSVG } from 'qrcode.react';
import BillPreview from '@/components/billing/BillPreview';
import { Banknote, Smartphone, CheckCircle2, Home, Printer, X } from 'lucide-react';
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
    discount?: number;
    discountType?: 'percent' | 'fixed';
    total?: number;
    subtotal?: number;
    discountAmount?: number;
  } | null;
  const state = rawState || {};

  const table = tables.find((t) => t.id === tableId);
  const order = tableId ? getActiveOrder(tableId) : undefined;

  const orderSnapshot = useRef<{ id: string; items: OrderItem[]; tableNumber: number } | null>(null);
  useEffect(() => {
    if (order && !orderSnapshot.current) {
      orderSnapshot.current = {
        id: order.id,
        items: [...order.items],
        tableNumber: order.tableNumber,
      };
    }
  }, [order]);

  const snap =
    orderSnapshot.current ||
    (order ? { id: order.id, items: order.items, tableNumber: order.tableNumber } : null);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paid, setPaid] = useState(false);
  const [billNum, setBillNum] = useState<number>(0);

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

  const total = state.total ?? snap.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = state.subtotal ?? total;
  const discountAmt = state.discountAmount ?? 0;
  const reference = `${settings.cafeName.replace(/\s/g, '')}-T${snap.tableNumber}-B${settings.billCounter + 1}`;

  const methods = [
    { id: 'cash', label: 'Cash', icon: Banknote, isQR: false },
    ...(settings.wallets.esewa.enabled
      ? [{ id: 'esewa', label: 'eSewa', icon: Smartphone, isQR: true }]
      : []),
    ...(settings.wallets.khalti.enabled
      ? [{ id: 'khalti', label: 'Khalti', icon: Smartphone, isQR: true }]
      : []),
    ...(settings.wallets.fonepay.enabled
      ? [{ id: 'fonepay', label: 'Fonepay', icon: Smartphone, isQR: true }]
      : []),
  ];

  const getQRData = (method: string) => {
    if (method === 'esewa') {
      return `eSewa://pay?eSewaID=${settings.esewaPhone || settings.esewaId}&amount=${total}&table=${snap.tableNumber}&ref=${reference}`;
    }
    return `pay://${method}?amount=${total}&ref=${reference}`;
  };

  const getQRImage = (method: string) => {
    const walletKey = method as 'esewa' | 'khalti' | 'fonepay';
    return settings.wallets[walletKey]?.qrImage || null;
  };

  const handleSelectMethod = (id: string, isQR: boolean) => {
    setSelectedMethod(id);
    if (isQR) {
      setShowQRModal(true);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;
    const bn = getNextBillNumber();
    setBillNum(bn);

    addPayment({
      orderId: snap.id,
      tableNumber: snap.tableNumber,
      items: [...snap.items],
      subtotal,
      discount: state.discount || 0,
      discountType: state.discountType || 'fixed',
      total,
      method: selectedMethod,
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

    if (printer.isConnected) {
      await printer.print(
        formatReceipt({
          cafeName: settings.cafeName,
          tableNumber: snap.tableNumber,
          items: snap.items,
          subtotal,
          discount: discountAmt,
          total,
          method: selectedMethod,
          date: format(Date.now(), 'yyyy-MM-dd HH:mm'),
          billNumber: bn,
        })
      );
    }
  };

  const handlePrint = () => {
    if (settings.printerAddress) {
      alert('Printing via Bluetooth... (printer feature coming soon)');
    } else {
      alert('No printer configured. Go to Admin → Settings to set up a Bluetooth printer.');
    }
  };

  /* ── SUCCESS SCREEN ────────────────────────────────────── */
  if (paid) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Payment Complete" />
        <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
          <div className="flex flex-col items-center py-8">
            <div className="w-24 h-24 rounded-full bg-success/15 flex items-center justify-center mb-4 shadow-[0_0_40px_-8px_hsl(var(--success)/0.5)]">
              <CheckCircle2 size={52} className="text-success" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Payment Received!</h2>
            <p className="text-muted-foreground mt-1">
              Rs. {total} via{' '}
              <span className="font-bold text-success uppercase">{selectedMethod}</span>
            </p>
          </div>

          <BillPreview
            cafeName={settings.cafeName}
            cafeLogo={settings.cafeLogo}
            cafeAddress={settings.cafeAddress}
            cafePhone={settings.cafePhone}
            billFooter={settings.billFooter}
            tableNumber={snap.tableNumber}
            items={snap.items}
            subtotal={subtotal}
            discount={state.discount || 0}
            discountType={state.discountType || 'fixed'}
            total={total}
            method={selectedMethod || ''}
            billNumber={billNum}
            date={Date.now()}
          />

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              data-testid="button-print-receipt"
              className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border border-border bg-secondary text-foreground font-semibold text-sm transition-all active:scale-[0.97] hover:bg-secondary/70"
            >
              <Printer size={18} />
              Print
            </button>
            <button
              onClick={() => navigate('/', { replace: true })}
              data-testid="button-back-home"
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-success text-white font-black text-base transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.4)]"
            >
              <Home size={20} /> Back to Tables
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── PAYMENT SCREEN ────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <TopBar
        title={`Payment — Table ${snap.tableNumber}`}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        {/* Large amount display */}
        <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-card/70 p-6 text-center shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Amount Due</p>
          <p className="text-6xl font-black text-foreground mt-2 tracking-tight">Rs. {total}</p>
          {discountAmt > 0 && (
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold">
              Saved Rs. {discountAmt}
            </span>
          )}
          <p className="text-xs text-muted-foreground mt-3 font-mono">Table {snap.tableNumber}</p>
        </div>

        {/* Payment methods */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
            Payment Method
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {methods.map(({ id, label, icon: Icon, isQR }) => (
              <button
                key={id}
                onClick={() => handleSelectMethod(id, isQR)}
                data-testid={`button-payment-method-${id}`}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.97] ${
                  selectedMethod === id
                    ? 'border-success bg-success/10 shadow-[0_2px_12px_-4px_hsl(var(--success)/0.3)]'
                    : 'border-border bg-card hover:bg-secondary/40 hover:border-border/80'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  selectedMethod === id ? 'bg-success/15' : 'bg-secondary'
                }`}>
                  <Icon size={20} className={selectedMethod === id ? 'text-success' : 'text-muted-foreground'} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold text-sm ${selectedMethod === id ? 'text-success' : 'text-foreground'}`}>
                    {label}
                  </p>
                  {isQR && (
                    <p className="text-[10px] text-muted-foreground">Opens QR</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cash confirm button (only shows when cash selected) */}
        {selectedMethod === 'cash' && (
          <button
            onClick={handleConfirmPayment}
            data-testid="button-confirm-payment"
            className="w-full py-5 rounded-2xl bg-success text-white font-black text-xl transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_20px_-4px_hsl(var(--success)/0.5)]"
          >
            Confirm Payment Rs. {total}
          </button>
        )}

        {/* Placeholder prompt when no method selected */}
        {!selectedMethod && (
          <div className="w-full py-5 rounded-2xl border-2 border-dashed border-border text-center text-muted-foreground text-sm font-medium">
            Select a payment method above
          </div>
        )}
      </div>

      {/* ── QR PAYMENT MODAL ──────────────────────────────── */}
      {showQRModal && selectedMethod && selectedMethod !== 'cash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-card rounded-3xl border border-border w-full max-w-sm shadow-2xl flex flex-col items-center overflow-hidden">
            {/* Modal header */}
            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-border">
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

            <div className="w-full p-6 flex flex-col items-center gap-4">
              {/* Total */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount Due</p>
                <p className="text-5xl font-black text-foreground mt-1">Rs. {total}</p>
              </div>

              {/* QR code */}
              <div className="p-4 bg-white rounded-2xl shadow-inner">
                {getQRImage(selectedMethod) ? (
                  <img
                    src={getQRImage(selectedMethod)!}
                    alt={`${selectedMethod} QR`}
                    className="w-52 h-52 object-contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={getQRData(selectedMethod)}
                    size={208}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                )}
              </div>

              {/* Instructions */}
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Scan with {selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} app
                </p>
                <p className="text-xs text-muted-foreground font-mono">{reference}</p>
              </div>

              {/* Confirm button inside modal */}
              <button
                onClick={handleConfirmPayment}
                data-testid="button-confirm-payment"
                className="w-full py-4 rounded-2xl bg-success text-white font-black text-lg transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.5)]"
              >
                Confirm Payment Rs. {total}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentScreen;
