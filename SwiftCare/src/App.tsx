import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DIAGNOSTIC_PACKAGES,
  DIAGNOSTIC_SECTIONS,
  DISCOUNT_CODES,
  INITIAL_ALERTS,
  INITIAL_BASKET,
  MEDICINES,
  NAGPUR_PROVIDERS,
  PATIENT_PROFILE,
} from './data/catalog';
import {
  AppTab,
  AuthenticatedPatient,
  BasketItem,
  CashlessPassRecord,
  CoverageMode,
  DiagnosticPackage,
  DiscountCodeRule,
  DrugFormType,
  EntryPhase,
  FulfillmentQuote,
  LabQuote,
  Medicine,
  PriceAlert,
  PriceSortOrder,
  RadiusKm,
  Scene3DMode,
} from './types/swiftcare';
import {
  calculateLedger,
  optimizePickupRoute,
  round2,
  validateAndApplyDiscountCode,
} from './utils/pricing';
import {
  buildPatientFromSession,
  fetchCashlessPasses,
  fetchOrCreatePatientProfile,
  getInitialSession,
  saveCashlessPass,
  signOutPatient,
  subscribeAuthChanges,
} from './services/supabaseClient';
import { SplashLanding } from './components/SplashLanding';
import { LoginGateway } from './components/LoginGateway';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { CompareScreen } from './components/CompareScreen';
import { EstimatorScreen } from './components/EstimatorScreen';
import { CheckoutScreen, CompletedPassPayload } from './components/CheckoutScreen';
import { DirectoryScreen } from './components/DirectoryScreen';
import { SavedAlertsScreen } from './components/SavedAlertsScreen';
import { CouponModal, LocationModal, ProfileModal, RxModal } from './components/Modals';
import { Clinical3DCanvas } from './components/Clinical3DCanvas';

const FALLBACK_PATIENT: AuthenticatedPatient = {
  id: 'local-default',
  fullName: PATIENT_PROFILE.name,
  email: 'priya.sharma@swiftcare.in',
  phone: '+91 98230 44120',
  abhaId: PATIENT_PROFILE.abhaId,
  abhaAddress: PATIENT_PROFILE.abhaAddress,
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
};

