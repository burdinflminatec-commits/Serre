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
// INITIALISATION DU BUREAU D'ÉTUDES & ATELIER CAD 3D
// ============================================================================

const canvas = document.getElementById('three-canvas');
const viewportContainer = document.getElementById('viewport-container');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  stencil: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d131c');

const camera = new THREE.PerspectiveCamera(42, 1, 10, 25000);
camera.position.set(1850, 1650, 2150);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 560, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxDistance = 9500;
controls.minDistance = 200;
controls.update();

// Éclairage Atelier CAD
const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.65);
hemiLight.position.set(0, 3000, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
dirLight.position.set(1800, 2900, 2100);
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
scene.add(dirLight);

const backLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
backLight.position.set(-1600, 1400, -1900);
scene.add(backLight);

// Grille technique au sol (Z_cad = 0 -> three.y = 0) élargie pour le roulage des plantes
const gridMajor = new THREE.GridHelper(7600, 76, 0x38bdf8, 0x1e293b);
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
// CONSTRUCTION DE LA SERRE & COUPE STENCIL
// ============================================================================

// Initialiser avec un plan de coupe partagé
const tempClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 999999);
const materials = createMaterialsRegistry([tempClipPlane]);
const serre = buildSerreAssembly(materials);
scene.add(serre.rootGroup);

const sectionManager = new SectionCapManager(scene, serre.solidMeshes);
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
const btnPanelMeasure = document.getElementById('btn-panel-measure');

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
    btnTopMeasure.classList.toggle('active', active);
    btnPanelMeasure.classList.toggle('active', active);
    btnPanelMeasure.textContent = active ? 'Mesure Active (Échap/M)' : 'Activer Mesure (M)';
  }
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
  inspCategory.textContent = part.category;
  inspDims.textContent = `${part.length} × ${part.width} mm • Ép. ${part.thickness} mm`;
  inspCode.textContent = part.partId;
  inspName.textContent = part.name;
  inspQty.textContent = `×${part.qty}`;

  renderPieceInspector2D(selectedPartId, inspSvgContainer);
  inspectorAside.classList.remove('collapsed');

  hudSelection.innerHTML = `Sélection : <strong style="color:#fde68a;">${mesh.userData.instanceId}</strong> — ${part.name} (${part.length}×${part.width}×${part.thickness} mm)`;

  if (isIsolated) {
    applyIsolation(true);
  }
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
  inspectorAside.classList.add('collapsed');
  hudSelection.textContent = 'Aucune pièce sélectionnée (Cliquez sur une pièce en 3D)';
  if (isIsolated) {
    applyIsolation(false);
  }
}

