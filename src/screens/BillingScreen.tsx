import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import BillPreview from '@/components/billing/BillPreview';
import { Percent, DollarSign } from 'lucide-react';

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
    discountType === 'percent' ? Math.round(subtotal * discountValue / 100) : discountValue;
  const total = Math.max(0, subtotal - discountAmount);

  if (!table || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-foreground">No active order for this table.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold flex items-center gap-2 transition-all active:scale-95"
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

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={`Bill — Table ${table.number}`} showBack onBack={() => navigate(`/order/${tableId}`)} />
      <div className="max-w-lg mx-auto p-4 space-y-4">
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

        {/* Discount Controls */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-bold text-foreground">Discount</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setDiscountType('percent')}
              data-testid="button-discount-percent"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                discountType === 'percent'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <Percent size={16} /> Percentage
            </button>
            <button
              onClick={() => setDiscountType('fixed')}
              data-testid="button-discount-fixed"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                discountType === 'fixed'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <DollarSign size={16} /> Fixed
            </button>
          </div>
          <input
            type="number"
            min="0"
            max={discountType === 'percent' ? 100 : subtotal}
            value={discountValue || ''}
            onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
            placeholder={discountType === 'percent' ? 'Enter %' : 'Enter amount'}
            data-testid="input-discount-value"
            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((v) => (
              <button
                key={v}
                onClick={() => { setDiscountType('percent'); setDiscountValue(v); }}
                data-testid={`button-quick-discount-${v}`}
                className="flex-1 py-2 rounded-lg bg-primary text-foreground text-sm font-medium hover:bg-accent/20 transition-colors"
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handlePay}
          data-testid="button-pay"
          className="w-full py-4 rounded-xl bg-accent text-accent-foreground font-bold text-lg transition-all active:scale-[0.98] hover:brightness-110"
        >
          Pay Rs. {total}
        </button>
      </div>
    </div>
  );
};

export default BillingScreen;
