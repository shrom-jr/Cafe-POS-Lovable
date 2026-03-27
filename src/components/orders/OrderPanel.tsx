import { useState } from 'react';
import { Order, OrderItem } from '@/types/pos';
import { fmt } from '@/utils/format';
import { Minus, Plus, Trash2, ShoppingBag, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OrderPanelProps {
  order: Order | null;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onRemove: (menuItemId: string) => void;
  onPay: () => void;
  onSendToKitchen: () => void;
  onClear?: () => void;
  pax?: number;
  onPaxChange?: (pax: number) => void;
}

const BLUE_BTN = { background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.24)' };

const OrderPanel = ({
  order,
  onUpdateQty,
  onRemove,
  onPay,
  onSendToKitchen,
  onClear,
  pax = 1,
  onPaxChange,
}: OrderPanelProps) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const items = order?.items || [];
  const unpaidItems = items.filter((i) => i.status !== 'paid');
  const total = unpaidItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const kitchenStatus = order?.kitchenStatus ?? 'draft';
  const hasUnsentItems = order?.hasUnsentItems ?? false;

  const statusLabel = kitchenStatus === 'draft' ? 'Draft' : hasUnsentItems ? 'Updated' : 'Sent';
  const statusColor =
    kitchenStatus === 'draft'
      ? { background: 'rgba(148,163,184,0.12)', color: 'rgba(148,163,184,0.7)', border: '1px solid rgba(148,163,184,0.2)' }
      : hasUnsentItems
      ? { background: 'rgba(251,191,36,0.12)', color: 'rgba(251,191,36,0.8)', border: '1px solid rgba(251,191,36,0.25)' }
      : { background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.8)', border: '1px solid rgba(52,211,153,0.25)' };

  const primaryLabel =
    kitchenStatus === 'draft'
      ? 'Send to Kitchen'
      : hasUnsentItems
      ? 'Send New Items'
      : 'Proceed to Payment →';

  const handlePrimary = () => {
    if (kitchenStatus === 'placed' && !hasUnsentItems) {
      onPay();
    } else {
      onSendToKitchen();
    }
  };

  const handleClearConfirmed = () => {
    onClear?.();
    setShowClearConfirm(false);
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, #141e30 0%, #0c1522 100%)',
      }}
    >
      {/* Top inner highlight — soft glow strip */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      />
      <div
        className="absolute inset-x-0 top-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)' }}
      />

      {/* Header */}
      <div
        className="relative px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <ShoppingBag size={16} style={{ color: 'rgba(59,130,246,0.65)' }} />
        <h3 className="font-bold text-sm flex-1 text-white/80">
          {order ? `Table ${order.tableNumber}` : 'Order'}
        </h3>
        {order && (
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={statusColor}
          >
            {statusLabel}
          </span>
        )}
        {itemCount > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(59,130,246,0.16)',
                color: 'rgba(147,197,253,0.88)',
                border: '1px solid rgba(59,130,246,0.28)',
              }}
            >
              {itemCount} items
            </span>
            {onClear && (
              <button
                onClick={() => setShowClearConfirm(true)}
                data-testid="button-clear-order"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white/35 transition-all active:scale-95 hover:text-red-400 hover:bg-red-500/10"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pax selector */}
      <div
        className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Users size={14} className="text-white/28 flex-shrink-0" />
        <span className="text-xs font-semibold text-white/32 flex-1">Guests (Pax)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPaxChange?.(Math.max(1, pax - 1))}
            disabled={pax <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/55 transition-all active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed hover:text-white hover:brightness-110"
            style={BLUE_BTN}
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center font-black text-sm tabular-nums text-white/82">{pax}</span>
          <button
            onClick={() => onPaxChange?.(pax + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/55 transition-all active:scale-90 hover:text-white hover:brightness-110"
            style={BLUE_BTN}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Item list — ONLY this section scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12" style={{ color: 'rgba(255,255,255,0.22)' }}>
            <ShoppingBag size={38} className="mb-3 opacity-25" />
            <p className="text-base font-bold text-center">No items yet</p>
            <p className="text-xs opacity-60 mt-1.5 text-center">Tap items on the left to add</p>
          </div>
        ) : (
          items.map((item) => (
            <OrderItemRow key={item.menuItemId} item={item} onUpdateQty={onUpdateQty} onRemove={onRemove} isPaid={item.status === 'paid'} />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 pt-3 pb-4 space-y-3 flex-shrink-0 relative"
        style={{
          background: 'linear-gradient(180deg, #0f1a2e 0%, #0c1522 100%)',
        }}
      >
        {/* Gradient fade — bleeds upward into scroll area, no layout impact */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: '-48px',
            height: '48px',
            background: 'linear-gradient(to bottom, transparent, #0c1522)',
          }}
        />
        <div className="flex items-center justify-between py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/30">Total</span>
          <span
            className="text-3xl font-black"
            style={{ color: items.length > 0 ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.25)' }}
          >
            Rs. {fmt(total)}
          </span>
        </div>

        {/* Primary action — kitchen lifecycle */}
        <button
          onClick={handlePrimary}
          disabled={items.length === 0}
          data-testid="button-proceed-to-bill"
          className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed"
          style={{
            background: items.length > 0
              ? 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)'
              : 'rgba(59,130,246,0.12)',
            color: items.length > 0 ? '#ffffff' : 'rgba(255,255,255,0.3)',
            boxShadow: items.length > 0
              ? '0 4px 20px -4px rgba(59,130,246,0.55), inset 0 1px 0 rgba(255,255,255,0.12)'
              : 'none',
          }}
        >
          {items.length > 0 ? primaryLabel : 'Add items to order'}
        </button>
      </div>

      {/* Clear confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all items from the order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface OrderItemRowProps {
  item: OrderItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  isPaid?: boolean;
}

const OrderItemRow = ({ item, onUpdateQty, onRemove, isPaid = false }: OrderItemRowProps) => (
  <div
    className="flex items-center gap-2 rounded-xl p-2.5 transition-all"
    data-testid={`order-item-${item.menuItemId}`}
    style={{
      background: isPaid ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
      border: isPaid ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.06)',
      opacity: isPaid ? 0.5 : 1,
    }}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className={`text-sm font-bold truncate ${isPaid ? 'line-through' : ''}`} style={{ color: isPaid ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.95)' }}>{item.name}</p>
        {isPaid && (
          <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.7)' }}>
            Paid
          </span>
        )}
      </div>
      <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.42)' }}>Rs. {fmt(item.price)} each</p>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={() => !isPaid && onUpdateQty(item.menuItemId, -1)}
        disabled={isPaid}
        data-testid={`button-decrease-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 transition-colors active:scale-90 hover:text-red-400 hover:bg-red-500/10 disabled:pointer-events-none disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <Minus size={13} />
      </button>
      <span className="w-7 text-center font-black text-sm text-white/85">{item.quantity}</span>
      <button
        onClick={() => !isPaid && onUpdateQty(item.menuItemId, 1)}
        disabled={isPaid}
        data-testid={`button-increase-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/45 transition-colors active:scale-90 hover:text-blue-300 hover:brightness-110 disabled:pointer-events-none disabled:opacity-30"
        style={BLUE_BTN}
      >
        <Plus size={13} />
      </button>
    </div>
    <p className="w-16 text-right text-sm font-bold" style={{ color: isPaid ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.88)' }}>
      Rs. {fmt(item.price * item.quantity)}
    </p>
    {!isPaid && (
      <button
        onClick={() => onRemove(item.menuItemId)}
        data-testid={`button-remove-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/22 transition-colors active:scale-90 hover:text-red-400 hover:bg-red-500/10"
      >
        <Trash2 size={13} />
      </button>
    )}
    {isPaid && <div className="w-7 h-7 flex-shrink-0" />}
  </div>
);

export default OrderPanel;
