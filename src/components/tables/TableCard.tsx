import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';

const statusConfig = {
  free: {
    cardBg: 'linear-gradient(160deg, #0d2416 0%, #081a0e 100%)',
    cardBorder: 'hsl(142 65% 35% / 0.55)',
    cardShadow: '0 2px 12px -2px rgba(0,0,0,0.5), inset 0 1px 0 0 hsl(142 60% 40% / 0.15)',
    cardHoverShadow: '0 6px 24px -4px hsl(142 71% 36% / 0.35), inset 0 1px 0 0 hsl(142 60% 40% / 0.2)',
    dotColor: 'hsl(142 71% 40%)',
    dotGlow: '0 0 7px 2px hsl(142 71% 40% / 0.6)',
    dotPulse: false,
    label: 'Available',
    labelBg: 'hsl(142 65% 20% / 0.6)',
    labelColor: 'hsl(142 60% 60%)',
    numberColor: 'hsl(142 30% 88%)',
    numberShadow: '0 0 12px hsl(142 60% 36% / 0.3)',
    paxColor: '',
    metaColor: '',
  },
  occupied: {
    cardBg: 'linear-gradient(160deg, #251a07 0%, #180f03 100%)',
    cardBorder: 'hsl(38 90% 50% / 0.6)',
    cardShadow: '0 2px 16px -2px hsl(32 90% 40% / 0.3), inset 0 1px 0 0 hsl(38 90% 50% / 0.15)',
    cardHoverShadow: '0 6px 28px -4px hsl(32 90% 50% / 0.5), inset 0 1px 0 0 hsl(38 90% 50% / 0.2)',
    dotColor: 'hsl(var(--accent))',
    dotGlow: '0 0 7px 2px hsl(48 96% 53% / 0.65)',
    dotPulse: true,
    label: 'Active',
    labelBg: 'hsl(38 90% 40% / 0.25)',
    labelColor: 'hsl(43 90% 65%)',
    numberColor: 'hsl(38 20% 95%)',
    numberShadow: '0 0 14px hsl(38 80% 50% / 0.35)',
    paxColor: 'hsl(43 90% 62%)',
    metaColor: 'hsl(38 50% 45%)',
  },
  billing: {
    cardBg: 'linear-gradient(160deg, #250d0d 0%, #180505 100%)',
    cardBorder: 'hsl(0 72% 51% / 0.6)',
    cardShadow: '0 2px 16px -2px hsl(0 72% 40% / 0.3), inset 0 1px 0 0 hsl(0 72% 51% / 0.15)',
    cardHoverShadow: '0 6px 28px -4px hsl(0 72% 51% / 0.5), inset 0 1px 0 0 hsl(0 72% 51% / 0.2)',
    dotColor: 'hsl(var(--danger))',
    dotGlow: '0 0 7px 2px hsl(0 72% 51% / 0.65)',
    dotPulse: true,
    label: 'Billing',
    labelBg: 'hsl(0 72% 30% / 0.25)',
    labelColor: 'hsl(0 72% 68%)',
    numberColor: 'hsl(0 10% 95%)',
    numberShadow: '0 0 14px hsl(0 70% 50% / 0.35)',
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
        border: `1px solid ${cfg.cardBorder}`,
        boxShadow: hovered ? cfg.cardHoverShadow : cfg.cardShadow,
      }}
    >
      {/* Top inner highlight */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 40%)' }}
      />

      {/* Status dot */}
      <div
        className="absolute top-3 right-3 w-2 h-2 rounded-full"
        style={{ background: cfg.dotColor, boxShadow: cfg.dotGlow }}
      >
        {cfg.dotPulse && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-60"
            style={{ background: cfg.dotColor, animationDuration: '2.2s' }}
          />
        )}
      </div>

      {/* Table number — highest priority */}
      <span
        className="text-5xl font-black tracking-tight leading-none"
        style={{ color: cfg.numberColor, textShadow: cfg.numberShadow }}
      >
        {table.number}
      </span>

      {/* Status badge — lower importance */}
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
