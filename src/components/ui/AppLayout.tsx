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
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}
    >
      {/* ── Top navigation bar ── */}
      <header
        className="flex-shrink-0 flex items-stretch h-14 px-6"
        style={{
          background: 'linear-gradient(135deg, #0a1228 0%, #0d1a2e 100%)',
          borderBottom: '1px solid rgba(59,130,246,0.25)',
        }}
      >
        {/* Left: café / screen name */}
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-xs font-semibold text-white/50 tracking-[0.14em] uppercase truncate select-none">
            {title}
          </span>
        </div>

        {/* Center: tab navigation */}
        <nav className="flex items-stretch gap-1 px-1">
          {navItems.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                data-testid={`nav-${label.toLowerCase()}`}
                className="relative px-4 my-2 flex items-center text-sm font-semibold rounded-md transition-all duration-200 select-none"
                style={active ? {
                  background: 'rgba(59,130,246,0.22)',
                  color: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(59,130,246,0.35)',
                  boxShadow: '0 2px 10px -2px rgba(59,130,246,0.3)',
                } : {
                  color: 'rgba(255,255,255,0.55)',
                }}
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
