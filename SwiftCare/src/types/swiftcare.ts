export type AppTab = 'compare' | 'estimator' | 'directory' | 'alerts';

export type RadiusKm = 2 | 5 | 10;

export type DrugFormType = 'generic' | 'brand';

export type PriceSortOrder = 'asc' | 'desc';

export type CoverageMode = 'cash_pass' | 'insurance_deductible';

export type LabFulfillmentMode = 'home_collection' | 'lab_walkin';

export type PaymentMethodId = 'upi_autopay' | 'card' | 'opd_wallet' | 'cashless_counter';

export type UpiAppId = 'gpay' | 'phonepe' | 'paytm';

export type Scene3DMode = 'rx-inspector' | 'network-map';

export type CameraPreset = 'hero' | 'top' | 'detail';

export type DiagnosticSectionId =
  | 'all'
  | 'hematology'
  | 'diabetes'
  | 'organ'
  | 'thyroid'
  | 'fever'
  | 'radiology'
  | 'packages';

export interface Medicine {
  id: string;
  genericName: string;
  brandName: string;
  drugClass: string;
  dosageForm: string;
  packSize: number;
  strengths: string[];
  baseGenericPrice10mg: number;
  baseBrandPrice10mg: number;
  bioequivalenceCode: string;
  savingsHeadlinePercent: number;
  manufacturerGeneric: string;
  manufacturerBrand: string;
  clinicalNote: string;
  pharmacistAdvice: string;
  rxcui?: string;
  fdaIndication?: string;
  sourceTag?: string;
}

export interface DiagnosticPackage {
  id: string;
  name: string;
  shortLabel: string;
  code: string;
  section: Exclude<DiagnosticSectionId, 'all'>;
  categoryLabel: string;
  parametersCount: number;
  lockedPrice: number;
  retailMrp: number;
  budgetPrice: number;
  nablChainPrice: number;
  avgPrice: number;
  fastingInstructions: string;
  turnaroundHours: number;
  defaultLabId: string;
  includedParameters?: string;
  savingsHeadlinePercent?: number;
}

export interface Provider {
  id: string;
  name: string;
  shortName: string;
  type: 'pharmacy' | 'lab';
  neighborhood: string;
  address: string;
  distanceKm: number;
  driveThru: boolean;
  curbside: boolean;
  homeDelivery: boolean;
  is24x7: boolean;
  nablAccredited?: boolean;
  rating: number;
  priceMultiplier: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Ready in 15m';
  voucherCode: string;
  fastingRequired?: boolean;
  coords: { x: number; z: number };
}

export interface FulfillmentQuote {
  provider: Provider;
  lockedPrice: number;
  retailMrp: number;
  savingsAmount: number;
  savingsPercent: number;
  isLowest: boolean;
  badgeText: string;
}

export interface LabQuote {
  provider: Provider;
  diagnosticPackage: DiagnosticPackage;
  lockedPrice: number;
  retailMrp: number;
  savingsAmount: number;
  savingsPercent: number;
  isLowest: boolean;
  badgeText: string;
}

export interface DiscountCodeRule {
  code: string;
  kind: 'promo' | 'couple';
  discountType: 'percent' | 'flat';
  value: number;
  minSpend: number;
  title: string;
  description: string;
  beneficiariesCount: number;
}

export interface AppliedDiscountResult {
  valid: boolean;
  discountAmount: number;
  rule?: DiscountCodeRule;
  error?: string;
}

export interface BasketItem {
  id: string;
  kind: 'medicine' | 'lab';
  title: string;
  subtitle: string;
  providerId: string;
  providerName: string;
  neighborhood: string;
  distanceKm: number;
  unitLockedPrice: number;
  unitRetailMrp: number;
  voucherDiscountPerUnit: number;
  quantity: number;
  packageTag?: string;
  voucherCode: string;
  fastingInstructions?: string;
}

export interface LedgerSummary {
  retailMrpTotal: number;
  networkDiscountTotal: number;
  digitalVoucherTotal: number;
  promoCodeDiscount: number;
  appliedCode?: string;
  appliedCodeKind?: 'promo' | 'couple';
  dispensingFee: number;
  subtotalAfterDiscounts: number;
  outOfPocketTotal: number;
  totalSavings: number;
  savingsPercent: number;
  deductibleMetBefore: number;
  deductibleTarget: number;
  deductibleApplied: number;
  deductibleMetAfter: number;
  insurerCoveredPortion: number;
  remainingDeductibleAfter: number;
}

export interface RouteOptimization {
  recommendedMode: 'consolidated' | 'split';
  consolidatedLabel: string;
  consolidatedTotal: number;
  consolidatedDistanceKm: number;
  splitTotal: number;
  splitDistanceKm: number;
  savingsDelta: number;
  summaryText: string;
}

export interface PriceAlert {
  id: string;
  medicineId: string;
  medicineName: string;
  strength: string;
  targetPrice: number;
  currentLowestPrice: number;
  enabled: boolean;
  lastChecked: string;
  triggeredDrop?: string;
}

export type EntryPhase = 'splash' | 'auth' | 'ready';

export type AuthProviderId = 'google' | 'apple' | 'abha' | 'email';

export type VerificationStepStatus = 'idle' | 'active' | 'done' | 'error';

export interface VerificationStepItem {
  id: string;
  label: string;
  detail: string;
  status: VerificationStepStatus;
}

export interface AuthenticatedPatient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  abhaId: string;
  abhaAddress: string;
  abhaVerified: boolean;
  authProvider: AuthProviderId;
  city: string;
  neighborhood: string;
  insurer: string;
  policyId: string;
  deductibleMet: number;
  deductibleAnnualTarget: number;
  rxId: string;
  prescriber: string;
  clinic: string;
  rxDate: string;
  isSandboxFallback?: boolean;
}

export interface CashlessPassRecord {
  id: string;
  patientId: string;
  passCode: string;
  rxRef: string;
  providerSummary: string;
  itemCount: number;
  appliedCode?: string | null;
  savingsTotal: number;
  payableTotal: number;
  paymentMethod: PaymentMethodId;
  labMode?: LabFulfillmentMode;
  createdAt: string;
}

