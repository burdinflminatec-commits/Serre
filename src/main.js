import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PARTS_CATALOG } from './data/serreData.js';
import { createMaterialsRegistry } from './cad/materials.js';
import { buildSerreAssembly, cadToThree } from './cad/geometryBuilder.js';
import { SectionCapManager } from './cad/sectionCap.js';
import { MeasurementTool } from './cad/measurementTool.js';
import { renderPieceInspector2D } from './ui/svgInspector.js';
import { renderCutlistModal } from './ui/cutlistModal.js';
import { renderBomModal } from './ui/bomModal.js';

// ============================================================================
// VERROUILLAGE PAR CODE PIN & MÉMORISATION NAVIGATEUR (LOCALSTORAGE)
// ============================================================================
const PIN_STORAGE_KEY = 'serre_cad_pin_auth_v1';
const EXPECTED_PIN_HASH = 'a1f16d7840814920'; // Empreinte salée (jamais stockée en clair)

function computePinHash(pin) {
  const s = `SERRE_CAD_SALT_2026::${pin}::ATELIER`;
  let h1 = 0xdeadbeef ^ s.length;
  let h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

const pinOverlay = document.getElementById('pin-lock-overlay');
const pinDots = Array.from(document.querySelectorAll('#pin-dots .pin-dot'));
const pinError = document.getElementById('pin-error');
const chkPinRemember = document.getElementById('chk-pin-remember');
let enteredPin = '';
let isPinUnlocked = false;

function checkSavedPinSession() {
  try {
    if (localStorage.getItem(PIN_STORAGE_KEY) === EXPECTED_PIN_HASH) {
      isPinUnlocked = true;
      pinOverlay.classList.add('hidden');
    }
  } catch (_) {
    // Ignore storage errors in private mode
  }
}

function updatePinDotsUI(isError = false) {
  pinDots.forEach((dot, idx) => {
    dot.classList.toggle('filled', idx < enteredPin.length && !isError);
    dot.classList.toggle('error', isError);
  });
}

function handlePinDigit(digit) {
  if (isPinUnlocked || enteredPin.length >= 4) return;
  pinError.classList.add('hidden');
  enteredPin += digit;
  updatePinDotsUI(false);

  if (enteredPin.length === 4) {
    const candidateHash = computePinHash(enteredPin);
    if (candidateHash === EXPECTED_PIN_HASH) {
      isPinUnlocked = true;
      if (chkPinRemember && chkPinRemember.checked) {
        try {
          localStorage.setItem(PIN_STORAGE_KEY, EXPECTED_PIN_HASH);
        } catch (_) {}
      }
      setTimeout(() => {
        pinOverlay.classList.add('hidden');
        enteredPin = '';
        updatePinDotsUI(false);
      }, 120);
    } else {
      pinError.classList.remove('hidden');
      updatePinDotsUI(true);
      setTimeout(() => {
        enteredPin = '';
        updatePinDotsUI(false);
      }, 450);
    }
  }
}

document.querySelectorAll('.pin-key').forEach((btn) => {
  btn.addEventListener('click', () => {
    const digit = btn.getAttribute('data-digit');
    const action = btn.getAttribute('data-action');
    if (digit !== null) {
      handlePinDigit(digit);
    } else if (action === 'clear') {
      enteredPin = '';
      updatePinDotsUI(false);
    } else if (action === 'back') {
      enteredPin = enteredPin.slice(0, -1);
      updatePinDotsUI(false);
    }
  });
});

window.addEventListener('keydown', (e) => {
  if (isPinUnlocked) return;
  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    handlePinDigit(e.key);
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    enteredPin = enteredPin.slice(0, -1);
    updatePinDotsUI(false);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    enteredPin = '';
    updatePinDotsUI(false);
  }
});

document.getElementById('btn-top-lock')?.addEventListener('click', () => {
  try {
    localStorage.removeItem(PIN_STORAGE_KEY);
  } catch (_) {}
  isPinUnlocked = false;
  enteredPin = '';
  updatePinDotsUI(false);
  pinOverlay.classList.remove('hidden');
});

checkSavedPinSession();

// ============================================================================
// DÉTECTION & BASCULE DU PROFIL TABLETTE LITE (SAMSUNG GALAXY TAB A SM-T580)
// SoC : Exynos 7870 | GPU : Mali-T830 MP1 (1 cœur) | RAM : 2 Go
// ============================================================================
const PERF_STORAGE_KEY = 'serre_cad_perf_mode_v1';
const urlParams = new URLSearchParams(window.location.search);
const savedPerfMode = (() => {
  try {
    return localStorage.getItem(PERF_STORAGE_KEY);
  } catch (_) {
    return null;
  }
})();

const isMobileOrTabletUA = /Android|SM-T580|Tablet|Mobile|iPad|iPhone/i.test(
  navigator.userAgent || ''
);

const isLiteMode = Boolean(
  urlParams.get('lite') === '1' ||
    savedPerfMode === 'lite' ||
    (savedPerfMode !== 'hd' && isMobileOrTabletUA)
);

document.body.classList.toggle('lite-mode', isLiteMode);

