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
        background: 'linear-gradient(180deg, #0d1f2e 0%, #04100a 100%)',
      }}
    >
      {/* ── Top navigation bar ── */}
      <header
        className="flex-shrink-0 flex items-stretch h-14 px-6"
        style={{
          background: 'linear-gradient(135deg, #071a10 0%, #091628 100%)',
          borderBottom: '1px solid hsl(142 71% 36% / 0.35)',
        }}
      >
        {/* Left: café / screen name */}
        <div className="flex items-center flex-1 min-w-0">
          <span
            className="text-xs font-bold truncate select-none uppercase tracking-[0.16em]"
            style={{ color: 'hsl(142 60% 55%)' }}
          >
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
                className={`
                  relative px-4 my-2 flex items-center text-sm font-bold rounded-md
                  transition-all duration-200 select-none
                `}
                style={active ? {
                  background: 'hsl(var(--accent))',
                  color: 'hsl(var(--accent-foreground))',
                  boxShadow: '0 2px 10px -2px hsl(48 96% 53% / 0.45)',
                } : {
                  color: 'hsl(142 55% 55% / 0.75)',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'hsl(142 60% 65%)';
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'hsl(142 55% 55% / 0.75)';
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
