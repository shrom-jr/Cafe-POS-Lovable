import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, History, Settings, Coffee } from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutGrid, label: 'Tables' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/admin', icon: Settings, label: 'Admin' },
];

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pos-shadow">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all ${
                active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const TopBar = ({ title, showBack, onBack }: { title: string; showBack?: boolean; onBack?: () => void }) => (
  <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
    {showBack && (
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
    )}
    <div className="flex items-center gap-2">
      <Coffee size={20} className="text-accent" />
      <h1 className="text-lg font-bold">{title}</h1>
    </div>
  </header>
);

export default Navigation;
