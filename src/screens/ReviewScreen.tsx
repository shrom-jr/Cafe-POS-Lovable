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
          className="px-5 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)' }}
        >
          Back to Order
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d1525 0%, #060e1a 100%)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(13,21,37,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <button
          onClick={() => navigate(`/order/${tableId}`)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 hover:text-white"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          <ChevronLeft size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-[14px] leading-tight tracking-wide">Review Order</p>
          <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Table {table.number}
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-5">
        <div className="max-w-[900px] mx-auto px-4 space-y-3">

          {/* ── Card 1: Order Items ── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px -6px rgba(0,0,0,0.4)',
            }}
          >
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-[0.16em]"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Order Items
              </p>
            </div>
            <div>
              {items.map((item, idx) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center gap-3 px-4 py-3"
                  style={
                    idx < items.length - 1
                      ? { borderBottom: '1px solid rgba(255,255,255,0.05)' }
                      : {}
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold truncate leading-snug"
                      style={{ color: 'rgba(255,255,255,0.95)' }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="text-xs leading-snug mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.38)' }}
                    >
                      Rs. {item.price} × {item.quantity}
                    </p>
                  </div>
                  <p
                    className="text-sm font-bold whitespace-nowrap tabular-nums"
                    style={{ color: 'rgba(255,255,255,0.90)' }}
                  >
                    Rs. {item.price * item.quantity}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Card 2: Billing Summary ── */}
          <div
            className="rounded-2xl px-4 py-4 space-y-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px -6px rgba(0,0,0,0.4)',
            }}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Subtotal</span>
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  Rs. {bill.subtotal}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Discount</span>
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{
                    color: bill.discountAmount > 0 ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.28)',
                  }}
                >
                  −Rs. {bill.discountAmount}
                </span>
              </div>
              {bill.vatEnabled && (
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    VAT ({Math.round(bill.vatRate * 100)}%)
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    Rs. {bill.vatAmount}
                  </span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

            <div className="flex items-end justify-between pt-1">
              <span
                className="text-[10px] font-black uppercase tracking-[0.18em] leading-none mb-1"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Total
              </span>
              <span
                className="text-[36px] font-black tracking-tight leading-none tabular-nums"
                style={{ color: '#ffffff' }}
              >
                Rs. {bill.total}
              </span>
            </div>
          </div>

          {/* ── Card 3: Discount ── */}
          <div
            className="rounded-2xl px-4 py-3 space-y-2"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-[0.14em]"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Discount
            </p>

            {/* Preset pills */}
            <div className="flex gap-2">
              {PRESETS.map((pct) => {
                const isActive = activePreset === pct && discountMode === 'percent';
                return (
                  <button
                    key={pct}
                    onClick={() => handlePreset(pct)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                    style={
                      isActive
                        ? {
                            background: 'rgba(59,130,246,0.22)',
                            color: 'rgba(147,197,253,0.95)',
                            border: '1px solid rgba(59,130,246,0.38)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.42)',
                            border: '1px solid rgba(255,255,255,0.09)',
                          }
                    }
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            {/* Mode toggle + custom input */}
            <div className="flex gap-2 items-center">
              <div
                className="flex rounded-lg overflow-hidden flex-shrink-0 text-[11px] font-bold"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
              >
                <button
                  onClick={() => handleModeToggle('percent')}
                  className="px-3 py-1.5 transition-colors"
                  style={
                    discountMode === 'percent'
                      ? { background: 'rgba(59,130,246,0.28)', color: 'rgba(147,197,253,0.95)' }
                      : { color: 'rgba(255,255,255,0.38)' }
                  }
                >
                  %
                </button>
                <button
                  onClick={() => handleModeToggle('fixed')}
                  className="px-3 py-1.5 transition-colors"
                  style={
                    discountMode === 'fixed'
                      ? { background: 'rgba(59,130,246,0.28)', color: 'rgba(147,197,253,0.95)' }
                      : { color: 'rgba(255,255,255,0.38)', borderLeft: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  Rs
                </button>
              </div>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={discountMode === 'percent' ? 'Custom %' : 'Custom Rs.'}
                value={discountInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
              />
            </div>
          </div>

          {/* ── Primary Action ── */}
          <button
            onClick={handlePay}
            disabled={items.length === 0}
            className="w-full py-4 rounded-xl text-white font-black text-[17px] tracking-wide transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)',
              boxShadow: '0 4px 20px -4px rgba(59,130,246,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            Proceed to Payment →
          </button>

        </div>
      </div>
    </div>
  );
};

export default ReviewScreen;
