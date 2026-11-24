import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, RotateCcw, Layers, MapPin, Pill } from 'lucide-react';
import { Clinical3DController, Scene3DOptions } from '../three/clinicalScene';
import { CameraPreset, DrugFormType, Provider, RadiusKm, Scene3DMode } from '../types/swiftcare';

interface Clinical3DCanvasProps {
  mode: Scene3DMode;
  medicineName: string;
  brandName: string;
  strength: string;
  formType: DrugFormType;
  radiusKm: RadiusKm;
  providers: Provider[];
  selectedProviderId: string | null;
  fullBleed: boolean;
  onToggleFullBleed: (open: boolean) => void;
  onChangeMode?: (mode: Scene3DMode) => void;
  onChangeFormType?: (formType: DrugFormType) => void;
}

export function Clinical3DCanvas({
  mode,
  medicineName,
  brandName,
  strength,
  formType,
  radiusKm,
  providers,
  selectedProviderId,
  fullBleed,
  onToggleFullBleed,
  onChangeMode,
  onChangeFormType,
}: Clinical3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<Clinical3DController | null>(null);

  const [explodeAmount, setExplodeAmount] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('hero');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const latestOptionsRef = useRef<Scene3DOptions>({
    mode,
    medicineName,
    brandName,
    strength,
    formType,
    explodeAmount,
    radiusKm,
    providers,
    selectedProviderId,
    cameraPreset,
  });

  latestOptionsRef.current = {
    mode,
    medicineName,
    brandName,
    strength,
    formType,
    explodeAmount,
    radiusKm,
    providers,
    selectedProviderId,
    cameraPreset,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = new Clinical3DController(container, latestOptionsRef.current);
    controllerRef.current = controller;

    const canvas = container.querySelector('canvas');
    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => {
      setContextLost(false);
      controller.requestRender();
    };
    canvas?.addEventListener('webglcontextlost', onLost);
    canvas?.addEventListener('webglcontextrestored', onRestored);

    const resizeObserver = new ResizeObserver(() => {
      controller.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas?.removeEventListener('webglcontextlost', onLost);
      canvas?.removeEventListener('webglcontextrestored', onRestored);
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.applyOptions({
      mode,
      medicineName,
      brandName,
      strength,
      formType,
      explodeAmount,
      radiusKm,
      providers,
      selectedProviderId,
      cameraPreset,
    });
  }, [
    mode,
    medicineName,
    brandName,
    strength,
    formType,
    explodeAmount,
    radiusKm,
    providers,
    selectedProviderId,
    cameraPreset,
    fullBleed,
  ]);

  // Trigger resize after fullBleed toggles so WebGL viewport matches 100vw x 100vh or card
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      controllerRef.current?.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [fullBleed]);

  useEffect(() => {
    if (!fullBleed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        onToggleFullBleed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullBleed, onToggleFullBleed]);

  const wrapperClass = fullBleed
    ? 'fixed inset-0 z-50 w-screen h-screen bg-[#e8f3f1]'
    : 'relative w-full h-[230px] sm:h-[260px] rounded-xl overflow-hidden border border-slate-200 bg-[#e8f3f1]';

  return (
    <div className={wrapperClass} data-testid="clinical-3d-viewport" data-mode={mode}>
      {/* Isolated WebGL mount container */}
      <div ref={mountRef} className="w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f0f4f3] p-6 text-center">
          <p className="text-sm font-semibold text-slate-900">3D Graphics Context Suspended</p>
          <p className="mt-1 text-xs text-slate-600">
            Restoring clinical inspection canvas automatically.
          </p>
        </div>
      )}

      {/* Top minimal overlay badge + expand/close control (solid/rgba surface, no backdrop-filter over WebGL) */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto rounded-lg bg-[#ffffff]/95 border border-slate-200 px-3 py-1.5 shadow-sm">
          <div className="text-xs font-semibold text-slate-900">
            {mode === 'rx-inspector'
              ? `${formType === 'generic' ? medicineName : brandName} ${strength}`
              : `Nagpur Care Network · ${radiusKm}km Radius`}
          </div>
          <div className="text-[11px] text-slate-600">
            {mode === 'rx-inspector'
              ? formType === 'generic'
                ? 'AB-Rated Bioequivalent · 3D Pack'
                : 'Reference Brand Retail · 3D Pack'
              : 'Dharampeth Hub · NABL & Rx Route'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleFullBleed(!fullBleed)}
          aria-label={fullBleed ? 'Exit full-screen 3D view' : 'Expand 3D inspector to full screen'}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a]/92 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#0f172a] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
        >
          {fullBleed ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Close 3D</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Inspect 3D</span>
            </>
          )}
        </button>
      </div>

      {/* Inline quick camera strip when embedded */}
      {!fullBleed && (
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-[#ffffff]/95 border border-slate-200 p-1 shadow-sm">
            {(['hero', 'detail', 'top'] as CameraPreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCameraPreset(preset)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                  cameraPreset === preset
                    ? 'bg-[#029185] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset === 'hero' ? 'Angle' : preset === 'detail' ? 'Close-up' : 'Top'}
              </button>
            ))}
          </div>

          {mode === 'rx-inspector' && (
            <button
              type="button"
              onClick={() => setExplodeAmount((v) => (v > 0.5 ? 0 : 0.85))}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-lg bg-[#ffffff]/95 border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-800 shadow-sm hover:bg-white transition-colors whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-[#029185]" />
              <span>{explodeAmount > 0.5 ? 'Assemble' : 'Explode View'}</span>
            </button>
          )}
        </div>
      )}

      {/* Full-bleed collapsible bottom control dock (<= 15% viewport footprint, solid/rgba surface) */}
      {fullBleed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(900px,94vw)] flex flex-col items-center pointer-events-none">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a]/92 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#0f172a] transition-colors whitespace-nowrap"
          >
            {dockCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto w-full rounded-xl bg-[#ffffff]/96 border border-slate-200 px-4 py-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
              {/* Scene Mode Switcher */}
              {onChangeMode && (
                <div className="flex items-center gap-1 bg-[#f0f4f3] p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onChangeMode('rx-inspector')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      mode === 'rx-inspector'
                        ? 'bg-[#029185] text-white'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Pill className="w-3.5 h-3.5" />
                    <span>Rx Bioequivalence</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeMode('network-map')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      mode === 'network-map'
                        ? 'bg-[#029185] text-white'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Nagpur Network</span>
                  </button>
                </div>
              )}

              {/* Generic vs Brand or Explode Slider */}
              {mode === 'rx-inspector' && (
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  {onChangeFormType && (
                    <div className="flex items-center gap-1 bg-[#f0f4f3] p-1 rounded-lg shrink-0">
                      <button
                        type="button"
                        onClick={() => onChangeFormType('generic')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                          formType === 'generic'
                            ? 'bg-white text-[#029185] shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        AB-Generic
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeFormType('brand')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                          formType === 'brand'
                            ? 'bg-white text-amber-700 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Brand
                      </button>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 flex-1">
                    <span className="whitespace-nowrap">Explode</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={explodeAmount}
                      onChange={(e) => setExplodeAmount(Number(e.target.value))}
                      aria-label="Explode 3D layers"
                      className="w-full accent-[#029185]"
                    />
                  </label>
                </div>
              )}

              {/* Camera Presets */}
              <div className="flex items-center gap-1 bg-[#f0f4f3] p-1 rounded-lg shrink-0">
                {(['hero', 'detail', 'top'] as CameraPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCameraPreset(preset)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      cameraPreset === preset
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {preset === 'hero' ? '3/4 Hero' : preset === 'detail' ? 'Detail' : 'Top View'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset('hero');
                    setExplodeAmount(0);
                  }}
                  aria-label="Reset 3D camera"
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
