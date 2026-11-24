import { createClient, Session } from '@supabase/supabase-js';
import { PATIENT_PROFILE } from '../data/catalog';
import {
  AuthenticatedPatient,
  AuthProviderId,
  CashlessPassRecord,
  LabFulfillmentMode,
  PaymentMethodId,
} from '../types/swiftcare';
import { normalizeIndianPhone } from '../utils/authValidation';

export const SUPABASE_PROJECT_ID = 'pyutakyzbbxtznohabvm';
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ckQaArGr3fIDW8UuzGRn4A_AcqlgWyj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_SETUP_SQL = `-- Run in Supabase SQL Editor for project ${SUPABASE_PROJECT_ID}
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  abha_id TEXT NOT NULL,
  abha_address TEXT,
  abha_verified BOOLEAN DEFAULT true,
  auth_provider TEXT NOT NULL,
  city TEXT DEFAULT 'Nagpur, MH',
  neighborhood TEXT DEFAULT 'Dharampeth',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cashless_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pass_code TEXT NOT NULL,
  rx_ref TEXT NOT NULL,
  provider_summary TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 1,
  applied_code TEXT,
  savings_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payable_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  lab_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashless_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage own profile" ON public.patient_profiles;
CREATE POLICY "Patients manage own profile" ON public.patient_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Patients manage own passes" ON public.cashless_passes;
CREATE POLICY "Patients manage own passes" ON public.cashless_passes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

function isMissingRelationError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? '';
  const msg = (err.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function isRlsPolicyError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? '';
  const msg = (err.message ?? '').toLowerCase();
  return code === '42501' || msg.includes('row-level security');
}

export function buildPatientFromSession(
  session: Session,
  overrides?: Partial<AuthenticatedPatient>,
): AuthenticatedPatient {
  const user = session.user;
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, string | undefined>;
  const providerRaw = (appMeta.provider ?? meta.auth_provider ?? 'email').toLowerCase();
  const authProvider: AuthProviderId =
    providerRaw === 'google' || providerRaw === 'apple' || providerRaw === 'abha'
      ? providerRaw
      : 'email';

  const fullName =
    overrides?.fullName ||
    meta.full_name ||
    meta.name ||
    (user.email ? user.email.split('@')[0].replace(/[._-]/g, ' ') : PATIENT_PROFILE.name);

  const email = overrides?.email || user.email || 'patient@swiftcare.in';
  const rawPhone = overrides?.phone || meta.phone || user.phone || '+91 98230 44120';
  const phone = rawPhone.startsWith('+91') ? rawPhone : normalizeIndianPhone(rawPhone) || rawPhone;
  const abhaId = overrides?.abhaId || meta.abha_id || PATIENT_PROFILE.abhaId;
  const handle = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

  return {
    id: user.id,
    fullName,
    email,
    phone,
    abhaId,
    abhaAddress: `${handle || 'patient'}@abdm`,
    abhaVerified: true,
    authProvider,
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
    isSandboxFallback: false,
  };
}

export async function getInitialSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  } catch {
    return null;
  }
}

export function subscribeAuthChanges(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export async function startOAuthSignIn(provider: 'google' | 'apple'): Promise<{
  status: 'redirected' | 'fallback_required';
  reason?: string;
}> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      return {
        status: 'fallback_required',
        reason:
          error?.message ||
          `${provider === 'google' ? 'Google' : 'Apple'} OAuth is not configured on this Supabase project yet.`,
      };
    }

    // Probe authorization endpoint cleanly or allow interactive fallback inside sandbox iframe
    // Note: Supabase returns an /auth/v1/authorize URL even before checking provider toggle,
    // so check if OAuth redirect is viable or surface clear error when provider disabled.
    const probe = await fetch(data.url, { method: 'GET', redirect: 'manual' }).catch(() => null);
    if (probe && probe.status >= 400) {
      return {
        status: 'fallback_required',
        reason: `${provider === 'google' ? 'Google' : 'Apple'} OAuth provider needs dashboard credentials in Supabase.`,
      };
    }

    window.location.assign(data.url);
    return { status: 'redirected' };
  } catch (err) {
    return {
      status: 'fallback_required',
      reason: err instanceof Error ? err.message : 'OAuth provider unavailable in preview.',
    };
  }
}

export async function signUpWithEmailPassword(params: {
  fullName: string;
  email: string;
  phone: string;
  abhaId?: string;
  password: string;
}): Promise<{
  patient?: AuthenticatedPatient;
  error?: string;
  requiresEmailConfirm?: boolean;
  schemaMissing?: boolean;
  rlsBlocked?: boolean;
  profileSynced?: boolean;
}> {
  const { fullName, email, phone, abhaId, password } = params;
  const resolvedAbha = abhaId && abhaId.replace(/\D/g, '').length === 14 ? abhaId : PATIENT_PROFILE.abhaId;

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone,
        abha_id: resolvedAbha,
        auth_provider: 'email',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { error: 'Unable to register patient account. Please verify your details.' };
  }

  const handle = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  const patient: AuthenticatedPatient = {
    id: user.id,
    fullName: fullName.trim(),
    email: email.trim(),
    phone,
    abhaId: resolvedAbha,
    abhaAddress: `${handle || 'patient'}@abdm`,
    abhaVerified: true,
    authProvider: 'email',
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
    isSandboxFallback: !data.session,
  };

  // Attempt profile upsert immediately when session is live (or if policy permits registration inserts)
  const sync = await upsertPatientProfile(patient, data.session ? user.id : undefined);

  return {
    patient,
    requiresEmailConfirm: !data.session,
    schemaMissing: sync.schemaMissing,
    rlsBlocked: sync.rlsBlocked,
    profileSynced: sync.ok,
  };
}

export async function signInWithEmailPassword(params: {
  email: string;
  password: string;
}): Promise<{
  patient?: AuthenticatedPatient;
  passes?: CashlessPassRecord[];
  error?: string;
  schemaMissing?: boolean;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });

  if (error || !data.session) {
    return { error: error?.message || 'Invalid email or password.' };
  }

  const basePatient = buildPatientFromSession(data.session);
  const { patient, schemaMissing } = await fetchOrCreatePatientProfile(basePatient, data.user.id);
  const passesRes = await fetchCashlessPasses(patient.id);

  return {
    patient,
    passes: passesRes.passes,
    schemaMissing: schemaMissing || passesRes.schemaMissing,
  };
}

export async function fetchOrCreatePatientProfile(
  fallbackPatient: AuthenticatedPatient,
  authUserId?: string,
): Promise<{ patient: AuthenticatedPatient; schemaMissing: boolean }> {
  try {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('id', fallbackPatient.id)
      .maybeSingle();

    if (error) {
      return {
        patient: fallbackPatient,
        schemaMissing: isMissingRelationError(error),
      };
    }

    if (data) {
      return {
        patient: {
          ...fallbackPatient,
          fullName: data.full_name || fallbackPatient.fullName,
          email: data.email || fallbackPatient.email,
          phone: data.phone || fallbackPatient.phone,
          abhaId: data.abha_id || fallbackPatient.abhaId,
          abhaAddress: data.abha_address || fallbackPatient.abhaAddress,
          abhaVerified: data.abha_verified ?? true,
          authProvider: (data.auth_provider as AuthProviderId) || fallbackPatient.authProvider,
          city: data.city || fallbackPatient.city,
          neighborhood: data.neighborhood || fallbackPatient.neighborhood,
        },
        schemaMissing: false,
      };
    }

    const upsert = await upsertPatientProfile(fallbackPatient, authUserId);
    return { patient: fallbackPatient, schemaMissing: upsert.schemaMissing };
  } catch {
    return { patient: fallbackPatient, schemaMissing: false };
  }
}

export async function upsertPatientProfile(
  patient: AuthenticatedPatient,
  authUserId?: string,
): Promise<{ ok: boolean; schemaMissing: boolean; rlsBlocked: boolean; errorMessage?: string }> {
  try {
    const { error } = await supabase.from('patient_profiles').upsert(
      {
        id: patient.id,
        user_id: authUserId ?? null,
        full_name: patient.fullName,
        email: patient.email,
        phone: patient.phone,
        abha_id: patient.abhaId,
        abha_address: patient.abhaAddress,
        abha_verified: patient.abhaVerified,
        auth_provider: patient.authProvider,
        city: patient.city,
        neighborhood: patient.neighborhood,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (error) {
      return {
        ok: false,
        schemaMissing: isMissingRelationError(error),
        rlsBlocked: isRlsPolicyError(error),
        errorMessage: error.message,
      };
    }
    return { ok: true, schemaMissing: false, rlsBlocked: false };
  } catch (err) {
    return {
      ok: false,
      schemaMissing: false,
      rlsBlocked: false,
      errorMessage: err instanceof Error ? err.message : 'Unable to reach Supabase.',
    };
  }
}

export async function fetchCashlessPasses(
  patientId: string,
): Promise<{ passes: CashlessPassRecord[]; schemaMissing: boolean }> {
  try {
    const { data, error } = await supabase
      .from('cashless_passes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return { passes: [], schemaMissing: isMissingRelationError(error) };
    }

    const passes: CashlessPassRecord[] = (data ?? []).map((row) => ({
      id: String(row.id),
      patientId: String(row.patient_id),
      passCode: String(row.pass_code),
      rxRef: String(row.rx_ref),
      providerSummary: String(row.provider_summary),
      itemCount: Number(row.item_count ?? 1),
      appliedCode: row.applied_code ? String(row.applied_code) : null,
      savingsTotal: Number(row.savings_total ?? 0),
      payableTotal: Number(row.payable_total ?? 0),
      paymentMethod: (row.payment_method as PaymentMethodId) || 'upi_autopay',
      labMode: row.lab_mode ? (row.lab_mode as LabFulfillmentMode) : undefined,
      createdAt: String(row.created_at ?? new Date().toISOString()),
    }));

    return { passes, schemaMissing: false };
  } catch {
    return { passes: [], schemaMissing: false };
  }
}

export async function saveCashlessPass(
  input: {
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
  },
): Promise<{
  record: CashlessPassRecord;
  persistedInDb: boolean;
  schemaMissing: boolean;
  rlsBlocked: boolean;
  errorMessage?: string;
}> {
  const localRecord: CashlessPassRecord = {
    id: `pass-${Date.now()}`,
    patientId: input.patientId,
    passCode: input.passCode,
    rxRef: input.rxRef,
    providerSummary: input.providerSummary,
    itemCount: input.itemCount,
    appliedCode: input.appliedCode ?? null,
    savingsTotal: input.savingsTotal,
    payableTotal: input.payableTotal,
    paymentMethod: input.paymentMethod,
    labMode: input.labMode,
    createdAt: new Date().toISOString(),
  };

  try {
    const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const userId = userData.user?.id ?? null;

    const { data, error } = await supabase
      .from('cashless_passes')
      .insert({
        patient_id: input.patientId,
        user_id: userId,
        pass_code: input.passCode,
        rx_ref: input.rxRef,
        provider_summary: input.providerSummary,
        item_count: input.itemCount,
        applied_code: input.appliedCode ?? null,
        savings_total: input.savingsTotal,
        payable_total: input.payableTotal,
        payment_method: input.paymentMethod,
        lab_mode: input.labMode ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return {
        record: localRecord,
        persistedInDb: false,
        schemaMissing: isMissingRelationError(error),
        rlsBlocked: isRlsPolicyError(error),
        errorMessage: error?.message,
      };
    }

    return {
      record: {
        ...localRecord,
        id: String(data.id),
        createdAt: String(data.created_at ?? localRecord.createdAt),
      },
      persistedInDb: true,
      schemaMissing: false,
      rlsBlocked: false,
    };
  } catch (err) {
    return {
      record: localRecord,
      persistedInDb: false,
      schemaMissing: false,
      rlsBlocked: false,
      errorMessage: err instanceof Error ? err.message : 'Unable to save pass to Supabase.',
    };
  }
}

export async function signOutPatient(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Clean local sign out regardless of network state
  }
}
