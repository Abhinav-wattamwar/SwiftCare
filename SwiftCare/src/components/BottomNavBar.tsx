import { Bell, Building2, Calculator, Search } from 'lucide-react';
import { AppTab } from '../types/swiftcare';

interface BottomNavBarProps {
  activeTab: AppTab;
  inCheckout: boolean;
  basketCount: number;
  alertsCount: number;
  onSelectTab: (tab: AppTab) => void;
}

export function BottomNavBar({
  activeTab,
  inCheckout,
  basketCount,
  alertsCount,
  onSelectTab,
}: BottomNavBarProps) {
  const tabs: {
    id: AppTab;
    label: string;
    icon: typeof Search;
    badge?: number;
  }[] = [
    { id: 'compare', label: 'Compare', icon: Search },
    { id: 'estimator', label: 'Estimator', icon: Calculator, badge: basketCount },
    { id: 'directory', label: 'Directory', icon: Building2 },
    { id: 'alerts', label: 'Saved Alerts', icon: Bell, badge: alertsCount },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-[56px] bg-white/95 backdrop-blur-sm border-t border-slate-200 grid grid-cols-4"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = !inCheckout && activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
              isActive ? 'text-[#029185]' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.4 : 1.9} />
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#029185] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {tab.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight whitespace-nowrap ${
                isActive ? 'font-semibold' : 'font-medium'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
