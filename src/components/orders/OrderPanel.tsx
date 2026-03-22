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
      style={{ background: 'linear-gradient(180deg, #091a10 0%, #060f0a 100%)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid hsl(142 50% 25% / 0.5)' }}
      >
        <ShoppingBag size={16} style={{ color: 'hsl(142 60% 50%)' }} />
        <h3 className="font-bold text-sm flex-1" style={{ color: 'hsl(142 30% 85%)' }}>
          {order ? `Table ${order.tableNumber}` : 'Order'}
        </h3>
        {itemCount > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'hsl(142 65% 36% / 0.25)',
                color: 'hsl(142 60% 60%)',
                border: '1px solid hsl(142 60% 36% / 0.4)',
              }}
            >
              {itemCount} items
            </span>
            {onClear && (
              <button
                onClick={() => setShowClearConfirm(true)}
                data-testid="button-clear-order"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
                style={{
                  color: 'hsl(215 15% 50%)',
                  border: '1px solid hsl(222 28% 22%)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'hsl(0 72% 65%)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(0 72% 51% / 0.5)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'hsl(0 72% 51% / 0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'hsl(215 15% 50%)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(222 28% 22%)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
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
        style={{ borderBottom: '1px solid hsl(142 50% 25% / 0.4)', background: 'hsl(142 40% 10% / 0.3)' }}
      >
        <Users size={14} style={{ color: 'hsl(142 40% 40%)' }} className="flex-shrink-0" />
        <span className="text-xs font-semibold flex-1" style={{ color: 'hsl(142 30% 50%)' }}>Guests (Pax)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPaxChange?.(Math.max(1, pax - 1))}
            disabled={pax <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'hsl(142 40% 15%)', color: 'hsl(142 50% 60%)' }}
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center font-black text-sm tabular-nums" style={{ color: 'hsl(142 20% 88%)' }}>
            {pax}
          </span>
          <button
            onClick={() => onPaxChange?.(pax + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90"
            style={{ background: 'hsl(142 40% 15%)', color: 'hsl(142 50% 60%)' }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ background: 'hsl(142 30% 8% / 0.4)' }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12" style={{ color: 'hsl(142 30% 35%)' }}>
            <ShoppingBag size={40} className="mb-3 opacity-25" />
            <p className="text-base font-bold text-center">No items yet</p>
            <p className="text-xs opacity-70 mt-1.5 text-center">Tap items on the left to start building the order</p>
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
        style={{ borderTop: '1px solid hsl(142 50% 25% / 0.4)', background: '#071410' }}
      >
        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'hsl(142 30% 45%)' }}>Total</span>
          <span className="text-3xl font-black" style={{ color: 'hsl(142 20% 92%)' }}>Rs. {total}</span>
        </div>

        {/* Primary Pay button — amber/yellow */}
        <button
          onClick={onPay}
          disabled={items.length === 0}
          data-testid="button-proceed-to-bill"
          className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: items.length > 0 ? 'hsl(var(--accent))' : 'hsl(48 96% 53% / 0.3)',
            color: 'hsl(var(--accent-foreground))',
            boxShadow: items.length > 0 ? '0 4px 18px -4px hsl(48 96% 53% / 0.5)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (items.length > 0) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
          }}
        >
          {items.length > 0 ? 'Review Order →' : 'Add items to order'}
        </button>
      </div>

      {/* Clear confirmation dialog */}
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
      background: 'hsl(142 35% 10%)',
      border: '1px solid hsl(142 40% 18% / 0.6)',
    }}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate" style={{ color: 'hsl(142 15% 85%)' }}>{item.name}</p>
      <p className="text-xs" style={{ color: 'hsl(142 25% 42%)' }}>Rs. {item.price} each</p>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={() => onUpdateQty(item.menuItemId, -1)}
        data-testid={`button-decrease-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90"
        style={{ background: 'hsl(142 30% 13%)', color: 'hsl(142 40% 55%)' }}
      >
        <Minus size={13} />
      </button>
      <span className="w-7 text-center font-black text-sm" style={{ color: 'hsl(142 15% 88%)' }}>
        {item.quantity}
      </span>
      <button
        onClick={() => onUpdateQty(item.menuItemId, 1)}
        data-testid={`button-increase-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90"
        style={{ background: 'hsl(142 50% 18%)', color: 'hsl(142 60% 55%)' }}
      >
        <Plus size={13} />
      </button>
    </div>
    <p className="w-16 text-right text-sm font-bold" style={{ color: 'hsl(142 40% 68%)' }}>
      Rs. {item.price * item.quantity}
    </p>
    <button
      onClick={() => onRemove(item.menuItemId)}
      data-testid={`button-remove-${item.menuItemId}`}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90"
      style={{ color: 'hsl(215 15% 45%)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'hsl(0 72% 65%)';
        (e.currentTarget as HTMLButtonElement).style.background = 'hsl(0 72% 51% / 0.12)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'hsl(215 15% 45%)';
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <Trash2 size={13} />
    </button>
  </div>
);

export default OrderPanel;
