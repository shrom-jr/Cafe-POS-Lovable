import { Payment, OrderItem } from '@/types/pos';
import { format } from 'date-fns';

interface Props {
  cafeName: string;
  cafeLogo?: string;
  cafeAddress?: string;
  cafePhone?: string;
  billFooter?: string;
  tableNumber: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountType: 'percent' | 'fixed';
  total: number;
  method?: string;
  billNumber?: number;
  date?: number;
}

const BillPreview = ({ cafeName, cafeLogo, cafeAddress, cafePhone, billFooter, tableNumber, items, subtotal, discount, discountType, total, method, billNumber, date }: Props) => {
  const dateStr = format(date || Date.now(), 'yyyy-MM-dd HH:mm');
  const discountDisplay = discountType === 'percent' ? `${discount}%` : `Rs. ${discount}`;

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        {cafeLogo && <img src={cafeLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2 rounded-lg" />}
        <h2 className="text-xl font-bold text-accent">{cafeName}</h2>
        {cafeAddress && <p className="text-xs text-muted-foreground">{cafeAddress}</p>}
        {cafePhone && <p className="text-xs text-muted-foreground">{cafePhone}</p>}
        <div className="text-xs text-muted-foreground mt-1">
          {billNumber && <span>Bill #{billNumber} · </span>}
          Table {tableNumber}
        </div>
        <div className="text-xs text-muted-foreground">{dateStr}</div>
      </div>

      <div className="border-t border-dashed border-border my-3" />

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center text-xs text-muted-foreground font-medium">
          <span className="flex-1">Item</span>
          <span className="w-10 text-center">Qty</span>
          <span className="w-16 text-right">Price</span>
          <span className="w-20 text-right">Total</span>
        </div>
        {items.map((item) => (
          <div key={item.menuItemId} className="flex items-center text-sm">
            <span className="flex-1 text-foreground truncate">{item.name}</span>
            <span className="w-10 text-center text-muted-foreground">{item.quantity}</span>
            <span className="w-16 text-right text-muted-foreground">{item.price}</span>
            <span className="w-20 text-right font-medium text-foreground">Rs. {item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-border my-3" />

      {/* Totals */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">Rs. {subtotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount ({discountDisplay})</span>
            <span className="text-success">
              -Rs. {discountType === 'percent' ? Math.round(subtotal * discount / 100) : discount}
            </span>
          </div>
        )}
        <div className="border-t border-border my-2" />
        <div className="flex justify-between text-lg font-bold">
          <span className="text-foreground">Total</span>
          <span className="text-accent">Rs. {total}</span>
        </div>
      </div>

      {method && (
        <>
          <div className="border-t border-dashed border-border my-3" />
          <div className="text-center text-sm text-muted-foreground">
            Paid via <span className="font-medium text-foreground">{method}</span>
          </div>
        </>
      )}

      <div className="border-t border-dashed border-border my-3" />
      <p className="text-center text-xs text-muted-foreground">{billFooter || 'Thank you for visiting!'}</p>
    </div>
  );
};

export default BillPreview;
