import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/',        label: 'Tables'  },
  { path: '/history', label: 'History' },
  { path: '/admin',   label: 'Admin'   },
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
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 20% 0%, hsl(var(--accent)/0.07) 0%, transparent 60%), linear-gradient(180deg, #0e0f11 0%, #111316 100%)',
      }}
    >
      {/* ── Top navigation bar ── */}
      <header className="flex-shrink-0 flex items-stretch h-[54px] px-6 border-b border-white/[0.1] bg-black/30 backdrop-blur-md">

        {/* Left: café / screen name */}
        <div className="flex items-center pr-6 min-w-0">
          <span className="text-sm font-bold text-foreground tracking-tight truncate select-none">
            {title}
          </span>
        </div>

        {/* Left divider */}
        <div className="w-px my-3.5 bg-white/[0.08] flex-shrink-0" />

        {/* Center: tab navigation */}
        <nav className="flex items-stretch px-2">
          {navItems.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                data-testid={`nav-${label.toLowerCase()}`}
                className={`
                  relative px-5 flex items-center text-[13px] font-semibold
                  transition-colors duration-150 select-none
                  ${active
                    ? 'text-foreground'
                    : 'text-muted-foreground/70 hover:text-foreground/60'}
                `}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 inset-x-3 h-[2px] rounded-t-sm bg-accent" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right divider */}
        <div className="w-px my-3.5 bg-white/[0.08] flex-shrink-0" />

        {/* Right: status / meta */}
        <div className="flex items-center justify-end gap-3 flex-1 min-w-0 pl-6">
          {headerRight}
        </div>

      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
