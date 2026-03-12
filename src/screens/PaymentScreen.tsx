import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePOS } from '@/context/POSContext';
import { TopBar } from '@/components/pos/Navigation';
import QRDisplay from '@/components/pos/QRDisplay';
import BillPreview from '@/components/pos/BillPreview';
import { Banknote, Smartphone, CheckCircle2, RotateCcw } from 'lucide-react';
import { printer, formatReceipt } from '@/utils/printer';
import { format } from 'date-fns';

const PaymentScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { tables, orders, settings, getActiveOrder, updateOrderStatus, addPayment, resetTable, getNextBillNumber } = usePOS();

  const rawState = location.state as { discount?: number; discountType?: 'percent' | 'fixed'; total?: number; subtotal?: number; discountAmount?: number } | null;
  const state = rawState || {};
  const table = tables.find(t => t.id === tableId);
  const order = tableId ? getActiveOrder(tableId) : undefined;

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [billNum, setBillNum] = useState<number>(0);

  if (!table || !order) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">No active order.</div>;
  }

  const total = state.total || order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = state.subtotal || total;
  const discountAmt = state.discountAmount || 0;
  const reference = `${settings.cafeName.replace(/\s/g, '')}-T${table.number}-B${settings.billCounter + 1}`;

  const methods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    ...(settings.wallets.esewa.enabled ? [{ id: 'esewa', label: 'eSewa', icon: Smartphone }] : []),
    ...(settings.wallets.khalti.enabled ? [{ id: 'khalti', label: 'Khalti', icon: Smartphone }] : []),
    ...(settings.wallets.fonepay.enabled ? [{ id: 'fonepay', label: 'Fonepay', icon: Smartphone }] : []),
  ];

  const generateEsewaQR = () => {
    return `eSewa://pay?eSewaID=${settings.esewaPhone || settings.esewaId}&amount=${total}&table=${table.number}&ref=${reference}`;
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;
    const bn = getNextBillNumber();
    setBillNum(bn);

    addPayment({
      orderId: order.id,
      tableNumber: table.number,
      items: [...order.items],
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

    updateOrderStatus(order.id, 'paid');
    setPaid(true);

    // Try printing
    if (printer.isConnected) {
      await printer.print(formatReceipt({
        cafeName: settings.cafeName,
        tableNumber: table.number,
        items: order.items,
        subtotal,
        discount: discountAmt,
        total,
        method: selectedMethod,
        date: format(Date.now(), 'yyyy-MM-dd HH:mm'),
        billNumber: bn,
      }));
    }
  };

  const handleReset = () => {
    if (tableId) resetTable(tableId);
    navigate('/');
  };

  if (paid) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Payment Complete" />
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex flex-col items-center py-8">
            <CheckCircle2 size={64} className="text-success mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Payment Received!</h2>
            <p className="text-muted-foreground mt-1">Rs. {total} via {selectedMethod}</p>
          </div>

          <BillPreview
            cafeName={settings.cafeName}
            tableNumber={table.number}
            items={order.items}
            subtotal={subtotal}
            discount={state.discount || 0}
            discountType={state.discountType || 'fixed'}
            total={total}
            method={selectedMethod || ''}
            billNumber={billNum}
            date={Date.now()}
          />

          <button
            onClick={handleReset}
            className="w-full py-4 rounded-xl bg-success text-accent-foreground font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RotateCcw size={20} /> Reset Table
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={`Payment — Table ${table.number}`} showBack onBack={() => navigate(`/billing/${tableId}`)} />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-muted-foreground text-sm">Amount Due</p>
          <p className="text-3xl font-bold text-accent mt-1">Rs. {total}</p>
        </div>

        {/* Payment Methods */}
        <div className="space-y-2">
          <h3 className="font-bold text-foreground">Select Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            {methods.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedMethod(id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === id
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-card hover:border-accent/30'
                }`}
              >
                <Icon size={24} className={selectedMethod === id ? 'text-accent' : 'text-muted-foreground'} />
                <span className={`font-medium ${selectedMethod === id ? 'text-accent' : 'text-foreground'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* QR Code for digital payments */}
        {selectedMethod === 'esewa' && (
          <QRDisplay
            data={generateEsewaQR()}
            label="eSewa Payment"
            amount={total}
            reference={reference}
          />
        )}

        {selectedMethod && selectedMethod !== 'esewa' && selectedMethod !== 'cash' && (
          <QRDisplay
            data={`pay://${selectedMethod}?amount=${total}&ref=${reference}`}
            label={`${selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} Payment`}
            amount={total}
            reference={reference}
          />
        )}

        <button
          onClick={handleConfirmPayment}
          disabled={!selectedMethod}
          className="w-full py-4 rounded-xl bg-accent text-accent-foreground font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
        >
          Confirm Payment
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
