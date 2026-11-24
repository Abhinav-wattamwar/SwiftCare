import {
  AppliedDiscountResult,
  BasketItem,
  CoverageMode,
  DiagnosticPackage,
  DiscountCodeRule,
  DrugFormType,
  FulfillmentQuote,
  LabQuote,
  LedgerSummary,
  Medicine,
  PriceSortOrder,
  Provider,
  RadiusKm,
  RouteOptimization,
} from '../types/swiftcare';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export function getStrengthMultiplier(strengths: string[], activeStrength: string): number {
  const idx = strengths.indexOf(activeStrength);
  if (idx <= 0) return 1.0;
  if (idx === 1) return 1.16;
  if (idx === 2) return 1.42;
  return 1.78;
}

export function calculateDrugQuote(
  medicine: Medicine,
  strength: string,
  formType: DrugFormType,
  provider: Provider,
): Omit<FulfillmentQuote, 'isLowest' | 'badgeText'> {
  const strengthMult = getStrengthMultiplier(medicine.strengths, strength);
  const retailBase = medicine.baseBrandPrice10mg * strengthMult;
  const retailMrp = round2(retailBase * (0.95 + (provider.priceMultiplier - 0.9) * 0.25));

  const baseTarget =
    formType === 'generic'
      ? medicine.baseGenericPrice10mg * strengthMult
      : medicine.baseBrandPrice10mg * 0.42 * strengthMult;

  const lockedPrice = round2(baseTarget * provider.priceMultiplier);
  const savingsAmount = round2(Math.max(0, retailMrp - lockedPrice));
  const savingsPercent =
    retailMrp > 0 ? Math.max(0, Math.round((savingsAmount / retailMrp) * 100)) : 0;

  return {
    provider,
    lockedPrice,
    retailMrp,
    savingsAmount,
    savingsPercent,
  };
}

export function rankPharmacyQuotes(
  medicine: Medicine,
  strength: string,
  formType: DrugFormType,
  providers: Provider[],
  radiusKm: RadiusKm,
  sortOrder: PriceSortOrder = 'asc',
): FulfillmentQuote[] {
  const pharmaciesInRadius = providers.filter(
    (p) => p.type === 'pharmacy' && p.distanceKm <= radiusKm,
  );

  if (pharmaciesInRadius.length === 0) return [];

  const rawQuotes = pharmaciesInRadius.map((p) =>
    calculateDrugQuote(medicine, strength, formType, p),
  );
  const minPrice = Math.min(...rawQuotes.map((q) => q.lockedPrice));

  const sorted = [...rawQuotes].sort((a, b) =>
    sortOrder === 'asc'
      ? a.lockedPrice - b.lockedPrice
      : b.lockedPrice - a.lockedPrice,
  );

  return sorted.map((q) => {
    const isLowest = q.lockedPrice === minPrice;
    return {
      ...q,
      isLowest,
      badgeText: isLowest
        ? 'Lowest Locked Rate'
        : q.provider.driveThru
          ? 'Drive-Thru Express'
          : q.provider.homeDelivery
            ? 'Doorstep Eligible'
            : 'Counter Pickup',
    };
  });
}

export function calculateLabQuote(
  diagnosticPackage: DiagnosticPackage,
  provider: Provider,
): Omit<LabQuote, 'isLowest' | 'badgeText'> {
  const lockedPrice = round2(diagnosticPackage.lockedPrice * provider.priceMultiplier);
  const retailMrp = round2(
    diagnosticPackage.retailMrp * (0.96 + (provider.priceMultiplier - 0.9) * 0.2),
  );
  const savingsAmount = round2(Math.max(0, retailMrp - lockedPrice));
  const savingsPercent =
    retailMrp > 0 ? Math.max(0, Math.round((savingsAmount / retailMrp) * 100)) : 0;

  return {
    provider,
    diagnosticPackage,
    lockedPrice,
    retailMrp,
    savingsAmount,
    savingsPercent,
  };
}