export default function App() {
  const [entryPhase, setEntryPhase] = useState<EntryPhase>('splash');
  const [authenticatedPatient, setAuthenticatedPatient] =
    useState<AuthenticatedPatient | null>(null);
  const [passHistory, setPassHistory] = useState<CashlessPassRecord[]>([]);
  const [supabaseSchemaMissing, setSupabaseSchemaMissing] = useState(false);
  const [supabaseSessionActive, setSupabaseSessionActive] = useState(false);
  const [supabaseSyncNote, setSupabaseSyncNote] = useState<string | null>(null);
  const sessionResolvedPatientRef = useRef<AuthenticatedPatient | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('compare');
  const [inCheckout, setInCheckout] = useState(false);

  const [radiusKm, setRadiusKm] = useState<RadiusKm>(5);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>(MEDICINES);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>(MEDICINES[0].id);
  const [selectedStrength, setSelectedStrength] = useState<string>('10mg');
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string>(
    DIAGNOSTIC_PACKAGES[0].id,
  );
  const [formType, setFormType] = useState<DrugFormType>('generic');
  const [sortOrder, setSortOrder] = useState<PriceSortOrder>('asc');

  const [basket, setBasket] = useState<BasketItem[]>(INITIAL_BASKET);
  const [coverageMode, setCoverageMode] = useState<CoverageMode>('cash_pass');
  const [consolidatedRouteApplied, setConsolidatedRouteApplied] = useState(false);
  const [priceDropMonitorEnabled, setPriceDropMonitorEnabled] = useState(true);
  const [alerts, setAlerts] = useState<PriceAlert[]>(INITIAL_ALERTS);
  const [appliedDiscountRule, setAppliedDiscountRule] = useState<DiscountCodeRule | null>(null);

  // Full-bleed 3D spatial inspector state
  const [fullBleed3D, setFullBleed3D] = useState(false);
  const [scene3DMode, setScene3DMode] = useState<Scene3DMode>('rx-inspector');

  // Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [couponContext, setCouponContext] = useState<{
    quote: FulfillmentQuote;
    medicine: Medicine;
    strength: string;
  } | null>(null);

  // Hydrate existing Supabase session (e.g., returning from Google/Apple OAuth redirect)
  useEffect(() => {
    let mounted = true;

    const hydrateFromSession = async () => {
      const session = await getInitialSession();
      if (!mounted || !session) return;

      const base = buildPatientFromSession(session);
      const { patient, schemaMissing } = await fetchOrCreatePatientProfile(base, session.user.id);
      const passesRes = await fetchCashlessPasses(patient.id);
      if (!mounted) return;

      sessionResolvedPatientRef.current = patient;
      setAuthenticatedPatient(patient);
      setPassHistory(passesRes.passes);
      setSupabaseSchemaMissing(schemaMissing || passesRes.schemaMissing);
      setSupabaseSessionActive(true);
    };

    hydrateFromSession();

    const unsubscribe = subscribeAuthChanges(async (session) => {
      if (!mounted) return;
      if (!session) {
        sessionResolvedPatientRef.current = null;
        return;
      }
      const base = buildPatientFromSession(session);
      const { patient, schemaMissing } = await fetchOrCreatePatientProfile(base, session.user.id);
      const passesRes = await fetchCashlessPasses(patient.id);
      if (!mounted) return;

      sessionResolvedPatientRef.current = patient;
      setAuthenticatedPatient(patient);
      setPassHistory(passesRes.passes);
      setSupabaseSchemaMissing(schemaMissing || passesRes.schemaMissing);
      setSupabaseSessionActive(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleSplashComplete = useCallback(() => {
    if (sessionResolvedPatientRef.current) {
      setEntryPhase('ready');
    } else {
      setEntryPhase('auth');
    }
  }, []);

  const activePatient = authenticatedPatient ?? FALLBACK_PATIENT;

  const activeMedicine = useMemo(
    () => availableMedicines.find((m) => m.id === selectedMedicineId) ?? availableMedicines[0],
    [availableMedicines, selectedMedicineId],
  );

  const ledger = useMemo(
    () =>
      calculateLedger(
        basket,
        coverageMode,
        activePatient.deductibleMet,
        activePatient.deductibleAnnualTarget,
        appliedDiscountRule,
      ),
    [basket, coverageMode, activePatient, appliedDiscountRule],
  );

  const routeOptimization = useMemo(() => optimizePickupRoute(basket), [basket]);

  const totalBasketItems = useMemo(
    () => basket.reduce((sum, item) => sum + item.quantity, 0),
    [basket],
  );

  const handleSelectTab = (tab: AppTab) => {
    setInCheckout(false);
    setActiveTab(tab);
    setScene3DMode(tab === 'directory' ? 'network-map' : 'rx-inspector');
  };

  const handleSelectMedicine = (id: string) => {
    const found = availableMedicines.find((m) => m.id === id);
    setSelectedMedicineId(id);
    if (found && !found.strengths.includes(selectedStrength)) {
      setSelectedStrength(found.strengths[0]);
    }
  };

  const handleImportLiveMedicine = (med: Medicine) => {
    setAvailableMedicines((prev) => {
      if (prev.some((m) => m.id === med.id)) {
        return prev.map((m) => (m.id === med.id ? med : m));
      }
      return [med, ...prev];
    });
    setSelectedMedicineId(med.id);
    setSelectedStrength(med.strengths[0] ?? '10mg');
  };

  const handleAddToEstimator = (
    quote: FulfillmentQuote,
    medicine: Medicine,
    strength: string,
    selectedForm: DrugFormType,
  ) => {
    const title = `${medicine.genericName} ${strength}`;
    setBasket((prev) => {
      const idx = prev.findIndex(
        (item) => item.providerId === quote.provider.id && item.title === title,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      const newItem: BasketItem = {
        id: `item-${medicine.id}-${strength}-${quote.provider.id}-${Date.now()}`,
        kind: 'medicine',
        title,
        subtitle: `${selectedForm === 'generic' ? 'AB-Rated Generic' : medicine.brandName} · ${medicine.dosageForm}`,
        providerId: quote.provider.id,
        providerName: quote.provider.name,
        neighborhood: quote.provider.neighborhood,
        distanceKm: quote.provider.distanceKm,
        unitLockedPrice: quote.lockedPrice,
        unitRetailMrp: quote.retailMrp,
        voucherDiscountPerUnit: round2(Math.max(0.8, quote.savingsAmount * 0.12)),
        quantity: 1,
        packageTag: selectedForm === 'generic' ? 'AB-Rated Generic' : 'Brand Retail',
        voucherCode: quote.provider.voucherCode,
      };
      return [newItem, ...prev];
    });
  };

  const handleAddLabToEstimator = (labQuote: LabQuote) => {
    const { diagnosticPackage: pkg, provider } = labQuote;
    setBasket((prev) => {
      const idx = prev.findIndex(
        (item) => item.providerId === provider.id && item.title === pkg.name,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      const newItem: BasketItem = {
        id: `item-${pkg.id}-${provider.id}-${Date.now()}`,
        kind: 'lab',
        title: pkg.name,
        subtitle: `${pkg.parametersCount} Biomarkers · ${provider.shortName} (NABL)`,
        providerId: provider.id,
        providerName: provider.name,
        neighborhood: provider.neighborhood,
        distanceKm: provider.distanceKm,
        unitLockedPrice: labQuote.lockedPrice,
        unitRetailMrp: labQuote.retailMrp,
        voucherDiscountPerUnit: round2(Math.max(4.0, labQuote.savingsAmount * 0.04)),
        quantity: 1,
        packageTag: 'Bundle Discount · Free Phlebotomy',
        voucherCode: provider.voucherCode,
        fastingInstructions: pkg.fastingInstructions,
      };
      return [...prev, newItem];
    });
  };

  const handleAddDiagnosticPackage = (pkg: DiagnosticPackage) => {
    const labProvider =
      NAGPUR_PROVIDERS.find((p) => p.id === pkg.defaultLabId) ??
      NAGPUR_PROVIDERS.find((p) => p.type === 'lab')!;

    setBasket((prev) => {
      if (prev.some((i) => i.title === pkg.name)) return prev;
      return [
        ...prev,
        {
          id: `item-${pkg.id}-${Date.now()}`,
          kind: 'lab',
          title: pkg.name,
          subtitle: `${pkg.parametersCount} Biomarkers · ${labProvider.shortName} (NABL)`,
          providerId: labProvider.id,
          providerName: labProvider.name,
          neighborhood: labProvider.neighborhood,
          distanceKm: labProvider.distanceKm,
          unitLockedPrice: pkg.lockedPrice,
          unitRetailMrp: pkg.retailMrp,
          voucherDiscountPerUnit: 6.0,
          quantity: 1,
          packageTag: 'Bundle Discount · Free Phlebotomy',
          voucherCode: labProvider.voucherCode,
          fastingInstructions: pkg.fastingInstructions,
        },
      ];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setBasket((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setBasket((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleToggleConsolidatedRoute = () => {
    setConsolidatedRouteApplied((prev) => !prev);
  };

  const handleApplyDiscountCode = (code: string) => {
    const lockedSubtotal = round2(
      basket.reduce((sum, item) => sum + item.unitLockedPrice * item.quantity, 0),
    );
    const result = validateAndApplyDiscountCode(code, lockedSubtotal, DISCOUNT_CODES);
    if (result.valid && result.rule) {
      setAppliedDiscountRule(result.rule);
      return { valid: true };
    }
    return { valid: false, error: result.error };
  };

  const handleRemoveDiscountCode = () => {
    setAppliedDiscountRule(null);
  };

  const handleToggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    );
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddAlert = (medicineId: string, strength: string, targetPrice: number) => {
    const med = MEDICINES.find((m) => m.id === medicineId) ?? MEDICINES[0];
    setAlerts((prev) => [
      {
        id: `alert-${Date.now()}`,
        medicineId: med.id,
        medicineName: med.genericName,
        strength,
        targetPrice,
        currentLowestPrice: med.baseGenericPrice10mg,
        enabled: true,
        lastChecked: 'Just now',
      },
      ...prev,
    ]);
  };

  const handleCompleteOrder = async (payload: CompletedPassPayload) => {
    const res = await saveCashlessPass({
      patientId: activePatient.id,
      ...payload,
    });
    setPassHistory((prev) => [res.record, ...prev]);
    if (res.schemaMissing) {
      setSupabaseSchemaMissing(true);
    }
    if (!res.persistedInDb && res.errorMessage) {
      setSupabaseSyncNote(
        res.rlsBlocked
          ? 'Pass generated locally. Confirm email or enable ABHA policy in Supabase SQL to persist rows.'
          : res.errorMessage,
      );
    }
  };

  const handleSignOut = async () => {
    await signOutPatient();
    sessionResolvedPatientRef.current = null;
    setProfileModalOpen(false);
    setAuthenticatedPatient(null);
    setPassHistory([]);
    setSupabaseSessionActive(false);
    setSupabaseSyncNote(null);
    setInCheckout(false);
    setEntryPhase('auth');
  };

  if (entryPhase === 'splash') {
    return <SplashLanding durationMs={3000} onComplete={handleSplashComplete} />;
  }

  if (entryPhase === 'auth' || !authenticatedPatient) {
    return (
      <LoginGateway
        onAuthenticated={({
          patient,
          passes,
          schemaMissing,
          supabaseSessionActive: active,
          syncNote,
        }) => {
          sessionResolvedPatientRef.current = patient;
          setAuthenticatedPatient(patient);
          setPassHistory(passes);
          setSupabaseSchemaMissing(schemaMissing);
          setSupabaseSessionActive(active);
          setSupabaseSyncNote(syncNote ?? null);
          setEntryPhase('ready');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faf9] text-slate-900 flex flex-col">
      <TopAppBar
        activeTab={activeTab}
        inCheckout={inCheckout}
        radiusKm={radiusKm}
        basketCount={totalBasketItems}
        patient={activePatient}
        onSelectTab={handleSelectTab}
        onOpenLocationModal={() => setLocationModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 pb-20 md:pb-10">
        {inCheckout ? (
          <CheckoutScreen
            basket={basket}
            ledger={ledger}
            patient={activePatient}
            discountCodes={DISCOUNT_CODES}
            appliedDiscountRule={appliedDiscountRule}
            onApplyDiscountCode={handleApplyDiscountCode}
            onRemoveDiscountCode={handleRemoveDiscountCode}
            onBackToEstimator={() => {
              setInCheckout(false);
              setActiveTab('estimator');
            }}
            onOpenRxModal={() => setRxModalOpen(true)}
            onCompleteOrder={handleCompleteOrder}
          />
        ) : activeTab === 'compare' ? (
          <CompareScreen
            medicines={availableMedicines}
            diagnosticPackages={DIAGNOSTIC_PACKAGES}
            diagnosticSections={DIAGNOSTIC_SECTIONS}
            providers={NAGPUR_PROVIDERS}
            selectedMedicineId={selectedMedicineId}
            selectedStrength={selectedStrength}
            selectedDiagnosticId={selectedDiagnosticId}
            formType={formType}
            sortOrder={sortOrder}
            radiusKm={radiusKm}
            basket={basket}
            basketTotal={ledger.outOfPocketTotal}
            fullBleed3D={false}
            onToggleFullBleed3D={(open) => {
              setScene3DMode('rx-inspector');
              setFullBleed3D(open);
            }}
            onSelectMedicine={handleSelectMedicine}
            onImportLiveMedicine={handleImportLiveMedicine}
            onSelectStrength={setSelectedStrength}
            onSelectDiagnostic={setSelectedDiagnosticId}
            onChangeFormType={setFormType}
            onToggleSortOrder={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            onAddToEstimator={handleAddToEstimator}
            onAddLabToEstimator={handleAddLabToEstimator}
            onOpenCoupon={(quote, medicine, strength) =>
              setCouponContext({ quote, medicine, strength })
            }
            onOpenEstimator={() => handleSelectTab('estimator')}
            onOpenLocationModal={() => setLocationModalOpen(true)}
          />
        ) : activeTab === 'estimator' ? (
          <EstimatorScreen
            basket={basket}
            coverageMode={coverageMode}
            ledger={ledger}
            routeOptimization={routeOptimization}
            consolidatedRouteApplied={consolidatedRouteApplied}
            priceDropMonitorEnabled={priceDropMonitorEnabled}
            diagnosticPackages={DIAGNOSTIC_PACKAGES}
            onChangeCoverageMode={setCoverageMode}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onToggleConsolidatedRoute={handleToggleConsolidatedRoute}
            onTogglePriceDropMonitor={() => setPriceDropMonitorEnabled((v) => !v)}
            onAddDiagnosticPackage={handleAddDiagnosticPackage}
            onProceedToCheckout={() => setInCheckout(true)}
            onGoToCompare={() => handleSelectTab('compare')}
          />
        ) : activeTab === 'directory' ? (
          <DirectoryScreen
            providers={NAGPUR_PROVIDERS}
            radiusKm={radiusKm}
            fullBleed3D={false}
            onToggleFullBleed3D={(open) => {
              setScene3DMode('network-map');
              setFullBleed3D(open);
            }}
            onSelectProviderForCompare={() => handleSelectTab('compare')}
          />
        ) : (
          <SavedAlertsScreen
            alerts={alerts}
            medicines={availableMedicines}
            onToggleAlert={handleToggleAlert}
            onDeleteAlert={handleDeleteAlert}
            onAddAlert={handleAddAlert}
            onCompareMedicine={(medId, str) => {
              setSelectedMedicineId(medId);
              setSelectedStrength(str);
              handleSelectTab('compare');
            }}
          />
        )}
      </main>

      <BottomNavBar
        activeTab={activeTab}
        inCheckout={inCheckout}
        basketCount={totalBasketItems}
        alertsCount={alerts.filter((a) => a.enabled).length}
        onSelectTab={handleSelectTab}
      />

      {fullBleed3D && (
        <Clinical3DCanvas
          mode={scene3DMode}
          medicineName={activeMedicine.genericName}
          brandName={activeMedicine.brandName}
          strength={selectedStrength}
          formType={formType}
          radiusKm={radiusKm}
          providers={NAGPUR_PROVIDERS}
          selectedProviderId="prov-apollo"
          fullBleed={true}
          onToggleFullBleed={setFullBleed3D}
          onChangeMode={setScene3DMode}
          onChangeFormType={setFormType}
        />
      )}

      <LocationModal
        open={locationModalOpen}
        radiusKm={radiusKm}
        onSelectRadius={setRadiusKm}
        onClose={() => setLocationModalOpen(false)}
      />

      <RxModal
        open={rxModalOpen}
        patient={activePatient}
        onClose={() => setRxModalOpen(false)}
      />

      <ProfileModal
        open={profileModalOpen}
        patient={activePatient}
        passHistory={passHistory}
        schemaMissing={supabaseSchemaMissing}
        supabaseSessionActive={supabaseSessionActive}
        syncNote={supabaseSyncNote}
        onClose={() => setProfileModalOpen(false)}
        onSignOut={handleSignOut}
      />

      <CouponModal
        quote={couponContext?.quote ?? null}
        medicine={couponContext?.medicine ?? null}
        strength={couponContext?.strength ?? selectedStrength}
        onClose={() => setCouponContext(null)}
      />
    </div>
  );
}
