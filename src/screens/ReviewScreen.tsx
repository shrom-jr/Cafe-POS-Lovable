import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { calcBill } from '@/utils/calcBill';
import { ChevronLeft, Tag } from 'lucide-react';

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

      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border bg-card flex-shrink-0">
        <button
          onClick={() => navigate(`/order/${tableId}`)}
          className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-90"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-foreground text-sm leading-tight">Review Order</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Table {table.number}</p>
        </div>
      </div>

      {/* Item list — capped, scrollable */}
      <div className="overflow-y-auto px-3 pt-2 pb-1" style={{ maxHeight: '52vh' }}>
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0"
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-[13px] font-semibold text-foreground truncate leading-snug">{item.name}</p>
              <p className="text-[11px] text-muted-foreground/70 leading-snug">
                Rs. {item.price} × {item.quantity}
              </p>
            </div>
            <p className="text-[13px] font-bold text-foreground whitespace-nowrap">
              Rs. {item.price * item.quantity}
            </p>
          </div>
        ))}
      </div>

      {/* Flex spacer */}
      <div className="flex-1" />

      {/* Bottom action panel */}
      <div className="flex-shrink-0 bg-card border-t border-border/60 shadow-[0_-8px_28px_-4px_rgba(0,0,0,0.4)] px-4 pt-3 pb-4 space-y-2">

        {/* Summary rows: Subtotal / Discount / VAT */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-muted-foreground/80">Subtotal</span>
            <span className="text-[12px] font-medium text-foreground/80">Rs. {bill.subtotal}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-muted-foreground font-medium">Discount</span>
            <span className={`text-[12px] font-bold ${bill.discountAmount > 0 ? 'text-success' : 'text-muted-foreground/50'}`}>
              −Rs. {bill.discountAmount}
            </span>
          </div>
          {bill.vatEnabled && (
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-muted-foreground/80">
                VAT ({Math.round(bill.vatRate * 100)}%)
              </span>
              <span className="text-[12px] font-medium text-foreground/70">Rs. {bill.vatAmount}</span>
            </div>
          )}
        </div>

        {/* Total — hero block */}
        <div className="flex justify-between items-end pt-2 border-t border-border/50">
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground leading-none pb-1">
            Total
          </span>
          <span className="text-3xl font-black text-foreground tracking-tight leading-none">
            Rs. {bill.total}
          </span>
        </div>

        {/* Discount controls */}
        <div className="space-y-1.5 pt-0.5">
          {/* Preset % buttons */}
          <div className="flex gap-1.5 items-center">
            <Tag size={11} className="text-muted-foreground/60 flex-shrink-0" />
            <div className="flex gap-1.5 flex-1">
              {PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePreset(pct)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                    activePreset === pct && discountMode === 'percent'
                      ? 'bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.35)]'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Manual discount input with mode toggle */}
          <div className="flex gap-1.5 items-center">
            {/* Mode toggle — clearly labelled */}
            <div className="flex rounded-lg overflow-hidden border border-border flex-shrink-0 text-[11px] font-black">
              <button
                onClick={() => handleModeToggle('percent')}
                className={`px-3 py-1.5 transition-colors ${
                  discountMode === 'percent'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                %
              </button>
              <button
                onClick={() => handleModeToggle('fixed')}
                className={`px-3 py-1.5 transition-colors border-l border-border ${
                  discountMode === 'fixed'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Rs
              </button>
            </div>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder={discountMode === 'percent' ? 'Enter % discount' : 'Enter Rs. amount'}
              value={discountInput}
              onChange={(e) => handleInputChange(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Pay button — gradient, no icon */}
        <button
          onClick={handlePay}
          disabled={items.length === 0}
          className="w-full py-3.5 rounded-xl text-white font-black text-[17px] tracking-wide transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--success)) 0%, hsl(var(--success) / 0.8) 100%)',
            boxShadow: '0 4px 18px -4px hsl(var(--success) / 0.5), 0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          Pay Rs. {bill.total}
        </button>
      </div>
    </div>
  );
};

export default ReviewScreen;