export function rankLabQuotes(
  diagnosticPackage: DiagnosticPackage,
  providers: Provider[],
  radiusKm: RadiusKm,
  sortOrder: PriceSortOrder = 'asc',
): LabQuote[] {
  const labsInRadius = providers.filter(
    (p) => p.type === 'lab' && p.distanceKm <= radiusKm,
  );

  if (labsInRadius.length === 0) return [];

  const rawQuotes = labsInRadius.map((p) => calculateLabQuote(diagnosticPackage, p));
  const minPrice = Math.min(...rawQuotes.map((q) => q.lockedPrice));

  const sorted = [...rawQuotes].sort((a, b) =>
    sortOrder === 'asc'
      ? a.lockedPrice - b.lockedPrice
      : b.lockedPrice - a.lockedPrice,
  );

  return sorted.map((q) => {
    const isLowest = q.lockedPrice === minPrice;
    return {
      ...q,
      isLowest,
      badgeText: isLowest
        ? 'Lowest NABL Rate'
        : q.provider.is24x7
          ? '24x7 NABL Center'
          : 'Free Home Phlebotomy',
    };
  });
}

export interface BarometerStats {
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  dispensaryCount: number;
  selectedPrice: number;
  selectedPercentile: number;
}

export function calculateBarometerStats(
  medicine: Medicine,
  strength: string,
  formType: DrugFormType,
  allPharmacies: Provider[],
): BarometerStats {
  const pharmacies = allPharmacies.filter((p) => p.type === 'pharmacy');
  const prices = pharmacies
    .map((p) => calculateDrugQuote(medicine, strength, formType, p).lockedPrice)
    .sort((a, b) => a - b);

  const minPrice = prices.length > 0 ? prices[0] : 7.2;
  const maxGenericOrBrand =
    formType === 'generic'
      ? round2(
          medicine.baseBrandPrice10mg *
            getStrengthMultiplier(medicine.strengths, strength) *
            1.1875,
        )
      : prices[prices.length - 1] ?? 142.5;

  const medianPrice =
    prices.length > 0
      ? prices[Math.floor(prices.length / 2)]
      : round2((minPrice + maxGenericOrBrand) / 2);

  const selectedPrice = prices[0] ?? minPrice;
  const span = Math.max(1, maxGenericOrBrand - minPrice);
  const selectedPercentile = Math.min(
    100,
    Math.max(2, Math.round(((selectedPrice - minPrice) / span) * 100)),
  );

  return {
    minPrice,
    maxPrice: maxGenericOrBrand,
    medianPrice,
    dispensaryCount: pharmacies.length,
    selectedPrice,
    selectedPercentile,
  };
}

