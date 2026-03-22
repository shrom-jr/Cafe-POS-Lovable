import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';

const statusConfig = {
  free: {
    cardBg: 'linear-gradient(160deg, #0d1f18 0%, #091510 100%)',
    cardBorder: 'rgba(16,185,129,0.28)',
    cardShadow: '0 2px 10px -2px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(16,185,129,0.08)',
    cardHoverBorder: 'rgba(59,130,246,0.45)',
    cardHoverShadow: '0 6px 24px -4px rgba(59,130,246,0.25), inset 0 1px 0 0 rgba(59,130,246,0.1)',
    dotColor: '#10b981',
    dotGlow: '0 0 6px 2px rgba(16,185,129,0.55)',
    dotPulse: false,
    label: 'Available',
    labelBg: 'rgba(16,185,129,0.12)',
    labelColor: 'rgba(52,211,153,0.85)',
    numberColor: 'rgba(255,255,255,0.82)',
    numberShadow: '0 0 10px rgba(16,185,129,0.2)',
    paxColor: '',
    metaColor: '',
  },
  occupied: {
    cardBg: 'linear-gradient(160deg, #1e1408 0%, #140d04 100%)',
    cardBorder: 'hsl(32 90% 50% / 0.45)',
    cardShadow: '0 2px 14px -2px hsl(32 90% 40% / 0.25), inset 0 1px 0 0 hsl(32 90% 50% / 0.1)',
    cardHoverBorder: 'rgba(59,130,246,0.45)',
    cardHoverShadow: '0 6px 24px -4px rgba(59,130,246,0.25), inset 0 1px 0 0 rgba(59,130,246,0.1)',
    dotColor: 'hsl(32 90% 55%)',
    dotGlow: '0 0 6px 2px hsl(32 90% 50% / 0.6)',
    dotPulse: true,
    label: 'Active',
    labelBg: 'hsl(32 90% 50% / 0.15)',
    labelColor: 'hsl(32 90% 68%)',
    numberColor: 'rgba(255,255,255,0.92)',
    numberShadow: '0 0 12px hsl(32 90% 50% / 0.3)',
    paxColor: 'hsl(32 90% 65%)',
    metaColor: 'hsl(32 60% 45%)',
  },
  billing: {
    cardBg: 'linear-gradient(160deg, #1e0d0d 0%, #130606 100%)',
    cardBorder: 'hsl(0 72% 51% / 0.45)',
    cardShadow: '0 2px 14px -2px hsl(0 72% 40% / 0.25), inset 0 1px 0 0 hsl(0 72% 51% / 0.1)',
    cardHoverBorder: 'rgba(59,130,246,0.45)',
    cardHoverShadow: '0 6px 24px -4px rgba(59,130,246,0.25), inset 0 1px 0 0 rgba(59,130,246,0.1)',
    dotColor: 'hsl(0 72% 55%)',
    dotGlow: '0 0 6px 2px hsl(0 72% 51% / 0.6)',
    dotPulse: true,
    label: 'Billing',
    labelBg: 'hsl(0 72% 51% / 0.15)',
    labelColor: 'hsl(0 72% 68%)',
    numberColor: 'rgba(255,255,255,0.92)',
    numberShadow: '0 0 12px hsl(0 72% 51% / 0.3)',
    paxColor: 'hsl(0 70% 65%)',
    metaColor: 'hsl(0 40% 45%)',
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
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`table-card-${table.id}`}
      className="relative flex flex-col items-center justify-center p-4 rounded-2xl w-full min-h-[148px] transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
      style={{
        background: cfg.cardBg,
        border: `1px solid ${hovered ? cfg.cardHoverBorder : cfg.cardBorder}`,
        boxShadow: hovered ? cfg.cardHoverShadow : cfg.cardShadow,
      }}
    >
      {/* Top inner highlight */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 40%)' }}
      />

      {/* Status dot */}
      <div
        className="absolute top-3 right-3 w-2 h-2 rounded-full"
        style={{ background: cfg.dotColor, boxShadow: cfg.dotGlow }}
      >
        {cfg.dotPulse && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-55"
            style={{ background: cfg.dotColor, animationDuration: '2.2s' }}
          />
        )}
      </div>

      {/* Table number */}
      <span
        className="text-5xl font-black tracking-tight leading-none"
        style={{ color: cfg.numberColor, textShadow: cfg.numberShadow }}
      >
        {table.number}
      </span>

      {/* Status badge */}
      <span
        className="mt-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
        style={{ background: cfg.labelBg, color: cfg.labelColor }}
      >
        {cfg.label}
      </span>

      {/* Active/Billing details */}
      {isActive && (
        <div className="mt-2 flex flex-col items-center gap-0.5 w-full">
          <span className="text-[15px] font-bold leading-tight" style={{ color: cfg.paxColor }}>
            {table.pax ?? 1} pax
          </span>
          <span className="text-[10px] font-medium tabular-nums" style={{ color: cfg.metaColor }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}{timer ? ` · ${timer}` : ''}
          </span>
        </div>
      )}
    </button>
  );
};

export default TableCard;
