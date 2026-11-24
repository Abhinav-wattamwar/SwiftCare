import { MapPin, ShieldCheck } from 'lucide-react';
import { AppTab, AuthenticatedPatient, RadiusKm } from '../types/swiftcare';
import { getInitials } from '../utils/authValidation';

interface TopAppBarProps {
  activeTab: AppTab;
  inCheckout: boolean;
  radiusKm: RadiusKm;
  basketCount: number;
  patient: AuthenticatedPatient;
  onSelectTab: (tab: AppTab) => void;
  onOpenLocationModal: () => void;
  onOpenProfileModal: () => void;
}

export function TopAppBar({
  activeTab,
  inCheckout,
  radiusKm,
  basketCount,
  patient,
  onSelectTab,
  onOpenLocationModal,
  onOpenProfileModal,
}: TopAppBarProps) {
  const initials = getInitials(patient.fullName);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('compare')}
          aria-label="SwiftCare Home"
          className="flex items-center text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#029185] rounded-lg py-0.5"
        >
          <img
            src="/assets/aistudio/logo_d3f7ff45.png"
            alt="SwiftCare"
            className="h-9 sm:h-10 w-auto object-contain brightness-105 contrast-110 mix-blend-multiply"
          />
        </button>

        {/* Zone 2: Desktop Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {(
            [
              { id: 'compare', label: 'Compare' },
              {
                id: 'estimator',
                label: basketCount > 0 ? `Estimator (${basketCount})` : 'Estimator',
              },
              { id: 'directory', label: 'Directory' },
              { id: 'alerts', label: 'Saved Alerts' },
            ] as { id: AppTab; label: string }[]
          ).map((item) => {
            const isActive = !inCheckout && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-[#029185] text-[#029185] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Location Chip + ABHA Patient Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenLocationModal}
            aria-label={`Change location, currently ${patient.city} within ${radiusKm}km`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f0f4f3] hover:bg-slate-200/70 border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
          >
            <MapPin className="w-3.5 h-3.5 text-[#029185] shrink-0" />
            <span className="tabular-nums">
              {patient.city} · {radiusKm}km
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenProfileModal}
            aria-label={`Patient profile ${patient.fullName}, ABHA verified`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-900 transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
          >
            <span className="w-6 h-6 rounded-md bg-[#029185]/12 text-[#029185] flex items-center justify-center font-bold text-[11px]">
              {initials}
            </span>
            <span className="hidden sm:inline max-w-[110px] truncate">{patient.fullName}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          </button>
        </div>
      </div>
    </header>
  );
}