const btnTopPerf = document.getElementById('btn-top-perf');
if (btnTopPerf) {
  btnTopPerf.textContent = '⚡ Lite';
  btnTopPerf.classList.toggle('lite-active', isLiteMode);
  btnTopPerf.title = isLiteMode
    ? 'Mode Lite actif — Cliquer pour passer en HD'
    : 'Activer le Mode Lite (Tablette / Mobile)';

  btnTopPerf.addEventListener('click', () => {
    saveViewStateToSession();
    const nextMode = isLiteMode ? 'hd' : 'lite';
    try {
      localStorage.setItem(PERF_STORAGE_KEY, nextMode);
    } catch (_) {}
    const url = new URL(window.location.href);
    if (nextMode === 'lite') {
      url.searchParams.set('lite', '1');
    } else {
      url.searchParams.delete('lite');
    }
    window.location.href = url.toString();
  });
}

// ============================================================================
// PLEIN ÉCRAN (FULLSCREEN API) & REPLI DU PANNEAU DE DROITE
// ============================================================================
const btnTopFullscreen = document.getElementById('btn-top-fullscreen');
const btnVpPanel = document.getElementById('btn-vp-panel');

function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
  );
}

function updateFullscreenButtonsUI() {
  const active = isFullscreenActive();
  if (btnTopFullscreen) {
    btnTopFullscreen.textContent = active ? '⛶ Quitter' : '⛶ Plein écran';
    btnTopFullscreen.classList.toggle('active', active);
  }
}

function toggleFullscreen() {
  const docEl = document.documentElement;
  if (!isFullscreenActive()) {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

btnTopFullscreen?.addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', () => {
  updateFullscreenButtonsUI();
  setTimeout(onResize, 60);
});
document.addEventListener('webkitfullscreenchange', () => {
  updateFullscreenButtonsUI();
  setTimeout(onResize, 60);
});

btnVpPanel?.addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('panel-collapsed');
  btnVpPanel.classList.toggle('active', collapsed);
  onResize();
});

window.addEventListener('keydown', (e) => {
  if (!isPinUnlocked) return;
  if ((e.key === 'f' || e.key === 'F') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    toggleFullscreen();
  }
});

// ============================================================================
// INITIALISATION DU BUREAU D'ÉTUDES & ATELIER CAD 3D
// ============================================================================

const canvas = document.getElementById('three-canvas');
const viewportContainer = document.getElementById('viewport-container');

// 1. CONFIGURATION DU RENDERER (En mode Lite : réduction du Fill-Rate de 60 à 70 %)
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isLiteMode, // OBLIGATOIRE sur Mali-T830 : pas de MSAA
  powerPreference: 'high-performance',
  alpha: false, // Évite le compositing transparent avec le DOM HTML derrière
  stencil: true, // Permet d'afficher les tranches pleines lors d'une Coupe 3D (coût nul quand la coupe est inactive)
  depth: true
});

// En mode Lite : 0.8 permet de calculer en ~1024×640 au lieu de 1920×1200 (DPR 1.5 banni)
renderer.setPixelRatio(isLiteMode ? 0.8 : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = !isLiteMode;
if (!isLiteMode) {
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
}
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d131c');

const camera = new THREE.PerspectiveCamera(42, 1, 10, 25000);
camera.position.set(1850, 1650, 2150);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 560, 0);
// En mode Lite : désactiver l'inertie (damping) pour stopper immédiatement les frames au lâcher du doigt
controls.enableDamping = !isLiteMode;
controls.dampingFactor = 0.08;
controls.maxDistance = 9500;
controls.minDistance = 200;
controls.update();

// Éclairage Atelier CAD
const ambientLight = new THREE.AmbientLight(0xdbeafe, isLiteMode ? 0.95 : 0.85);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.65);
hemiLight.position.set(0, 3000, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
dirLight.position.set(1800, 2900, 2100);
if (!isLiteMode) {
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 200;
  dirLight.shadow.camera.far = 7500;
  const d = 1750;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
}
scene.add(dirLight);

const backLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
backLight.position.set(-1600, 1400, -1900);
scene.add(backLight);

// Grille technique au sol avec axes centraux bleus (0x38bdf8)
const gridMajor = new THREE.GridHelper(
  7600,
  isLiteMode ? 38 : 76,
  0x38bdf8,
  0x1e293b
);
gridMajor.position.y = -0.5;
scene.add(gridMajor);

// Axes repère au sol (Origine au coin avant-gauche pour lecture intuitive)
const axesGroup = new THREE.Group();
axesGroup.position.copy(cadToThree(-1080, -340, 2));
const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 220, 0xef4444, 24, 12);
const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 220, 0x22c55e, 24, 12);
const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 220, 0x38bdf8, 24, 12);
axesGroup.add(arrowX, arrowY, arrowZ);
scene.add(axesGroup);

// ============================================================================
// BOUCLE DE RENDU À LA DEMANDE (Zéro charge CPU/GPU au repos sur Exynos 7870)
// ============================================================================
let renderRequested = false;

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

// ============================================================================
// CONSTRUCTION DE LA SERRE & COUPE DYNAMIQUE
// ============================================================================

// Initialiser avec un plan de coupe partagé
const tempClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 999999);
const materials = createMaterialsRegistry([tempClipPlane], isLiteMode);
const serre = buildSerreAssembly(materials, isLiteMode);
scene.add(serre.rootGroup);

const sectionManager = new SectionCapManager(scene, serre.solidMeshes, isLiteMode);
// Connecter le clippingPlane du SectionCapManager à tous les matériaux
Object.values(materials).forEach((mat) => {
  if (mat.clippingPlanes) {
    mat.clippingPlanes = [sectionManager.clippingPlane];
  }
});

// ============================================================================
// OUTIL DE MESURE 3D
// ============================================================================

const btnTopMeasure = document.getElementById('btn-top-measure');

