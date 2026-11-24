import { AuthProviderId, VerificationStepItem } from '../types/swiftcare';

export function formatAbhaInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));
  if (digits.length > 10) parts.push(digits.slice(10, 14));
  return parts.join('-');
}

export function isValidAbhaId(abha: string): boolean {
  const digits = abha.replace(/\D/g, '');
  return digits.length === 14;
}

export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const stripped = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  const ten = stripped.slice(0, 10);
  if (!ten) return '';
  if (ten.length <= 5) return `+91 ${ten}`;
  return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
}

export function extractTenDigitPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits.slice(-10);
}

export function isValidIndianPhone(raw: string): boolean {
  const ten = extractTenDigitPhone(raw);
  return /^[6-9]\d{9}$/.test(ten);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function getInitials(fullName: string): string {
  const tokens = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 'SC';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
}

export function getProviderLabel(provider: AuthProviderId): string {
  switch (provider) {
    case 'google':
      return 'Google Identity';
    case 'apple':
      return 'Apple ID';
    case 'abha':
      return 'ABDM ABHA ID';
    case 'email':
      return 'SwiftCare Email & Mobile';
  }
}

export function buildVerificationSteps(options: {
  provider: AuthProviderId;
  activeStepIndex: number; // 0..3, or -1 if idle, 4 if all complete
  errorIndex?: number;
  errorMessage?: string;
}): VerificationStepItem[] {
  const { provider, activeStepIndex, errorIndex, errorMessage } = options;
  const providerName = getProviderLabel(provider);

  const templates = [
    {
      id: 'channel',
      label: 'Gateway Handshake',
      detail: `Validating ${providerName} credentials & clinical session`,
    },
    {
      id: 'identity',
      label: provider === 'abha' ? 'ABDM & OTP Verification' : 'Identity & ABHA Check',
      detail:
        provider === 'abha'
          ? 'Verifying 14-digit ABHA number & OTP confirmation'
          : 'Linking verified identity token with ABHA health profile',
    },
    {
      id: 'supabase',
      label: 'Supabase Patient Sync',
      detail: 'Saving patient profile, phone & cashless pass history',
    },
    {
      id: 'ready',
      label: 'Heart-Link Unlocked',
      detail: 'Preparing personalized Rx & NABL price workspace',
    },
  ];

  return templates.map((tpl, idx) => {
    if (errorIndex === idx) {
      return {
        ...tpl,
        status: 'error',
        detail: errorMessage || 'Verification interrupted. Please retry.',
      };
    }
    if (activeStepIndex === -1) {
      return { ...tpl, status: 'idle' };
    }
    if (idx < activeStepIndex) {
      return { ...tpl, status: 'done' };
    }
    if (idx === activeStepIndex) {
      return { ...tpl, status: 'active' };
    }
    return { ...tpl, status: 'idle' };
  });
}
