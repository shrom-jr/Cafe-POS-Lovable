import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { calcBill } from '@/utils/calcBill';
import { ChevronLeft } from 'lucide-react';

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

      {/* Header — floating glass */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: 'rgba(var(--card-rgb, 20 20 20) / 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <button
          onClick={() => navigate(`/order/${tableId}`)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground transition-all active:scale-90 hover:text-foreground"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <ChevronLeft size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-foreground text-[13px] leading-tight tracking-wide">Review Order</p>
          <p className="text-[11px] text-muted-foreground/70 leading-tight">Table {table.number}</p>
        </div>
      </div>

      {/* Item list — scrollable, max ~50% screen */}
      <div className="overflow-y-auto px-4 py-2" style={{ maxHeight: '50vh' }}>
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="flex items-center justify-between px-2 py-2 rounded-xl transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-[13px] font-semibold text-foreground truncate leading-snug">{item.name}</p>
              <p className="text-[11px] text-muted-foreground/60 leading-snug mt-0.5">
                Rs. {item.price} × {item.quantity}
              </p>
            </div>
            <p className="text-[13px] font-bold text-foreground/90 whitespace-nowrap tabular-nums">
              Rs. {item.price * item.quantity}
            </p>
          </div>
        ))}
      </div>

      {/* Flex spacer */}
      <div className="flex-1" />

      {/* Bottom panel — glass */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-5 space-y-3"
        style={{
          background: 'rgba(var(--card-rgb, 18 18 18) / 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -12px 40px -8px rgba(0,0,0,0.6)',
        }}
      >

        {/* Bill summary — glass card */}
        <div
          className="rounded-2xl px-4 py-3 space-y-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Breakdown rows */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-muted-foreground/70">Subtotal</span>
              <span className="text-[12px] font-medium text-foreground/75 tabular-nums">Rs. {bill.subtotal}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-muted-foreground/90 font-semibold">Discount</span>
              <span
                className="text-[12px] font-bold tabular-nums"
                style={{ color: bill.discountAmount > 0 ? 'hsl(var(--success))' : 'rgba(255,255,255,0.25)' }}
              >
                −Rs. {bill.discountAmount}
              </span>
            </div>
            {bill.vatEnabled && (
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-muted-foreground/70">
                  VAT ({Math.round(bill.vatRate * 100)}%)
                </span>
                <span className="text-[12px] font-medium text-foreground/70 tabular-nums">Rs. {bill.vatAmount}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

          {/* Total — hero */}
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60 leading-none mb-0.5">
              Total
            </span>
            <span
              className="text-[32px] font-black tracking-tight leading-none tabular-nums"
              style={{
                color: '#fff',
                textShadow: '0 0 24px hsl(var(--success) / 0.35)',
              }}
            >
              Rs. {bill.total}
            </span>
          </div>
        </div>

        {/* Discount section */}
        <div className="space-y-2">
          {/* Preset pill buttons */}
          <div className="flex gap-2">
            {PRESETS.map((pct) => {
              const isActive = activePreset === pct && discountMode === 'percent';
              return (
                <button
                  key={pct}
                  onClick={() => handlePreset(pct)}
                  className="flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                  style={
                    isActive
                      ? {
                          background: 'hsl(var(--success))',
                          color: '#fff',
                          boxShadow: '0 0 12px -2px hsl(var(--success) / 0.55)',
                          border: '1px solid hsl(var(--success))',
                        }
                      : {
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.5)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }
                  }
                >
                  {pct}%
                </button>
              );
            })}
          </div>

          {/* Mode toggle + input row */}
          <div className="flex gap-2 items-center">
            {/* Segmented control */}
            <div
              className="flex rounded-full overflow-hidden flex-shrink-0 text-[11px] font-black"
              style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}
            >
              <button
                onClick={() => handleModeToggle('percent')}
                className="px-3 py-1.5 transition-colors"
                style={
                  discountMode === 'percent'
                    ? { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }
                    : { color: 'rgba(255,255,255,0.4)' }
                }
              >
                %
              </button>
              <button
                onClick={() => handleModeToggle('fixed')}
                className="px-3 py-1.5 transition-colors"
                style={
                  discountMode === 'fixed'
                    ? { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }
                    : { color: 'rgba(255,255,255,0.4)', borderLeft: '1px solid rgba(255,255,255,0.1)' }
                }
              >
                Rs
              </button>
            </div>

            {/* Input */}
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder={discountMode === 'percent' ? 'Custom %' : 'Custom Rs.'}
              value={discountInput}
              onChange={(e) => handleInputChange(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-full text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--accent) / 0.6)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={items.length === 0}
          className="w-full py-4 rounded-xl text-white font-black text-[17px] tracking-wide transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--success)) 0%, hsl(142 60% 35%) 100%)',
            boxShadow: '0 4px 20px -4px hsl(var(--success) / 0.45), 0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          Pay Rs. {bill.total}
        </button>
      </div>
    </div>
  );
};

export default ReviewScreen;
