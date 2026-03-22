import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';

const statusConfig = {
  free: {
    border: 'border-success/20',
    bg: 'from-success/7 via-success/3 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]',
    outerGlow: '',
    hoverGlow: 'hover:shadow-[0_8px_28px_-4px_hsl(var(--success)/0.2),inset_0_1px_0_0_rgba(255,255,255,0.09)]',
    dot: 'bg-success',
    dotShadow: '0 0 6px 2px hsl(var(--success)/0.45)',
    dotPulse: false,
    label: 'Available',
    labelColor: 'text-success/80',
    labelBg: 'bg-success/8',
    numberColor: 'text-white/85',
    numberShadow: '0 1px 6px rgba(0,0,0,0.5)',
    totalColor: 'text-success/75',
    metaColor: 'text-success/45',
  },
  occupied: {
    border: 'border-warning/35',
    bg: 'from-warning/10 via-warning/5 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_hsl(var(--warning)/0.2)]',
    outerGlow: 'shadow-[0_4px_20px_-4px_hsl(var(--warning)/0.25)]',
    hoverGlow: 'hover:shadow-[0_8px_32px_-4px_hsl(var(--warning)/0.4),inset_0_1px_0_0_hsl(var(--warning)/0.25)]',
    dot: 'bg-warning',
    dotShadow: '0 0 6px 2px hsl(var(--warning)/0.5)',
    dotPulse: true,
    label: 'Active',
    labelColor: 'text-warning/90',
    labelBg: 'bg-warning/10',
    numberColor: 'text-white/90',
    numberShadow: '0 1px 6px rgba(0,0,0,0.5)',
    totalColor: 'text-warning/80',
    metaColor: 'text-warning/55',
  },
  billing: {
    border: 'border-danger/35',
    bg: 'from-danger/10 via-danger/5 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_hsl(var(--danger)/0.2)]',
    outerGlow: 'shadow-[0_4px_20px_-4px_hsl(var(--danger)/0.25)]',
    hoverGlow: 'hover:shadow-[0_8px_32px_-4px_hsl(var(--danger)/0.4),inset_0_1px_0_0_hsl(var(--danger)/0.25)]',
    dot: 'bg-danger',
    dotShadow: '0 0 6px 2px hsl(var(--danger)/0.5)',
    dotPulse: true,
    label: 'Billing',
    labelColor: 'text-danger/90',
    labelBg: 'bg-danger/10',
    numberColor: 'text-white/90',
    numberShadow: '0 1px 6px rgba(0,0,0,0.5)',
    totalColor: 'text-danger/80',
    metaColor: 'text-danger/55',
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
    >
      {/* Subtle surface overlay */}
      <div className="absolute inset-0 rounded-2xl bg-white/[0.025] pointer-events-none" />

      {/* Radial center highlight */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 65%)',
        }}
      />

      {/* Status dot */}
      <div
        className={`absolute top-3.5 right-3.5 w-2 h-2 rounded-full ${cfg.dot}`}
        style={{ boxShadow: cfg.dotShadow }}
      >
        {cfg.dotPulse && (
          <div
            className={`absolute inset-0 rounded-full ${cfg.dot} animate-ping opacity-60`}
            style={{ animationDuration: '2s' }}
          />
        )}
      </div>

      {/* Table number */}
      <span
        className={`text-5xl font-black tracking-tight leading-none ${cfg.numberColor}`}
        style={{ textShadow: cfg.numberShadow }}
      >
        {table.number}
      </span>

      {/* Status badge */}
      <span className={`mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cfg.labelBg} ${cfg.labelColor}`}>
        {cfg.label}
      </span>

      {/* Active/Billing details */}
      {isActive && (
        <div className="mt-3 flex flex-col items-center gap-1 w-full">
          <span className={`text-sm font-bold ${cfg.totalColor}`}>
            {table.pax ?? 1} pax
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
