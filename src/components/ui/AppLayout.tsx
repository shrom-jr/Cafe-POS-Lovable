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
        background: 'linear-gradient(180deg, #111214 0%, #0c0d10 100%)',
      }}
    >
      {/* ── Top navigation bar ── */}
      <header
        className="flex-shrink-0 flex items-stretch h-14 px-6 border-b border-white/[0.09] backdrop-blur-[3px]"
        style={{
          background:
            'linear-gradient(to right, rgba(10,11,14,0.96) 0%, rgba(11,14,22,0.94) 100%)',
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
                className={`
                  relative px-4 my-2 flex items-center text-sm font-semibold rounded-md
                  transition-all duration-200 select-none
                  ${active
                    ? 'text-white/92'
                    : 'text-white/40 hover:text-white/65'}
                `}
                style={active ? {
                  background: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.14), 0 1px 3px rgba(0,0,0,0.4)',
                } : undefined}
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