const measurementTool = new MeasurementTool({
  scene,
  camera,
  domElement: renderer.domElement,
  labelsContainer: document.getElementById('measurement-labels'),
  tooltipEl: document.getElementById('measurement-tooltip'),
  listContainer: document.getElementById('measurements-list'),
  partMeshes: serre.partMeshes,
  sectionManager,
  onStateChange: (active) => {
    btnTopMeasure?.classList.toggle('active', active);
  },
  onRequestRender: requestRenderIfNotRequested
});

// ============================================================================
// SÉLECTION 3D, BOXHELPER AMBRE & INSPECTEUR 2D
// ============================================================================

let selectedMesh = null;
let selectedPartId = null;
let isIsolated = false;

const selectionBox = new THREE.BoxHelper(new THREE.Mesh(), 0xf59e0b);
selectionBox.material.depthTest = false;
selectionBox.material.transparent = true;
selectionBox.material.opacity = 0.95;
selectionBox.renderOrder = 990;
selectionBox.visible = false;
scene.add(selectionBox);

const inspectorAside = document.getElementById('piece-inspector');
const inspCategory = document.getElementById('insp-category');
const inspDims = document.getElementById('insp-dims');
const inspCode = document.getElementById('insp-code');
const inspName = document.getElementById('insp-name');
const inspQty = document.getElementById('insp-qty');
const inspSvgContainer = document.getElementById('inspector-svg-container');
const hudSelection = document.getElementById('hud-selection');
const btnInspIsolate = document.getElementById('btn-insp-isolate');

function selectPartByMesh(mesh) {
  if (!mesh) {
    clearSelection();
    return;
  }

  selectedMesh = mesh;
  selectedPartId = mesh.userData.partId;
  const part = PARTS_CATALOG[selectedPartId];

  selectionBox.setFromObject(mesh);
  selectionBox.visible = true;

  // Remplir l'en-tête compact de l'inspecteur 2D
  inspCategory.textContent = part.stockSource || part.category;
  inspDims.textContent = `${part.length} × ${part.width} × ${part.thickness} mm`;
  inspCode.textContent = part.partId;
  inspName.textContent = part.name;
  inspQty.textContent = `×${part.qty}`;

  renderPieceInspector2D(selectedPartId, inspSvgContainer);
  const wasCollapsed = inspectorAside.classList.contains('collapsed');
  inspectorAside.classList.remove('collapsed');
  if (isLiteMode && wasCollapsed) {
    onResize();
  }

  hudSelection.innerHTML = `<strong style="color:#fde68a;">${mesh.userData.instanceId}</strong> — ${part.name} (${part.length}×${part.width}×${part.thickness} mm)`;
  hudSelection.classList.remove('hidden');

  if (isIsolated) {
    applyIsolation(true);
  }
  requestRenderIfNotRequested();
}

function selectPartById(partId) {
  const targetMesh = serre.partMeshes.find((m) => m.userData.partId === partId);
  if (targetMesh) {
    selectPartByMesh(targetMesh);
  }
}

function clearSelection() {
  selectedMesh = null;
  selectedPartId = null;
  selectionBox.visible = false;
  const wasOpen = !inspectorAside.classList.contains('collapsed');
  inspectorAside.classList.add('collapsed');
  if (isLiteMode && wasOpen) {
    onResize();
  }
  hudSelection.textContent = '';
  hudSelection.classList.add('hidden');
  if (isIsolated) {
    applyIsolation(false);
  }
  requestRenderIfNotRequested();
}

function applyIsolation(enable) {
  isIsolated = enable;
  btnInspIsolate.classList.toggle('active-isolate', isIsolated);
  btnInspIsolate.innerHTML = isIsolated ? '👁️ Tout afficher' : '👁️ Isoler';

  serre.partMeshes.forEach((m) => {
    if (!isIsolated || !selectedPartId) {
      m.visible = true;
    } else {
      m.visible = m.userData.partId === selectedPartId;
    }
  });
  sectionManager.syncTransforms();
  requestRenderIfNotRequested();
}

function centerCameraOnSelected() {
  if (!selectedMesh) return;
  const box = new THREE.Box3().setFromObject(selectedMesh);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z, 350);
  const dir = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(dir, maxDim * 2.1);
  controls.update();
  requestRenderIfNotRequested();
}

// ============================================================================
// INTERACTION 3D DIRECTE : SÉLECTION AU CLIC & MANIPULATION PAR GLISSER (DRAG)
// ============================================================================

const selectRaycaster = new THREE.Raycaster();
const selectMouse = new THREE.Vector2();
let ptrDownX = 0;
let ptrDownY = 0;
let dragTarget = null;
let dragStart = null;

// Récupère tous les maillages visibles (pièces + plateau à roulettes)
function getInteractiveMeshes() {
  const list = [...serre.partMeshes];
  serre.groups.trolley.traverse((c) => {
    if (c.isMesh) list.push(c);
  });
  return list.filter((m) => {
    let curr = m;
    while (curr) {
      if (!curr.visible) return false;
      curr = curr.parent;
    }
    return true;
  });
}

function raycastVisibleScene(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  selectMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  selectMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  selectRaycaster.setFromCamera(selectMouse, camera);
  const hits = selectRaycaster.intersectObjects(getInteractiveMeshes(), false);
  const clipPlane = sectionManager.active ? sectionManager.clippingPlane : null;

  for (const h of hits) {
    if (!clipPlane || clipPlane.distanceToPoint(h.point) >= -0.05) {
      return h;
    }
  }
  return null;
}

