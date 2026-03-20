import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import QRDisplay from '@/components/payment/QRDisplay';
import BillPreview from '@/components/billing/BillPreview';
import { Banknote, Smartphone, CheckCircle2, RotateCcw, Home, Printer } from 'lucide-react';
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
      orderSnapshot.current = { id: order.id, items: [...order.items], tableNumber: order.tableNumber };
    }
  }, [order]);

  const snap = orderSnapshot.current || (order ? { id: order.id, items: order.items, tableNumber: order.tableNumber } : null);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [billNum, setBillNum] = useState<number>(0);

  if (!table || !snap) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-foreground">No active order for this table.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <Home size={18} /> Go to Tables
        </button>
      </div>
    );
  }

  const total = state.total || snap.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = state.subtotal || total;
  const discountAmt = state.discountAmount || 0;
  const reference = `${settings.cafeName.replace(/\s/g, '')}-T${snap.tableNumber}-B${settings.billCounter + 1}`;

  const methods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    ...(settings.wallets.esewa.enabled ? [{ id: 'esewa', label: 'eSewa', icon: Smartphone }] : []),
    ...(settings.wallets.khalti.enabled ? [{ id: 'khalti', label: 'Khalti', icon: Smartphone }] : []),
    ...(settings.wallets.fonepay.enabled ? [{ id: 'fonepay', label: 'Fonepay', icon: Smartphone }] : []),
  ];

  const generateEsewaQR = () =>
    `eSewa://pay?eSewaID=${settings.esewaPhone || settings.esewaId}&amount=${total}&table=${snap.tableNumber}&ref=${reference}`;

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

  const handleReset = () => {
    if (tableId) resetTable(tableId);
    navigate('/', { replace: true });
  };

  const handlePrint = () => {
    if (settings.printerAddress) {
      alert('Printing via Bluetooth... (printer feature coming soon)');
    } else {
      alert('No printer configured. Go to Admin → Settings to set up a Bluetooth printer.');
    }
  };

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
              onClick={handleReset}
              data-testid="button-reset-table"
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-success text-white font-black text-base transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.4)]"
            >
              <RotateCcw size={20} /> Reset Table
            </button>
          </div>

          <button
            onClick={() => navigate('/', { replace: true })}
            data-testid="button-back-home"
            className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:bg-secondary/70"
          >
            <Home size={18} /> Back to Tables
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        title={`Payment — Table ${snap.tableNumber}`}
        showBack
        onBack={() => navigate(`/billing/${tableId}`, { replace: true })}
      />
      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        <div className="bg-gradient-to-b from-card to-card/80 rounded-2xl border border-border p-6 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
          <p className="text-muted-foreground text-sm font-medium">Amount Due</p>
          <p className="text-5xl font-black text-accent mt-2 tracking-tight">Rs. {total}</p>
          {discountAmt > 0 && (
            <p className="text-xs text-success mt-1 font-medium">
              Saved Rs. {discountAmt}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-foreground text-sm">Select Payment Method</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {methods.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedMethod(id)}
                data-testid={`button-payment-method-${id}`}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.97] ${
                  selectedMethod === id
                    ? 'border-accent bg-accent/10 shadow-[0_2px_12px_-4px_hsl(var(--accent)/0.3)]'
                    : 'border-border bg-card hover:border-accent/30 hover:bg-card/80'
                }`}
              >
                <Icon
                  size={22}
                  className={selectedMethod === id ? 'text-accent' : 'text-muted-foreground'}
                />
                <span
                  className={`font-semibold text-sm ${
                    selectedMethod === id ? 'text-accent' : 'text-foreground'
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedMethod && selectedMethod !== 'cash' && (() => {
          const walletKey = selectedMethod as 'esewa' | 'khalti' | 'fonepay';
          const wallet = settings.wallets[walletKey];
          const label = selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1);

          if (wallet?.qrImage) {
            return (
              <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-2xl border border-border shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]">
                <h3 className="text-lg font-bold text-foreground">{label} Payment</h3>
                <img
                  src={wallet.qrImage}
                  alt={`${label} QR`}
                  className="w-56 h-56 object-contain rounded-xl border-2 border-border bg-white p-2"
                />
                <p className="text-3xl font-black text-accent">Rs. {total}</p>
                <p className="text-xs text-muted-foreground font-mono">{reference}</p>
                <p className="text-sm text-muted-foreground text-center">
                  Scan with {label} app to pay
                </p>
              </div>
            );
          }

          const data =
            selectedMethod === 'esewa'
              ? generateEsewaQR()
              : `pay://${selectedMethod}?amount=${total}&ref=${reference}`;
          return (
            <QRDisplay data={data} label={`${label} Payment`} amount={total} reference={reference} />
          );
        })()}

        <button
          onClick={handleConfirmPayment}
          disabled={!selectedMethod}
          data-testid="button-confirm-payment"
          className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-black text-lg transition-all active:scale-[0.97] disabled:opacity-35 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.5)]"
        >
          {selectedMethod ? `Confirm ${selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} Payment` : 'Select a Payment Method'}
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
