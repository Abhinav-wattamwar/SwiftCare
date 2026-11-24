import { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  FileText,
  LogOut,
  MapPin,
  Navigation,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AuthenticatedPatient,
  CashlessPassRecord,
  FulfillmentQuote,
  Medicine,
  RadiusKm,
} from '../types/swiftcare';
import { PATIENT_PROFILE } from '../data/catalog';
import { formatINR } from '../utils/pricing';
import { SUPABASE_PROJECT_ID, SUPABASE_SETUP_SQL } from '../services/supabaseClient';

interface LocationModalProps {
  open: boolean;
  radiusKm: RadiusKm;
  onSelectRadius: (km: RadiusKm) => void;
  onClose: () => void;
}

export function LocationModal({ open, radiusKm, onSelectRadius, onClose }: LocationModalProps) {
  const [detectStatus, setDetectStatus] = useState<'idle' | 'detecting' | 'detected'>('idle');

  if (!open) return null;

  const handleAutoDetect = () => {
    setDetectStatus('detecting');
    window.setTimeout(() => {
      setDetectStatus('detected');
    }, 350);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="geo-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="geo-modal-title" className="text-base font-bold text-slate-900">
            Location & Search Radius
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location modal"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl bg-[#f6faf9] border border-slate-200 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#029185] mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900">
                {PATIENT_PROFILE.neighborhood}, {PATIENT_PROFILE.city}
              </div>
              <div className="text-[11px] text-slate-600">
                {detectStatus === 'detected'
                  ? 'GPS locked · 21.139° N, 79.062° E'
                  : 'PIN 440010 · ABDM Nagpur Cluster'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoDetect}
            className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#029185] hover:bg-slate-50 whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>
              {detectStatus === 'detecting'
                ? 'Detecting...'
                : detectStatus === 'detected'
                  ? 'GPS Locked'
                  : 'Auto-Detect'}
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">Select Dispensary Radius</div>
          <div className="grid grid-cols-3 gap-2">
            {([2, 5, 10] as RadiusKm[]).map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => onSelectRadius(km)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-colors tabular-nums ${
                  radiusKm === km
                    ? 'bg-[#029185] text-white border-[#029185]'
                    : 'bg-[#f6faf9] text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                Within {km}km
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold"
        >
          Apply {radiusKm}km Radius
        </button>
      </div>
    </div>
  );
}

interface RxModalProps {
  open: boolean;
  patient?: AuthenticatedPatient;
  onClose: () => void;
}

export function RxModal({ open, patient, onClose }: RxModalProps) {
  if (!open) return null;
  const displayName = patient?.fullName ?? PATIENT_PROFILE.name;
  const displayAbha = patient?.abhaId ?? PATIENT_PROFILE.abhaId;
  const displayRxId = patient?.rxId ?? PATIENT_PROFILE.rxId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rx-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#029185]" />
            <h2 id="rx-modal-title" className="text-base font-bold text-slate-900">
              Verified Digital Rx #{displayRxId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prescription preview"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[#f6faf9] p-4 space-y-3 text-xs">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <div>
              <div className="font-bold text-slate-900">{PATIENT_PROFILE.clinic}</div>
              <div className="text-slate-600">{PATIENT_PROFILE.prescriber}</div>
            </div>
            <div className="text-right font-mono text-slate-700">{PATIENT_PROFILE.rxDate}</div>
          </div>

          <div>
            <div className="text-slate-500">Patient</div>
            <div className="font-semibold text-slate-900">
              {displayName} ({PATIENT_PROFILE.age}Y / {PATIENT_PROFILE.gender}) · ABHA{' '}
              <span className="font-mono">{displayAbha}</span>
            </div>
          </div>

          <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-2">
            <div>
              <div className="font-bold text-slate-900">
                1. Tab. Atorvastatin Calcium 20mg (30s)
              </div>
              <div className="text-slate-600">Sig: 1 tab OD HS (Once daily at bedtime) · 30 days</div>
            </div>
            <div>
              <div className="font-bold text-slate-900">
                2. Lab: Comprehensive Metabolic Panel (CMP)
              </div>
              <div className="text-slate-600">Fasting 8–10 hrs · NABL Accredited Lab</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[#029185] font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Digitally Signed via ABDM Health Information Exchange</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-[#029185] text-white text-xs font-semibold"
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface CouponModalProps {
  quote: FulfillmentQuote | null;
  medicine: Medicine | null;
  strength: string;
  onClose: () => void;
}

export function CouponModal({ quote, medicine, strength, onClose }: CouponModalProps) {
  const [copied, setCopied] = useState(false);
  if (!quote || !medicine) return null;

  const copyCode = () => {
    navigator.clipboard?.writeText(quote.provider.voucherCode).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="coupon-modal-title" className="text-base font-bold text-slate-900">
            SwiftCare Digital Discount Voucher
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close coupon dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-[#029185]/35 bg-[#f6faf9] p-4 space-y-2 text-center">
          <div className="text-xs text-slate-600">
            {medicine.genericName} {strength} · {quote.provider.name}
          </div>
          <div className="text-2xl font-bold text-[#029185] tabular-nums">
            {formatINR(quote.lockedPrice)}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            Locked vs Retail MRP {formatINR(quote.retailMrp)} ({quote.savingsPercent}% off)
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 font-mono text-sm font-bold text-slate-900">
            <span>{quote.provider.voucherCode}</span>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy coupon voucher code"
              className="text-[#029185] hover:text-[#0D9488]"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 text-center">
          Present this voucher code at {quote.provider.shortName} or lock it into your Care
          Estimator basket for cashless checkout.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-[#029185] text-white text-xs font-semibold"
        >
          Close Voucher
        </button>
      </div>
    </div>
  );
}

interface ProfileModalProps {
  open: boolean;
  patient: AuthenticatedPatient;
  passHistory: CashlessPassRecord[];
  schemaMissing: boolean;
  supabaseSessionActive: boolean;
  syncNote?: string | null;
  onClose: () => void;
  onSignOut: () => void;
}

export function ProfileModal({
  open,
  patient,
  passHistory,
  schemaMissing,
  supabaseSessionActive,
  syncNote,
  onClose,
  onSignOut,
}: ProfileModalProps) {
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!open) return null;

  const copySql = () => {
    navigator.clipboard?.writeText(SUPABASE_SETUP_SQL).catch(() => {});
    setCopiedSql(true);
    window.setTimeout(() => setCopiedSql(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div className="w-full max-w-lg max-h-[90svh] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="profile-modal-title" className="text-base font-bold text-slate-900">
              Patient Profile &amp; ABHA Identity
            </h2>
            <p className="text-[11px] text-slate-500">
              Auth via {patient.authProvider.toUpperCase()} · Supabase Project{' '}
              <span className="font-mono">{SUPABASE_PROJECT_ID}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close patient profile"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl bg-[#f6faf9] border border-slate-200 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Patient Name</span>
            <span className="font-bold text-slate-900">{patient.fullName}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-800 truncate">{patient.email}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Mobile Number</span>
            <span className="font-mono font-semibold text-slate-900">{patient.phone}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">ABHA Number</span>
            <span className="font-mono font-semibold text-[#029185]">{patient.abhaId}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">ABHA Address</span>
            <span className="font-mono text-slate-800">{patient.abhaAddress}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Insurer Policy</span>
            <span className="font-semibold text-slate-900">
              {patient.insurer} ({patient.policyId})
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
            <span className="text-slate-500">Database Sync</span>
            <span className="font-semibold text-[#029185]">
              {supabaseSessionActive && !schemaMissing
                ? 'Live Supabase Synced'
                : schemaMissing
                  ? 'Tables Pending SQL Setup'
                  : 'Local Session (RLS / Email Confirm)'}
            </span>
          </div>
          {syncNote && (
            <p className="text-[11px] text-[#D97706] bg-[#D97706]/10 rounded-lg px-2.5 py-1.5">
              {syncNote}
            </p>
          )}
        </div>

        {/* Cashless Passes History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Receipt className="w-3.5 h-3.5 text-[#029185]" />
              <span>Cashless Passes History ({passHistory.length})</span>
            </div>
          </div>

          {passHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-[#f6faf9] p-3.5 text-xs text-slate-600 text-center">
              No cashless passes locked yet. Confirm an order in Checkout to save your digital pass
              to Supabase.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {passHistory.map((pass) => (
                <div
                  key={pass.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-[#029185]">{pass.passCode}</div>
                    <div className="text-slate-700 font-medium truncate">
                      {pass.providerSummary}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {pass.itemCount} item(s)
                      {pass.appliedCode ? ` · Code ${pass.appliedCode}` : ''} · Saved{' '}
                      {formatINR(pass.savingsTotal)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 tabular-nums">
                      {formatINR(pass.payableTotal)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(pass.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Supabase SQL Setup Helper if tables haven't been created yet */}
        {(schemaMissing || showSql) && (
          <div className="rounded-xl border border-[#D97706]/35 bg-[#D97706]/8 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                <Database className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Supabase SQL Schema Helper</span>
              </span>
              <button
                type="button"
                onClick={copySql}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-[#029185]"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied SQL' : 'Copy SQL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-700">
              Run this SQL in your Supabase Dashboard SQL Editor to provision{' '}
              <span className="font-mono">patient_profiles</span> and{' '}
              <span className="font-mono">cashless_passes</span> with Row-Level Security.
            </p>
            <pre className="max-h-32 overflow-auto rounded-lg bg-slate-900 text-slate-100 p-2.5 text-[10px] font-mono leading-relaxed">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {!schemaMissing && (
            <button
              type="button"
              onClick={() => setShowSql((s) => !s)}
              className="text-[11px] font-semibold text-slate-500 hover:text-[#029185]"
            >
              {showSql ? 'Hide Supabase SQL' : 'View Supabase SQL Schema'}
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#E11D48]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-xl bg-[#029185] text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