function raycastSectionPlane(clientX, clientY) {
  if (!sectionManager.active) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  selectMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  selectMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  selectRaycaster.setFromCamera(selectMouse, camera);

  // 1. Tester les poignées de bordure du plan de coupe
  const handleHits = selectRaycaster.intersectObjects(sectionManager.handleMeshes, false);
  if (handleHits.length > 0) {
    return { point: handleHits[0].point, priority: 'handle' };
  }

  // 2. Tester le voile du plan de coupe (et la tranche grise coupée)
  const planeHits = selectRaycaster.intersectObject(sectionManager.interactivePlaneMesh, false);
  if (planeHits.length > 0) {
    return { point: planeHits[0].point, priority: 'plane' };
  }
  return null;
}

function getMovableMechanismType(mesh) {
  if (!mesh || !mesh.userData) return null;
  const { subGroup, partId, isTrolley, latchSide } = mesh.userData;
  if (subGroup === 'roof') return 'roof';
  if (subGroup === 'sideLeft') return 'sideLeft';
  if (subGroup === 'sideRight') return 'sideRight';
  if (partId === 'Q03') return latchSide === 'left' ? 'sideLeft' : 'sideRight';
  if (partId === 'Q02') return 'vent';
  if (isTrolley || subGroup === 'trolley') return 'trolley';
  return null;
}

function projectWorldDeltaToScreenUnit(originWorld, worldDir) {
  const rect = renderer.domElement.getBoundingClientRect();
  const p0 = originWorld.clone().project(camera);
  const p1 = originWorld.clone().addScaledVector(worldDir, 120).project(camera);

  const dx = (p1.x - p0.x) * 0.5 * rect.width;
  const dy = -(p1.y - p0.y) * 0.5 * rect.height;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return { ux: 0, uy: -1 };
  return { ux: dx / len, uy: dy / len };
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  ptrDownX = e.clientX;
  ptrDownY = e.clientY;

  if (measurementTool.enabled) return;

  const sectionHit = raycastSectionPlane(e.clientX, e.clientY);
  const hit = raycastVisibleScene(e.clientX, e.clientY);
  const clipPlane = sectionManager.active ? sectionManager.clippingPlane : null;

  const isOnCutFace =
    hit && clipPlane && Math.abs(clipPlane.distanceToPoint(hit.point)) < 22;
  const mechType = hit ? getMovableMechanismType(hit.object) : null;

  if (
    sectionHit &&
    (sectionHit.priority === 'handle' || isOnCutFace || !mechType)
  ) {
    dragTarget = 'sectionPlane';
    sectionManager.setHighlight(true);
    dragStart = {
      clientX: e.clientX,
      clientY: e.clientY,
      hitPoint: sectionHit.point.clone(),
      moved: false,
      sectionPosMm: sectionManager.positionMm
    };
    controls.enabled = false;
    return;
  }

  if (mechType) {
    dragTarget = mechType;
    dragStart = {
      clientX: e.clientX,
      clientY: e.clientY,
      hitPoint: hit.point.clone(),
      hitObject: hit.object,
      moved: false,
      roofAngle: currentRoofAngle,
      ventAngle: currentVentAngle,
      leftOffset: currentLeftSideOffset,
      rightOffset: currentRightSideOffset,
      trolleyX: currentTrolleyOffsetX
    };
    controls.enabled = false;
  }
});

