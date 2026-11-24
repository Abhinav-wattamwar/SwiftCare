import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Database,
  HeartPulse,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { PATIENT_PROFILE } from '../data/catalog';
import {
  AuthenticatedPatient,
  AuthProviderId,
  CashlessPassRecord,
  VerificationStepItem,
} from '../types/swiftcare';
import {
  buildVerificationSteps,
  formatAbhaInput,
  isValidAbhaId,
  isValidEmail,
  isValidIndianPhone,
  normalizeIndianPhone,
} from '../utils/authValidation';
import {
  fetchCashlessPasses,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  startOAuthSignIn,
  SUPABASE_PROJECT_ID,
  upsertPatientProfile,
} from '../services/supabaseClient';

interface LoginGatewayProps {
  onAuthenticated: (payload: {
    patient: AuthenticatedPatient;
    passes: CashlessPassRecord[];
    schemaMissing: boolean;
    supabaseSessionActive: boolean;
    syncNote?: string | null;
  }) => void;
}

type AuthPanelMode = 'credentials' | 'abha' | 'oauth_fallback';

function GoogleLogoIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

function AppleLogoIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  );
}

function VerificationStepperCard({
  steps,
  provider,
}: {
  steps: VerificationStepItem[];
  provider: AuthProviderId;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-label="Step-by-step authentication progress"
      className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#029185]" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Live Verification Pipeline
          </h2>
        </div>
        <span className="text-[11px] font-mono font-semibold text-[#029185] uppercase">
          {provider}
        </span>
      </div>

      <ol className="space-y-2.5">
        {steps.map((step, index) => {
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';
          const isError = step.status === 'error';

          return (
            <motion.li
              key={step.id}
              layout={!prefersReducedMotion}
              initial={prefersReducedMotion ? false : { opacity: 0.7 }}
              animate={{
                opacity: step.status === 'idle' ? 0.65 : 1,
                scale: isActive && !prefersReducedMotion ? 1.01 : 1,
              }}
              transition={{ duration: 0.25 }}
              className={`rounded-xl border p-3 transition-colors ${
                isDone
                  ? 'border-[#10B981]/40 bg-[#10B981]/8'
                  : isActive
                    ? 'border-[#029185] bg-[#f6faf9] shadow-xs'
                    : isError
                      ? 'border-[#E11D48]/50 bg-[#E11D48]/6'
                      : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                    isDone
                      ? 'bg-[#10B981] text-white'
                      : isActive
                        ? 'bg-[#029185] text-white'
                        : isError
                          ? 'bg-[#E11D48] text-white'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isDone ? (
                    <motion.span
                      initial={prefersReducedMotion ? false : { scale: 0.4, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </motion.span>
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isError ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        isError
                          ? 'text-[#E11D48]'
                          : isDone
                            ? 'text-slate-900'
                            : isActive
                              ? 'text-[#029185]'
                              : 'text-slate-700'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {isDone
                        ? 'Verified'
                        : isActive
                          ? 'Checking...'
                          : isError
                            ? 'Action Needed'
                            : 'Queued'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{step.detail}</p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function LoginGateway({ onAuthenticated }: LoginGatewayProps) {
  const prefersReducedMotion = useReducedMotion();

  const [panelMode, setPanelMode] = useState<AuthPanelMode>('credentials');
  const [credentialMode, setCredentialMode] = useState<'signup' | 'signin'>('signup');
  const [activeProvider, setActiveProvider] = useState<AuthProviderId>('email');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [abhaId, setAbhaId] = useState('');
  const [password, setPassword] = useState('');

  // ABHA OTP states
  const [abhaOtpSent, setAbhaOtpSent] = useState(false);
  const [abhaOtp, setAbhaOtp] = useState('');

  // Guided OAuth fallback states
  const [oauthFallbackProvider, setOauthFallbackProvider] = useState<'google' | 'apple'>('google');
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // Stepper & Feedback states
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [errorStepIndex, setErrorStepIndex] = useState<number | undefined>(undefined);
  const [errorStepMessage, setErrorStepMessage] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
  const [pendingConfirmPatient, setPendingConfirmPatient] =
    useState<AuthenticatedPatient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verificationSteps = buildVerificationSteps({
    provider: activeProvider,
    activeStepIndex: stepIndex,
    errorIndex: errorStepIndex,
    errorMessage: errorStepMessage,
  });

  const resetStepper = (provider: AuthProviderId) => {
    setActiveProvider(provider);
    setStepIndex(0);
    setErrorStepIndex(undefined);
    setErrorStepMessage(undefined);
    setFormError(null);
    setInfoBanner(null);
  };

  const failStep = (idx: number, message: string) => {
    setErrorStepIndex(idx);
    setErrorStepMessage(message);
    setFormError(message);
    setIsSubmitting(false);
  };

  const handleOAuthClick = async (provider: 'google' | 'apple') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPendingConfirmPatient(null);
    resetStepper(provider);

    await pause(prefersReducedMotion ? 50 : 280);
    setStepIndex(1);

    const res = await startOAuthSignIn(provider);
    if (res.status === 'redirected') {
      return;
    }

    // Provider credentials aren't configured yet in Supabase -> guided interactive consent preview
    setIsSubmitting(false);
    setStepIndex(0);
    setOauthFallbackProvider(provider);
    setOauthNotice(
      res.reason ||
        `${provider === 'google' ? 'Google' : 'Apple'} OAuth needs dashboard credentials in Supabase project ${SUPABASE_PROJECT_ID}. Complete interactive identity consent below to continue.`,
    );
    setPanelMode('oauth_fallback');
  };

  const handleCompleteOAuthFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanName = fullName.trim() || 'Priya Sharma';
    const cleanEmail = email.trim() || `${oauthFallbackProvider}.patient@swiftcare.in`;
    const cleanPhone = phone.trim() ? normalizeIndianPhone(phone) : '+91 98230 44120';

    if (!isValidEmail(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (phone.trim() && !isValidIndianPhone(phone)) {
      setFormError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (abhaId.trim() && !isValidAbhaId(abhaId)) {
      setFormError('ABHA ID must contain 14 digits (XX-XXXX-XXXX-XXXX).');
      return;
    }

    setIsSubmitting(true);
    resetStepper(oauthFallbackProvider);

    await pause(prefersReducedMotion ? 50 : 320);
    setStepIndex(1);
    await pause(prefersReducedMotion ? 50 : 380);
    setStepIndex(2);

    const resolvedAbha = abhaId.trim() || PATIENT_PROFILE.abhaId;
    const handle = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    const patient: AuthenticatedPatient = {
      id: `${oauthFallbackProvider}-${cleanEmail.toLowerCase()}`,
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      abhaId: resolvedAbha,
      abhaAddress: `${handle || 'patient'}@abdm`,
      abhaVerified: true,
      authProvider: oauthFallbackProvider,
      city: PATIENT_PROFILE.city,
      neighborhood: PATIENT_PROFILE.neighborhood,
      insurer: PATIENT_PROFILE.insurer,
      policyId: PATIENT_PROFILE.policyId,
      deductibleMet: PATIENT_PROFILE.deductibleMet,
      deductibleAnnualTarget: PATIENT_PROFILE.deductibleAnnualTarget,
      rxId: PATIENT_PROFILE.rxId,
      prescriber: PATIENT_PROFILE.prescriber,
      clinic: PATIENT_PROFILE.clinic,
      rxDate: PATIENT_PROFILE.rxDate,
      isSandboxFallback: true,
    };

    const upsertRes = await upsertPatientProfile(patient);
    const passesRes = upsertRes.ok ? await fetchCashlessPasses(patient.id) : { passes: [], schemaMissing: false };

    await pause(prefersReducedMotion ? 50 : 340);
    setStepIndex(3);
    await pause(prefersReducedMotion ? 50 : 320);
    setStepIndex(4);

    setIsSubmitting(false);
    onAuthenticated({
      patient,
      passes: passesRes.passes,
      schemaMissing: upsertRes.schemaMissing || passesRes.schemaMissing,
      supabaseSessionActive: upsertRes.ok,
      syncNote: upsertRes.ok
        ? null
        : upsertRes.rlsBlocked
          ? 'Profile kept in active session (Supabase RLS requires authenticated session or sandbox policy).'
          : upsertRes.errorMessage ?? null,
    });
  };

  const handleSendAbhaOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isValidAbhaId(abhaId)) {
      setFormError('Enter a valid 14-digit ABHA ID (e.g. 27-4819-3022-8194).');
      return;
    }
    if (phone.trim() && !isValidIndianPhone(phone)) {
      setFormError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    resetStepper('abha');
    setStepIndex(1);
    setAbhaOtpSent(true);
    setInfoBanner('ABDM Sandbox OTP dispatched to Aadhaar-linked mobile. Use demo OTP 123456.');
  };

  const handleVerifyAbhaOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (abhaOtp.trim().length !== 6) {
      failStep(1, 'Enter the 6-digit ABDM verification OTP (demo OTP: 123456).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setActiveProvider('abha');
    setStepIndex(1);

    await pause(prefersReducedMotion ? 50 : 350);
    setStepIndex(2);

    const cleanName = fullName.trim() || PATIENT_PROFILE.name;
    const cleanEmail = email.trim() || 'abha.patient@swiftcare.in';
    const cleanPhone = phone.trim() ? normalizeIndianPhone(phone) : '+91 98230 44120';
    const handle = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

    const patient: AuthenticatedPatient = {
      id: `abha-${abhaId.replace(/\D/g, '')}`,
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      abhaId,
      abhaAddress: `${handle || 'patient'}@abdm`,
      abhaVerified: true,
      authProvider: 'abha',
      city: PATIENT_PROFILE.city,
      neighborhood: PATIENT_PROFILE.neighborhood,
      insurer: PATIENT_PROFILE.insurer,
      policyId: PATIENT_PROFILE.policyId,
      deductibleMet: PATIENT_PROFILE.deductibleMet,
      deductibleAnnualTarget: PATIENT_PROFILE.deductibleAnnualTarget,
      rxId: PATIENT_PROFILE.rxId,
      prescriber: PATIENT_PROFILE.prescriber,
      clinic: PATIENT_PROFILE.clinic,
      rxDate: PATIENT_PROFILE.rxDate,
      isSandboxFallback: true,
    };

    const upsertRes = await upsertPatientProfile(patient);
    const passesRes = upsertRes.ok ? await fetchCashlessPasses(patient.id) : { passes: [], schemaMissing: false };
    await pause(prefersReducedMotion ? 50 : 360);
    setStepIndex(3);
    await pause(prefersReducedMotion ? 50 : 300);
    setStepIndex(4);

    setIsSubmitting(false);
    onAuthenticated({
      patient,
      passes: passesRes.passes,
      schemaMissing: upsertRes.schemaMissing || passesRes.schemaMissing,
      supabaseSessionActive: upsertRes.ok,
      syncNote: upsertRes.ok
        ? null
        : upsertRes.rlsBlocked
          ? 'ABHA session verified locally (Supabase RLS requires email session or sandbox policy to write rows).'
          : upsertRes.errorMessage ?? null,
    });
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setPendingConfirmPatient(null);

    if (credentialMode === 'signup') {
      if (fullName.trim().length < 2) {
        setFormError('Please enter patient full name.');
        return;
      }
      if (!isValidEmail(email)) {
        setFormError('Please enter a valid email address.');
        return;
      }
      if (!isValidIndianPhone(phone)) {
        setFormError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (abhaId.trim() && !isValidAbhaId(abhaId)) {
        setFormError('Optional ABHA ID must be 14 digits (XX-XXXX-XXXX-XXXX).');
        return;
      }
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters.');
        return;
      }

      setIsSubmitting(true);
      resetStepper('email');
      await pause(prefersReducedMotion ? 50 : 280);
      setStepIndex(1);

      const formattedPhone = normalizeIndianPhone(phone);
      const res = await signUpWithEmailPassword({
        fullName,
        email,
        phone: formattedPhone,
        abhaId: abhaId.trim() || undefined,
        password,
      });

      if (res.error || !res.patient) {
        failStep(1, res.error || 'Unable to create patient account in Supabase.');
        return;
      }

      setStepIndex(2);
      await pause(prefersReducedMotion ? 50 : 380);
      setStepIndex(3);

      if (res.requiresEmailConfirm) {
        setIsSubmitting(false);
        setStepIndex(3);
        setPendingConfirmPatient(res.patient);
        setInfoBanner(
          res.profileSynced
            ? `Account & patient profile created in Supabase! Verification link sent to ${res.patient.email}.`
            : `Auth account created in Supabase Auth for ${res.patient.email}, awaiting email confirmation (patient_profiles row writes once email is confirmed or Confirm Email is turned off in Supabase Auth).`,
        );
        return;
      }

      const passesRes = await fetchCashlessPasses(res.patient.id);
      await pause(prefersReducedMotion ? 50 : 280);
      setStepIndex(4);
      setIsSubmitting(false);

      onAuthenticated({
        patient: res.patient,
        passes: passesRes.passes,
        schemaMissing: Boolean(res.schemaMissing || passesRes.schemaMissing),
        supabaseSessionActive: true,
      });
    } else {
      if (!isValidEmail(email)) {
        setFormError('Please enter your registered email address.');
        return;
      }
      if (password.length < 6) {
        setFormError('Please enter your password (minimum 6 characters).');
        return;
      }

      setIsSubmitting(true);
      resetStepper('email');
      await pause(prefersReducedMotion ? 50 : 260);
      setStepIndex(1);

      const res = await signInWithEmailPassword({ email, password });
      if (res.error || !res.patient) {
        failStep(1, res.error || 'Sign-in failed. Verify email and password.');
        return;
      }

      setStepIndex(2);
      await pause(prefersReducedMotion ? 50 : 350);
      setStepIndex(3);
      await pause(prefersReducedMotion ? 50 : 280);
      setStepIndex(4);
      setIsSubmitting(false);

      onAuthenticated({
        patient: res.patient,
        passes: res.passes ?? [],
        schemaMissing: Boolean(res.schemaMissing),
        supabaseSessionActive: true,
      });
    }
  };

  return (
    <div className="min-h-[100svh] w-full bg-[#f6faf9] flex flex-col justify-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Clinical Brand Anchor + Live 4-Step Verification Stepper */}
        <motion.aside
          initial={prefersReducedMotion ? false : { opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 space-y-4"
        >
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <img
                src="/assets/aistudio/logo_d3f7ff45.png"
                alt="SwiftCare"
                className="h-11 w-auto object-contain brightness-105 contrast-110 mix-blend-multiply"
              />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#029185]">
                <HeartPulse className="w-3.5 h-3.5 text-[#db2777]" />
                <span>Heart-Link Auth</span>
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                Swiftcare - A connection direct to heart
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verify your patient profile with Google, Apple, ABDM ABHA ID, or Email &amp; Mobile
                to unlock bioequivalent generic savings, NABL lab rates, and cashless pass history.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 font-medium">
                <Database className="w-3.5 h-3.5 text-[#029185]" />
                <span>Supabase Patient Vault</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                <span>ABHA &amp; ABDM Ready</span>
              </span>
            </div>
          </div>

          <div className="hidden lg:block">
            <VerificationStepperCard steps={verificationSteps} provider={activeProvider} />
          </div>
        </motion.aside>

        {/* Right Column: Mandatory Login & Signup Gateway Card */}
        <motion.section
          aria-label="SwiftCare Patient Login Gateway"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Patient Sign In &amp; Registration
              </h2>
              <p className="text-xs text-slate-600">
                Choose an instant identity gateway or register with your phone &amp; ABHA ID
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#029185]">
              <Lock className="w-3.5 h-3.5" />
              <span>TLS · RLS Protected</span>
            </span>
          </div>

          {/* Primary Express Identity Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleOAuthClick('google')}
              className="min-h-[46px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <GoogleLogoIcon />
              <span>Login with Google</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleOAuthClick('apple')}
              className="min-h-[46px] px-3.5 rounded-xl border border-slate-900 bg-slate-950 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <AppleLogoIcon />
              <span>Login with Apple</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setFormError(null);
                setInfoBanner(null);
                setPendingConfirmPatient(null);
                setPanelMode('abha');
                setActiveProvider('abha');
                setStepIndex(0);
                setErrorStepIndex(undefined);
              }}
              className={`min-h-[46px] px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                panelMode === 'abha'
                  ? 'bg-[#0D9488] text-white ring-2 ring-[#029185]/30'
                  : 'bg-[#029185] hover:bg-[#0D9488] text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Login with ABHA ID</span>
            </button>
          </div>

          {/* Mobile Verification Stepper */}
          <div className="lg:hidden">
            <VerificationStepperCard steps={verificationSteps} provider={activeProvider} />
          </div>

          {/* Divider */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200" />
            <button
              type="button"
              onClick={() => {
                setPanelMode('credentials');
                setFormError(null);
                setInfoBanner(null);
                setActiveProvider('email');
              }}
              className="shrink mx-3 text-[11px] font-semibold text-slate-500 hover:text-[#029185]"
            >
              {panelMode === 'credentials'
                ? 'or register / sign in with Email & Mobile'
                : '← Back to Email & Mobile Sign Up / Sign In'}
            </button>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Inline Error or Info Alerts */}
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-[#E11D48]/35 bg-[#E11D48]/8 px-3.5 py-2.5 text-xs font-medium text-[#E11D48] flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {infoBanner && (
            <div className="rounded-xl border border-[#029185]/35 bg-[#029185]/8 px-3.5 py-3 text-xs text-slate-800 space-y-2.5">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#029185] shrink-0 mt-0.5" />
                <span>{infoBanner}</span>
              </div>
              {pendingConfirmPatient && (
                <button
                  type="button"
                  onClick={() => {
                    setStepIndex(4);
                    onAuthenticated({
                      patient: pendingConfirmPatient,
                      passes: [],
                      schemaMissing: false,
                      supabaseSessionActive: false,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#029185] hover:bg-[#0D9488] text-white px-3 py-2 text-xs font-semibold"
                >
                  <span>Enter SwiftCare Workspace Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Panel Switcher: Credentials / ABHA OTP / Guided OAuth Fallback */}
          <AnimatePresence mode="wait">
            {panelMode === 'abha' ? (
              <motion.div
                key="abha-panel"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="rounded-xl border border-slate-200 bg-[#f6faf9] p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      ABDM 14-Digit ABHA Verification
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Connect your Ayushman Bharat Health Account directly
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAbhaId(PATIENT_PROFILE.abhaId);
                      setFullName(PATIENT_PROFILE.name);
                      setPhone('+91 98230 44120');
                      setEmail('priya.sharma@swiftcare.in');
                    }}
                    className="text-[11px] font-semibold text-[#029185] hover:underline"
                  >
                    Fill Demo ABHA
                  </button>
                </div>

                {!abhaOtpSent ? (
                  <form onSubmit={handleSendAbhaOtp} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="abha-id-input" className="text-xs font-semibold text-slate-700">
                          14-Digit ABHA Number
                        </label>
                        <input
                          id="abha-id-input"
                          type="text"
                          inputMode="numeric"
                          value={abhaId}
                          onChange={(e) => setAbhaId(formatAbhaInput(e.target.value))}
                          placeholder="27-4819-3022-8194"
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#029185]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="abha-name" className="text-xs font-semibold text-slate-700">
                          Patient Name
                        </label>
                        <input
                          id="abha-name"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Priya Sharma"
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="abha-phone" className="text-xs font-semibold text-slate-700">
                          Aadhaar-Linked Mobile
                        </label>
                        <input
                          id="abha-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(normalizeIndianPhone(e.target.value))}
                          placeholder="+91 98230 44120"
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full min-h-[46px] rounded-xl bg-[#029185] hover:bg-[#0D9488] text-white text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <span>Send ABDM Verification OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyAbhaOtp} className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-slate-800">ABHA {abhaId}</span>
                      <button
                        type="button"
                        onClick={() => setAbhaOtp('123456')}
                        className="font-semibold text-[#029185] hover:underline"
                      >
                        Use Demo OTP 123456
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="abha-otp-input" className="text-xs font-semibold text-slate-700">
                        6-Digit ABDM OTP
                      </label>
                      <input
                        id="abha-otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={abhaOtp}
                        onChange={(e) => setAbhaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP (123456)"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm tracking-widest font-bold text-slate-900 focus:outline-none focus:border-[#029185]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAbhaOtpSent(false);
                          setAbhaOtp('');
                        }}
                        className="min-h-[46px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                      >
                        Edit ABHA
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 min-h-[46px] rounded-xl bg-[#029185] hover:bg-[#0D9488] text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>Verify ABHA &amp; Enter SwiftCare</span>
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            ) : panelMode === 'oauth_fallback' ? (
              <motion.form
                key="oauth-fallback-panel"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                onSubmit={handleCompleteOAuthFallback}
                className="rounded-xl border border-slate-200 bg-[#f6faf9] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {oauthFallbackProvider === 'google' ? 'Google' : 'Apple'} Interactive Identity
                      Consent
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">{oauthNotice}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="oauth-name" className="text-xs font-semibold text-slate-700">
                      Patient Name
                    </label>
                    <input
                      id="oauth-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Priya Sharma"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="oauth-email" className="text-xs font-semibold text-slate-700">
                      {oauthFallbackProvider === 'google' ? 'Google Email' : 'Apple ID Email'}
                    </label>
                    <input
                      id="oauth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patient@gmail.com"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="oauth-phone" className="text-xs font-semibold text-slate-700">
                      Mobile Number (+91)
                    </label>
                    <input
                      id="oauth-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(normalizeIndianPhone(e.target.value))}
                      placeholder="+91 98230 44120"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="oauth-abha" className="text-xs font-semibold text-slate-700">
                      ABHA ID (Optional)
                    </label>
                    <input
                      id="oauth-abha"
                      type="text"
                      value={abhaId}
                      onChange={(e) => setAbhaId(formatAbhaInput(e.target.value))}
                      placeholder="27-4819-3022-8194"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] rounded-xl bg-[#029185] hover:bg-[#0D9488] text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>
                    Confirm {oauthFallbackProvider === 'google' ? 'Google' : 'Apple'} Consent &amp;
                    Sync Profile
                  </span>
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="credentials-panel"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="space-y-3.5"
              >
                {/* Sign Up vs Sign In Switcher */}
                <div
                  role="tablist"
                  aria-label="Account mode"
                  className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#f0f4f3]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={credentialMode === 'signup'}
                    onClick={() => {
                      setCredentialMode('signup');
                      setFormError(null);
                    }}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                      credentialMode === 'signup'
                        ? 'bg-white text-[#029185] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create Patient Account
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={credentialMode === 'signin'}
                    onClick={() => {
                      setCredentialMode('signin');
                      setFormError(null);
                    }}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                      credentialMode === 'signin'
                        ? 'bg-white text-[#029185] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Existing Patient Sign In
                  </button>
                </div>

                <form onSubmit={handleCredentialsSubmit} className="space-y-3">
                  {credentialMode === 'signup' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="signup-name" className="text-xs font-semibold text-slate-700">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="signup-name"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Priya Sharma"
                            className="w-full h-11 rounded-xl border border-slate-200 bg-[#f6faf9] focus:bg-white pl-9 pr-3 text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-phone" className="text-xs font-semibold text-slate-700">
                          Mobile Number (+91)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="signup-phone"
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(normalizeIndianPhone(e.target.value))}
                            placeholder="+91 98230 44120"
                            className="w-full h-11 rounded-xl border border-slate-200 bg-[#f6faf9] focus:bg-white pl-9 pr-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="auth-email" className="text-xs font-semibold text-slate-700">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="patient@example.com"
                          className="w-full h-11 rounded-xl border border-slate-200 bg-[#f6faf9] focus:bg-white pl-9 pr-3 text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700">
                        Password
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-password"
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full h-11 rounded-xl border border-slate-200 bg-[#f6faf9] focus:bg-white pl-9 pr-3 text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                        />
                      </div>
                    </div>
                  </div>

                  {credentialMode === 'signup' && (
                    <div className="space-y-1">
                      <label htmlFor="signup-abha" className="text-xs font-semibold text-slate-700">
                        ABHA ID (Optional · 14 Digits)
                      </label>
                      <input
                        id="signup-abha"
                        type="text"
                        inputMode="numeric"
                        value={abhaId}
                        onChange={(e) => setAbhaId(formatAbhaInput(e.target.value))}
                        placeholder="XX-XXXX-XXXX-XXXX (auto-linked if left blank)"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-[#f6faf9] focus:bg-white px-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-[#029185]"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[46px] rounded-xl bg-[#029185] hover:bg-[#0D9488] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>
                      {credentialMode === 'signup'
                        ? 'Register Patient & Sync to Supabase'
                        : 'Verify & Enter SwiftCare'}
                    </span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}
