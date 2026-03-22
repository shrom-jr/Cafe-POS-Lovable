import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';

const statusConfig = {
  free: {
    border: 'border-white/[0.06]',
    bg: 'bg-white/[0.025]',
    dot: 'bg-success',
    dotPulse: false,
    numberColor: 'text-foreground/50',
    paxColor: '',
    metaColor: '',
  },
  occupied: {
    border: 'border-warning/50',
    bg: 'bg-warning/[0.06]',
    dot: 'bg-warning',
    dotPulse: true,
    numberColor: 'text-foreground',
    paxColor: 'text-warning',
    metaColor: 'text-foreground/35',
  },
  billing: {
    border: 'border-danger/50',
    bg: 'bg-danger/[0.06]',
    dot: 'bg-danger',
    dotPulse: true,
    numberColor: 'text-foreground',
    paxColor: 'text-danger',
    metaColor: 'text-foreground/35',
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
  onClick: () => void;
}

const TableCard = ({ table, itemCount = 0, onClick }: TableCardProps) => {
  const timer = useTimer(table.orderStartTime);
  const cfg = statusConfig[table.status];
  const isActive = table.status !== 'free';

  return (
    <button
      onClick={onClick}
      data-testid={`table-card-${table.id}`}
      className={`
        relative flex flex-col items-center justify-center
        p-5 rounded-2xl border w-full
        ${cfg.bg}
        ${cfg.border}
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lg
        active:translate-y-0
        min-h-[150px]
      `}
    >
      {/* Status dot */}
      <div
        className={`
          absolute top-3.5 right-3.5 w-2 h-2 rounded-full
          ${cfg.dot}
          ${cfg.dotPulse ? 'animate-pulse' : ''}
        `}
      />

      {/* Table number */}
      <span className={`text-5xl font-black tracking-tight leading-none ${cfg.numberColor}`}>
        {table.number}
      </span>

      {/* Active/Billing details */}
      {isActive && (
        <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
          <span className={`text-base font-semibold tabular-nums ${cfg.paxColor}`}>
            {table.pax ?? 1} pax
          </span>
          <span className={`text-xs tabular-nums ${cfg.metaColor}`}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}{timer ? ` · ${timer}` : ''}
          </span>
        </div>
      )}
    </button>
  );
};

export default TableCard;