window.addEventListener('pointermove', (e) => {
  if (measurementTool.enabled) return;

  if (dragTarget && dragStart) {
    const dx = e.clientX - dragStart.clientX;
    const dy = e.clientY - dragStart.clientY;

    if (!dragStart.moved && Math.hypot(dx, dy) >= 4) {
      dragStart.moved = true;
      renderer.domElement.style.cursor = 'grabbing';
    }

    if (dragStart.moved) {
      hudSelection.classList.remove('hidden');
      if (dragTarget === 'roof') {
        const { ux, uy } = projectWorldDeltaToScreenUnit(
          dragStart.hitPoint,
          new THREE.Vector3(0, 1, 0)
        );
        const projPx = dx * ux + dy * uy;
        currentRoofAngle = Math.min(73.3, Math.max(0, dragStart.roofAngle + projPx * 0.32));
        sliderRoofAngle.value = String(currentRoofAngle);
        valRoofAngle.textContent =
          currentRoofAngle === 0
            ? 'Fermé'
            : currentRoofAngle >= 73
            ? '90°'
            : `+${currentRoofAngle.toFixed(0)}°`;
        hudSelection.innerHTML = `Toit : <strong style="color:#38bdf8;">${valRoofAngle.textContent}</strong>`;
        applyKinematicsState();
      } else if (dragTarget === 'vent') {
        const { ux, uy } = projectWorldDeltaToScreenUnit(
          dragStart.hitPoint,
          new THREE.Vector3(0, 1, 0)
        );
        const projPx = dx * ux + dy * uy;
        currentVentAngle = Math.min(12, Math.max(0, dragStart.ventAngle + projPx * 0.08));
        sliderVentAngle.value = String(currentVentAngle);
        const strokeMm = Math.round((currentVentAngle / 12) * 90);
        valVentAngle.textContent = currentVentAngle === 0 ? '0 mm' : `+${strokeMm} mm`;
        hudSelection.innerHTML = `Vérin : <strong style="color:#38bdf8;">+${strokeMm} mm</strong>`;
        applyKinematicsState();
      } else if (dragTarget === 'sideLeft') {
        const { ux, uy } = projectWorldDeltaToScreenUnit(
          dragStart.hitPoint,
          new THREE.Vector3(-1, 0, -0.35).normalize()
        );
        const projPx = dx * ux + dy * uy;
        currentLeftSideOffset = Math.min(600, Math.max(0, Math.round(dragStart.leftOffset + projPx * 2.4)));
        sliderSidesOffset.value = String(currentLeftSideOffset);
        const isWallParked = currentLeftSideOffset >= 580;
        valSidesOffset.textContent =
          currentLeftSideOffset === 0 ? 'Fermés' : isWallParked ? '90°' : `${currentLeftSideOffset} mm`;
        hudSelection.innerHTML = `Côté G : <strong style="color:#38bdf8;">${valSidesOffset.textContent}</strong>`;
        applyKinematicsState();
      } else if (dragTarget === 'sideRight') {
        const { ux, uy } = projectWorldDeltaToScreenUnit(
          dragStart.hitPoint,
          new THREE.Vector3(1, 0, -0.35).normalize()
        );
        const projPx = dx * ux + dy * uy;
        currentRightSideOffset = Math.min(600, Math.max(0, Math.round(dragStart.rightOffset + projPx * 2.4)));
        sliderSidesOffset.value = String(currentRightSideOffset);
        const isWallParked = currentRightSideOffset >= 580;
        valSidesOffset.textContent =
          currentRightSideOffset === 0 ? 'Fermés' : isWallParked ? '90°' : `${currentRightSideOffset} mm`;
        hudSelection.innerHTML = `Côté D : <strong style="color:#38bdf8;">${valSidesOffset.textContent}</strong>`;
        applyKinematicsState();
      } else if (dragTarget === 'trolley') {
        const { ux, uy } = projectWorldDeltaToScreenUnit(
          dragStart.hitPoint,
          new THREE.Vector3(1, 0, 0)
        );
        const projPx = dx * ux + dy * uy;
        currentTrolleyOffsetX = Math.min(2800, Math.max(-2800, Math.round(dragStart.trolleyX + projPx * 3.8)));
        hudSelection.innerHTML = `Plantes : <strong style="color:#38bdf8;">${currentTrolleyOffsetX > 0 ? '+' : ''}${currentTrolleyOffsetX} mm</strong>`;
        applyKinematicsState();
      } else if (dragTarget === 'sectionPlane') {
        const axisWorldDir =
          sectionManager.axis === 'X'
            ? new THREE.Vector3(1, 0, 0)
            : sectionManager.axis === 'Y'
            ? new THREE.Vector3(0, 0, -1)
            : new THREE.Vector3(0, 1, 0);
        const { ux, uy } = projectWorldDeltaToScreenUnit(dragStart.hitPoint, axisWorldDir);
        const projPx = dx * ux + dy * uy;
        const bounds = sectionManager.getBoundsForAxis(sectionManager.axis);
        const newPos = Math.min(
          bounds.max,
          Math.max(bounds.min, Math.round((dragStart.sectionPosMm + projPx * 2.8) / 5) * 5)
        );
        sliderSectionPos.value = String(newPos);
        valSectionPos.textContent = `${newPos} mm`;
        sectionManager.setConfig({ positionMm: newPos });
        sectionManager.syncTransforms();
        hudSelection.innerHTML = `Coupe ${sectionManager.axis} : <strong style="color:#38bdf8;">${newPos} mm</strong>`;
        requestRenderIfNotRequested();
      }
    }
    return;
  }

  // En mode Lite (tablette tactile SM-T580), éviter le raycast de survol inutile à chaque mouvement
  if (!isLiteMode && e.target === renderer.domElement) {
    const secHover = raycastSectionPlane(e.clientX, e.clientY);
    const hoverHit = raycastVisibleScene(e.clientX, e.clientY);
    const mechType = hoverHit ? getMovableMechanismType(hoverHit.object) : null;
    sectionManager.setHighlight(Boolean(secHover));
    renderer.domElement.style.cursor = mechType || secHover ? 'grab' : 'default';
    requestRenderIfNotRequested();
  }
});

window.addEventListener('pointerup', (e) => {
  if (e.button !== 0) return;

  if (dragTarget) {
    const wasMoved = dragStart && dragStart.moved;
    controls.enabled = true;
    sectionManager.setHighlight(false);
    renderer.domElement.style.cursor = 'grab';
    dragTarget = null;
    dragStart = null;
    if (!selectedMesh) {
      hudSelection.textContent = '';
      hudSelection.classList.add('hidden');
    }
    requestRenderIfNotRequested();
    if (wasMoved) return;
  }

  if (measurementTool.enabled) return;
  if (e.target !== renderer.domElement) return;
  if (Math.hypot(e.clientX - ptrDownX, e.clientY - ptrDownY) >= 6) return;

  const validHit = raycastVisibleScene(e.clientX, e.clientY);
  if (validHit && validHit.object.userData && validHit.object.userData.partId) {
    selectPartByMesh(validHit.object);
  } else {
    clearSelection();
  }
});

// ============================================================================
// ÉVÉNEMENTS DE L'INTERFACE GRAPHIQUE (BARRE HAUT, VOLET GAUCHE, VOLET DROIT)
// ============================================================================

// Boutons Inspecteur Gauche
document.getElementById('btn-close-inspector').addEventListener('click', clearSelection);
btnInspIsolate.addEventListener('click', () => applyIsolation(!isIsolated));
document.getElementById('btn-insp-center').addEventListener('click', centerCameraOnSelected);

document.getElementById('btn-insp-cutlist').addEventListener('click', () => {
  openCutlistModal(selectedPartId);
});

