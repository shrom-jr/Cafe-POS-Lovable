import { useState } from 'react';
import { MenuItem } from '@/types/pos';
import { Plus } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  quantityInOrder?: number;
  onAdd: () => void;
}

const MenuItemCard = ({ item, quantityInOrder = 0, onAdd }: MenuItemCardProps) => {
  const [flash, setFlash] = useState(false);

  const handleClick = () => {
    onAdd();
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
  };

  return (
    <button
      onClick={handleClick}
      data-testid={`menu-item-${item.id}`}
      className={`
        relative flex flex-col items-center justify-center p-3 rounded-xl
        border transition-all duration-150 active:scale-[0.93] hover:scale-[1.02]
        shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)]
        min-h-[96px] w-full
        ${flash
          ? 'border-accent/80 bg-accent/15 scale-[0.95]'
          : 'border-border bg-card hover:border-accent/40 hover:bg-card/80'
        }
      `}
    >
      {quantityInOrder > 0 && (
        <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 rounded-full bg-accent text-accent-foreground text-[11px] font-bold flex items-center justify-center leading-none">
          {quantityInOrder}
        </span>
      )}

      {item.image ? (
        <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover mb-2" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mb-2 text-accent text-lg font-bold select-none">
          {item.name.charAt(0)}
        </div>
      )}

      <span className="text-sm font-semibold text-foreground text-center leading-tight line-clamp-2">
        {item.name}
      </span>
      <span className="text-xs font-bold text-accent mt-1">Rs. {item.price}</span>

      <div className={`
        absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center
        transition-all duration-150
        ${flash ? 'bg-accent text-accent-foreground scale-110' : 'bg-accent/10 text-accent/50'}
      `}>
        <Plus size={12} />
      </div>
    </button>
  );
};

export default MenuItemCard;
