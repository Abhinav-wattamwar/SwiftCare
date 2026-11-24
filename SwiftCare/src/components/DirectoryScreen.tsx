import { useMemo, useState } from 'react';
import { Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Provider, RadiusKm } from '../types/swiftcare';
import { filterProvidersByRadius } from '../utils/pricing';
import { Clinical3DCanvas } from './Clinical3DCanvas';

interface DirectoryScreenProps {
  providers: Provider[];
  radiusKm: RadiusKm;
  fullBleed3D: boolean;
  onToggleFullBleed3D: (open: boolean) => void;
  onSelectProviderForCompare: () => void;
}

export function DirectoryScreen({
  providers,
  radiusKm,
  fullBleed3D,
  onToggleFullBleed3D,
  onSelectProviderForCompare,
}: DirectoryScreenProps) {
  const [filterType, setFilterType] = useState<'all' | 'pharmacy' | 'lab'>('all');
  const [only24x7, setOnly24x7] = useState(false);
  const [onlyDriveThru, setOnlyDriveThru] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>('prov-apollo');

  const filtered = useMemo(
    () => filterProvidersByRadius(providers, radiusKm, filterType, only24x7, onlyDriveThru),
    [providers, radiusKm, filterType, only24x7, onlyDriveThru],
  );

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Nagpur Care Network Directory
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {filtered.length} verified pharmacies & NABL-accredited diagnostic hubs within {radiusKm}km
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-[#f0f4f3] rounded-lg">
            {(
              [
                { id: 'all', label: 'All Partners' },
                { id: 'pharmacy', label: 'Pharmacies' },
                { id: 'lab', label: 'NABL Labs' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterType === f.id
                    ? 'bg-white text-[#029185] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnly24x7((v) => !v)}
            aria-pressed={only24x7}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              only24x7
                ? 'bg-[#029185] text-white border-[#029185]'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            24x7 Open
          </button>

          <button
            type="button"
            onClick={() => setOnlyDriveThru((v) => !v)}
            aria-pressed={onlyDriveThru}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              onlyDriveThru
                ? 'bg-[#029185] text-white border-[#029185]'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Drive-Thru
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Interactive 3D Nagpur Spatial Diorama */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5 lg:sticky lg:top-16">
          <div>
            <h2 className="text-sm font-bold text-slate-900">3D Nagpur Fulfillment Map</h2>
            <p className="text-xs text-slate-600">
              Select a partner card to highlight its branch & pickup corridor
            </p>
          </div>
          <Clinical3DCanvas
            mode="network-map"
            medicineName="Atorvastatin Calcium"
            brandName="Lipitor"
            strength="20mg"
            formType="generic"
            radiusKm={radiusKm}
            providers={providers}
            selectedProviderId={selectedProviderId}
            fullBleed={fullBleed3D}
            onToggleFullBleed={onToggleFullBleed3D}
          />
        </section>

        {/* Provider Cards List */}
        <section className="lg:col-span-7 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                No partners match the active filters within {radiusKm}km
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterType('all');
                  setOnly24x7(false);
                  setOnlyDriveThru(false);
                }}
                className="text-xs font-semibold text-[#029185] hover:underline"
              >
                Reset Directory Filters
              </button>
            </div>
          ) : (
            filtered.map((p) => {
              const selected = p.id === selectedProviderId;
              return (
                <article
                  key={p.id}
                  className={`bg-white rounded-xl border p-4 transition-colors ${
                    selected ? 'border-[#029185] shadow-xs' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[#029185]">
                        {p.type === 'lab' ? 'NABL Accredited Lab' : 'ABDM Partner Pharmacy'} ·{' '}
                        {p.stockStatus}
                      </p>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{p.name}</h3>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.address}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                        <span className="font-semibold text-slate-900">
                          {p.distanceKm.toFixed(1)} km
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          {p.rating.toFixed(1)}
                        </span>
                        {p.is24x7 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-[#029185] font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              24x7
                            </span>
                          </>
                        )}
                        {p.nablAccredited && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-[#029185] font-medium">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              NABL ISO-15189
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedProviderId(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          selected
                            ? 'bg-[#029185] text-white border-[#029185]'
                            : 'bg-[#f6faf9] text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {selected ? 'Focused on 3D' : 'Locate on 3D'}
                      </button>
                      {p.type === 'pharmacy' && (
                        <button
                          type="button"
                          onClick={onSelectProviderForCompare}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#029185] hover:bg-[#029185]/8 transition-colors"
                        >
                          View Prices
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
