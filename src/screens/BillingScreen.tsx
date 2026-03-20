import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import BillPreview from '@/components/billing/BillPreview';
import { Percent, DollarSign, Printer, CreditCard } from 'lucide-react';

const BillingScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  const { tables } = useTables();
  const { getActiveOrder } = useOrders();
  const settings = usePOSStore((s) => s.settings);

  const table = tables.find((t) => t.id === tableId);
  const order = tableId ? getActiveOrder(tableId) : undefined;

  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);

  const subtotal = useMemo(
    () => (order?.items || []).reduce((s, i) => s + i.price * i.quantity, 0),
    [order]
  );

  const discountAmount =
    discountType === 'percent' ? Math.round((subtotal * discountValue) / 100) : discountValue;
  const total = Math.max(0, subtotal - discountAmount);

  if (!table || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-foreground">No active order for this table.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-success text-white font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          Go to Tables
        </button>
      </div>
    );
  }

  const handlePay = () => {
    navigate(`/payment/${tableId}`, {
      state: { discount: discountValue, discountType, total, subtotal, discountAmount },
    });
  };

  const handlePrint = () => {
    if (settings.printerAddress) {
      alert('Printing via Bluetooth... (printer feature coming soon)');
    } else {
      alert('No printer configured. Go to Admin → Settings to set up a Bluetooth printer.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={`View Bill — Table ${table.number}`} showBack onBack={() => navigate(-1)} />
      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        <BillPreview
          cafeName={settings.cafeName}
          cafeLogo={settings.cafeLogo}
          cafeAddress={settings.cafeAddress}
          cafePhone={settings.cafePhone}
          billFooter={settings.billFooter}
          tableNumber={table.number}
          items={order.items}
          subtotal={subtotal}
          discount={discountValue}
          discountType={discountType}
          total={total}
        />

        {/* Discount section */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]">
          <h3 className="font-bold text-foreground text-sm">Apply Discount</h3>
          <div className="flex gap-2">
            <button
              onClick={() => { setDiscountType('percent'); setDiscountValue(0); }}
              data-testid="button-discount-percent"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                discountType === 'percent'
                  ? 'bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)]'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
              }`}
            >
              <Percent size={15} /> Percentage
            </button>
            <button
              onClick={() => { setDiscountType('fixed'); setDiscountValue(0); }}
              data-testid="button-discount-fixed"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                discountType === 'fixed'
                  ? 'bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)]'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
              }`}
            >
              <DollarSign size={15} /> Fixed
            </button>
          </div>
          <input
            type="number"
            min="0"
            max={discountType === 'percent' ? 100 : subtotal}
            value={discountValue || ''}
            onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
            placeholder={discountType === 'percent' ? 'Enter % discount' : 'Enter amount off'}
            data-testid="input-discount-value"
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          {discountType === 'percent' && (
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((v) => (
                <button
                  key={v}
                  onClick={() => setDiscountValue(v)}
                  data-testid={`button-quick-discount-${v}`}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    discountValue === v
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-primary/70 text-foreground hover:bg-accent/10'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            data-testid="button-print-bill"
            className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border border-border bg-secondary text-foreground font-semibold text-sm transition-all active:scale-[0.97] hover:bg-secondary/70"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={handlePay}
            data-testid="button-pay"
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-success text-white font-black text-lg transition-all active:scale-[0.97] hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.5)]"
          >
            <CreditCard size={20} />
            Pay Rs. {total}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingScreen;
