import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';

const statusConfig = {
  free: {
    border: 'border-white/[0.09]',
    bg: 'from-success/6 via-success/2 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]',
    outerGlow: '',
    hoverGlow: 'hover:shadow-[0_6px_24px_-4px_hsl(var(--success)/0.18),inset_0_1px_0_0_rgba(255,255,255,0.09)]',
    dot: 'bg-success',
    dotShadow: '0 0 5px 1px hsl(var(--success)/0.38)',
    dotPulse: false,
    label: 'Available',
    labelColor: 'text-white/30',
    labelBg: 'bg-white/[0.05]',
    numberColor: 'text-white/70',
    numberShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
  occupied: {
    border: 'border-warning/30',
    bg: 'from-warning/11 via-warning/5 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_hsl(var(--warning)/0.22)]',
    outerGlow: 'shadow-[0_4px_18px_-4px_hsl(var(--warning)/0.28)]',
    hoverGlow: 'hover:shadow-[0_8px_30px_-4px_hsl(var(--warning)/0.42),inset_0_1px_0_0_hsl(var(--warning)/0.25)]',
    dot: 'bg-warning',
    dotShadow: '0 0 5px 1px hsl(var(--warning)/0.5)',
    dotPulse: true,
    label: 'Active',
    labelColor: 'text-warning/55',
    labelBg: 'bg-warning/[0.08]',
    numberColor: 'text-white/92',
    numberShadow: '0 1px 5px rgba(0,0,0,0.55)',
  },
  billing: {
    border: 'border-danger/30',
    bg: 'from-danger/11 via-danger/5 to-transparent',
    innerGlow: 'shadow-[inset_0_1px_0_0_hsl(var(--danger)/0.22)]',
    outerGlow: 'shadow-[0_4px_18px_-4px_hsl(var(--danger)/0.28)]',
    hoverGlow: 'hover:shadow-[0_8px_30px_-4px_hsl(var(--danger)/0.42),inset_0_1px_0_0_hsl(var(--danger)/0.25)]',
    dot: 'bg-danger',
    dotShadow: '0 0 5px 1px hsl(var(--danger)/0.5)',
    dotPulse: true,
    label: 'Billing',
    labelColor: 'text-danger/55',
    labelBg: 'bg-danger/[0.08]',
    numberColor: 'text-white/92',
    numberShadow: '0 1px 5px rgba(0,0,0,0.55)',
  },
};

const paxColor: Record<string, string> = {
  free:     'text-white/45',
  occupied: 'text-warning/85',
  billing:  'text-danger/85',
};

const metaColor: Record<string, string> = {
  free:     'text-white/28',
  occupied: 'text-white/38',
  billing:  'text-white/38',
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
        p-4 rounded-2xl border w-full
        bg-gradient-to-b ${cfg.bg}
        ${cfg.border}
        ${cfg.innerGlow}
        ${isActive ? cfg.outerGlow : ''}
        ${cfg.hoverGlow}
        transition-all duration-200
        hover:scale-[1.02] hover:-translate-y-0.5
        active:scale-[0.97] active:translate-y-0
        min-h-[148px]
      `}
    >
      {/* Solid surface base */}
      <div className="absolute inset-0 rounded-2xl bg-white/[0.04] pointer-events-none" />

      {/* Radial center highlight */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.045) 0%, transparent 60%)',
        }}
      />

      {/* Status dot */}
      <div
        className={`absolute top-3 right-3 w-2 h-2 rounded-full ${cfg.dot}`}
        style={{ boxShadow: cfg.dotShadow }}
      >
        {cfg.dotPulse && (
          <div
            className={`absolute inset-0 rounded-full ${cfg.dot} animate-ping opacity-50`}
            style={{ animationDuration: '2.2s' }}
          />
        )}
      </div>

      {/* Table number — highest priority */}
      <span
        className={`text-5xl font-black tracking-tight leading-none ${cfg.numberColor}`}
        style={{ textShadow: cfg.numberShadow }}
      >
        {table.number}
      </span>

      {/* Status badge — low importance */}
      <span className={`mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.labelBg} ${cfg.labelColor}`}>
        {cfg.label}
      </span>

      {/* Active/Billing details */}
      {isActive && (
        <div className="mt-2 flex flex-col items-center gap-0.5 w-full">
          {/* Pax — second priority */}
          <span className={`text-[15px] font-bold leading-tight ${paxColor[table.status]}`}>
            {table.pax ?? 1} pax
          </span>
          {/* Items + timer — lowest priority */}
          <span className={`text-[10px] font-medium tabular-nums ${metaColor[table.status]}`}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}{timer ? ` · ${timer}` : ''}
          </span>
        </div>
      )}
    </button>
  );
};

export default TableCard;
