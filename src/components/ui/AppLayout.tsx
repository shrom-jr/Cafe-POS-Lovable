import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, History, Settings } from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutGrid, label: 'Tables' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/admin', icon: Settings, label: 'Admin' },
];

interface AppLayoutProps {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

const AppLayout = ({ title, headerRight, children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 20% 0%, hsl(var(--accent)/0.07) 0%, transparent 60%), linear-gradient(180deg, #0e0f11 0%, #111316 100%)',
      }}
    >
      {/* Sidebar */}
      <aside className="w-20 flex-shrink-0 flex flex-col items-center py-6 gap-2 border-r border-white/[0.06] bg-black/30 backdrop-blur-xl z-10">
        <div className="mb-4 text-2xl select-none">☕</div>
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-testid={`nav-${label.toLowerCase()}`}
              title={label}
              className={`
                relative flex flex-col items-center justify-center gap-1.5 w-14 py-3 rounded-2xl
                transition-all duration-200
                ${
                  active
                    ? 'bg-accent/20 text-accent shadow-[0_0_16px_-4px_hsl(var(--accent)/0.5)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-accent" />
              )}
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/20 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
          <h1 className="text-base font-bold text-foreground tracking-tight">{title}</h1>
          {headerRight && <div className="flex items-center gap-3">{headerRight}</div>}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
