import { useState } from 'react';
import { Bell, Plus, TrendingDown, Trash2 } from 'lucide-react';
import { Medicine, PriceAlert } from '../types/swiftcare';
import { formatINR } from '../utils/pricing';

interface SavedAlertsScreenProps {
  alerts: PriceAlert[];
  medicines: Medicine[];
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onAddAlert: (medicineId: string, strength: string, targetPrice: number) => void;
  onCompareMedicine: (medicineId: string, strength: string) => void;
}

export function SavedAlertsScreen({
  alerts,
  medicines,
  onToggleAlert,
  onDeleteAlert,
  onAddAlert,
  onCompareMedicine,
}: SavedAlertsScreenProps) {
  const [newMedId, setNewMedId] = useState(medicines[0].id);
  const selectedMed = medicines.find((m) => m.id === newMedId) ?? medicines[0];
  const [newStrength, setNewStrength] = useState(selectedMed.strengths[0]);
  const [targetPrice, setTargetPrice] = useState(10);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPrice <= 0) return;
    onAddAlert(newMedId, newStrength, targetPrice);
  };

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Saved Price-Drop Alerts</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Automated monitoring across 14 licensed Nagpur dispensaries and NABL labs
          </p>
        </div>
        <div className="text-xs font-semibold text-[#029185] tabular-nums">
          {alerts.filter((a) => a.enabled).length} active monitors
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Alert List */}
        <section className="lg:col-span-7 space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-sm font-semibold text-slate-900">No saved alerts yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Create a target price alert on the right to get notified when local dispensary
                rates drop.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isMet = alert.currentLowestPrice <= alert.targetPrice;
              return (
                <article
                  key={alert.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-900">
                          {alert.medicineName} {alert.strength}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500">Checked {alert.lastChecked}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs tabular-nums">
                        <span>
                          Target:{' '}
                          <strong className="text-slate-900">{formatINR(alert.targetPrice)}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Current Lowest:{' '}
                          <strong className={isMet ? 'text-[#10B981]' : 'text-[#029185]'}>
                            {formatINR(alert.currentLowestPrice)}
                          </strong>
                        </span>
                      </div>
                      {alert.triggeredDrop && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#10B981]">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>{alert.triggeredDrop}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={alert.enabled}
                      aria-label={`Toggle alert for ${alert.medicineName} ${alert.strength}`}
                      onClick={() => onToggleAlert(alert.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        alert.enabled ? 'bg-[#029185]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          alert.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onCompareMedicine(alert.medicineId, alert.strength)}
                      className="text-xs font-semibold text-[#029185] hover:underline"
                    >
                      Compare Live Offers
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAlert(alert.id)}
                      aria-label={`Delete alert for ${alert.medicineName}`}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#E11D48]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Create Alert Form */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#029185]" />
              <h2 className="text-sm font-bold text-slate-900">Create Price-Drop Monitor</h2>
            </div>

            <div>
              <label htmlFor="alert-med" className="block text-xs font-medium text-slate-700 mb-1">
                Medicine
              </label>
              <select
                id="alert-med"
                value={newMedId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setNewMedId(nextId);
                  const found = medicines.find((m) => m.id === nextId);
                  if (found) setNewStrength(found.strengths[0]);
                }}
                className="w-full h-10 rounded-lg border border-slate-200 bg-[#f6faf9] px-3 text-xs font-medium text-slate-900"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.genericName} ({m.brandName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="alert-strength"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Strength
                </label>
                <select
                  id="alert-strength"
                  value={newStrength}
                  onChange={(e) => setNewStrength(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-[#f6faf9] px-3 text-xs font-medium text-slate-900"
                >
                  {selectedMed.strengths.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="alert-target"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Target Price (₹)
                </label>
                <input
                  id="alert-target"
                  type="number"
                  min={1}
                  step={0.5}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-[#f6faf9] px-3 text-xs font-semibold text-slate-900 tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-[#029185] hover:bg-[#0D9488] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Price Alert</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
