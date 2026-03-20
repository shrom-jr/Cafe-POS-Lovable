import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';
import { Clock, ShoppingBag } from 'lucide-react';

const statusConfig = {
  free: {
    border: 'border-success/40',
    bg: 'bg-gradient-to-b from-success/10 to-success/5',
    dot: 'bg-success',
    label: 'Available',
    labelColor: 'text-success',
    glow: '',
  },
  occupied: {
    border: 'border-warning/50',
    bg: 'bg-gradient-to-b from-warning/12 to-warning/5',
    dot: 'bg-warning',
    label: 'Active',
    labelColor: 'text-warning',
    glow: 'hover:shadow-[0_0_24px_-4px_hsl(var(--warning)/0.35)]',
  },
  billing: {
    border: 'border-danger/50',
    bg: 'bg-gradient-to-b from-danger/12 to-danger/5',
    dot: 'bg-danger',
    label: 'Billing',
    labelColor: 'text-danger',
    glow: 'hover:shadow-[0_0_24px_-4px_hsl(var(--danger)/0.35)]',
  },
};

function useTimer(startTime?: number) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!startTime) { setElapsed(''); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

interface TableCardProps {
  table: CafeTable;
  itemCount?: number;
  runningTotal?: number;
  onClick: () => void;
}

const TableCard = ({ table, itemCount = 0, runningTotal = 0, onClick }: TableCardProps) => {
  const timer = useTimer(table.orderStartTime);
  const cfg = statusConfig[table.status];
  const isActive = table.status !== 'free';

  return (
    <button
      onClick={onClick}
      data-testid={`table-card-${table.id}`}
      className={`
        relative flex flex-col items-center justify-center p-4 rounded-2xl border-2
        transition-all duration-200 active:scale-95 hover:scale-[1.02] hover:-translate-y-0.5
        shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6)]
        min-h-[130px] w-full
        ${cfg.border} ${cfg.bg} ${cfg.glow}
      `}
    >
      <div
        className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${cfg.dot} ${
          isActive ? 'animate-pulse' : ''
        } shadow-[0_0_6px_1px_currentColor]`}
      />

      <span className="text-4xl font-black text-foreground tracking-tight">{table.number}</span>

      <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full bg-black/20 ${cfg.labelColor}`}>
        {cfg.label}
      </span>

      {isActive && (
        <div className="flex flex-col items-center gap-1 mt-2 w-full">
          {timer && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={10} />
              <span className="font-mono">{timer}</span>
            </div>
          )}
          <div className="flex items-center justify-between w-full mt-1 px-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingBag size={10} />
              <span>{itemCount}</span>
            </div>
            <span className="text-sm font-bold text-accent">Rs. {runningTotal}</span>
          </div>
        </div>
      )}
    </button>
  );
};

export default TableCard;
