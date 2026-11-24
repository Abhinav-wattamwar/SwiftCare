import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Lock,
  Minus,
  Plus,
  Route,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  BasketItem,
  CoverageMode,
  DiagnosticPackage,
  DiagnosticSectionId,
  LedgerSummary,
  RouteOptimization,
} from '../types/swiftcare';
import { formatINR } from '../utils/pricing';

interface EstimatorScreenProps {
  basket: BasketItem[];
  coverageMode: CoverageMode;
  ledger: LedgerSummary;
  routeOptimization: RouteOptimization;
  consolidatedRouteApplied: boolean;
  priceDropMonitorEnabled: boolean;
  diagnosticPackages: DiagnosticPackage[];
  onChangeCoverageMode: (mode: CoverageMode) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onToggleConsolidatedRoute: () => void;
  onTogglePriceDropMonitor: () => void;
  onAddDiagnosticPackage: (pkg: DiagnosticPackage) => void;
  onProceedToCheckout: () => void;
  onGoToCompare: () => void;
}

export function EstimatorScreen({
  basket,
  coverageMode,
  ledger,
  routeOptimization,
  consolidatedRouteApplied,
  priceDropMonitorEnabled,
  diagnosticPackages,
  onChangeCoverageMode,
  onUpdateQuantity,
  onRemoveItem,
  onToggleConsolidatedRoute,
  onTogglePriceDropMonitor,
  onAddDiagnosticPackage,
  onProceedToCheckout,
  onGoToCompare,
}: EstimatorScreenProps) {
  const [diagFilter, setDiagFilter] = useState<Exclude<DiagnosticSectionId, 'all'>>('packages');

  const deductiblePct = Math.min(
    100,
    Math.round((ledger.deductibleMetAfter / ledger.deductibleTarget) * 100),
  );
  const deductibleBeforePct = Math.min(
    100,
    Math.round((ledger.deductibleMetBefore / ledger.deductibleTarget) * 100),
  );

  const basketTitles = new Set(basket.map((b) => b.title));
  const filteredPackages = diagnosticPackages.filter((pkg) => pkg.section === diagFilter);

  return (
    <div className="space-y-5">
      {/* Header & Coverage Mode Switcher */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Care Cost Estimator
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Bundled medicine + NABL diagnostic cost ledger with real-time deductible tracking
          </p>
        </div>

        <div
          role="group"
          aria-label="Coverage mode switcher"
          className="inline-flex items-center gap-1 p-1 bg-[#f0f4f3] rounded-lg"
        >
          <button
            type="button"
            onClick={() => onChangeCoverageMode('cash_pass')}
            className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              coverageMode === 'cash_pass'
                ? 'bg-white text-[#029185] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash + SwiftCare Pass
          </button>
          <button
            type="button"
            onClick={() => onChangeCoverageMode('insurance_deductible')}
            className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              coverageMode === 'insurance_deductible'
                ? 'bg-white text-[#029185] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Insurance Deductible Mode
          </button>
        </div>
      </section>

      {/* Deductible Tracker (highlighted in Insurance Deductible Mode, visible compactly otherwise) */}
      <section
        className={`rounded-xl border p-4 transition-colors ${
          coverageMode === 'insurance_deductible'
            ? 'bg-white border-[#029185]/50 shadow-xs'
            : 'bg-[#f0f4f3] border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Annual OPD Deductible Progress (Star Health Care Shield)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {coverageMode === 'insurance_deductible'
                ? `Current basket applies ${formatINR(ledger.deductibleApplied)} toward your deductible.`
                : 'Switch to Insurance Deductible Mode above to apply this basket to your annual deductible.'}
            </p>
          </div>
          <div className="text-right tabular-nums">
            <span className="text-base font-bold text-[#029185]">
              {formatINR(
                coverageMode === 'insurance_deductible'
                  ? ledger.deductibleMetAfter
                  : ledger.deductibleMetBefore,
              )}
            </span>
            <span className="text-xs text-slate-500">
              {' '}
              / {formatINR(ledger.deductibleTarget)} met
            </span>
          </div>
        </div>

        <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-[#029185] transition-all duration-200"
            style={{
              width: `${
                coverageMode === 'insurance_deductible' ? deductiblePct : deductibleBeforePct
              }%`,
            }}
          />
        </div>
      </section>

      {basket.length === 0 ? (
        <section className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <h2 className="text-base font-bold text-slate-900">Your Care Basket is empty</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Add a prescription medicine from the Compare screen or select an NABL diagnostic package
            below to lock cashless discounts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onGoToCompare}
              className="rounded-lg bg-[#029185] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D9488]"
            >
              Compare Medicines
            </button>
            <button
              type="button"
              onClick={() => onAddDiagnosticPackage(diagnosticPackages[0])}
              className="rounded-lg border border-slate-200 bg-[#f6faf9] px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
            >
              Add Metabolic Panel ({formatINR(diagnosticPackages[0].lockedPrice)})
            </button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Basket Items + Route Optimizer + Optional NABL Lab Bundles */}
          <div className="lg:col-span-7 space-y-4">
            <section className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
              <div className="px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Care Basket Items ({basket.length})
                </h2>
                <button
                  type="button"
                  onClick={onGoToCompare}
                  className="text-xs font-semibold text-[#029185] hover:underline"
                >
                  + Add Medicine
                </button>
              </div>

              {basket.map((item) => (
                <div key={item.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    {item.packageTag && (
                      <p className="text-[11px] font-semibold text-[#10B981]">
                        {item.packageTag}
                      </p>
                    )}
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600">{item.subtitle}</p>
                    <p className="text-xs text-slate-500">
                      {item.providerName} · {item.distanceKm.toFixed(1)} km · {item.voucherCode}
                    </p>

                    <div className="pt-2 flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-[#f6faf9]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200/60 rounded-l-lg"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-900 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200/60 rounded-r-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${item.title} from basket`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-[#E11D48] rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-base font-bold text-slate-900">
                      {formatINR(item.unitLockedPrice * item.quantity)}
                    </div>
                    <div className="text-xs text-slate-500 line-through">
                      {formatINR(item.unitRetailMrp * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Pickup Route Optimizer */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Route className="w-4 h-4 text-[#029185] mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Pickup Route Optimizer</h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {routeOptimization.summaryText}
                    </p>
                  </div>
                </div>

                {routeOptimization.recommendedMode === 'consolidated' && (
                  <button
                    type="button"
                    onClick={onToggleConsolidatedRoute}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      consolidatedRouteApplied
                        ? 'bg-[#10B981]/12 text-[#029185] border border-[#10B981]/40'
                        : 'bg-[#f0f4f3] text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {consolidatedRouteApplied ? 'Consolidated Active' : 'Consolidate Pickup'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="rounded-lg bg-[#f6faf9] p-2.5 border border-slate-100">
                  <div className="text-slate-500">Split Best Price</div>
                  <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                    {formatINR(routeOptimization.splitTotal)} ·{' '}
                    {routeOptimization.splitDistanceKm.toFixed(1)} km
                  </div>
                </div>
                <div className="rounded-lg bg-[#f6faf9] p-2.5 border border-slate-100">
                  <div className="text-slate-500">Single-Stop + Home Lab</div>
                  <div className="font-bold text-[#029185] tabular-nums mt-0.5">
                    {formatINR(routeOptimization.consolidatedTotal)} ·{' '}
                    {routeOptimization.consolidatedDistanceKm.toFixed(1)} km
                  </div>
                </div>
              </div>
            </section>

            {/* Quick-Add NABL Diagnostic Bundles & 42 Master Index Tests */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Add NABL Diagnostic Tests & Packages ({diagnosticPackages.length})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                {(
                  [
                    { id: 'packages', label: 'Health Packages (4)' },
                    { id: 'hematology', label: 'Hematology (5)' },
                    { id: 'diabetes', label: 'Diabetes (4)' },
                    { id: 'organ', label: 'Organ & Biochem (7)' },
                    { id: 'thyroid', label: 'Thyroid & Vitamins (9)' },
                    { id: 'fever', label: 'Fever & Infection (7)' },
                    { id: 'radiology', label: 'Radiology (6)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDiagFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                      diagFilter === tab.id
                        ? 'bg-[#0f172a] text-white border-[#0f172a]'
                        : 'bg-[#f6faf9] text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {filteredPackages.map((pkg) => {
                  const alreadyIn = basketTitles.has(pkg.name);
                  return (
                    <div
                      key={pkg.id}
                      className="rounded-lg border border-slate-200 bg-[#f6faf9] p-3 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{pkg.name}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {pkg.categoryLabel} · {pkg.turnaroundHours}h report
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div>
                          <span className="text-xs font-bold text-[#029185] tabular-nums">
                            {formatINR(pkg.lockedPrice)}
                          </span>
                          <span className="text-[10px] text-slate-500 line-through ml-1 tabular-nums">
                            {formatINR(pkg.retailMrp)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyIn}
                          onClick={() => onAddDiagnosticPackage(pkg)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                            alreadyIn
                              ? 'bg-slate-200 text-slate-500 cursor-default'
                              : 'bg-[#029185] text-white hover:bg-[#0D9488]'
                          }`}
                        >
                          {alreadyIn ? 'In Basket' : '+ Bundle'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Transparent Price Ledger, Price-Drop Monitor, Primary CTA */}
          <div className="lg:col-span-5 space-y-4">
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900">Transparent Price Ledger</h2>

              <dl className="space-y-2 text-sm border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Standard Retail MRP</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">
                    {formatINR(ledger.retailMrpTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">SwiftCare Network Discounts</dt>
                  <dd className="font-semibold text-[#10B981] tabular-nums">
                    -{formatINR(ledger.networkDiscountTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Digital Vouchers Applied</dt>
                  <dd className="font-semibold text-[#10B981] tabular-nums">
                    -{formatINR(ledger.digitalVoucherTotal)}
                  </dd>
                </div>
                {ledger.promoCodeDiscount > 0 && ledger.appliedCode && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-600">
                      {ledger.appliedCodeKind === 'couple' ? 'Couple Code' : 'Promo Code'} (
                      {ledger.appliedCode})
                    </dt>
                    <dd className="font-semibold text-[#10B981] tabular-nums">
                      -{formatINR(ledger.promoCodeDiscount)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Dispensing & Home Phlebotomy Fee</dt>
                  <dd className="font-semibold text-[#029185] tabular-nums">FREE (₹0.00)</dd>
                </div>
                {coverageMode === 'insurance_deductible' && ledger.insurerCoveredPortion > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-600">Insurer Post-Deductible Share</dt>
                    <dd className="font-semibold text-[#10B981] tabular-nums">
                      -{formatINR(ledger.insurerCoveredPortion)}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-sm font-bold text-slate-900">Locked Out-of-Pocket Total</div>
                  <div className="text-xs font-semibold text-[#10B981] tabular-nums">
                    {ledger.savingsPercent}% patient savings ({formatINR(ledger.totalSavings)} saved)
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#029185] tabular-nums">
                  {formatINR(ledger.outOfPocketTotal)}
                </div>
              </div>
            </section>

            {/* Price-Drop Monitor Toggle */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Bell className="w-4 h-4 text-[#029185] mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-900">Price-Drop Monitor</div>
                  <div className="text-xs text-slate-600">
                    Notify me if local Nagpur pharmacy prices fall further
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={priceDropMonitorEnabled}
                aria-label="Toggle automated local price-drop alerts"
                onClick={onTogglePriceDropMonitor}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  priceDropMonitorEnabled ? 'bg-[#029185]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    priceDropMonitorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </section>

            {/* Primary CTA + Trust Assurances */}
            <section className="space-y-2.5">
              <button
                type="button"
                onClick={onProceedToCheckout}
                className="w-full h-12 rounded-xl bg-[#029185] hover:bg-[#0D9488] active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>Proceed to Cashless Checkout & Lock</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#029185]" />
                  <span>ABDM & HIPAA Compliant</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#029185]" />
                  <span>256-Bit Encrypted Pass</span>
                </span>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
