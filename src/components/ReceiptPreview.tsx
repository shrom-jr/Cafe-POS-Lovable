import { OrderItem } from '@/types/pos';
import { format } from 'date-fns';

interface ReceiptPreviewProps {
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
  vatAmount?: number;
  vatRate?: number;
  vatEnabled?: boolean;
  total: number;
  method?: string;
  billNumber?: number;
  date?: number;
}

const ReceiptPreview = ({
  cafeName,
  cafeLogo,
  cafeAddress,
  cafePhone,
  billFooter,
  tableNumber,
  items,
  subtotal,
  discount,
  discountType,
  vatAmount = 0,
  vatRate = 0.13,
  vatEnabled = false,
  total,
  method,
  billNumber,
  date,
}: ReceiptPreviewProps) => {
  const dateStr = format(date || Date.now(), 'yyyy-MM-dd HH:mm');
  const discountAmount =
    discountType === 'percent' ? Math.round((subtotal * discount) / 100) : discount;
  const discountDisplay =
    discountType === 'percent' ? `${discount}%` : `Rs. ${discount}`;

  return (
    <div
      className="bg-card border border-border/60 rounded-2xl p-5 max-w-md mx-auto shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]"
      data-testid="receipt-preview"
    >
      <div className="text-center mb-4">
        {cafeLogo && (
          <img
            src={cafeLogo}
            alt="Logo"
            className="w-14 h-14 object-contain mx-auto mb-2 rounded-xl"
          />
        )}
        <h2 className="text-xl font-black text-accent tracking-tight">{cafeName}</h2>
        {cafeAddress && <p className="text-xs text-muted-foreground mt-0.5">{cafeAddress}</p>}
        {cafePhone && <p className="text-xs text-muted-foreground">{cafePhone}</p>}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          {billNumber && (
            <span className="px-2 py-0.5 rounded-full bg-secondary font-mono font-bold">
              #{billNumber}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-secondary">Table {tableNumber}</span>
          <span>{dateStr}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-border/60 my-3" />

      <div className="space-y-0.5">
        <div className="flex items-center text-xs text-muted-foreground font-semibold pb-2">
          <span className="flex-1">Item</span>
          <span className="w-10 text-center">Qty</span>
          <span className="w-16 text-right">Rate</span>
          <span className="w-20 text-right">Total</span>
        </div>
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="flex items-center text-sm py-1.5 border-b border-border/20 last:border-0"
          >
            <span className="flex-1 text-foreground font-medium truncate pr-2">{item.name}</span>
            <span className="w-10 text-center text-muted-foreground">{item.quantity}</span>
            <span className="w-16 text-right text-muted-foreground">{item.price}</span>
            <span className="w-20 text-right font-bold text-foreground">
              Rs. {item.price * item.quantity}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-border/60 my-3" />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">Rs. {subtotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount ({discountDisplay})</span>
            <span className="font-semibold text-success">-Rs. {discountAmount}</span>
          </div>
        )}
        {vatEnabled && vatAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT ({Math.round(vatRate * 100)}%)</span>
            <span className="font-medium text-foreground">Rs. {vatAmount}</span>
          </div>
        )}
        <div className="border-t border-border/50 pt-3 mt-1">
          <div className="flex justify-between items-baseline">
            <span className="text-base font-bold text-foreground">Total</span>
            <span className="text-3xl font-black text-accent">Rs. {total}</span>
          </div>
        </div>
      </div>

      {method && (
        <>
          <div className="border-t border-dashed border-border/60 my-3" />
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Paid via</span>
            <span className="px-3 py-1 rounded-full bg-success/15 text-success font-bold text-xs uppercase tracking-wide">
              {method}
            </span>
          </div>
        </>
      )}

      <div className="border-t border-dashed border-border/60 my-3" />
      <p className="text-center text-xs text-muted-foreground italic">
        {billFooter || 'Thank you for visiting! ☕'}
      </p>
    </div>
  );
};

export default ReceiptPreview;
