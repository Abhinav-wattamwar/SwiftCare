import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Home,
  Lock,
  ShieldCheck,
  Smartphone,
  Store,
  Tag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AuthenticatedPatient,
  BasketItem,
  DiscountCodeRule,
  LabFulfillmentMode,
  LedgerSummary,
  PaymentMethodId,
  UpiAppId,
} from '../types/swiftcare';
import { PATIENT_PROFILE } from '../data/catalog';
import { formatINR } from '../utils/pricing';

export interface CompletedPassPayload {
  passCode: string;
  rxRef: string;
  providerSummary: string;
  itemCount: number;
  appliedCode?: string | null;
  savingsTotal: number;
  payableTotal: number;
  paymentMethod: PaymentMethodId;
  labMode?: LabFulfillmentMode;
}

interface CheckoutScreenProps {
  basket: BasketItem[];
  ledger: LedgerSummary;
  patient: AuthenticatedPatient;
  discountCodes: DiscountCodeRule[];
  appliedDiscountRule: DiscountCodeRule | null;
  onApplyDiscountCode: (code: string) => { valid: boolean; error?: string };
  onRemoveDiscountCode: () => void;
  onBackToEstimator: () => void;
  onOpenRxModal: () => void;
  onCompleteOrder: (payload: CompletedPassPayload) => void;
}

