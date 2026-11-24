import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraPreset, DrugFormType, Provider, RadiusKm, Scene3DMode } from '../types/swiftcare';

export interface Scene3DOptions {
  mode: Scene3DMode;
  medicineName: string;
  brandName: string;
  strength: string;
  formType: DrugFormType;
  explodeAmount: number; // 0 to 1
  radiusKm: RadiusKm;
  providers: Provider[];
  selectedProviderId: string | null;
  cameraPreset: CameraPreset;
}

const _desiredCamPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrushedMetalBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const shade = 112 + Math.floor(Math.sin(y * 0.7) * 14 + ((y * 37) % 19));
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 256, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createRxLabelTexture(
  medicineName: string,
  brandName: string,
  strength: string,
  formType: DrugFormType,
  maxAniso: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 256);

  // Top clinical teal header stripe
  ctx.fillStyle = formType === 'generic' ? '#029185' : '#b45309';
  ctx.fillRect(0, 0, 512, 54);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('SwiftCare Rx · ABDM Verified', 24, 35);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px sans-serif';
  const title = formType === 'generic' ? medicineName : `${brandName} (${medicineName})`;
  ctx.fillText(title.slice(0, 26), 24, 102);

  ctx.fillStyle = '#029185';
  ctx.font = 'bold 34px monospace';
  ctx.fillText(strength, 24, 150);

  ctx.fillStyle = '#475569';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    formType === 'generic' ? 'FDA AB-Rated Bioequivalent · #RX-8841' : 'Reference Brand Retail · #RX-8841',
    24,
    190,
  );

  // Barcode strips
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 28; i++) {
    const w = i % 3 === 0 ? 5 : 2;
    ctx.fillRect(24 + i * 9, 210, w, 28);
  }

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('PASS #MW-882', 330, 232);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function createNagpurMapTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#edf5f3';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle city grid
  ctx.strokeStyle = '#d3e4e0';
  ctx.lineWidth = 2;
  for (let i = 32; i < 512; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Primary arterial roads (WHC Road, Central Bazar Rd, Wardha Rd)
  ctx.strokeStyle = '#b9d4ce';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(40, 256);
  ctx.lineTo(472, 256);
  ctx.moveTo(256, 40);
  ctx.lineTo(256, 472);
  ctx.moveTo(80, 90);
  ctx.lineTo(430, 420);
  ctx.stroke();

  // Neighborhood labels
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('DHARAMPETH', 168, 224);
  ctx.fillText('SITABULDI', 96, 336);
  ctx.fillText('CIVIL LINES', 310, 146);
  ctx.fillText('RAMDASPETH', 292, 376);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export class Clinical3DController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private frameId = 0;
  private renderBusy = false;
  private renderDirty = false;
  private disposed = false;

  private rxGroup = new THREE.Group();
  private networkGroup = new THREE.Group();

  // Animated / Explodable Rx sub-groups
  private bottleGroup = new THREE.Group();
  private capGroup = new THREE.Group();
  private blisterGroup = new THREE.Group();
  private heroTabletGroup = new THREE.Group();
  private moleculeGroup = new THREE.Group();
  private labelMesh!: THREE.Mesh;
  private bottleBodyMat!: THREE.MeshPhysicalMaterial;
  private heroTabletMat!: THREE.MeshStandardMaterial;

  // Network map dynamic refs
  private radiusRingMeshes: { km: RadiusKm; mesh: THREE.Mesh }[] = [];
  private providerNodes = new Map<string, { group: THREE.Group; beacon: THREE.Mesh }>();

  // Transition targets
  private currentExplode = 0;
  private targetExplode = 0;
  private cameraAnimating = false;
  private lastTime = performance.now();
  private options: Scene3DOptions;

  // Disposable resource tracking
  private disposables: { dispose: () => void }[] = [];
  private labelTex: THREE.CanvasTexture | null = null;
  private contactShadowTex: THREE.CanvasTexture;
  private bumpTex: THREE.CanvasTexture;

  constructor(container: HTMLElement, initialOptions: Scene3DOptions) {
    this.container = container;
    this.options = initialOptions;
    this.isSoftwareGl = detectSoftwareGl();

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 240);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const bgHex = 0xe8f3f1;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.Fog(bgHex, 15, 36);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    this.disposables.push(envTex);
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(4.6, 3.6, 6.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 16;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.target.set(0, 0.85, 0);

    this.controls.addEventListener('change', () => {
      this.requestRender();
    });
    this.controls.addEventListener('start', () => {
      this.cameraAnimating = false;
    });

    this.contactShadowTex = createContactShadowTexture();
    this.bumpTex = createBrushedMetalBumpTexture();
    this.disposables.push(this.contactShadowTex, this.bumpTex);

    this.setupLighting();
    this.buildRxInspectorScene();
    this.buildNetworkMapScene(initialOptions.providers);

    this.scene.add(this.rxGroup);
    this.scene.add(this.networkGroup);

    this.applyOptions(initialOptions, true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.requestRender();
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight(0xd9f2ef, 0x9fb3b0, 0.95);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.2);
    keyLight.position.set(5.5, 9, 5.5);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x99f6e4, 0.75);
    rimLight.position.set(-6, 4.5, -5.5);
    this.scene.add(rimLight);
  }

  private makeContactShadow(radius: number, y = 0.015): THREE.Mesh {
    const geo = new THREE.CircleGeometry(radius, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    this.disposables.push(geo, mat);
    const disc = new THREE.Mesh(geo, mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = y;
    return disc;
  }

  private buildRxInspectorScene(): void {
    // 1. Clinical anodized aluminum pedestal plinth
    const plinthPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(2.75, 0),
      new THREE.Vector2(2.75, 0.14),
      new THREE.Vector2(2.6, 0.24),
      new THREE.Vector2(0, 0.24),
    ];
    const plinthGeo = new THREE.LatheGeometry(plinthPoints, 48);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xdbe9e6,
      metalness: 0.72,
      roughness: 0.34,
      bumpMap: this.bumpTex,
      bumpScale: 0.008,
    });
    this.disposables.push(plinthGeo, plinthMat);
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    this.rxGroup.add(plinth);
    this.rxGroup.add(this.makeContactShadow(3.15, 0.008));

    // Accent clinical teal trim ring around plinth
    const trimGeo = new THREE.TorusGeometry(2.62, 0.032, 12, 64);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x029185,
      metalness: 0.25,
      roughness: 0.35,
    });
    this.disposables.push(trimGeo, trimMat);
    const trimRing = new THREE.Mesh(trimGeo, trimMat);
    trimRing.rotation.x = Math.PI / 2;
    trimRing.position.y = 0.24;
    this.rxGroup.add(trimRing);

    // 2. Sculpted Pharmaceutical Bottle (LatheGeometry)
    const bottlePts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.68, 0.0),
      new THREE.Vector2(0.76, 0.12),
      new THREE.Vector2(0.76, 1.38),
      new THREE.Vector2(0.56, 1.66),
      new THREE.Vector2(0.54, 1.92),
      new THREE.Vector2(0.59, 1.96),
      new THREE.Vector2(0.5, 1.98),
    ];
    const bottleGeo = new THREE.LatheGeometry(bottlePts, 40);
    this.bottleBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d9488,
      metalness: 0.05,
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      transmission: this.isSoftwareGl ? 0 : 0.45,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.88 : 1,
      ior: 1.5,
      thickness: 0.8,
    });
    this.disposables.push(bottleGeo, this.bottleBodyMat);
    const bottleMesh = new THREE.Mesh(bottleGeo, this.bottleBodyMat);
    bottleMesh.castShadow = true;
    bottleMesh.receiveShadow = true;
    this.bottleGroup.add(bottleMesh);

    // Wrapped prescription label cylinder
    const labelGeo = new THREE.CylinderGeometry(0.772, 0.772, 0.96, 40, 1, true, -Math.PI * 0.65, Math.PI * 1.3);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.disposables.push(labelGeo, labelMat);
    this.labelMesh = new THREE.Mesh(labelGeo, labelMat);
    this.labelMesh.position.y = 0.78;
    this.labelMesh.rotation.y = 0.62;
    this.bottleGroup.add(this.labelMesh);

    // Interior capsules inside bottle (InstancedMesh)
    const innerPillGeo = new THREE.CapsuleGeometry(0.11, 0.16, 6, 12);
    const innerPillMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.05,
    });
    this.disposables.push(innerPillGeo, innerPillMat);
    const innerPills = new THREE.InstancedMesh(innerPillGeo, innerPillMat, 14);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 4.2;
      const rad = 0.22 + (i % 3) * 0.14;
      dummy.position.set(Math.cos(angle) * rad, 0.25 + Math.floor(i / 4) * 0.2, Math.sin(angle) * rad);
      dummy.rotation.set(i * 0.6, i * 1.1, i * 0.4);
      dummy.updateMatrix();
      innerPills.setMatrixAt(i, dummy.matrix);
    }
    innerPills.instanceMatrix.needsUpdate = true;
    innerPills.computeBoundingSphere();
    this.bottleGroup.add(innerPills);

    this.bottleGroup.position.set(-0.95, 0.25, -0.15);
    this.rxGroup.add(this.bottleGroup);

    // 3. Ribbed Child-Resistant Cap Group
    const capGeo = new THREE.CylinderGeometry(0.63, 0.65, 0.36, 36);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.42,
      metalness: 0.08,
    });
    this.disposables.push(capGeo, capMat);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.castShadow = true;
    this.capGroup.add(capMesh);

    const ribGeo = new THREE.BoxGeometry(0.05, 0.32, 0.08);
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55 });
    this.disposables.push(ribGeo, ribMat);
    const ribs = new THREE.InstancedMesh(ribGeo, ribMat, 20);
    for (let i = 0; i < 20; i++) {
      const theta = (i / 20) * Math.PI * 2;
      dummy.position.set(Math.cos(theta) * 0.64, 0, Math.sin(theta) * 0.64);
      dummy.rotation.set(0, -theta, 0);
      dummy.updateMatrix();
      ribs.setMatrixAt(i, dummy.matrix);
    }
    ribs.instanceMatrix.needsUpdate = true;
    ribs.computeBoundingSphere();
    this.capGroup.add(ribs);

    const capSealGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.03, 32);
    const capSealMat = new THREE.MeshStandardMaterial({ color: 0x029185, roughness: 0.3, metalness: 0.2 });
    this.disposables.push(capSealGeo, capSealMat);
    const capSeal = new THREE.Mesh(capSealGeo, capSealMat);
    capSeal.position.y = 0.185;
    this.capGroup.add(capSeal);

    this.capGroup.position.set(-0.95, 2.18, -0.15);
    this.rxGroup.add(this.capGroup);

    // 4. Blister Pack Tray Assembly (ExtrudeGeometry + Anisotropic Foil)
    const cardShape = new THREE.Shape();
    const cw = 1.45;
    const ch = 0.95;
    const r = 0.12;
    cardShape.moveTo(-cw / 2 + r, -ch / 2);
    cardShape.lineTo(cw / 2 - r, -ch / 2);
    cardShape.quadraticCurveTo(cw / 2, -ch / 2, cw / 2, -ch / 2 + r);
    cardShape.lineTo(cw / 2, ch / 2 - r);
    cardShape.quadraticCurveTo(cw / 2, ch / 2, cw / 2 - r, ch / 2);
    cardShape.lineTo(-cw / 2 + r, ch / 2);
    cardShape.quadraticCurveTo(-cw / 2, ch / 2, -cw / 2, ch / 2 - r);
    cardShape.lineTo(-cw / 2, -ch / 2 + r);
    cardShape.quadraticCurveTo(-cw / 2, -ch / 2, -cw / 2 + r, -ch / 2);

    const cardGeo = new THREE.ExtrudeGeometry(cardShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    cardGeo.rotateX(-Math.PI / 2);
    const foilMat = new THREE.MeshPhysicalMaterial({
      color: 0xdde7e5,
      metalness: 0.88,
      roughness: 0.22,
      anisotropy: 0.8,
      bumpMap: this.bumpTex,
      bumpScale: 0.006,
    });
    this.disposables.push(cardGeo, foilMat);
    const blisterCard = new THREE.Mesh(cardGeo, foilMat);
    blisterCard.castShadow = true;
    blisterCard.receiveShadow = true;
    this.blisterGroup.add(blisterCard);

    // 6 thermoformed dome cells + tablets
    const domeGeo = new THREE.SphereGeometry(0.16, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf0fdfa,
      roughness: 0.1,
      metalness: 0,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const blisterTabGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 20);
    const blisterTabMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    this.disposables.push(domeGeo, domeMat, blisterTabGeo, blisterTabMat);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const px = -0.44 + col * 0.44;
        const pz = -0.22 + row * 0.44;

        const tab = new THREE.Mesh(blisterTabGeo, blisterTabMat);
        tab.position.set(px, 0.08, pz);
        this.blisterGroup.add(tab);

        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.set(px, 0.06, pz);
        dome.renderOrder = 3;
        this.blisterGroup.add(dome);
      }
    }
    this.blisterGroup.position.set(1.05, 0.28, 0.35);
    this.blisterGroup.rotation.y = -0.25;
    this.rxGroup.add(this.blisterGroup);

    // 5. Hero Scored Tablet on Clinical Display Cradle
    const cradleGeo = new THREE.CylinderGeometry(0.45, 0.52, 0.16, 28);
    const cradleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38, metalness: 0.4 });
    this.disposables.push(cradleGeo, cradleMat);
    const cradle = new THREE.Mesh(cradleGeo, cradleMat);
    cradle.position.y = 0.08;
    cradle.castShadow = true;
    this.heroTabletGroup.add(cradle);

    const tabletPts = [
      new THREE.Vector2(0, -0.09),
      new THREE.Vector2(0.32, -0.09),
      new THREE.Vector2(0.38, -0.04),
      new THREE.Vector2(0.38, 0.04),
      new THREE.Vector2(0.32, 0.09),
      new THREE.Vector2(0, 0.09),
    ];
    const tabletGeo = new THREE.LatheGeometry(tabletPts, 36);
    this.heroTabletMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.06,
    });
    this.disposables.push(tabletGeo, this.heroTabletMat);
    const tabletMesh = new THREE.Mesh(tabletGeo, this.heroTabletMat);
    tabletMesh.position.y = 0.32;
    tabletMesh.rotation.x = 0.42;
    tabletMesh.castShadow = true;
    this.heroTabletGroup.add(tabletMesh);

    const scoreBarGeo = new THREE.BoxGeometry(0.56, 0.025, 0.03);
    const scoreBarMat = new THREE.MeshStandardMaterial({ color: 0x029185, roughness: 0.4 });
    this.disposables.push(scoreBarGeo, scoreBarMat);
    const scoreBar = new THREE.Mesh(scoreBarGeo, scoreBarMat);
    scoreBar.position.set(0, 0.4, 0.04);
    scoreBar.rotation.x = 0.42;
    this.heroTabletGroup.add(scoreBar);

    this.heroTabletGroup.position.set(1.05, 0.25, -0.82);
    this.rxGroup.add(this.heroTabletGroup);

    // 6. Bioequivalence Molecular Ring (TubeGeometry + Atom Spheres)
    const hexPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hexPts.push(new THREE.Vector3(Math.cos(a) * 0.52, Math.sin(a * 2) * 0.07, Math.sin(a) * 0.52));
    }
    const hexCurve = new THREE.CatmullRomCurve3(hexPts, true);
    const tubeGeo = new THREE.TubeGeometry(hexCurve, 48, 0.025, 10, true);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.45,
      roughness: 0.25,
    });
    this.disposables.push(tubeGeo, tubeMat);
    const ringMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.moleculeGroup.add(ringMesh);

    const atomGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const atomMat = new THREE.MeshStandardMaterial({ color: 0x029185, roughness: 0.2, metalness: 0.35 });
    this.disposables.push(atomGeo, atomMat);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const atom = new THREE.Mesh(atomGeo, atomMat);
      atom.position.set(Math.cos(a) * 0.52, Math.sin(a * 2) * 0.07, Math.sin(a) * 0.52);
      this.moleculeGroup.add(atom);
    }
    this.moleculeGroup.position.set(1.05, 1.32, -0.82);
    this.rxGroup.add(this.moleculeGroup);
  }

  private buildNetworkMapScene(providers: Provider[]): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const mapTex = createNagpurMapTexture(maxAniso);
    this.disposables.push(mapTex);

    // 1. Nagpur Ground Slab
    const slabGeo = new THREE.BoxGeometry(11.5, 0.32, 10.5);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mapTex,
      roughness: 0.78,
      metalness: 0.05,
    });
    const slabSideMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.6,
      metalness: 0.2,
    });
    this.disposables.push(slabGeo, slabMat, slabSideMat);
    const slab = new THREE.Mesh(slabGeo, [
      slabSideMat,
      slabSideMat,
      slabMat,
      slabSideMat,
      slabSideMat,
      slabSideMat,
    ]);
    slab.position.y = -0.16;
    slab.receiveShadow = true;
    this.networkGroup.add(slab);
    this.networkGroup.add(this.makeContactShadow(6.8, -0.33));

    // 2. Radius Rings (2km, 5km, 10km)
    const rings: { km: RadiusKm; r: number }[] = [
      { km: 2, r: 2.0 },
      { km: 5, r: 3.6 },
      { km: 10, r: 4.9 },
    ];
    rings.forEach(({ km, r }, i) => {
      const ringGeo = new THREE.RingGeometry(r - 0.06, r, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x029185,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      this.disposables.push(ringGeo, ringMat);
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.02 + i * 0.005;
      this.networkGroup.add(mesh);
      this.radiusRingMeshes.push({ km, mesh });
    });

    // 3. Patient Home Hub (Dharampeth Center)
    const homeGroup = new THREE.Group();
    const homeBaseGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.14, 24);
    const homeBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
    const homeBodyGeo = new THREE.BoxGeometry(0.42, 0.36, 0.42);
    const homeBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    const roofGeo = new THREE.ConeGeometry(0.36, 0.26, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x029185, roughness: 0.35 });
    this.disposables.push(homeBaseGeo, homeBaseMat, homeBodyGeo, homeBodyMat, roofGeo, roofMat);

    const hBase = new THREE.Mesh(homeBaseGeo, homeBaseMat);
    hBase.position.y = 0.07;
    const hBody = new THREE.Mesh(homeBodyGeo, homeBodyMat);
    hBody.position.y = 0.32;
    hBody.castShadow = true;
    const hRoof = new THREE.Mesh(roofGeo, roofMat);
    hRoof.position.y = 0.63;
    hRoof.rotation.y = Math.PI / 4;
    homeGroup.add(hBase, hBody, hRoof, this.makeContactShadow(0.55, 0.012));
    this.networkGroup.add(homeGroup);

    // 4. Composite Pharmacy & NABL Lab Buildings
    const plinthGeo = new THREE.BoxGeometry(0.68, 0.08, 0.68);
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75 });
    const pharmBodyGeo = new THREE.BoxGeometry(0.54, 0.56, 0.54);
    const pharmBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    const labBodyGeo = new THREE.BoxGeometry(0.58, 0.88, 0.58);
    const labBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xcffafe,
      roughness: 0.15,
      metalness: 0.25,
      clearcoat: 0.8,
    });
    const canopyGeo = new THREE.BoxGeometry(0.62, 0.08, 0.26);
    const crossHGeo = new THREE.BoxGeometry(0.24, 0.07, 0.04);
    const crossVGeo = new THREE.BoxGeometry(0.07, 0.24, 0.04);
    this.disposables.push(plinthGeo, plinthMat, pharmBodyGeo, pharmBodyMat, labBodyGeo, labBodyMat, canopyGeo, crossHGeo, crossVGeo);

    providers.slice(0, 10).forEach((prov) => {
      const bGroup = new THREE.Group();
      const isLab = prov.type === 'lab';

      const base = new THREE.Mesh(plinthGeo, plinthMat);
      base.position.y = 0.04;

      const body = new THREE.Mesh(isLab ? labBodyGeo : pharmBodyGeo, isLab ? labBodyMat : pharmBodyMat);
      body.position.y = isLab ? 0.52 : 0.36;
      body.castShadow = true;
      body.receiveShadow = true;

      const accentMat = new THREE.MeshStandardMaterial({
        color: isLab ? 0x0d9488 : 0x10b981,
        roughness: 0.3,
        metalness: 0.2,
      });
      this.disposables.push(accentMat);

      const canopy = new THREE.Mesh(canopyGeo, accentMat);
      canopy.position.set(0, isLab ? 0.98 : 0.66, 0.16);

      const cH = new THREE.Mesh(crossHGeo, accentMat);
      cH.position.set(0, isLab ? 0.68 : 0.45, isLab ? 0.3 : 0.28);
      const cV = new THREE.Mesh(crossVGeo, accentMat);
      cV.position.set(0, isLab ? 0.68 : 0.45, isLab ? 0.3 : 0.28);

      bGroup.add(base, body, canopy, cH, cV, this.makeContactShadow(0.55, 0.015));
      bGroup.position.set(prov.coords.x, 0, prov.coords.z);
      this.networkGroup.add(bGroup);
      this.providerNodes.set(prov.id, { group: bGroup, beacon: canopy });
    });

    // 5. Pickup & Phlebotomy Route Tubes
    const routePts = [
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(-0.45, 0.65, -0.4),
      new THREE.Vector3(-0.9, 0.25, -0.8),
      new THREE.Vector3(0.2, 0.85, 0.9),
      new THREE.Vector3(1.2, 0.25, 2.4),
    ];
    const routeCurve = new THREE.CatmullRomCurve3(routePts);
    const routeGeo = new THREE.TubeGeometry(routeCurve, 48, 0.04, 8, false);
    const routeMat = new THREE.MeshStandardMaterial({
      color: 0x029185,
      emissive: 0x029185,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    });
    this.disposables.push(routeGeo, routeMat);
    const routeMesh = new THREE.Mesh(routeGeo, routeMat);
    this.networkGroup.add(routeMesh);
  }

  public applyOptions(next: Scene3DOptions, snapImmediate = false): void {
    const prev = this.options;
    this.options = next;

    this.rxGroup.visible = next.mode === 'rx-inspector';
    this.networkGroup.visible = next.mode === 'network-map';

    // Update Rx label texture if medicine, strength, or form changed
    if (
      snapImmediate ||
      prev.medicineName !== next.medicineName ||
      prev.brandName !== next.brandName ||
      prev.strength !== next.strength ||
      prev.formType !== next.formType
    ) {
      if (this.labelTex) {
        this.labelTex.dispose();
      }
      this.labelTex = createRxLabelTexture(
        next.medicineName,
        next.brandName,
        next.strength,
        next.formType,
        this.renderer.capabilities.getMaxAnisotropy(),
      );
      const lMat = this.labelMesh.material as THREE.MeshStandardMaterial;
      lMat.map = this.labelTex;
      lMat.needsUpdate = true;

      // Update bottle & tablet appearance between AB-Rated Generic (clinical teal/white) vs Brand (amber/gold)
      if (next.formType === 'generic') {
        this.bottleBodyMat.color.setHex(0x0d9488);
        this.heroTabletMat.color.setHex(0xffffff);
      } else {
        this.bottleBodyMat.color.setHex(0xd97706);
        this.heroTabletMat.color.setHex(0xfef3c7);
      }
    }

    // Update radius ring highlights on Network Map
    this.radiusRingMeshes.forEach(({ km, mesh }) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = km === next.radiusKm ? 0.72 : 0.16;
      mat.color.setHex(km === next.radiusKm ? 0x029185 : 0x64748b);
    });

    // Highlight selected provider
    this.providerNodes.forEach(({ group, beacon }, id) => {
      const isSelected = id === next.selectedProviderId;
      group.scale.setScalar(isSelected ? 1.18 : 1.0);
      const mat = beacon.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(isSelected ? 0x029185 : 0x000000);
      mat.emissiveIntensity = isSelected ? 0.45 : 0;
    });

    // Explode target
    this.targetExplode = next.explodeAmount;
    if (snapImmediate || this.isSoftwareGl) {
      this.currentExplode = this.targetExplode;
      this.applyExplodePositions(this.currentExplode);
    }

    // Camera preset
    if (snapImmediate || prev.mode !== next.mode || prev.cameraPreset !== next.cameraPreset) {
      this.computeCameraPreset(next.mode, next.cameraPreset);
      if (snapImmediate || this.isSoftwareGl) {
        this.camera.position.copy(_desiredCamPos);
        this.controls.target.copy(_desiredTarget);
        this.controls.update();
        this.cameraAnimating = false;
      } else {
        this.cameraAnimating = true;
      }
    }

    this.requestRender();
  }

  private computeCameraPreset(mode: Scene3DMode, preset: CameraPreset): void {
    if (mode === 'rx-inspector') {
      if (preset === 'top') {
        _desiredCamPos.set(0.1, 6.4, 2.2);
        _desiredTarget.set(0, 0.5, 0);
      } else if (preset === 'detail') {
        _desiredCamPos.set(2.4, 1.85, 2.5);
        _desiredTarget.set(0.95, 0.7, -0.45);
      } else {
        _desiredCamPos.set(4.5, 3.3, 5.8);
        _desiredTarget.set(0, 0.85, 0);
      }
    } else {
      if (preset === 'top') {
        _desiredCamPos.set(0, 10.5, 2.5);
        _desiredTarget.set(0, 0, 0);
      } else if (preset === 'detail') {
        _desiredCamPos.set(-2.6, 3.2, 3.8);
        _desiredTarget.set(-0.6, 0.35, -0.4);
      } else {
        _desiredCamPos.set(6.3, 6.9, 8.2);
        _desiredTarget.set(0, 0.15, 0);
      }
    }
  }

  private applyExplodePositions(t: number): void {
    this.capGroup.position.y = 2.18 + t * 1.05;
    this.capGroup.rotation.y = t * 0.65;
    this.bottleGroup.position.x = -0.95 - t * 0.45;
    this.blisterGroup.position.x = 1.05 + t * 0.48;
    this.blisterGroup.position.y = 0.28 + t * 0.22;
    this.heroTabletGroup.position.y = 0.25 + t * 0.32;
    this.moleculeGroup.position.y = 1.32 + t * 0.65;
    this.moleculeGroup.rotation.y = t * 1.4;
  }

  public resize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 240);
    const height = Math.max(this.container.clientHeight, 200);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.requestRender();
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  public requestRender(): void {
    if (this.disposed) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      let needsAnotherFrame = false;

      if (!this.isSoftwareGl) {
        if (Math.abs(this.currentExplode - this.targetExplode) > 0.002) {
          this.currentExplode = THREE.MathUtils.damp(this.currentExplode, this.targetExplode, 7, dt);
          this.applyExplodePositions(this.currentExplode);
          needsAnotherFrame = true;
        }
        if (this.cameraAnimating) {
          const alpha = 1 - Math.exp(-6.5 * dt);
          this.camera.position.lerp(_desiredCamPos, alpha);
          this.controls.target.lerp(_desiredTarget, alpha);
          if (
            this.camera.position.distanceTo(_desiredCamPos) < 0.03 &&
            this.controls.target.distanceTo(_desiredTarget) < 0.03
          ) {
            this.camera.position.copy(_desiredCamPos);
            this.controls.target.copy(_desiredTarget);
            this.cameraAnimating = false;
          } else {
            needsAnotherFrame = true;
          }
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty || needsAnotherFrame) {
          this.requestRender();
        }
      };

      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.controls.dispose();
    if (this.labelTex) this.labelTex.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