// Boutons Barre d'en-tête & Mesures
btnTopMeasure?.addEventListener('click', () => measurementTool.toggle());
document.getElementById('btn-clear-measures')?.addEventListener('click', () => measurementTool.clearAll());

document.getElementById('chk-global-dims')?.addEventListener('change', (e) => {
  measurementTool.setGlobalDimsVisible(e.target.checked);
});

// Visibilité par sous-ensembles
document.querySelectorAll('input[data-group]').forEach((chk) => {
  chk.addEventListener('change', (e) => {
    const grp = e.target.getAttribute('data-group');
    const visible = e.target.checked;

    if (grp === 'roof') {
      serre.groups.roofPivot.visible = visible;
    } else if (grp === 'polycarbonate') {
      serre.partMeshes.forEach((m) => {
        if (m.userData.materialType === 'polycarbonate') {
          m.visible = visible;
        }
      });
    } else if (serre.groups[grp]) {
      serre.groups[grp].visible = visible;
    }
    sectionManager.syncTransforms();
    requestRenderIfNotRequested();
  });
});

// Cinématique concise
const sliderVentAngle = document.getElementById('slider-vent-angle');
const valVentAngle = document.getElementById('val-vent-angle');
const sliderRoofAngle = document.getElementById('slider-roof-angle');
const valRoofAngle = document.getElementById('val-roof-angle');
const sliderSidesOffset = document.getElementById('slider-sides-offset');
const valSidesOffset = document.getElementById('val-sides-offset');
const sliderExplode = document.getElementById('slider-explode');
const valExplode = document.getElementById('val-explode');

let currentVentAngle = 0;
let currentRoofAngle = 0;
let currentSidesOffset = 0;
let currentLeftSideOffset = 0;
let currentRightSideOffset = 0;
let currentTrolleyOffsetX = 0;
let currentExplode = 0;

function applyKinematicsState() {
  serre.updateKinematics({
    ventAngleDeg: currentVentAngle,
    roofAngleDeg: currentRoofAngle,
    sidesOffsetMm: currentSidesOffset,
    leftSideOffsetMm: currentLeftSideOffset,
    rightSideOffsetMm: currentRightSideOffset,
    trolleyOffsetX: currentTrolleyOffsetX,
    explodeFactor: currentExplode / 100
  });
  if (selectedMesh && selectionBox.visible) {
    selectionBox.setFromObject(selectedMesh);
  }
  sectionManager.syncTransforms();
  requestRenderIfNotRequested();
}

sliderVentAngle.addEventListener('input', (e) => {
  currentVentAngle = Number(e.target.value);
  const strokeMm = Math.round((currentVentAngle / 12) * 90);
  valVentAngle.textContent = currentVentAngle === 0 ? '0 mm' : `+${strokeMm} mm`;
  applyKinematicsState();
});

sliderRoofAngle.addEventListener('input', (e) => {
  currentRoofAngle = Number(e.target.value);
  valRoofAngle.textContent =
    currentRoofAngle === 0
      ? 'Fermé'
      : currentRoofAngle >= 73
      ? '90°'
      : `+${currentRoofAngle.toFixed(0)}°`;
  applyKinematicsState();
});

sliderSidesOffset.addEventListener('input', (e) => {
  currentSidesOffset = Number(e.target.value);
  currentLeftSideOffset = currentSidesOffset;
  currentRightSideOffset = currentSidesOffset;
  valSidesOffset.textContent =
    currentSidesOffset === 0
      ? 'Fermés'
      : currentSidesOffset >= 580
      ? '90°'
      : `${currentSidesOffset} mm`;
  applyKinematicsState();
});

sliderExplode.addEventListener('input', (e) => {
  currentExplode = Number(e.target.value);
  valExplode.textContent = `${currentExplode}%`;
  applyKinematicsState();
});

// Coupe CAD Dynamique (Stencil) — s'active au clic sur un axe, se désactive si on reclique sur l'axe actif
const sliderSectionPos = document.getElementById('slider-section-pos');
const valSectionPos = document.getElementById('val-section-pos');
const btnSectionFlip = document.getElementById('btn-section-flip');
const axisBtns = document.querySelectorAll('.axis-btn');

axisBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const isAlreadyActive = btn.classList.contains('active');

    if (isAlreadyActive) {
      btn.classList.remove('active');
      sliderSectionPos.disabled = true;
      sectionManager.setConfig({ active: false });
      sectionManager.syncTransforms();
      requestRenderIfNotRequested();
      return;
    }

    axisBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const axis = btn.getAttribute('data-axis');
    const bounds = sectionManager.getBoundsForAxis(axis);
    sliderSectionPos.disabled = false;
    sliderSectionPos.min = String(bounds.min);
    sliderSectionPos.max = String(bounds.max);
    sliderSectionPos.value = String(bounds.defaultPos);
    valSectionPos.textContent = `${bounds.defaultPos} mm`;
    sectionManager.setConfig({ active: true, axis, positionMm: bounds.defaultPos });
    sectionManager.syncTransforms();
    requestRenderIfNotRequested();
  });
});

btnSectionFlip.addEventListener('click', () => {
  if (!sectionManager.active) return;
  sectionManager.setConfig({ flipped: !sectionManager.flipped });
  sectionManager.syncTransforms();
  requestRenderIfNotRequested();
});

sliderSectionPos.addEventListener('input', (e) => {
  const pos = Number(e.target.value);
  valSectionPos.textContent = `${pos} mm`;
  sectionManager.setConfig({ positionMm: pos });
  sectionManager.syncTransforms();
  requestRenderIfNotRequested();
});

