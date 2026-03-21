import { useState } from 'react';
import { MenuItem } from '@/types/pos';
import { Plus } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  quantityInOrder?: number;
  onAdd: () => void;
  disabled?: boolean;
}

const MenuItemCard = ({ item, quantityInOrder = 0, onAdd, disabled = false }: MenuItemCardProps) => {
  const [flash, setFlash] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    onAdd();
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
  };

  return (
    <button
      onClick={handleClick}
      data-testid={`menu-item-${item.id}`}
      disabled={disabled}
      className={`
        relative flex flex-col rounded-xl overflow-hidden border w-full text-left
        transition-all duration-150
        ${disabled
          ? 'opacity-40 cursor-not-allowed border-border bg-card'
          : flash
            ? 'border-accent/70 scale-[0.97] shadow-[0_0_0_2px_hsl(var(--accent)/0.18)]'
            : 'border-border bg-card hover:border-accent/30 active:scale-[0.97] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] hover:shadow-[0_4px_18px_-4px_rgba(0,0,0,0.5)]'
        }
      `}
    >
      {/* ── Image section ── */}
      <div className="relative w-full aspect-square overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover transition-all duration-150 ${flash ? 'brightness-110 scale-[1.03]' : ''}`}
          />
        ) : (
          <div
            className={`
              w-full h-full flex items-center justify-center select-none
              text-accent text-4xl font-bold transition-all duration-150
              ${flash ? 'bg-accent/20' : 'bg-primary/80'}
            `}
          >
            {item.name.charAt(0)}
          </div>
        )}

        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-accent/10 pointer-events-none" />
        )}

        {/* Quantity badge — top right */}
        {quantityInOrder > 0 && (
          <span className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-accent text-accent-foreground text-[11px] font-bold flex items-center justify-center leading-none shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
            {quantityInOrder}
          </span>
        )}

        {/* Plus button — bottom right, frosted glass */}
        <div className={`
          absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center
          shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-150
          ${flash
            ? 'bg-accent text-accent-foreground scale-110'
            : 'bg-black/40 backdrop-blur-sm text-white/75 hover:bg-black/55'}
        `}>
          <Plus size={14} />
        </div>
      </div>

      {/* ── Text section ── */}
      <div className={`px-2.5 py-2 flex flex-col gap-[3px] transition-colors duration-150 ${flash ? 'bg-accent/5' : ''}`}>
        <span className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {item.name}
        </span>
        <span className="text-xs text-muted-foreground">
          Rs. {item.price}
        </span>
      </div>
    </button>
  );
};

export default MenuItemCard;
