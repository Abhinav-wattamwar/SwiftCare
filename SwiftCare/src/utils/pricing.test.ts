import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDrugQuote,
  rankPharmacyQuotes,
  rankLabQuotes,
  calculateBarometerStats,
  calculateLedger,
  optimizePickupRoute,
  filterProvidersByRadius,
  validateAndApplyDiscountCode,
  formatINR,
} from './pricing';
import {
  DIAGNOSTIC_PACKAGES,
  DISCOUNT_CODES,
  INITIAL_BASKET,
  MEDICINES,
  NAGPUR_PROVIDERS,
  PATIENT_PROFILE,
} from '../data/catalog';

test('formatINR formats Indian Rupee currency with 2 decimals', () => {
  assert.equal(formatINR(38.6), '₹38.60');
  assert.equal(formatINR(7.2), '₹7.20');
  assert.equal(formatINR(1500), '₹1500.00');
});

test('calculateDrugQuote computes AB-rated generic savings vs brand', () => {
  const atorvastatin = MEDICINES[0];
  const apollo = NAGPUR_PROVIDERS.find((p) => p.id === 'prov-apollo')!;

  const genericQuote = calculateDrugQuote(atorvastatin, '10mg', 'generic', apollo);
  const brandQuote = calculateDrugQuote(atorvastatin, '10mg', 'brand', apollo);

  assert.equal(genericQuote.lockedPrice, 8.4);
  assert.ok(genericQuote.savingsPercent >= 90);
  assert.ok(brandQuote.lockedPrice > genericQuote.lockedPrice * 4);
});

test('rankPharmacyQuotes supports single-click Ascending and Descending sorting while preserving lowest tag', () => {
  const atorvastatin = MEDICINES[0];
  const ascQuotes = rankPharmacyQuotes(atorvastatin, '10mg', 'generic', NAGPUR_PROVIDERS, 5, 'asc');
  const descQuotes = rankPharmacyQuotes(atorvastatin, '10mg', 'generic', NAGPUR_PROVIDERS, 5, 'desc');

  assert.ok(ascQuotes.length > 1);
  for (let i = 1; i < ascQuotes.length; i++) {
    assert.ok(ascQuotes[i].lockedPrice >= ascQuotes[i - 1].lockedPrice);
  }
  for (let i = 1; i < descQuotes.length; i++) {
    assert.ok(descQuotes[i].lockedPrice <= descQuotes[i - 1].lockedPrice);
  }

  assert.equal(ascQuotes[0].isLowest, true);
  assert.equal(descQuotes[descQuotes.length - 1].isLowest, true);
});

test('rankLabQuotes sorts NABL diagnostic centres in Ascending and Descending order', () => {
  const cmp = DIAGNOSTIC_PACKAGES[0];
  const ascLabs = rankLabQuotes(cmp, NAGPUR_PROVIDERS, 5, 'asc');
  const descLabs = rankLabQuotes(cmp, NAGPUR_PROVIDERS, 5, 'desc');

  assert.equal(ascLabs.length, 4);
  assert.ok(ascLabs[0].lockedPrice < ascLabs[ascLabs.length - 1].lockedPrice);
  assert.ok(descLabs[0].lockedPrice > descLabs[descLabs.length - 1].lockedPrice);
  assert.equal(ascLabs[0].isLowest, true);
  assert.equal(descLabs[descLabs.length - 1].isLowest, true);
});

test('validateAndApplyDiscountCode handles Couple bundles, Promo coupons, and validation errors', () => {
  const emptyRes = validateAndApplyDiscountCode('  ', 38.6, DISCOUNT_CODES);
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.error);

  const invalidRes = validateAndApplyDiscountCode('NOPE99', 38.6, DISCOUNT_CODES);
  assert.equal(invalidRes.valid, false);

  const coupleRes = validateAndApplyDiscountCode('couple25', 38.6, DISCOUNT_CODES);
  assert.equal(coupleRes.valid, true);
  assert.equal(coupleRes.rule?.kind, 'couple');
  assert.equal(coupleRes.discountAmount, 9.65);

  const promoRes = validateAndApplyDiscountCode('SWIFT20', 38.6, DISCOUNT_CODES);
  assert.equal(promoRes.valid, true);
  assert.equal(promoRes.rule?.kind, 'promo');
  assert.equal(promoRes.discountAmount, 7.72);

  const minSpendFail = validateAndApplyDiscountCode('FIRST50', 38.6, DISCOUNT_CODES);
  assert.equal(minSpendFail.valid, false);
  assert.ok(minSpendFail.error?.includes('100.00'));

  const flatSuccess = validateAndApplyDiscountCode('FIRST50', 120, DISCOUNT_CODES);
  assert.equal(flatSuccess.valid, true);
  assert.equal(flatSuccess.discountAmount, 50);
});