function setIsoCameraForAspect() {
  const aspect = Math.max(0.5, camera.aspect || 1.4);
  const scale = aspect < 1.35 ? 1.35 / Math.max(0.75, aspect) : 1.05;
  controls.target.set(0, 560, 0);
  camera.position.set(1850 * scale, 1550 * scale, 2150 * scale);
  controls.update();
}

// Vues Normalisées
document.querySelectorAll('.view-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.getAttribute('data-view');
    const center = new THREE.Vector3(0, 560, 0);

    if (view === 'iso') {
      setIsoCameraForAspect();
    } else if (view === 'front') {
      camera.position.set(0, 560, 2750);
      controls.target.copy(center);
    } else if (view === 'top') {
      camera.position.set(0, 3200, 10);
      controls.target.set(0, 0, 0);
    } else if (view === 'side') {
      camera.position.set(2500, 560, 0);
      controls.target.copy(center);
    } else if (view === 'reset') {
      setIsoCameraForAspect();
      currentVentAngle = 0;
      currentRoofAngle = 0;
      currentSidesOffset = 0;
      currentLeftSideOffset = 0;
      currentRightSideOffset = 0;
      currentTrolleyOffsetX = 0;
      currentExplode = 0;
      sliderVentAngle.value = '0';
      valVentAngle.textContent = '0 mm';
      sliderRoofAngle.value = '0';
      valRoofAngle.textContent = 'Fermé';
      sliderSidesOffset.value = '0';
      valSidesOffset.textContent = 'Fermés';
      sliderExplode.value = '0';
      valExplode.textContent = '0%';
      if (isIsolated) applyIsolation(false);
      applyKinematicsState();
    }
    controls.update();
    requestRenderIfNotRequested();
  });
});

// ============================================================================
// MODALES : PLAN DE DÉCOUPE & NOMENCLATURE
// ============================================================================

const modalCutlist = document.getElementById('modal-cutlist');
const modalBom = document.getElementById('modal-bom');
const cutlistBody = document.getElementById('cutlist-modal-body');
const bomBody = document.getElementById('bom-modal-body');
const printSheet = document.getElementById('print-sheet');

function openCutlistModal(highlightPartId = null) {
  renderCutlistModal({
    modalBodyEl: cutlistBody,
    printSheetEl: printSheet,
    highlightedPartId: highlightPartId || selectedPartId,
    onSelectPart: (partId) => {
      modalCutlist.classList.add('hidden');
      selectPartById(partId);
      centerCameraOnSelected();
    }
  });
  modalCutlist.classList.remove('hidden');
}

function openBomModal() {
  renderBomModal(bomBody, (partId) => {
    modalBom.classList.add('hidden');
    selectPartById(partId);
    centerCameraOnSelected();
  });
  modalBom.classList.remove('hidden');
}

document.getElementById('btn-top-cutlist').addEventListener('click', () => openCutlistModal());
document.getElementById('btn-top-bom').addEventListener('click', () => openBomModal());

document.getElementById('btn-print-cutlist').addEventListener('click', () => {
  renderCutlistModal({
    modalBodyEl: cutlistBody,
    printSheetEl: printSheet,
    highlightedPartId: selectedPartId
  });
  window.print();
});

document.querySelectorAll('.btn-modal-close').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-close');
    if (targetId) document.getElementById(targetId)?.classList.add('hidden');
  });
});

