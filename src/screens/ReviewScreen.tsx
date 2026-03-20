import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { calcBill } from '@/utils/calcBill';
import { CreditCard, ChevronLeft, Tag } from 'lucide-react';

const PRESETS = [0, 5, 10, 15];

const ReviewScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  const { tables } = useTables();
  const { getActiveOrder } = useOrders();
  const settings = usePOSStore((s) => s.settings);

  const table = tables.find((t) => t.id === tableId);
  const order = tableId ? getActiveOrder(tableId) : undefined;

  // Snapshot items so they don't disappear if order updates
  const itemsRef = useRef(order?.items || []);
  useEffect(() => {
    if (order?.items.length) itemsRef.current = [...order.items];
  }, [order]);
  const items = itemsRef.current;

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

  const handlePay = () => {
    navigate(`/payment/${tableId}`, {
      state: {
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        discountValue,
        discountType: discountMode,
        vatAmount: bill.vatAmount,
        vatRate: bill.vatRate,
        vatMode: bill.vatMode,
        vatEnabled: bill.vatEnabled,
        total: bill.total,
      },
    });
  };

  if (!table || !tableId || items.length === 0) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-sm text-center">No active order found.</p>
        <button
          onClick={() => navigate(tableId ? `/order/${tableId}` : '/')}
          className="px-5 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm transition-all active:scale-95"
        >
          Back to Order
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* Minimal top bar */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card flex-shrink-0">
        <button
          onClick={() => navigate(`/order/${tableId}`)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-foreground text-sm">Review Order</p>
          <p className="text-xs text-muted-foreground">Table {table.number}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-black text-foreground text-base">Rs. {bill.total}</p>
        </div>
      </div>

      {/* Scrollable item list - flex shrink */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-1">
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">Rs. {item.price} × {item.quantity}</p>
            </div>
            <p className="text-sm font-bold text-foreground whitespace-nowrap">
              Rs. {item.price * item.quantity}
            </p>
          </div>
        ))}
      </div>

      {/* Fixed bottom panel */}
      <div className="flex-shrink-0 border-t border-border bg-card px-3 pt-3 pb-4 space-y-3">

        {/* Totals */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">Rs. {bill.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className={`font-semibold ${bill.discountAmount > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              -{bill.discountAmount > 0 ? `Rs. ${bill.discountAmount}` : 'Rs. 0'}
            </span>
          </div>
          {bill.vatEnabled && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT ({Math.round(bill.vatRate * 100)}%)</span>
              <span className="font-medium text-foreground">Rs. {bill.vatAmount}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-border/40">
            <span className="font-black text-foreground">Total</span>
            <span className="font-black text-2xl text-foreground">Rs. {bill.total}</span>
          </div>
        </div>

        {/* Discount controls */}
        <div className="space-y-2">
          {/* Preset buttons */}
          <div className="flex gap-1.5 items-center">
            <Tag size={13} className="text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1.5 flex-1">
              {PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePreset(pct)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    activePreset === pct && discountMode === 'percent'
                      ? 'bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)]'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Manual input */}
          <div className="flex gap-1.5 items-center">
            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border flex-shrink-0">
              <button
                onClick={() => handleModeToggle('percent')}
                className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  discountMode === 'percent'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                %
              </button>
              <button
                onClick={() => handleModeToggle('fixed')}
                className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  discountMode === 'fixed'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Rs
              </button>
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={discountMode === 'percent' ? 'Custom %' : 'Amount in Rs.'}
                value={discountInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={items.length === 0}
          className="w-full py-4 rounded-xl bg-success text-white font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.45)]"
        >
          <CreditCard size={20} />
          💳 Pay Rs. {bill.total}
        </button>
      </div>
    </div>
  );
};

export default ReviewScreen;
