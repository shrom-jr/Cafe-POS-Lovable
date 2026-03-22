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
      <header className="flex-shrink-0 flex items-stretch h-14 px-6 border-b border-white/5 bg-black/25 backdrop-blur-md">

        {/* Left: café / screen name */}
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-sm font-bold text-foreground tracking-tight truncate select-none">
            {title}
          </span>
        </div>

        {/* Center: tab navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                data-testid={`nav-${label.toLowerCase()}`}
                className={`
                  px-4 h-8 rounded-md flex items-center text-sm font-semibold
                  transition-colors duration-150 select-none
                  ${active
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'}
                `}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right: status / meta */}
        <div className="flex items-center justify-end gap-3 flex-1 min-w-0">
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