export function CheckoutScreen({
  basket,
  ledger,
  patient,
  discountCodes,
  appliedDiscountRule,
  onApplyDiscountCode,
  onRemoveDiscountCode,
  onBackToEstimator,
  onOpenRxModal,
  onCompleteOrder,
}: CheckoutScreenProps) {
  const [labMode, setLabMode] = useState<LabFulfillmentMode>('home_collection');
  const [slotTime, setSlotTime] = useState('07:00 AM – 08:00 AM');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('upi_autopay');
  const [upiApp, setUpiApp] = useState<UpiAppId>('gpay');
  const [codeInput, setCodeInput] = useState(appliedDiscountRule?.code ?? '');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [issuedPassCode, setIssuedPassCode] = useState(PATIENT_PROFILE.cashlessPassCode);

  const pharmacyItems = basket.filter((i) => i.kind === 'medicine');
  const labItems = basket.filter((i) => i.kind === 'lab');

  const basketSubtotal = Number(
    basket.reduce((sum, item) => sum + item.unitLockedPrice * item.quantity, 0).toFixed(2),
  );

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onApplyDiscountCode(codeInput);
    if (!res.valid) {
      setCodeError(res.error ?? 'Invalid Couple or Promo code.');
    } else {
      setCodeError(null);
    }
  };

  const handleQuickApply = (code: string) => {
    setCodeInput(code);
    const res = onApplyDiscountCode(code);
    if (!res.valid) {
      setCodeError(res.error ?? 'Unable to apply code.');
    } else {
      setCodeError(null);
    }
  };

  const handleConfirm = () => {
    const generatedCode = `PASS #SC-${String(Math.floor(100 + Math.random() * 900))}`;
    const providers = Array.from(new Set(basket.map((b) => b.providerName))).join(' + ');
    const itemCount = basket.reduce((sum, item) => sum + item.quantity, 0);

    setIssuedPassCode(generatedCode);
    setConfirmed(true);
    onCompleteOrder({
      passCode: generatedCode,
      rxRef: patient.rxId,
      providerSummary: providers || 'Nagpur Network Partner',
      itemCount,
      appliedCode: appliedDiscountRule?.code ?? null,
      savingsTotal: ledger.totalSavings,
      payableTotal: ledger.outOfPocketTotal,
      paymentMethod,
      labMode: labItems.length > 0 ? labMode : undefined,
    });
  };

  if (confirmed) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <nav aria-label="Checkout progress" className="bg-white rounded-xl border border-slate-200 p-4">
          <ol className="grid grid-cols-3 gap-2 text-xs">
            <li className="flex items-center gap-2 font-semibold text-[#10B981]">
              <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              <span>1. Review</span>
            </li>
            <li className="flex items-center gap-2 font-semibold text-[#10B981]">
              <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              <span>2. Fulfilment</span>
            </li>
            <li className="flex items-center gap-2 font-semibold text-[#10B981]">
              <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              <span>3. Payment</span>
            </li>
          </ol>
        </nav>

        <section className="bg-white rounded-xl border border-[#10B981]/50 p-6 shadow-xs text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <img
              src="/assets/aistudio/logo_d3f7ff45.png"
              alt="SwiftCare"
              className="h-10 w-auto object-contain brightness-105 contrast-110 mix-blend-multiply"
            />
            <div className="w-10 h-10 rounded-full bg-[#10B981]/15 text-[#029185] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Cashless Pass Locked & Confirmed
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              48-Hour Rate Protection active until 25 Nov 2026 · ABDM Pass Issued
            </p>
          </div>

          <div className="rounded-xl bg-[#f6faf9] border border-slate-200 p-4 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Digital Pickup Pass</span>
              <span className="font-mono text-sm font-bold text-[#029185]">
                {issuedPassCode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Patient &amp; ABHA ID</span>
              <span className="text-xs font-semibold text-slate-900 font-mono">
                {patient.fullName} · {patient.abhaId}
              </span>
            </div>
            {appliedDiscountRule && ledger.promoCodeDiscount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  {appliedDiscountRule.kind === 'couple'
                    ? 'Couple / Family Code Applied'
                    : 'Promo Code Applied'}
                </span>
                <span className="text-xs font-bold text-[#10B981] font-mono">
                  {appliedDiscountRule.code} (-{formatINR(ledger.promoCodeDiscount)})
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Locked Out-of-Pocket Paid</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {formatINR(ledger.outOfPocketTotal)} (Saved {ledger.savingsPercent}%)
              </span>
            </div>
            {labItems.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">NABL Diagnostic Mode</span>
                <span className="text-xs font-semibold text-slate-900">
                  {labMode === 'home_collection'
                    ? `Free Home Sample (${slotTime})`
                    : `Lab Walk-in (${slotTime})`}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenRxModal}
              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800"
            >
              View Verified #{PATIENT_PROFILE.rxId}
            </button>
            <button
              type="button"
              onClick={onBackToEstimator}
              className="rounded-lg bg-[#029185] hover:bg-[#0D9488] px-4 py-2.5 text-xs font-semibold text-white"
            >
              Return to Care Estimator
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back link + Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToEstimator}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#029185] py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Estimator</span>
        </button>

        <nav aria-label="Checkout progress" className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex-1 max-w-md">
          <ol className="grid grid-cols-3 gap-2 text-xs">
            <li className="flex items-center gap-1.5 font-semibold text-[#10B981]">
              <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </span>
              <span className="truncate">1. Review</span>
            </li>
            <li className="flex items-center gap-1.5 font-bold text-[#029185]">
              <span className="w-5 h-5 rounded-full bg-[#029185] text-white flex items-center justify-center text-[11px] shrink-0">
                2
              </span>
              <span className="truncate">2. Fulfilment</span>
            </li>
            <li className="flex items-center gap-1.5 font-medium text-slate-500">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] shrink-0">
                3
              </span>
              <span className="truncate">3. Payment</span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Patient & e-Prescription, Order Fulfillment Split */}
        <div className="lg:col-span-7 space-y-4">
          {/* Patient & e-Prescription Card */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-[#029185]">
                ABDM Verified Patient & e-Prescription
              </div>
              <h1 className="text-base font-bold text-slate-900">
                {patient.fullName} · {PATIENT_PROFILE.age}Y {PATIENT_PROFILE.gender}
              </h1>
              <p className="text-xs text-slate-600 font-mono">
                ABHA ID: {patient.abhaId} · Rx #{patient.rxId}
              </p>
              <p className="text-xs text-slate-500">
                {patient.prescriber} · {patient.rxDate}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenRxModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#f6faf9] hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 whitespace-nowrap min-h-[38px]"
            >
              <FileText className="w-3.5 h-3.5 text-[#029185]" />
              <span>View Rx</span>
            </button>
          </section>

          {/* Order Fulfillment Split */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Order Fulfillment Split</h2>

            {/* Pharmacy Partner Card */}
            {pharmacyItems.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-[#029185]">
                      Pharmacy Pickup Voucher · Ready in 15 mins
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {pharmacyItems[0].providerName}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {pharmacyItems.map((i) => `${i.title} (x${i.quantity})`).join(', ')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#f0f4f3] border border-slate-200 px-2.5 py-1.5 text-right shrink-0">
                    <div className="text-[10px] text-slate-500">Digital Pass</div>
                    <div className="font-mono text-xs font-bold text-[#029185]">
                      {PATIENT_PROFILE.cashlessPassCode}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NABL Diagnostic Partner Card */}
            {labItems.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-[#029185]">
                      NABL-Accredited Diagnostic Partner
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {labItems[0].providerName}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {labItems.map((i) => i.title).join(', ')}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    {labItems[0].voucherCode}
                  </span>
                </div>

                {/* Fasting Instructions */}
                <div className="rounded-lg bg-[#D97706]/10 border border-[#D97706]/25 px-3 py-2 text-xs text-slate-800 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold">Fasting Protocol:</strong>{' '}
                    {labItems[0].fastingInstructions ??
                      '8–10 hours overnight fasting required. Plain water allowed.'}
                  </span>
                </div>

                {/* Home Sample Collection vs Lab Walk-in Toggle */}
                <div className="space-y-2">
                  <div
                    role="group"
                    aria-label="Diagnostic sample collection mode"
                    className="grid grid-cols-2 gap-1.5 p-1 bg-[#f0f4f3] rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => setLabMode('home_collection')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-semibold transition-colors ${
                        labMode === 'home_collection'
                          ? 'bg-white text-[#029185] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Free Home Collection</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabMode('lab_walkin')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-semibold transition-colors ${
                        labMode === 'lab_walkin'
                          ? 'bg-white text-[#029185] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Lab Walk-in</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {['07:00 AM – 08:00 AM', '08:30 AM – 09:30 AM', '10:00 AM – 11:00 AM'].map(
                      (slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSlotTime(slot)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border whitespace-nowrap shrink-0 ${
                            slotTime === slot
                              ? 'border-[#029185] bg-[#029185]/8 text-[#029185] font-semibold'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Couple/Promo Code Billing + Cashless Pre-Auth + Payment Gateway */}
        <div className="lg:col-span-5 space-y-4">
          {/* Couple & Promo Code Billing Card */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#029185]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Couple Code & Promo Coupons
                </h2>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                2-Patient or Single Promo
              </span>
            </div>

            <form onSubmit={handleApplySubmit} className="flex items-center gap-2">
              <label htmlFor="couple-promo-input" className="sr-only">
                Enter Couple or Promo code
              </label>
              <input
                id="couple-promo-input"
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  if (codeError) setCodeError(null);
                }}
                placeholder="Enter COUPLE25, SWIFT20, FAMILY30..."
                className="flex-1 h-10 rounded-lg border border-slate-200 bg-[#f6faf9] px-3 font-mono text-xs font-semibold uppercase text-slate-900 placeholder:normal-case placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-[#029185] focus:bg-white"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Apply Code
              </button>
            </form>

            {codeError && (
              <p role="alert" className="text-xs font-medium text-[#E11D48]">
                {codeError}
              </p>
            )}

            {appliedDiscountRule && ledger.promoCodeDiscount > 0 ? (
              <div className="rounded-lg border border-[#10B981]/35 bg-[#10B981]/10 p-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {appliedDiscountRule.kind === 'couple' ? (
                    <Users className="w-4 h-4 text-[#029185] mt-0.5 shrink-0" />
                  ) : (
                    <Tag className="w-4 h-4 text-[#029185] mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {appliedDiscountRule.code} · {appliedDiscountRule.title}
                    </div>
                    <div className="text-[11px] text-slate-700 mt-0.5">
                      {appliedDiscountRule.kind === 'couple'
                        ? `Couple / Family Bundle (${appliedDiscountRule.beneficiariesCount} patients covered)`
                        : 'Single-Patient Promo Discount'}{' '}
                      · Saves {formatINR(ledger.promoCodeDiscount)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveDiscountCode();
                    setCodeInput('');
                    setCodeError(null);
                  }}
                  aria-label="Remove applied discount code"
                  className="p-1 text-slate-500 hover:text-[#E11D48] rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {discountCodes.map((rule) => (
                  <button
                    key={rule.code}
                    type="button"
                    onClick={() => handleQuickApply(rule.code)}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-[#f6faf9] hover:border-[#029185] text-[11px] font-semibold text-slate-700 transition-colors"
                  >
                    <span className="font-mono text-[#029185]">{rule.code}</span> ·{' '}
                    {rule.discountType === 'percent' ? `${rule.value}%` : formatINR(rule.value)}
                    {rule.kind === 'couple' ? ' Couple' : ' Promo'}
                  </button>
                ))}
              </div>
            )}

            {/* Billing Summary */}
            <dl className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Locked Care Basket Subtotal</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">
                  {formatINR(basketSubtotal)}
                </dd>
              </div>
              {ledger.promoCodeDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">
                    {appliedDiscountRule?.kind === 'couple' ? 'Couple Bundle' : 'Promo'} Discount (
                    {ledger.appliedCode})
                  </dt>
                  <dd className="font-semibold text-[#10B981] tabular-nums">
                    -{formatINR(ledger.promoCodeDiscount)}
                  </dd>
                </div>
              )}
              {ledger.insurerCoveredPortion > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Insurer Post-Deductible Share</dt>
                  <dd className="font-semibold text-[#10B981] tabular-nums">
                    -{formatINR(ledger.insurerCoveredPortion)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-sm">
                <dt className="font-bold text-slate-900">Final Payable Total</dt>
                <dd className="font-bold text-[#029185] tabular-nums">
                  {formatINR(ledger.outOfPocketTotal)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Pre-Auth Banner */}
          <section className="rounded-xl border border-[#10B981]/35 bg-[#10B981]/8 p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#029185] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                SwiftCare Pre-Approved Cashless Pass
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Zero paperwork counter clearance at Nagpur partner dispensaries and NABL centers.
              </p>
            </div>
          </section>

          {/* Payment Integration */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Billing & Payment Gateway</h2>
              <span className="text-base font-bold text-[#029185] tabular-nums">
                {formatINR(ledger.outOfPocketTotal)}
              </span>
            </div>

            <div className="space-y-2">
              {(
                [
                  {
                    id: 'upi_autopay',
                    label: 'UPI Instant Autopay',
                    sub: 'GPay, PhonePe, Paytm · Zero surcharge',
                    icon: Smartphone,
                  },
                  {
                    id: 'card',
                    label: 'Credit / Debit Card',
                    sub: 'RuPay, Visa, Mastercard (Tokenized)',
                    icon: CreditCard,
                  },
                  {
                    id: 'opd_wallet',
                    label: 'ABDM / OPD Health Wallet',
                    sub: 'Balance ₹2,450.00 available',
                    icon: Wallet,
                  },
                  {
                    id: 'cashless_counter',
                    label: 'Pay Cashless at Counter',
                    sub: 'Present PASS #MW-882 on arrival',
                    icon: Store,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = paymentMethod === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      active ? 'border-[#029185] bg-[#f6faf9]' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className="w-full flex items-center justify-between gap-2 text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#029185] shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                          <div className="text-[11px] text-slate-600">{opt.sub}</div>
                        </div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          active ? 'border-[#029185]' : 'border-slate-300'
                        }`}
                      >
                        {active && <span className="w-2 h-2 rounded-full bg-[#029185]" />}
                      </span>
                    </button>

                    {opt.id === 'upi_autopay' && active && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 flex items-center gap-2">
                        {(
                          [
                            { id: 'gpay', name: 'Google Pay' },
                            { id: 'phonepe', name: 'PhonePe' },
                            { id: 'paytm', name: 'Paytm' },
                          ] as const
                        ).map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setUpiApp(app.id)}
                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                              upiApp === app.id
                                ? 'bg-[#029185] text-white border-[#029185]'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {app.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sticky CTA with 48-Hour Rate Protection */}
          <section className="space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full h-12 rounded-xl bg-[#029185] hover:bg-[#0D9488] active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Confirm & Lock Cashless Pass ({formatINR(ledger.outOfPocketTotal)})</span>
            </button>
            <p className="text-center text-[11px] text-slate-600">
              Price lock guarantee backed by 48-hour rate protection across Nagpur network partners.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
