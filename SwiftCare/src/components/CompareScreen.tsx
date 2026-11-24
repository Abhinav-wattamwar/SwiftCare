import { useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpNarrowWide,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FlaskConical,
  Globe,
  Info,
  Loader2,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import {
  BasketItem,
  DiagnosticPackage,
  DiagnosticSectionId,
  DrugFormType,
  FulfillmentQuote,
  LabQuote,
  Medicine,
  PriceSortOrder,
  Provider,
  RadiusKm,
} from '../types/swiftcare';
import {
  calculateBarometerStats,
  formatINR,
  rankLabQuotes,
  rankPharmacyQuotes,
} from '../utils/pricing';
import { lookupMedicineGlobalAndIndia } from '../services/medicineApi';
import { Clinical3DCanvas } from './Clinical3DCanvas';

interface CompareScreenProps {
  medicines: Medicine[];
  diagnosticPackages: DiagnosticPackage[];
  diagnosticSections: Array<{ id: DiagnosticSectionId; label: string }>;
  providers: Provider[];
  selectedMedicineId: string;
  selectedStrength: string;
  selectedDiagnosticId: string;
  formType: DrugFormType;
  sortOrder: PriceSortOrder;
  radiusKm: RadiusKm;
  basket: BasketItem[];
  basketTotal: number;
  fullBleed3D: boolean;
  onToggleFullBleed3D: (open: boolean) => void;
  onSelectMedicine: (id: string) => void;
  onImportLiveMedicine: (medicine: Medicine) => void;
  onSelectStrength: (strength: string) => void;
  onSelectDiagnostic: (id: string) => void;
  onChangeFormType: (form: DrugFormType) => void;
  onToggleSortOrder: () => void;
  onAddToEstimator: (
    quote: FulfillmentQuote,
    medicine: Medicine,
    strength: string,
    formType: DrugFormType,
  ) => void;
  onAddLabToEstimator: (labQuote: LabQuote) => void;
  onOpenCoupon: (quote: FulfillmentQuote, medicine: Medicine, strength: string) => void;
  onOpenEstimator: () => void;
  onOpenLocationModal: () => void;
}

export function CompareScreen({
  medicines,
  diagnosticPackages,
  diagnosticSections,
  providers,
  selectedMedicineId,
  selectedStrength,
  selectedDiagnosticId,
  formType,
  sortOrder,
  radiusKm,
  basket,
  basketTotal,
  fullBleed3D,
  onToggleFullBleed3D,
  onSelectMedicine,
  onImportLiveMedicine,
  onSelectStrength,
  onSelectDiagnostic,
  onChangeFormType,
  onToggleSortOrder,
  onAddToEstimator,
  onAddLabToEstimator,
  onOpenCoupon,
  onOpenEstimator,
  onOpenLocationModal,
}: CompareScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDiagSection, setActiveDiagSection] = useState<DiagnosticSectionId>('all');
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [showAllDispensaries, setShowAllDispensaries] = useState(false);
  const [focusedProviderId, setFocusedProviderId] = useState<string | null>(null);
  const [liveLookupLoading, setLiveLookupLoading] = useState(false);
  const [liveLookupStatus, setLiveLookupStatus] = useState<string | null>(null);

  const activeMedicine = useMemo(
    () => medicines.find((m) => m.id === selectedMedicineId) ?? medicines[0],
    [medicines, selectedMedicineId],
  );

  const activeDiagnostic = useMemo(
    () => diagnosticPackages.find((d) => d.id === selectedDiagnosticId) ?? diagnosticPackages[0],
    [diagnosticPackages, selectedDiagnosticId],
  );

  const filteredMedicines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return medicines;
    const matches = medicines.filter(
      (m) =>
        m.genericName.toLowerCase().includes(q) ||
        m.brandName.toLowerCase().includes(q) ||
        m.drugClass.toLowerCase().includes(q),
    );
    return matches.length > 0 ? matches : medicines;
  }, [medicines, searchQuery]);

  const filteredDiagnostics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const bySection =
      activeDiagSection === 'all'
        ? diagnosticPackages
        : diagnosticPackages.filter((d) => d.section === activeDiagSection);
    if (!q) return bySection;
    const matches = bySection.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.shortLabel.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.categoryLabel.toLowerCase().includes(q) ||
        (d.includedParameters?.toLowerCase().includes(q) ?? false),
    );
    if (matches.length > 0) return matches;
    const globalMatches = diagnosticPackages.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.shortLabel.toLowerCase().includes(q) ||
        d.categoryLabel.toLowerCase().includes(q) ||
        (d.includedParameters?.toLowerCase().includes(q) ?? false),
    );
    return globalMatches.length > 0 ? globalMatches : bySection;
  }, [diagnosticPackages, activeDiagSection, searchQuery]);

  const medExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return medicines.some(
      (m) =>
        m.genericName.toLowerCase().includes(q) ||
        m.brandName.toLowerCase().includes(q) ||
        m.drugClass.toLowerCase().includes(q),
    );
  }, [medicines, searchQuery]);

  const labExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return diagnosticPackages.some(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.shortLabel.toLowerCase().includes(q) ||
        d.categoryLabel.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q),
    );
  }, [diagnosticPackages, searchQuery]);

  const handleLiveMedicineLookup = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? searchQuery).trim();
    if (q.length < 2) return;
    setLiveLookupLoading(true);
    setLiveLookupStatus(null);
    try {
      const result = await lookupMedicineGlobalAndIndia(q);
      if (result) {
        onImportLiveMedicine(result.medicine);
        setLiveLookupStatus(
          `Loaded ${result.medicine.genericName} (${result.medicine.brandName}) via ${result.sourceLabel}`,
        );
      } else {
        setLiveLookupStatus(
          `No RxNorm or openFDA monograph found for "${q}". Try Paracetamol, Azithromycin, Amlodipine, or Pantoprazole.`,
        );
      }
    } finally {
      setLiveLookupLoading(false);
    }
  };

  const quotes = useMemo(
    () =>
      rankPharmacyQuotes(
        activeMedicine,
        selectedStrength,
        formType,
        providers,
        radiusKm,
        sortOrder,
      ),
    [activeMedicine, selectedStrength, formType, providers, radiusKm, sortOrder],
  );

  const labQuotes = useMemo(
    () => rankLabQuotes(activeDiagnostic, providers, radiusKm, sortOrder),
    [activeDiagnostic, providers, radiusKm, sortOrder],
  );

  const barometer = useMemo(
    () => calculateBarometerStats(activeMedicine, selectedStrength, formType, providers),
    [activeMedicine, selectedStrength, formType, providers],
  );

  const basketKeys = useMemo(
    () => new Set(basket.map((b) => `${b.providerId}:${b.title}`)),
    [basket],
  );

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-5">
      {/* Unified Search, Live RxNorm/openFDA Lookup & Single-Click Price Sort Toolbar */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!medExactMatch && !labExactMatch) {
              void handleLiveMedicineLookup();
            }
          }}
          className="flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="drug-search-input" className="sr-only">
              Search 42 diagnostic tests or any medicine via RxNorm and openFDA
            </label>
            <input
              id="drug-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (liveLookupStatus) setLiveLookupStatus(null);
              }}
              placeholder="Search 42 diagnostics (CBC, HbA1c, MRI, Dengue...) or any drug (Paracetamol, Azithromycin)..."
              className="w-full h-11 pl-9 pr-9 rounded-lg border border-slate-200 bg-[#f6faf9] text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#029185] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setLiveLookupStatus(null);
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchQuery.trim().length >= 2 && (
            <button
              type="button"
              disabled={liveLookupLoading}
              onClick={() => void handleLiveMedicineLookup()}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-lg bg-[#0f172a] hover:bg-slate-800 disabled:opacity-60 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              {liveLookupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-[#10B981]" />
              )}
              <span>Lookup RxNorm + openFDA</span>
            </button>
          )}

          {/* Single-click Ascending / Descending Price Sort Filter */}
          <button
            type="button"
            onClick={onToggleSortOrder}
            aria-label={`Sort prices ${
              sortOrder === 'asc'
                ? 'ascending low to high, click for descending'
                : 'descending high to low, click for ascending'
            }`}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-[#029185]/35 bg-[#f6faf9] hover:bg-[#029185]/10 text-xs font-bold text-[#029185] transition-colors whitespace-nowrap shrink-0"
          >
            {sortOrder === 'asc' ? (
              <>
                <ArrowUpNarrowWide className="w-4 h-4" />
                <span>Price: Low → High (Asc)</span>
              </>
            ) : (
              <>
                <ArrowDownWideNarrow className="w-4 h-4" />
                <span>Price: High → Low (Desc)</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Global + Indian Pharma Library Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-700">Live Drug Library (RxNorm · openFDA · Indian Formulary):</span>
            {['Paracetamol', 'Azithromycin', 'Amlodipine', 'Pantoprazole'].map((molecule) => (
              <button
                key={molecule}
                type="button"
                onClick={() => {
                  setSearchQuery(molecule);
                  void handleLiveMedicineLookup(molecule);
                }}
                className="px-2 py-0.5 rounded-md border border-slate-200 bg-[#f6faf9] hover:border-[#029185] font-medium text-[#029185] transition-colors"
              >
                + {molecule}
              </button>
            ))}
          </div>
          {liveLookupStatus && (
            <span className="font-medium text-[#029185]">{liveLookupStatus}</span>
          )}
        </div>

        {!medExactMatch && !labExactMatch && !liveLookupStatus && (
          <div className="rounded-lg bg-[#f0f4f3] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-700 font-medium">
              &ldquo;{searchQuery}&rdquo; is outside the default quick list. Query free NLM RxNorm
              + openFDA APIs or reset search.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleLiveMedicineLookup()}
                className="font-semibold text-[#029185] hover:underline"
              >
                Search RxNorm & openFDA
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="font-semibold text-slate-600 hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Mobile Quick-Jump Bar for Split Dual Columns */}
        <div className="flex lg:hidden items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => scrollToSection('medicines-column')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-[#f0f4f3] text-[11px] font-semibold text-slate-800 whitespace-nowrap"
          >
            <Pill className="w-3.5 h-3.5 text-[#029185] shrink-0" />
            <span>Medicines ({quotes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('diagnostics-column')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-[#f0f4f3] text-[11px] font-semibold text-slate-800 whitespace-nowrap"
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#029185] shrink-0" />
            <span>Diagnostic Centres ({labQuotes.length})</span>
          </button>
        </div>
      </section>

      {/* Split Dual-Column Simultaneous Comparison: Medicines (Left) + Diagnostic Centres (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: MEDICINES */}
        <section
          id="medicines-column"
          aria-labelledby="medicines-column-heading"
          className="lg:col-span-6 space-y-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#029185]" />
                <h2 id="medicines-column-heading" className="text-sm font-bold text-slate-900">
                  Medicines & AB-Rated Generics
                </h2>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {sortOrder === 'asc' ? 'Lowest first' : 'Highest first'}
              </span>
            </div>

            {/* Medicine Formulary Picker */}
            <div className="flex flex-wrap items-center gap-1.5">
              {filteredMedicines.map((med) => {
                const active = med.id === activeMedicine.id;
                const shortGeneric = med.genericName.split(' ')[0];
                const shortBrand = med.brandName.split(' ')[0];
                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => onSelectMedicine(med.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${
                      active
                        ? 'bg-[#029185] text-white border-[#029185]'
                        : 'bg-[#f6faf9] text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {shortGeneric} ({shortBrand})
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    {formType === 'generic'
                      ? activeMedicine.genericName
                      : `${activeMedicine.brandName} (${activeMedicine.genericName})`}
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {activeMedicine.dosageForm} ·{' '}
                    {formType === 'generic'
                      ? activeMedicine.manufacturerGeneric
                      : activeMedicine.manufacturerBrand}
                  </p>
                </div>

                {/* Generic vs Brand Segmented Switch */}
                <div
                  role="group"
                  aria-label="Generic or brand formulation"
                  className="inline-flex items-center gap-1 p-1 bg-[#f0f4f3] rounded-lg shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => onChangeFormType('generic')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      formType === 'generic'
                        ? 'bg-white text-[#029185] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    AB-Rated Generic
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeFormType('brand')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      formType === 'brand'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Brand ({activeMedicine.brandName})
                  </button>
                </div>
              </div>

              {/* Strength Selector Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500 mr-1">Strength:</span>
                {activeMedicine.strengths.map((str) => {
                  const isActive = str === selectedStrength;
                  return (
                    <button
                      key={str}
                      type="button"
                      onClick={() => onSelectStrength(str)}
                      aria-pressed={isActive}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums transition-colors border whitespace-nowrap ${
                        isActive
                          ? 'bg-[#0D9488] text-white border-[#0D9488]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-[#f6faf9]'
                      }`}
                    >
                      {str}
                    </button>
                  );
                })}
              </div>

              {(activeMedicine.rxcui || activeMedicine.fdaIndication) && (
                <div className="rounded-lg bg-[#f6faf9] border border-slate-200 px-3 py-2 text-[11px] text-slate-700 space-y-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-[#029185]">
                    <span>{activeMedicine.sourceTag ?? 'RxNorm · openFDA · CDSCO India'}</span>
                    {activeMedicine.rxcui && (
                      <span className="font-mono text-slate-700">
                        RxCUI: {activeMedicine.rxcui}
                      </span>
                    )}
                  </div>
                  {activeMedicine.fdaIndication && (
                    <p className="text-slate-600 leading-snug">{activeMedicine.fdaIndication}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bioequivalence & Savings Banner */}
          <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/8 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#029185] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900">
                  {formType === 'generic'
                    ? `Save up to ${activeMedicine.savingsHeadlinePercent}% with ${activeMedicine.bioequivalenceCode}`
                    : `Switching to AB-Rated Generic saves up to ${activeMedicine.savingsHeadlinePercent}%`}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Identical API ({activeMedicine.genericName} {selectedStrength}) · ABDM verified.
                </p>
              </div>
            </div>

            {formType === 'brand' && (
              <button
                type="button"
                onClick={() => onChangeFormType('generic')}
                className="px-3 py-1.5 rounded-lg bg-[#029185] text-white text-xs font-semibold hover:bg-[#0D9488] transition-colors whitespace-nowrap shrink-0"
              >
                Switch to Generic
              </button>
            )}
          </div>

          {/* Ranked Pharmacy Dispensaries */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Ranked Nagpur Dispensaries ({quotes.length})
              </h3>
              <button
                type="button"
                onClick={onOpenLocationModal}
                className="text-xs font-semibold text-[#029185] hover:underline whitespace-nowrap"
              >
                Within {radiusKm}km
              </button>
            </div>

            {quotes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  No partner dispensaries within {radiusKm}km
                </p>
                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="inline-flex items-center justify-center rounded-lg bg-[#029185] px-4 py-2 text-xs font-semibold text-white"
                >
                  Expand Search Radius
                </button>
              </div>
            ) : (
              <>
                {(showAllDispensaries ? quotes : quotes.slice(0, 4)).map((q) => {
                  const itemKey = `${q.provider.id}:${activeMedicine.genericName} ${selectedStrength}`;
                  const isAdded = basketKeys.has(itemKey);
                  return (
                    <article
                      key={q.provider.id}
                      onMouseEnter={() => setFocusedProviderId(q.provider.id)}
                      className={`bg-white rounded-xl border p-3.5 transition-colors ${
                        q.isLowest
                          ? 'border-[#029185]/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#029185]">
                            {q.badgeText} · {q.provider.stockStatus}
                          </p>
                          <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                            {q.provider.name}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {q.provider.neighborhood} ·{' '}
                            <span className="tabular-nums font-medium">
                              {q.provider.distanceKm.toFixed(1)} km
                            </span>
                            {q.provider.driveThru ? ' · Drive-Thru' : ''}
                            {q.provider.homeDelivery ? ' · Delivery' : ''}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-[#029185] tabular-nums">
                            {formatINR(q.lockedPrice)}
                          </div>
                          <div className="text-xs text-slate-500 line-through tabular-nums">
                            MRP {formatINR(q.retailMrp)}
                          </div>
                          <div className="text-[11px] font-semibold text-[#10B981] tabular-nums">
                            Save {q.savingsPercent}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenCoupon(q, activeMedicine, selectedStrength)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#f6faf9] hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors min-h-[36px] whitespace-nowrap"
                        >
                          <Tag className="w-3.5 h-3.5 text-[#029185]" />
                          <span>Get Coupon</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onAddToEstimator(q, activeMedicine, selectedStrength, formType)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap ${
                            isAdded
                              ? 'bg-[#10B981]/12 text-[#029185] border border-[#10B981]/40'
                              : 'bg-[#029185] hover:bg-[#0D9488] text-white'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added Rx</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Estimator</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {quotes.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDispensaries((v) => !v)}
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-[#f6faf9] text-xs font-semibold text-[#029185] transition-colors"
                  >
                    {showAllDispensaries
                      ? 'Show Top 4 Dispensaries'
                      : `View All ${quotes.length} Nagpur Dispensaries`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: DIAGNOSTIC CENTRES */}
        <section
          id="diagnostics-column"
          aria-labelledby="diagnostics-column-heading"
          className="lg:col-span-6 space-y-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#029185]" />
                <h2 id="diagnostics-column-heading" className="text-sm font-bold text-slate-900">
                  Diagnostic Centres & Master Index ({diagnosticPackages.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {sortOrder === 'asc' ? 'Lowest first' : 'Highest first'}
              </span>
            </div>

            {/* 7 Diagnostic Category Filter Tabs */}
            <div
              role="group"
              aria-label="Diagnostic test category sections"
              className="flex flex-wrap items-center gap-1.5 pb-1"
            >
              {diagnosticSections.map((sec) => {
                const isActive = activeDiagSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveDiagSection(sec.id);
                      const firstInSec =
                        sec.id === 'all'
                          ? diagnosticPackages[0]
                          : diagnosticPackages.find((d) => d.section === sec.id);
                      if (firstInSec) onSelectDiagnostic(firstInSec.id);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                      isActive
                        ? 'bg-[#0f172a] text-white border-[#0f172a]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>

            {/* Diagnostic Test Package Picker (all 42 PDF Pathology, Radiology & Packages) */}
            <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredDiagnostics.map((pkg) => {
                const active = pkg.id === activeDiagnostic.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => onSelectDiagnostic(pkg.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${
                      active
                        ? 'bg-[#029185] text-white border-[#029185]'
                        : 'bg-[#f6faf9] text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {pkg.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-[#029185]">
                    {activeDiagnostic.categoryLabel} · {activeDiagnostic.code} ·{' '}
                    {activeDiagnostic.turnaroundHours}h Report
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    {activeDiagnostic.name}
                  </h3>
                </div>
                {activeDiagnostic.savingsHeadlinePercent && (
                  <span className="px-2 py-1 rounded-md bg-[#10B981]/15 text-[#029185] text-[11px] font-bold whitespace-nowrap shrink-0">
                    {activeDiagnostic.savingsHeadlinePercent}% OFF
                  </span>
                )}
              </div>

              {activeDiagnostic.includedParameters && (
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Included Parameters: </span>
                  {activeDiagnostic.includedParameters}
                </p>
              )}

              {/* PDF Master Benchmark Strip */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#f6faf9] border border-slate-200 p-2.5 text-center tabular-nums">
                <div>
                  <div className="text-[10px] font-medium text-slate-500">
                    {activeDiagnostic.section === 'packages' ? 'Package Deal' : 'Budget Lab'}
                  </div>
                  <div className="text-xs font-bold text-[#029185]">
                    {formatINR(activeDiagnostic.budgetPrice)}
                  </div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] font-medium text-slate-500">
                    {activeDiagnostic.section === 'packages'
                      ? 'Individual MRP'
                      : activeDiagnostic.section === 'radiology'
                        ? 'Hospital Chain'
                        : 'NABL Chain'}
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    {formatINR(activeDiagnostic.nablChainPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-500">
                    {activeDiagnostic.section === 'packages' ? 'Effective Save' : 'Avg. Benchmark'}
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {activeDiagnostic.section === 'packages'
                      ? `${activeDiagnostic.savingsHeadlinePercent ?? 55}% OFF`
                      : formatINR(activeDiagnostic.avgPrice)}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                <Clock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                <span>{activeDiagnostic.fastingInstructions}</span>
              </p>
            </div>
          </div>

          {/* NABL Quality & Phlebotomy Banner */}
          <div className="rounded-xl border border-[#029185]/30 bg-[#029185]/8 p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#029185] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                NABL ISO-15189 Certified Labs · Free Home Sample Collection
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Select any diagnostic centre alongside your medicines to bundle both in one cashless
                pass.
              </p>
            </div>
          </div>

          {/* Ranked NABL Diagnostic Centres */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Ranked NABL Diagnostic Centres ({labQuotes.length})
              </h3>
              <span className="text-xs text-slate-600">Select simultaneously with Rx</span>
            </div>

            {labQuotes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  No NABL labs within {radiusKm}km
                </p>
                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="inline-flex items-center justify-center rounded-lg bg-[#029185] px-4 py-2 text-xs font-semibold text-white"
                >
                  Expand Search Radius
                </button>
              </div>
            ) : (
              labQuotes.map((lq) => {
                const labKey = `${lq.provider.id}:${lq.diagnosticPackage.name}`;
                const isAdded = basketKeys.has(labKey);
                return (
                  <article
                    key={lq.provider.id}
                    onMouseEnter={() => setFocusedProviderId(lq.provider.id)}
                    className={`bg-white rounded-xl border p-3.5 transition-colors ${
                      lq.isLowest
                        ? 'border-[#029185]/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#029185]">
                          {lq.badgeText} · NABL ISO-15189
                        </p>
                        <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                          {lq.provider.name}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {lq.provider.neighborhood} ·{' '}
                          <span className="tabular-nums font-medium">
                            {lq.provider.distanceKm.toFixed(1)} km
                          </span>{' '}
                          · {lq.provider.rating.toFixed(1)}★ · Home Phlebotomy
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-[#029185] tabular-nums">
                          {formatINR(lq.lockedPrice)}
                        </div>
                        <div className="text-xs text-slate-500 line-through tabular-nums">
                          MRP {formatINR(lq.retailMrp)}
                        </div>
                        <div className="text-[11px] font-semibold text-[#10B981] tabular-nums">
                          Save {lq.savingsPercent}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-600">
                        {lq.provider.voucherCode}
                      </span>

                      <button
                        type="button"
                        onClick={() => onAddLabToEstimator(lq)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap ${
                          isAdded
                            ? 'bg-[#10B981]/12 text-[#029185] border border-[#10B981]/40'
                            : 'bg-[#029185] hover:bg-[#0D9488] text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added Lab</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Lab to Estimator</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Lower Analytical & Interactive 3D Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              3D Bioequivalence & Pack Inspector
            </h2>
            <p className="text-xs text-slate-600">
              Drag to orbit · Inspect tablet scoring, blister foil & Rx label
            </p>
          </div>
          <Clinical3DCanvas
            mode="rx-inspector"
            medicineName={activeMedicine.genericName}
            brandName={activeMedicine.brandName}
            strength={selectedStrength}
            formType={formType}
            radiusKm={radiusKm}
            providers={providers}
            selectedProviderId={focusedProviderId}
            fullBleed={fullBleed3D}
            onToggleFullBleed={onToggleFullBleed3D}
            onChangeFormType={onChangeFormType}
          />
        </section>

        <div className="lg:col-span-6 space-y-4">
          {/* Regional Price Barometer */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Regional Price Barometer</h2>
              <span className="text-xs font-medium text-slate-600 tabular-nums">
                {barometer.dispensaryCount} Licensed Nagpur Dispensaries
              </span>
            </div>

            <div className="space-y-2">
              <div className="relative h-3 rounded-full bg-gradient-to-r from-[#10B981] via-[#D97706] to-[#E11D48]">
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#0f172a] shadow-sm"
                  style={{ left: `${barometer.selectedPercentile}%` }}
                  aria-label={`Lowest SwiftCare locked price at ${barometer.selectedPercentile}% of regional spread`}
                />
              </div>

              <div className="flex items-center justify-between text-xs tabular-nums">
                <div>
                  <span className="font-bold text-[#029185]">{formatINR(barometer.minPrice)}</span>
                  <span className="text-slate-500 ml-1">Lowest</span>
                </div>
                <div className="text-slate-600">
                  Median <span className="font-semibold">{formatINR(barometer.medianPrice)}</span>
                </div>
                <div>
                  <span className="font-bold text-[#E11D48]">{formatINR(barometer.maxPrice)}</span>
                  <span className="text-slate-500 ml-1">Retail Peak</span>
                </div>
              </div>
            </div>
          </section>

          {/* Clinical Safety Accordion */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setSafetyOpen((v) => !v)}
              aria-expanded={safetyOpen}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#f6faf9] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-[#029185] shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Clinical Safety & Bioequivalence Guide
                  </div>
                  <div className="text-xs text-slate-600">
                    AB rating standards, CDSCO bounds & pharmacist copay advice
                  </div>
                </div>
              </div>
              {safetyOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              )}
            </button>

            {safetyOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div>
                  <span className="font-semibold text-slate-900">AB-Rating Bioequivalence: </span>
                  {activeMedicine.clinicalNote}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Pharmacist Guidance: </span>
                  {activeMedicine.pharmacistAdvice}
                </div>
              </div>
            )}
          </section>

          {/* Unified Care Basket Dock */}
          <section className="rounded-xl bg-[#0f172a] text-white p-4 shadow-md flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-300">Unified Rx + Diagnostic Basket</div>
              <div className="text-sm sm:text-base font-bold tabular-nums">
                {basket.reduce((s, i) => s + i.quantity, 0)} items ·{' '}
                <span className="text-[#10B981]">{formatINR(basketTotal)}</span> locked
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenEstimator}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#029185] hover:bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <span>Open Estimator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