test('calculateBarometerStats spans all 14 licensed dispensaries', () => {
  const atorvastatin = MEDICINES[0];
  const stats = calculateBarometerStats(atorvastatin, '10mg', 'generic', NAGPUR_PROVIDERS);

  assert.equal(stats.dispensaryCount, 14);
  assert.ok(stats.minPrice < 10);
  assert.ok(stats.maxPrice >= 140);
  assert.ok(stats.selectedPercentile >= 0 && stats.selectedPercentile <= 100);
});

test('calculateLedger calculates ₹38.60 baseline and reduces payable total when COUPLE25 applied', () => {
  const cashLedger = calculateLedger(
    INITIAL_BASKET,
    'cash_pass',
    PATIENT_PROFILE.deductibleMet,
    PATIENT_PROFILE.deductibleAnnualTarget,
  );
  assert.equal(cashLedger.outOfPocketTotal, 38.6);
  assert.equal(cashLedger.savingsPercent, 87);

  const coupleRule = DISCOUNT_CODES.find((c) => c.code === 'COUPLE25')!;
  const discountedLedger = calculateLedger(
    INITIAL_BASKET,
    'cash_pass',
    PATIENT_PROFILE.deductibleMet,
    PATIENT_PROFILE.deductibleAnnualTarget,
    coupleRule,
  );
  assert.equal(discountedLedger.promoCodeDiscount, 9.65);
  assert.equal(discountedLedger.outOfPocketTotal, 28.95);
  assert.equal(discountedLedger.appliedCode, 'COUPLE25');
});

test('optimizePickupRoute detects multi-branch consolidation vs split savings', () => {
  const route = optimizePickupRoute(INITIAL_BASKET);
  assert.equal(route.recommendedMode, 'consolidated');
  assert.equal(route.splitTotal, 38.6);
  assert.ok(route.consolidatedDistanceKm < route.splitDistanceKm);
});

test('filterProvidersByRadius respects pharmacy/lab, 24x7, and drive-thru filters', () => {
  const labs = filterProvidersByRadius(NAGPUR_PROVIDERS, 5, 'lab', false, false);
  assert.equal(labs.length, 4);
  assert.ok(labs.every((l) => l.nablAccredited === true));

  const driveThru24x7 = filterProvidersByRadius(NAGPUR_PROVIDERS, 5, 'pharmacy', true, true);
  assert.ok(driveThru24x7.every((p) => p.is24x7 && p.driveThru));
});

test('DIAGNOSTIC_PACKAGES contains all 42 PDF benchmark tests across 7 sections', () => {
  assert.equal(DIAGNOSTIC_PACKAGES.length, 42);

  const countBySection = DIAGNOSTIC_PACKAGES.reduce<Record<string, number>>((acc, item) => {
    acc[item.section] = (acc[item.section] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(countBySection.hematology, 5);
  assert.equal(countBySection.diabetes, 4);
  assert.equal(countBySection.organ, 7);
  assert.equal(countBySection.thyroid, 9);
  assert.equal(countBySection.fever, 7);
  assert.equal(countBySection.radiology, 6);
  assert.equal(countBySection.packages, 4);

  const mri = DIAGNOSTIC_PACKAGES.find((d) => d.id === 'diag-mri')!;
  assert.equal(mri.budgetPrice, 4500);
  assert.equal(mri.nablChainPrice, 8000);
  assert.equal(mri.avgPrice, 6250);

  const fullBody = DIAGNOSTIC_PACKAGES.find((d) => d.id === 'diag-pkg-fullbody')!;
  assert.equal(fullBody.budgetPrice, 1259);
  assert.equal(fullBody.nablChainPrice, 3400);
  assert.equal(fullBody.savingsHeadlinePercent, 63);
});

