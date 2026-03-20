import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';

const statusConfig = {
  free: {
    border: 'border-success/30',
    bg: 'from-success/10 via-success/5 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_hsl(var(--success)/0.2)]',
    outerGlow: '',
    hoverGlow: 'hover:shadow-[0_8px_32px_-4px_hsl(var(--success)/0.3),inset_0_1px_0_0_hsl(var(--success)/0.25)]',
    dot: 'bg-success shadow-[0_0_6px_2px_hsl(var(--success)/0.5)]',
    dotPulse: false,
    label: 'Available',
    labelColor: 'text-success',
    labelBg: 'bg-success/10',
    numberColor: 'text-foreground',
    totalColor: 'text-success',
    metaColor: 'text-success/60',
  },
  occupied: {
    border: 'border-warning/40',
    bg: 'from-warning/12 via-warning/6 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_hsl(var(--warning)/0.25)]',
    outerGlow: 'shadow-[0_4px_20px_-4px_hsl(var(--warning)/0.2)]',
    hoverGlow: 'hover:shadow-[0_8px_32px_-4px_hsl(var(--warning)/0.4),inset_0_1px_0_0_hsl(var(--warning)/0.3)]',
    dot: 'bg-warning shadow-[0_0_6px_2px_hsl(var(--warning)/0.5)]',
    dotPulse: true,
    label: 'Active',
    labelColor: 'text-warning',
    labelBg: 'bg-warning/10',
    numberColor: 'text-foreground',
    totalColor: 'text-warning',
    metaColor: 'text-warning/60',
  },
  billing: {
    border: 'border-danger/40',
    bg: 'from-danger/12 via-danger/6 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_hsl(var(--danger)/0.25)]',
    outerGlow: 'shadow-[0_4px_20px_-4px_hsl(var(--danger)/0.25)]',
    hoverGlow: 'hover:shadow-[0_8px_32px_-4px_hsl(var(--danger)/0.45),inset_0_1px_0_0_hsl(var(--danger)/0.3)]',
    dot: 'bg-danger shadow-[0_0_6px_2px_hsl(var(--danger)/0.5)]',
    dotPulse: true,
    label: 'Billing',
    labelColor: 'text-danger',
    labelBg: 'bg-danger/10',
    numberColor: 'text-foreground',
    totalColor: 'text-danger',
    metaColor: 'text-danger/60',
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
        p-5 rounded-2xl border-2 w-full
        bg-gradient-to-b ${cfg.bg}
        ${cfg.border}
        ${cfg.innerGlow}
        ${isActive ? cfg.outerGlow : ''}
        ${cfg.hoverGlow}
        transition-all duration-200
        hover:scale-[1.02] hover:-translate-y-0.5
        active:scale-[0.97] active:translate-y-0
        min-h-[150px]
        backdrop-blur-sm
      `}
      style={{ background: undefined }}
    >
      {/* Subtle card surface overlay */}
      <div className="absolute inset-0 rounded-2xl bg-white/[0.02] pointer-events-none" />

      {/* Status dot */}
      <div
        className={`
          absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full
          ${cfg.dot}
          ${cfg.dotPulse ? 'animate-pulse' : ''}
        `}
      />

      {/* Table number */}
      <span className={`text-5xl font-black tracking-tight leading-none ${cfg.numberColor}`}>
        {table.number}
      </span>

      {/* Status badge */}
      <span className={`mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cfg.labelBg} ${cfg.labelColor}`}>
        {cfg.label}
      </span>

      {/* Active/Billing details */}
      {isActive && (
        <div className="mt-3 flex flex-col items-center gap-1 w-full">
          <span className={`text-lg font-black ${cfg.totalColor}`}>
            Rs. {runningTotal}
          </span>
          <span className={`text-[11px] font-medium tabular-nums ${cfg.metaColor}`}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}{timer ? ` • ${timer}` : ''}
          </span>
        </div>
      )}
    </button>
  );
};

export default TableCard;
