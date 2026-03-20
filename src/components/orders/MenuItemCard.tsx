import { MenuItem } from '@/types/pos';

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: () => void;
}

const MenuItemCard = ({ item, onAdd }: MenuItemCardProps) => (
  <button
    onClick={onAdd}
    data-testid={`menu-item-${item.id}`}
    className="flex flex-col items-center justify-center p-3 rounded-xl bg-card border border-border hover:border-accent/50 hover:pos-glow transition-all active:scale-95 min-h-[90px]"
  >
    {item.image ? (
      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover mb-2" />
    ) : (
      <div className="w-10 h-10 rounded-lg bg-primary/50 flex items-center justify-center mb-2 text-accent text-lg font-bold">
        {item.name.charAt(0)}
      </div>
    )}
    <span className="text-sm font-medium text-foreground text-center leading-tight line-clamp-2">{item.name}</span>
    <span className="text-xs font-bold text-accent mt-1">Rs. {item.price}</span>
  </button>
);

export default MenuItemCard;