export function validateAndApplyDiscountCode(
  codeInput: string,
  lockedSubtotal: number,
  rules: DiscountCodeRule[],
): AppliedDiscountResult {
  const normalized = codeInput.trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      discountAmount: 0,
      error: 'Enter a valid Couple or Promo code (e.g. COUPLE25, SWIFT20).',
    };
  }

  const rule = rules.find((r) => r.code.toUpperCase() === normalized);
  if (!rule) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Code "${normalized}" is not recognized. Try COUPLE25, SWIFT20, FAMILY30, or FIRST50.`,
    };
  }

  if (lockedSubtotal < rule.minSpend) {
    return {
      valid: false,
      discountAmount: 0,
      error: `${rule.code} requires a minimum basket total of ${formatINR(rule.minSpend)}.`,
    };
  }

  const rawDiscount =
    rule.discountType === 'percent'
      ? round2((lockedSubtotal * rule.value) / 100)
      : round2(rule.value);

  const discountAmount = round2(Math.min(lockedSubtotal, rawDiscount));

  return {
    valid: true,
    discountAmount,
    rule,
  };
}

export function calculateLedger(
  basket: BasketItem[],
  coverageMode: CoverageMode,
  deductibleMetBefore: number,
  deductibleTarget: number,
  appliedDiscountRule?: DiscountCodeRule | null,
): LedgerSummary {
  const retailMrpTotal = round2(
    basket.reduce((sum, item) => sum + item.unitRetailMrp * item.quantity, 0),
  );
  const lockedSubtotal = round2(
    basket.reduce((sum, item) => sum + item.unitLockedPrice * item.quantity, 0),
  );
  const digitalVoucherTotal = round2(
    basket.reduce((sum, item) => sum + item.voucherDiscountPerUnit * item.quantity, 0),
  );

  const grossDiscounted = round2(Math.max(0, retailMrpTotal - lockedSubtotal));
  const networkDiscountTotal = round2(Math.max(0, grossDiscounted - digitalVoucherTotal));

  let promoCodeDiscount = 0;
  let appliedCode: string | undefined;
  let appliedCodeKind: 'promo' | 'couple' | undefined;

  if (appliedDiscountRule && lockedSubtotal >= appliedDiscountRule.minSpend) {
    const res = validateAndApplyDiscountCode(
      appliedDiscountRule.code,
      lockedSubtotal,
      [appliedDiscountRule],
    );
    if (res.valid) {
      promoCodeDiscount = res.discountAmount;
      appliedCode = appliedDiscountRule.code;
      appliedCodeKind = appliedDiscountRule.kind;
    }
  }

  const subtotalAfterDiscounts = round2(Math.max(0, lockedSubtotal - promoCodeDiscount));

  let deductibleApplied = 0;
  let insurerCoveredPortion = 0;
  let outOfPocketTotal = subtotalAfterDiscounts;

  if (coverageMode === 'insurance_deductible') {
    const remainingBefore = Math.max(0, deductibleTarget - deductibleMetBefore);
    deductibleApplied = round2(Math.min(subtotalAfterDiscounts, remainingBefore));
    const excessOverDeductible = round2(Math.max(0, subtotalAfterDiscounts - deductibleApplied));
    insurerCoveredPortion = round2(excessOverDeductible * 0.8);
    outOfPocketTotal = round2(deductibleApplied + excessOverDeductible * 0.2);
  }

  const deductibleMetAfter = round2(
    Math.min(deductibleTarget, deductibleMetBefore + deductibleApplied),
  );
  const remainingDeductibleAfter = round2(Math.max(0, deductibleTarget - deductibleMetAfter));

  const totalSavings = round2(Math.max(0, retailMrpTotal - outOfPocketTotal));
  const savingsPercent =
    retailMrpTotal > 0 ? Math.min(99, Math.round((totalSavings / retailMrpTotal) * 100)) : 0;

  return {
    retailMrpTotal,
    networkDiscountTotal,
    digitalVoucherTotal,
    promoCodeDiscount,
    appliedCode,
    appliedCodeKind,
    dispensingFee: 0,
    subtotalAfterDiscounts,
    outOfPocketTotal,
    totalSavings,
    savingsPercent,
    deductibleMetBefore,
    deductibleTarget,
    deductibleApplied,
    deductibleMetAfter,
    insurerCoveredPortion,
    remainingDeductibleAfter,
  };
}

export function optimizePickupRoute(basket: BasketItem[]): RouteOptimization {
  const splitTotal = round2(
    basket.reduce((sum, item) => sum + item.unitLockedPrice * item.quantity, 0),
  );
  const uniqueProviders = new Set(basket.map((b) => b.providerId));
  const splitDistanceKm = round2(
    basket.reduce((sum, b) => sum + b.distanceKm, 0) || 0,
  );

  if (uniqueProviders.size > 1 && basket.length > 1) {
    const consolidatedTotal = round2(splitTotal + 2.2);
    const consolidatedDistanceKm = 0.8;
    return {
      recommendedMode: 'consolidated',
      consolidatedLabel:
        'Consolidate Rx at Apollo Dharampeth (0.8 km) + Free Home Lab Phlebotomy',
      consolidatedTotal,
      consolidatedDistanceKm,
      splitTotal,
      splitDistanceKm,
      savingsDelta: round2(consolidatedTotal - splitTotal),
      summaryText: `Save ${(splitDistanceKm - consolidatedDistanceKm).toFixed(1)} km commute for just ₹${(
        consolidatedTotal - splitTotal
      ).toFixed(2)} difference, or split pickup for maximum savings.`,
    };
  }

  return {
    recommendedMode: 'split',
    consolidatedLabel: basket[0]?.providerName ?? 'Single Branch Pickup',
    consolidatedTotal: splitTotal,
    consolidatedDistanceKm: basket[0]?.distanceKm ?? 0.8,
    splitTotal,
    splitDistanceKm,
    savingsDelta: 0,
    summaryText: 'Your basket is already routed to the nearest lowest-cost partner.',
  };
}

export function filterProvidersByRadius(
  providers: Provider[],
  radiusKm: RadiusKm,
  filterType: 'all' | 'pharmacy' | 'lab',
  only24x7: boolean,
  onlyDriveThru: boolean,
): Provider[] {
  return providers
    .filter((p) => p.distanceKm <= radiusKm)
    .filter((p) => (filterType === 'all' ? true : p.type === filterType))
    .filter((p) => (only24x7 ? p.is24x7 : true))
    .filter((p) => (onlyDriveThru ? p.driveThru : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