function applyIsolation(enable) {
  isIsolated = enable;
  btnInspIsolate.classList.toggle('active-isolate', isIsolated);
  btnInspIsolate.innerHTML = isIsolated ? '👁️ Tout réafficher' : '👁️ Isoler';

  serre.partMeshes.forEach((m) => {
    if (!isIsolated || !selectedPartId) {
      m.visible = true;
    } else {
      m.visible = m.userData.partId === selectedPartId;
    }
  });
  sectionManager.syncTransforms();
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

  // Si on clique sur une poignée du plan de coupe, sur la tranche coupée (distance < 22 mm du plan),
  // ou sur le plan de coupe en dehors d'un élément mobile
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
    // Bloquer la rotation de caméra pendant qu'on manipule un élément mobile
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
      if (dragTarget === 'roof') {
        const { ux, uy } = projectWorldDeltaToScreenUnit(
          dragStart.hitPoint,
          new THREE.Vector3(0, 1, 0)
        );
        const projPx = dx * ux + dy * uy;
        currentRoofAngle = Math.min(73.3, Math.max(0, dragStart.roofAngle + projPx * 0.32));
        sliderRoofAngle.value = String(currentRoofAngle);
        const absAngle = Math.round(16.7 + currentRoofAngle);
        valRoofAngle.textContent =
          currentRoofAngle === 0
            ? 'Posé sur vérin'
            : currentRoofAngle >= 73
            ? 'Toit Vertical (90°)'
            : `+${currentRoofAngle.toFixed(0)}° (Pente ${absAngle}°)`;
        hudSelection.innerHTML = `🖐️ Manipulation Toit Ouvrant : <strong style="color:#38bdf8;">Pente ${absAngle}° (${currentRoofAngle >= 73 ? 'Vertical' : '+' + currentRoofAngle.toFixed(0) + '°'})</strong>`;
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
        valVentAngle.textContent =
          currentVentAngle === 0 ? '0° (0 mm)' : `${currentVentAngle.toFixed(1)}° (+${strokeMm} mm)`;
        hudSelection.innerHTML = `🌡️ Manipulation Vérin Thermique : <strong style="color:#38bdf8;">Course +${strokeMm} mm (${currentVentAngle.toFixed(1)}°)</strong>`;
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
        valSidesOffset.textContent = isWallParked
          ? 'Posé contre le mur (90°)'
          : `G: ${currentLeftSideOffset} / D: ${currentRightSideOffset} mm`;
        hudSelection.innerHTML = `🚪 Manipulation Côté Gauche : <strong style="color:#38bdf8;">${
          isWallParked ? 'Rangé à plat dans le plan arrière (90°)' : `Course ${currentLeftSideOffset} mm`
        }</strong>`;
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
        valSidesOffset.textContent = isWallParked
          ? 'Posé contre le mur (90°)'
          : `G: ${currentLeftSideOffset} / D: ${currentRightSideOffset} mm`;
        hudSelection.innerHTML = `🚪 Manipulation Côté Droit : <strong style="color:#38bdf8;">${
          isWallParked ? 'Rangé à plat dans le plan arrière (90°)' : `Course ${currentRightSideOffset} mm`
        }</strong>`;
        applyKinematicsState();
      } else if (dragTarget === 'trolley') {
        const { ux, uy } = projectWorldDeltaToScreenUnit(
          dragStart.hitPoint,
          new THREE.Vector3(1, 0, 0)
        );
        const projPx = dx * ux + dy * uy;
        currentTrolleyOffsetX = Math.min(2800, Math.max(-2800, Math.round(dragStart.trolleyX + projPx * 3.8)));
        hudSelection.innerHTML = `🛞 Roulage Plateau Plantes : <strong style="color:#38bdf8;">X = ${currentTrolleyOffsetX > 0 ? '+' : ''}${currentTrolleyOffsetX} mm</strong>`;
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
        hudSelection.innerHTML = `🔪 Plan de Coupe (${sectionManager.axis}) : <strong style="color:#38bdf8;">${newPos} mm</strong>`;
      }
    }
    return;
  }

  // Changement du curseur en "grab" au survol d'un élément mobile ou du plan de coupe actif
  if (e.target === renderer.domElement) {
    const secHover = raycastSectionPlane(e.clientX, e.clientY);
    const hoverHit = raycastVisibleScene(e.clientX, e.clientY);
    const mechType = hoverHit ? getMovableMechanismType(hoverHit.object) : null;
    sectionManager.setHighlight(Boolean(secHover));
    renderer.domElement.style.cursor = mechType || secHover ? 'grab' : 'default';
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

// Boutons Barre d'en-tête
btnTopMeasure.addEventListener('click', () => measurementTool.toggle());
btnPanelMeasure.addEventListener('click', () => measurementTool.toggle());
document.getElementById('btn-clear-measures').addEventListener('click', () => measurementTool.clearAll());

document.getElementById('chk-global-dims').addEventListener('change', (e) => {
  measurementTool.setGlobalDimsVisible(e.target.checked);
});

document.getElementById('chk-xray-poly').addEventListener('change', (e) => {
  measurementTool.xrayPolycarbonate = e.target.checked;
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
  });
});

// Cinématique : Ouverture par le Haut — Vérin Auto (0..12°) + Levage Manuel jusqu'à la verticale (0..73.3°)
const sliderVentAngle = document.getElementById('slider-vent-angle');
const valVentAngle = document.getElementById('val-vent-angle');
const sliderRoofAngle = document.getElementById('slider-roof-angle');
const valRoofAngle = document.getElementById('val-roof-angle');
const sliderSidesOffset = document.getElementById('slider-sides-offset');
const valSidesOffset = document.getElementById('val-sides-offset');
const sliderExplode = document.getElementById('slider-explode');
const valExplode = document.getElementById('val-explode');

let currentVentAngle = 0; // 0..12° (poussée directe du cylindre thermique +90 mm)
let currentRoofAngle = 0; // 0..73.3° (16.7° + 73.3° = 90° toit vertical !)
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
}

sliderVentAngle.addEventListener('input', (e) => {
  currentVentAngle = Number(e.target.value);
  const strokeMm = Math.round((currentVentAngle / 12) * 90);
  valVentAngle.textContent =
    currentVentAngle === 0
      ? '0° (0 mm)'
      : `${currentVentAngle}° (+${strokeMm} mm)`;
  applyKinematicsState();
});

document.querySelectorAll('button[data-vent]').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentVentAngle = Number(btn.getAttribute('data-vent'));
    sliderVentAngle.value = String(currentVentAngle);
    sliderVentAngle.dispatchEvent(new Event('input'));
  });
});

sliderRoofAngle.addEventListener('input', (e) => {
  currentRoofAngle = Number(e.target.value);
  const absAngle = Math.round(16.7 + currentRoofAngle);
  valRoofAngle.textContent =
    currentRoofAngle === 0
      ? 'Posé sur vérin'
      : currentRoofAngle >= 73
      ? 'Toit Vertical (90°)'
      : `+${currentRoofAngle.toFixed(0)}° (Pente ${absAngle}°)`;
  applyKinematicsState();
});

document.querySelectorAll('button[data-roof]').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentRoofAngle = Number(btn.getAttribute('data-roof'));
    sliderRoofAngle.value = String(currentRoofAngle);
    sliderRoofAngle.dispatchEvent(new Event('input'));
  });
});

