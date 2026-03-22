import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';

const statusConfig = {
  free: {
    border:        'border-white/[0.07]',
    hoverBorder:   'hover:border-white/[0.15]',
    cardBg:        'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
    chipBg:        'bg-white/[0.06]',
    chipText:      'text-muted-foreground',
    dotColor:      'bg-muted-foreground/40',
    dotPulse:      false,
    label:         'Available',
    numberColor:   'text-foreground',
    totalColor:    'text-foreground',
    metaColor:     'text-muted-foreground/60',
  },
  occupied: {
    border:        'border-warning/[0.18]',
    hoverBorder:   'hover:border-warning/[0.35]',
    cardBg:        'linear-gradient(160deg, rgba(251,146,60,0.07) 0%, rgba(255,255,255,0.014) 100%)',
    chipBg:        'bg-warning/[0.12]',
    chipText:      'text-warning/80',
    dotColor:      'bg-warning/75',
    dotPulse:      true,
    label:         'Active',
    numberColor:   'text-foreground',
    totalColor:    'text-warning/90',
    metaColor:     'text-warning/55',
  },
  billing: {
    border:        'border-danger/[0.18]',
    hoverBorder:   'hover:border-danger/[0.35]',
    cardBg:        'linear-gradient(160deg, rgba(220,38,38,0.07) 0%, rgba(255,255,255,0.014) 100%)',
    chipBg:        'bg-danger/[0.12]',
    chipText:      'text-danger/80',
    dotColor:      'bg-danger/75',
    dotPulse:      true,
    label:         'Billing',
    numberColor:   'text-foreground',
    totalColor:    'text-danger/90',
    metaColor:     'text-danger/55',
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
        relative flex flex-col items-center justify-center
        rounded-2xl border w-full min-h-[130px] p-4
        transition-all duration-150
        ${cfg.border} ${cfg.hoverBorder}
        hover:shadow-[0_4px_18px_-4px_rgba(0,0,0,0.5)]
        hover:-translate-y-px
        active:scale-[0.97] active:translate-y-0 active:shadow-none
      `}
      style={{ background: cfg.cardBg }}
    >
      {/* Subtle top-edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-white/[0.06] pointer-events-none" />

      {/* Table number */}
      <span className={`text-5xl font-black tracking-tight leading-none ${cfg.numberColor}`}>
        {table.number}
      </span>

      {/* Status chip */}
      <span className={`mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-[3px] rounded-full ${cfg.chipBg} ${cfg.chipText}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor} ${cfg.dotPulse ? 'animate-pulse' : ''}`} />
        {cfg.label}
      </span>

      {/* Active / billing details */}
      {isActive && (
        <div className="mt-3 flex flex-col items-center gap-0.5 w-full">
          <span className={`text-base font-bold tabular-nums ${cfg.totalColor}`}>
            Rs. {runningTotal}
          </span>
          <span className={`text-[11px] tabular-nums ${cfg.metaColor}`}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}{timer ? ` · ${timer}` : ''}
          </span>
        </div>
      )}

      {/* Placeholder row for free tables — keeps height consistent */}
      {!isActive && (
        <div className="mt-3 h-[36px]" />
      )}
    </button>
  );
};

export default TableCard;
