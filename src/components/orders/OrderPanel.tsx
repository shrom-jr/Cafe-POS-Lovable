import { useState } from 'react';
import { Order, OrderItem } from '@/types/pos';
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
  onClear?: () => void;
  pax?: number;
  onPaxChange?: (pax: number) => void;
}

const BLUE_BTN = { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.22)' };

const OrderPanel = ({
  order,
  onUpdateQty,
  onRemove,
  onPay,
  onClear,
  pax = 1,
  onPaxChange,
}: OrderPanelProps) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const items = order?.items || [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleClearConfirmed = () => {
    onClear?.();
    setShowClearConfirm(false);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d1525 0%, #080f1c 100%)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(59,130,246,0.12)' }}
      >
        <ShoppingBag size={16} style={{ color: 'rgba(59,130,246,0.7)' }} />
        <h3 className="font-bold text-sm flex-1 text-white/75">
          {order ? `Table ${order.tableNumber}` : 'Order'}
        </h3>
        {itemCount > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(59,130,246,0.14)',
                color: 'rgba(147,197,253,0.85)',
                border: '1px solid rgba(59,130,246,0.25)',
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
        className="px-4 py-2.5 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(15,23,42,0.35)' }}
      >
        <Users size={14} className="text-white/30 flex-shrink-0" />
        <span className="text-xs font-semibold text-white/35 flex-1">Guests (Pax)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPaxChange?.(Math.max(1, pax - 1))}
            disabled={pax <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/55 transition-colors active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed hover:text-white"
            style={BLUE_BTN}
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center font-black text-sm tabular-nums text-white/80">{pax}</span>
          <button
            onClick={() => onPaxChange?.(pax + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/55 transition-colors active:scale-90 hover:text-white"
            style={BLUE_BTN}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-white/25">
            <ShoppingBag size={40} className="mb-3 opacity-20" />
            <p className="text-base font-bold text-center">No items yet</p>
            <p className="text-xs opacity-60 mt-1.5 text-center">Tap items on the left to start building the order</p>
          </div>
        ) : (
          items.map((item) => (
            <OrderItemRow key={item.menuItemId} item={item} onUpdateQty={onUpdateQty} onRemove={onRemove} />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="p-4 space-y-3"
        style={{ borderTop: '1px solid rgba(59,130,246,0.10)', background: 'rgba(8,15,28,0.75)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/35">Total</span>
          <span className="text-3xl font-black" style={{ color: 'rgba(52,211,153,0.88)' }}>
            Rs. {total}
          </span>
        </div>

        {/* Primary action — blue */}
        <button
          onClick={onPay}
          disabled={items.length === 0}
          data-testid="button-proceed-to-bill"
          className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-25 disabled:cursor-not-allowed hover:brightness-110"
          style={{
            background: items.length > 0
              ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)'
              : 'rgba(59,130,246,0.15)',
            color: '#ffffff',
            boxShadow: items.length > 0 ? '0 4px 18px -4px rgba(59,130,246,0.45)' : 'none',
          }}
        >
          {items.length > 0 ? 'Review Order →' : 'Add items to order'}
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
}

const OrderItemRow = ({ item, onUpdateQty, onRemove }: OrderItemRowProps) => (
  <div
    className="flex items-center gap-2 rounded-xl p-2.5 transition-colors"
    data-testid={`order-item-${item.menuItemId}`}
    style={{
      background: 'rgba(15,23,42,0.65)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white/78 truncate">{item.name}</p>
      <p className="text-xs text-white/30">Rs. {item.price} each</p>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={() => onUpdateQty(item.menuItemId, -1)}
        data-testid={`button-decrease-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/45 transition-colors active:scale-90 hover:text-red-400 hover:bg-red-500/10"
        style={{ background: 'rgba(15,23,42,0.8)' }}
      >
        <Minus size={13} />
      </button>
      <span className="w-7 text-center font-black text-sm text-white/82">{item.quantity}</span>
      <button
        onClick={() => onUpdateQty(item.menuItemId, 1)}
        data-testid={`button-increase-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/45 transition-colors active:scale-90 hover:text-blue-300"
        style={BLUE_BTN}
      >
        <Plus size={13} />
      </button>
    </div>
    <p className="w-16 text-right text-sm font-bold text-white/55">
      Rs. {item.price * item.quantity}
    </p>
    <button
      onClick={() => onRemove(item.menuItemId)}
      data-testid={`button-remove-${item.menuItemId}`}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 transition-colors active:scale-90 hover:text-red-400 hover:bg-red-500/10"
    >
      <Trash2 size={13} />
    </button>
  </div>
);

export default OrderPanel;