[modalCutlist, modalBom].forEach((modal) => {
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

// Pré-générer la feuille d'impression au démarrage pour Ctrl+P direct
renderCutlistModal({
  modalBodyEl: cutlistBody,
  printSheetEl: printSheet,
  highlightedPartId: null
});

// ============================================================================
// REDIMENSIONNEMENT & BOUCLE DE RENDU À LA DEMANDE (Zéro charge CPU/GPU au repos)
// ============================================================================

function onResize() {
  const w = Math.max(1, viewportContainer.clientWidth);
  const h = Math.max(1, viewportContainer.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  requestRenderIfNotRequested();
}

function render() {
  renderRequested = false;
  if (controls.enableDamping) {
    controls.update();
  }
  if (sectionManager.active) {
    sectionManager.syncTransforms();
  }
  measurementTool.updateLabelsProjection();
  renderer.render(scene, camera);
}

// ============================================================================
// SAUVEGARDE & RESTAURATION D'ÉTAT LORS DE LA BASCULE NORMAL <-> LITE
// ============================================================================
const VIEW_STATE_SESSION_KEY = 'serre_cad_view_state_v1';

function saveViewStateToSession() {
  try {
    const groupVisibility = {};
    document.querySelectorAll('input[data-group]').forEach((chk) => {
      groupVisibility[chk.getAttribute('data-group')] = chk.checked;
    });

    const state = {
      cameraPos: camera.position.toArray(),
      controlsTarget: controls.target.toArray(),
      section: {
        active: sectionManager.active,
        axis: sectionManager.axis,
        flipped: sectionManager.flipped,
        positionMm: sectionManager.positionMm
      },
      kinematics: {
        currentVentAngle,
        currentRoofAngle,
        currentSidesOffset,
        currentLeftSideOffset,
        currentRightSideOffset,
        currentTrolleyOffsetX,
        currentExplode
      },
      groupVisibility,
      showGlobalDims: Boolean(document.getElementById('chk-global-dims')?.checked),
      panelCollapsed: document.body.classList.contains('panel-collapsed'),
      selectedInstanceId: selectedMesh?.userData?.instanceId || null,
      selectedPartId: selectedPartId || null,
      isIsolated,
      measurements: measurementTool.measurements.map((m) => ({
        pA: m.pA.toArray(),
        pB: m.pB.toArray()
      }))
    };

    sessionStorage.setItem(VIEW_STATE_SESSION_KEY, JSON.stringify(state));
  } catch (_) {}
}

function restoreViewStateFromSession() {
  try {
    const raw = sessionStorage.getItem(VIEW_STATE_SESSION_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(VIEW_STATE_SESSION_KEY);
    const state = JSON.parse(raw);

    // 1. Panneau replié
    if (state.panelCollapsed) {
      document.body.classList.add('panel-collapsed');
      btnVpPanel?.classList.add('active');
    }

    // 2. Cinématique & Curseurs
    if (state.kinematics) {
      currentVentAngle = state.kinematics.currentVentAngle ?? 0;
      currentRoofAngle = state.kinematics.currentRoofAngle ?? 0;
      currentSidesOffset = state.kinematics.currentSidesOffset ?? 0;
      currentLeftSideOffset = state.kinematics.currentLeftSideOffset ?? 0;
      currentRightSideOffset = state.kinematics.currentRightSideOffset ?? 0;
      currentTrolleyOffsetX = state.kinematics.currentTrolleyOffsetX ?? 0;
      currentExplode = state.kinematics.currentExplode ?? 0;

      sliderVentAngle.value = String(currentVentAngle);
      const strokeMm = Math.round((currentVentAngle / 12) * 90);
      valVentAngle.textContent = currentVentAngle === 0 ? '0 mm' : `+${strokeMm} mm`;

      sliderRoofAngle.value = String(currentRoofAngle);
      valRoofAngle.textContent =
        currentRoofAngle === 0
          ? 'Fermé'
          : currentRoofAngle >= 73
          ? '90°'
          : `+${currentRoofAngle.toFixed(0)}°`;

      sliderSidesOffset.value = String(currentLeftSideOffset);
      valSidesOffset.textContent =
        currentLeftSideOffset === 0
          ? 'Fermés'
          : currentLeftSideOffset >= 580
          ? '90°'
          : `${currentLeftSideOffset} mm`;

      sliderExplode.value = String(currentExplode);
      valExplode.textContent = `${currentExplode}%`;

      applyKinematicsState();
    }

    // 3. Visibilité par sous-ensembles & Cotes hors-tout
    if (state.groupVisibility) {
      document.querySelectorAll('input[data-group]').forEach((chk) => {
        const grp = chk.getAttribute('data-group');
        if (grp in state.groupVisibility) {
          chk.checked = Boolean(state.groupVisibility[grp]);
          chk.dispatchEvent(new Event('change'));
        }
      });
    }

    const chkGlobal = document.getElementById('chk-global-dims');
    if (chkGlobal && typeof state.showGlobalDims === 'boolean') {
      chkGlobal.checked = state.showGlobalDims;
      measurementTool.setGlobalDimsVisible(state.showGlobalDims);
    }

    // 4. Coupe 3D
    if (state.section) {
      const { active, axis, flipped, positionMm } = state.section;
      const bounds = sectionManager.getBoundsForAxis(axis || 'X');
      sliderSectionPos.min = String(bounds.min);
      sliderSectionPos.max = String(bounds.max);
      sliderSectionPos.value = String(positionMm ?? bounds.defaultPos);
      valSectionPos.textContent = `${positionMm ?? bounds.defaultPos} mm`;
      sliderSectionPos.disabled = !active;

      axisBtns.forEach((b) => {
        b.classList.toggle('active', Boolean(active && b.getAttribute('data-axis') === axis));
      });

      sectionManager.setConfig({
        active: Boolean(active),
        axis: axis || 'X',
        flipped: Boolean(flipped),
        positionMm: positionMm ?? bounds.defaultPos
      });
      sectionManager.syncTransforms();
    }

    // 5. Sélection & Isolation
    if (state.selectedInstanceId || state.selectedPartId) {
      const mesh =
        serre.partMeshes.find((m) => m.userData.instanceId === state.selectedInstanceId) ||
        serre.partMeshes.find((m) => m.userData.partId === state.selectedPartId);
      if (mesh) {
        selectPartByMesh(mesh);
        if (state.isIsolated) {
          applyIsolation(true);
        }
      }
    }

    // 6. Mesures 3D
    if (Array.isArray(state.measurements)) {
      state.measurements.forEach((m) => {
        if (Array.isArray(m.pA) && Array.isArray(m.pB)) {
          measurementTool._addMeasurement(
            new THREE.Vector3().fromArray(m.pA),
            new THREE.Vector3().fromArray(m.pB)
          );
        }
      });
    }

    // 7. Caméra & Cible OrbitControls
    onResize();
    if (Array.isArray(state.cameraPos) && Array.isArray(state.controlsTarget)) {
      camera.position.fromArray(state.cameraPos);
      controls.target.fromArray(state.controlsTarget);
      controls.update();
    }
    return true;
  } catch (_) {
    return false;
  }
}

// Déclencher un rendu uniquement quand on tourne la caméra ou redimensionne
controls.addEventListener('change', requestRenderIfNotRequested);
window.addEventListener('resize', onResize);
window.visualViewport?.addEventListener('resize', onResize);

onResize();
if (!restoreViewStateFromSession()) {
  setIsoCameraForAspect();
}
requestRenderIfNotRequested();