sliderSidesOffset.addEventListener('input', (e) => {
  currentSidesOffset = Number(e.target.value);
  currentLeftSideOffset = currentSidesOffset;
  currentRightSideOffset = currentSidesOffset;
  valSidesOffset.textContent =
    currentSidesOffset === 0
      ? 'En place (0 mm)'
      : currentSidesOffset >= 580
      ? 'Contre le mur (90°)'
      : `Écartés (${currentSidesOffset} mm)`;
  applyKinematicsState();
});

document.querySelectorAll('button[data-sides]').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentSidesOffset = Number(btn.getAttribute('data-sides'));
    sliderSidesOffset.value = String(currentSidesOffset);
    sliderSidesOffset.dispatchEvent(new Event('input'));
  });
});

sliderExplode.addEventListener('input', (e) => {
  currentExplode = Number(e.target.value);
  valExplode.textContent = `${currentExplode}%`;
  applyKinematicsState();
});

// Coupe CAD Dynamique (Stencil)
const chkSectionActive = document.getElementById('chk-section-active');
const sliderSectionPos = document.getElementById('slider-section-pos');
const valSectionPos = document.getElementById('val-section-pos');
const btnSectionFlip = document.getElementById('btn-section-flip');
const axisBtns = document.querySelectorAll('.axis-btn');

chkSectionActive.addEventListener('change', (e) => {
  const active = e.target.checked;
  sliderSectionPos.disabled = !active;
  sectionManager.setConfig({ active });
  sectionManager.syncTransforms();
});

axisBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    axisBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const axis = btn.getAttribute('data-axis');
    const bounds = sectionManager.getBoundsForAxis(axis);
    sliderSectionPos.min = String(bounds.min);
    sliderSectionPos.max = String(bounds.max);
    sliderSectionPos.value = String(bounds.defaultPos);
    valSectionPos.textContent = `${bounds.defaultPos} mm`;
    sectionManager.setConfig({ axis, positionMm: bounds.defaultPos });
    sectionManager.syncTransforms();
  });
});

btnSectionFlip.addEventListener('click', () => {
  sectionManager.setConfig({ flipped: !sectionManager.flipped });
  sectionManager.syncTransforms();
});

sliderSectionPos.addEventListener('input', (e) => {
  const pos = Number(e.target.value);
  valSectionPos.textContent = `${pos} mm`;
  sectionManager.setConfig({ positionMm: pos });
  sectionManager.syncTransforms();
});

// Vues Normalisées (Repère métier X=Largeur, Y=Profondeur, Z=Hauteur)
document.querySelectorAll('.view-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.getAttribute('data-view');
    const center = new THREE.Vector3(0, 580, 0);

    if (view === 'iso') {
      camera.position.set(1850, 1650, 2150);
      controls.target.copy(center);
    } else if (view === 'front') {
      // Face Avant (Y_cad négatif -> three.z positif)
      camera.position.set(0, 580, 2700);
      controls.target.copy(center);
    } else if (view === 'top') {
      // Vue de Dessus (Z_cad positif -> three.y positif)
      camera.position.set(0, 3200, 10);
      controls.target.set(0, 0, 0);
    } else if (view === 'side') {
      // Vue de Profil Droit (X_cad positif -> three.x positif)
      camera.position.set(2500, 580, 0);
      controls.target.copy(center);
    } else if (view === 'reset') {
      camera.position.set(1850, 1650, 2150);
      controls.target.copy(center);
      currentVentAngle = 0;
      currentRoofAngle = 0;
      currentSidesOffset = 0;
      currentLeftSideOffset = 0;
      currentRightSideOffset = 0;
      currentTrolleyOffsetX = 0;
      currentExplode = 0;
      sliderVentAngle.value = '0';
      valVentAngle.textContent = '0° (0 mm)';
      sliderRoofAngle.value = '0';
      valRoofAngle.textContent = 'Posé sur vérin';
      sliderSidesOffset.value = '0';
      valSidesOffset.textContent = 'En place (0 mm)';
      sliderExplode.value = '0';
      valExplode.textContent = '0%';
      if (isIsolated) applyIsolation(false);
      applyKinematicsState();
    }
    controls.update();
  });
});

// ============================================================================
// MODALES : PLAN DE DÉCOUPE, NOMENCLATURE & AIDE
// ============================================================================

const modalCutlist = document.getElementById('modal-cutlist');
const modalBom = document.getElementById('modal-bom');
const modalHelp = document.getElementById('modal-help');
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
document.getElementById('btn-top-help').addEventListener('click', () => {
  modalHelp.classList.remove('hidden');
});

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
    if (targetId) document.getElementById(targetId).classList.add('hidden');
  });
});

[modalCutlist, modalBom, modalHelp].forEach((modal) => {
  modal.addEventListener('click', (e) => {
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
// REDIMENSIONNEMENT & BOUCLE DE RENDU
// ============================================================================

function onResize() {
  const w = viewportContainer.clientWidth;
  const h = viewportContainer.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener('resize', onResize);
onResize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  if (sectionManager.active) {
    sectionManager.syncTransforms();
  }
  measurementTool.updateLabelsProjection();
  renderer.render(scene, camera);
}

animate();
