import * as THREE from 'three';
import { cadToThree, threeToCad } from './geometryBuilder.js';

/**
 * Outil de Mesure 3D Interactif (MeasurementTool)
 * - Clic Gauche uniquement (e.button === 0, tolérance drag < 6 px)
 * - Clic Droit (e.button === 2) ignoré à 100% (Pan OrbitControls)
 * - Aimantation sur sommets ET intersections exactes Arêtes ∩ Plan de coupe
 * - Détection des faces internes et de la tranche pleine de coupe (Stencil Cap)
 * - Étiquettes HTML fixes avec suppression sans décalage au survol
 */
export class MeasurementTool {
  constructor({
    scene,
    camera,
    domElement,
    labelsContainer,
    tooltipEl,
    listContainer,
    partMeshes,
    sectionManager,
    onStateChange,
    onRequestRender
  }) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.labelsContainer = labelsContainer;
    this.tooltipEl = tooltipEl;
    this.listContainer = listContainer;
    this.partMeshes = partMeshes;
    this.sectionManager = sectionManager;
    this.onStateChange = onStateChange || (() => {});
    this.onRequestRender = onRequestRender || (() => {});

    this.enabled = false;
    this.xrayPolycarbonate = false;
    this.showGlobalDims = false;

    this.raycaster = new THREE.Raycaster();
    this.mouseNdc = new THREE.Vector2();

    this.pointA = null;
    this.currentHover = null; // { point: Vector3, snapped: boolean }
    this.measurements = []; // [{ id, pA, pB, distMm, deltas, lineObj, badgeEl }]
    this.nextId = 1;

    // Groupe 3D des segments de mesure et du curseur
    this.measureGroup = new THREE.Group();
    this.scene.add(this.measureGroup);

    this.globalDimsGroup = new THREE.Group();
    this.scene.add(this.globalDimsGroup);
    this.globalDimBadges = [];

    this._initCursors();
    this._initGlobalDimensions();
    this._bindEvents();
  }

  _initCursors() {
    // Curseur sphérique (Or = aimanté coin/intersection, Cyan = libre sur face/coupe)
    const sphereGeom = new THREE.SphereGeometry(7, 16, 16);
    this.cursorMatSnap = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });
    this.cursorMatFree = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      depthTest: false,
      transparent: true,
      opacity: 0.9
    });

    this.cursorMesh = new THREE.Mesh(sphereGeom, this.cursorMatFree);
    this.cursorMesh.renderOrder = 999;
    this.cursorMesh.visible = false;
    this.scene.add(this.cursorMesh);

    // Marqueur Point A en cours
    this.markerAMesh = new THREE.Mesh(sphereGeom, this.cursorMatSnap);
    this.markerAMesh.renderOrder = 999;
    this.markerAMesh.visible = false;
    this.scene.add(this.markerAMesh);

    // Ligne élastique A -> Curseur
    const previewGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3()
    ]);
    const previewMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 14,
      gapSize: 8,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });
    this.previewLine = new THREE.Line(previewGeom, previewMat);
    this.previewLine.renderOrder = 998;
    this.previewLine.visible = false;
    this.scene.add(this.previewLine);
  }

  /**
   * Crée les cotes d'encombrement globales (X=1900, Y=500, Z_arrière=1195, Z_avant=1045)
   */
  _initGlobalDimensions() {
    const defs = [
      {
        label: 'Largeur X : 1900 mm',
        p1: cadToThree(-950, -320, 0),
        p2: cadToThree(950, -320, 0)
      },
      {
        label: 'Profondeur Y : 500 mm',
        p1: cadToThree(-1040, -250, 0),
        p2: cadToThree(-1040, 250, 0)
      },
      {
        label: 'Hauteur Arrière Z : 1195 mm',
        p1: cadToThree(1040, 250, 0),
        p2: cadToThree(1040, 250, 1195)
      },
      {
        label: 'Hauteur Avant Z : 1045 mm',
        p1: cadToThree(1040, -250, 0),
        p2: cadToThree(1040, -250, 1045)
      }
    ];

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.65
    });

    defs.forEach((d) => {
      const geom = new THREE.BufferGeometry().setFromPoints([d.p1, d.p2]);
      const line = new THREE.Line(geom, lineMat);
      this.globalDimsGroup.add(line);

      const badge = document.createElement('div');
      badge.className = 'measure-badge-3d global-dim';
      badge.textContent = d.label;
      badge.style.display = 'none';
      this.labelsContainer.appendChild(badge);

      const mid = d.p1.clone().add(d.p2).multiplyScalar(0.5);
      this.globalDimBadges.push({ mid, badge });
    });
    this.globalDimsGroup.visible = false;
  }

  setGlobalDimsVisible(visible) {
    this.showGlobalDims = visible;
    this.globalDimsGroup.visible = visible;
    this.globalDimBadges.forEach((b) => {
      b.badge.style.display = visible ? 'inline-flex' : 'none';
    });
    this.onRequestRender();
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
    if (!this.enabled) {
      this.cancelCurrentPointA();
      this.cursorMesh.visible = false;
      this.tooltipEl.classList.add('hidden');
    }
    this.domElement.style.cursor = this.enabled ? 'crosshair' : 'default';
    this.onStateChange(this.enabled);
    this.onRequestRender();
  }

  toggle() {
    this.setEnabled(!this.enabled);
  }

  cancelCurrentPointA() {
    this.pointA = null;
    this.markerAMesh.visible = false;
    this.previewLine.visible = false;
    this.tooltipEl.classList.add('hidden');
    this.onRequestRender();
  }

  _bindEvents() {
    let downX = 0;
    let downY = 0;

    this.domElement.addEventListener('pointerdown', (e) => {
      // RÈGLE STRICTE : Ignorer totalement le clic droit (e.button === 2)
      if (e.button !== 0) return;
      downX = e.clientX;
      downY = e.clientY;
    });

    this.domElement.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      this._onPointerMove(e);
    });

    this.domElement.addEventListener('pointerup', (e) => {
      if (!this.enabled) return;
      // RÈGLE STRICTE : Clic gauche uniquement et tolérance de glissement < 6 px
      if (e.button !== 0) return;
      const distPx = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (distPx >= 6) return;

      this._onLeftClick(e);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          this.toggle();
        }
      } else if (e.key === 'Escape' && this.enabled) {
        this.cancelCurrentPointA();
      }
    });
  }

  /**
   * Calcule le point 3D sous la souris en tenant compte :
   * - du filtre de coupe active (plane.distanceToPoint(p) >= 0)
   * - des faces internes et de la tranche pleine coupée (Stencil Cap)
   * - de l'aimantation sur les sommets visibles ET sur les intersections Arêtes ∩ Plan de coupe
   */
  _computeTargetPoint(clientX, clientY) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    const isSectionActive = this.sectionManager && this.sectionManager.active;
    const clipPlane = isSectionActive ? this.sectionManager.clippingPlane : null;

    // Filtrer les maillages candidats visibles
    const candidates = this.partMeshes.filter((m) => {
      if (!this._isMeshVisible(m)) return false;
      if (this.xrayPolycarbonate && m.userData.materialType === 'polycarbonate') return false;
      return true;
    });

    // Activer temporairement DoubleSide pour détecter l'entrée/sortie dans les solides coupés
    const savedSides = new Map();
    if (isSectionActive) {
      candidates.forEach((m) => {
        savedSides.set(m, m.material.side);
        m.material.side = THREE.DoubleSide;
      });
    }

    const rawHits = this.raycaster.intersectObjects(candidates, false);

    if (isSectionActive) {
      candidates.forEach((m) => {
        m.material.side = savedSides.get(m);
      });
    }

    // 1. Filtrer les intersections situées du côté visible du plan de coupe
    let bestHit = null;
    for (let i = 0; i < rawHits.length; i++) {
      const h = rawHits[i];
      if (!clipPlane || clipPlane.distanceToPoint(h.point) >= -0.05) {
        bestHit = h;
        break;
      }
    }

    // 2. Si la coupe est active, vérifier si le rayon coupe le plan de coupe à l'intérieur d'un solide
    if (isSectionActive && clipPlane) {
      const planeTarget = new THREE.Vector3();
      const hitPlane = this.raycaster.ray.intersectPlane(clipPlane, planeTarget);
      if (hitPlane) {
        const distToPlane = this.raycaster.ray.origin.distanceTo(planeTarget);
        if (!bestHit || distToPlane <= bestHit.distance + 0.5) {
          // Vérifier si planeTarget se trouve dans la section d'un maillage solide coupé
          const meshOnCap = this._findSolidContainingCapPoint(candidates, rawHits, distToPlane);
          if (meshOnCap) {
            bestHit = {
              point: planeTarget,
              distance: distToPlane,
              object: meshOnCap,
              isCapHit: true
            };
          }
        }
      }
    }

    if (!bestHit) return null;

    // 3. Aimantation (Snapping) sur les sommets et les intersections Arête ∩ Plan de coupe
    const snapResult = this._findNearestSnapVertex(
      bestHit.object,
      bestHit.point,
      clipPlane,
      rect
    );

    if (snapResult) {
      return {
        point: snapResult,
        snapped: true
      };
    }

    return {
      point: bestHit.point.clone(),
      snapped: false
    };
  }

  /**
   * Détermine si le point d'intersection avec le plan de coupe tombe à l'intérieur d'un solide
   */
  _findSolidContainingCapPoint(candidates, rawHits, distToPlane) {
    // Regrouper les hits par objet : si un objet a un hit avant le plan (coupé) et un hit après le plan (visible),
    // alors le plan de coupe traverse l'intérieur du volume fermé de cet objet !
    const byObject = new Map();
    for (const h of rawHits) {
      if (h.object.userData.materialType === 'polycarbonate') continue;
      if (!byObject.has(h.object)) byObject.set(h.object, []);
      byObject.get(h.object).push(h.distance);
    }

    for (const [obj, dists] of byObject.entries()) {
      let hasBefore = false;
      let hasAfter = false;
      for (const d of dists) {
        if (d < distToPlane - 0.01) hasBefore = true;
        if (d >= distToPlane - 0.01) hasAfter = true;
      }
      if (hasBefore && hasAfter) {
        return obj;
      }
    }
    return null;
  }

  /**
   * Cherche le sommet ou l'intersection (Arête ∩ Plan de coupe) le plus proche à l'écran (< 15 px)
   */
  _findNearestSnapVertex(hitMesh, hitPointWorld, clipPlane, viewportRect) {
    const edgeChild = hitMesh.children.find((c) => c.userData && c.userData.isEdgeLine);
    const geom = edgeChild ? edgeChild.geometry : hitMesh.geometry;
    const posAttr = geom.attributes.position;
    if (!posAttr) return null;

    hitMesh.updateMatrixWorld();
    const matWorld = hitMesh.matrixWorld;

    const hitScreen = this._worldToScreen(hitPointWorld, viewportRect);
    const maxSnapPx = 15;
    const maxWorldRadius = 85; // mm

    let bestPoint = null;
    let bestPxDist = maxSnapPx;

    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();

    const checkCandidate = (ptWorld) => {
      if (ptWorld.distanceTo(hitPointWorld) > maxWorldRadius) return;
      const scr = this._worldToScreen(ptWorld, viewportRect);
      const dPx = Math.hypot(scr.x - hitScreen.x, scr.y - hitScreen.y);
      if (dPx < bestPxDist) {
        bestPxDist = dPx;
        bestPoint = ptWorld.clone();
      }
    };

    if (edgeChild) {
      // Parcourir les segments d'arêtes (paires de sommets)
      for (let i = 0; i < posAttr.count; i += 2) {
        v1.fromBufferAttribute(posAttr, i).applyMatrix4(matWorld);
        v2.fromBufferAttribute(posAttr, i + 1).applyMatrix4(matWorld);

        if (!clipPlane) {
          checkCandidate(v1);
          checkCandidate(v2);
        } else {
          const d1 = clipPlane.distanceToPoint(v1);
          const d2 = clipPlane.distanceToPoint(v2);

          if (d1 >= -0.1) checkCandidate(v1);
          if (d2 >= -0.1) checkCandidate(v2);

          // Si l'arête traverse le plan de coupe, calculer l'intersection exacte Arête ∩ Plan !
          if ((d1 < 0 && d2 >= 0) || (d2 < 0 && d1 >= 0)) {
            const t = d1 / (d1 - d2);
            const inter = v1.clone().lerp(v2, t);
            checkCandidate(inter);
          }
        }
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        v1.fromBufferAttribute(posAttr, i).applyMatrix4(matWorld);
        if (!clipPlane || clipPlane.distanceToPoint(v1) >= -0.1) {
          checkCandidate(v1);
        }
      }
    }

    return bestPoint;
  }

  _worldToScreen(vec3, rect) {
    const p = vec3.clone().project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * rect.width,
      y: (-p.y * 0.5 + 0.5) * rect.height,
      z: p.z
    };
  }

  _isMeshVisible(mesh) {
    let curr = mesh;
    while (curr) {
      if (!curr.visible) return false;
      curr = curr.parent;
    }
    return true;
  }

  _onPointerMove(e) {
    const target = this._computeTargetPoint(e.clientX, e.clientY);
    this.currentHover = target;

    if (!target) {
      this.cursorMesh.visible = false;
      if (!this.pointA) this.tooltipEl.classList.add('hidden');
      this.onRequestRender();
      return;
    }

    this.cursorMesh.visible = true;
    this.cursorMesh.position.copy(target.point);
    this.cursorMesh.material = target.snapped ? this.cursorMatSnap : this.cursorMatFree;

    if (this.pointA) {
      // Mettre à jour la ligne élastique A -> Curseur et le tooltip temps réel
      const posAttr = this.previewLine.geometry.attributes.position;
      posAttr.setXYZ(0, this.pointA.x, this.pointA.y, this.pointA.z);
      posAttr.setXYZ(1, target.point.x, target.point.y, target.point.z);
      posAttr.needsUpdate = true;
      this.previewLine.computeLineDistances();
      this.previewLine.visible = true;

      const dist = this.pointA.distanceTo(target.point);
      const cadA = threeToCad(this.pointA);
      const cadB = threeToCad(target.point);
      const dx = Math.abs(cadB.x - cadA.x);
      const dy = Math.abs(cadB.y - cadA.y);
      const dz = Math.abs(cadB.z - cadA.z);

      const rect = this.domElement.getBoundingClientRect();
      this.tooltipEl.style.left = `${e.clientX - rect.left + 16}px`;
      this.tooltipEl.style.top = `${e.clientY - rect.top + 16}px`;
      this.tooltipEl.innerHTML = `
        <div class="tt-main">${dist.toFixed(1)} mm ${target.snapped ? '🎯' : ''}</div>
        <div class="tt-deltas">ΔX: ${dx.toFixed(1)} | ΔY: ${dy.toFixed(1)} | ΔZ: ${dz.toFixed(1)}</div>
      `;
      this.tooltipEl.classList.remove('hidden');
    } else {
      const cadP = threeToCad(target.point);
      const rect = this.domElement.getBoundingClientRect();
      this.tooltipEl.style.left = `${e.clientX - rect.left + 16}px`;
      this.tooltipEl.style.top = `${e.clientY - rect.top + 16}px`;
      this.tooltipEl.innerHTML = `
        <div class="tt-main">${target.snapped ? '🎯 Coin / Arête aimanté' : 'Point sur surface'}</div>
        <div class="tt-deltas">X: ${cadP.x.toFixed(0)} | Y: ${cadP.y.toFixed(0)} | Z: ${cadP.z.toFixed(0)} mm</div>
      `;
      this.tooltipEl.classList.remove('hidden');
    }
    this.onRequestRender();
  }

  _onLeftClick(e) {
    const target = this._computeTargetPoint(e.clientX, e.clientY);
    if (!target) return;

    if (!this.pointA) {
      this.pointA = target.point.clone();
      this.markerAMesh.position.copy(this.pointA);
      this.markerAMesh.visible = true;
      this.onRequestRender();
    } else {
      const pointB = target.point.clone();
      if (this.pointA.distanceTo(pointB) > 0.5) {
        this._addMeasurement(this.pointA, pointB);
      }
      this.cancelCurrentPointA();
    }
  }

  _addMeasurement(pA, pB) {
    const id = this.nextId++;
    const distMm = pA.distanceTo(pB);
    const cadA = threeToCad(pA);
    const cadB = threeToCad(pB);
    const deltas = {
      dx: Math.abs(cadB.x - cadA.x),
      dy: Math.abs(cadB.y - cadA.y),
      dz: Math.abs(cadB.z - cadA.z)
    };

    // Segment 3D + sphères aux extrémités
    const segGroup = new THREE.Group();
    const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      depthTest: false
    });
    const line = new THREE.Line(geom, mat);
    line.renderOrder = 995;
    segGroup.add(line);

    const endGeom = new THREE.SphereGeometry(5, 12, 12);
    const endMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false });
    const sA = new THREE.Mesh(endGeom, endMat);
    const sB = new THREE.Mesh(endGeom, endMat);
    sA.position.copy(pA);
    sB.position.copy(pB);
    sA.renderOrder = 996;
    sB.renderOrder = 996;
    segGroup.add(sA, sB);

    this.measureGroup.add(segGroup);

    // Badge HTML projeté au milieu du segment (fixe au survol, suppression propre)
    const badgeEl = document.createElement('div');
    badgeEl.className = 'measure-badge-3d';
    badgeEl.innerHTML = `
      <span>${distMm.toFixed(1)} mm</span>
      <button type="button" class="measure-badge-del" title="Supprimer cette mesure">✕</button>
    `;

    // RÈGLE STRICTE : stopPropagation sur pointerdown/click pour ne pas poser de point 3D derrière
    const delBtn = badgeEl.querySelector('.measure-badge-del');
    delBtn.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
    });
    delBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.removeMeasurement(id);
    });

    this.labelsContainer.appendChild(badgeEl);

    const mid = pA.clone().add(pB).multiplyScalar(0.5);
    this.measurements.push({
      id,
      pA,
      pB,
      mid,
      distMm,
      deltas,
      segGroup,
      badgeEl
    });

    this._renderMeasurementsList();
    this.updateLabelsProjection();
    this.onRequestRender();
  }

  removeMeasurement(id) {
    const idx = this.measurements.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const item = this.measurements[idx];
    this.measureGroup.remove(item.segGroup);
    item.badgeEl.remove();
    this.measurements.splice(idx, 1);
    this._renderMeasurementsList();
    this.onRequestRender();
  }

  clearAll() {
    this.measurements.forEach((m) => {
      this.measureGroup.remove(m.segGroup);
      m.badgeEl.remove();
    });
    this.measurements = [];
    this.cancelCurrentPointA();
    this._renderMeasurementsList();
    this.onRequestRender();
  }

  _renderMeasurementsList() {
    if (!this.listContainer) return;
    const sectionEl = this.listContainer.closest('.panel-section');
    if (this.measurements.length === 0) {
      this.listContainer.innerHTML = '';
      if (sectionEl) sectionEl.classList.add('hidden');
      return;
    }

    if (sectionEl) sectionEl.classList.remove('hidden');
    this.listContainer.innerHTML = '';
    this.measurements.forEach((m, index) => {
      const row = document.createElement('div');
      row.className = 'measure-item';
      row.innerHTML = `
        <span>#${index + 1} : <strong>${m.distMm.toFixed(1)} mm</strong></span>
        <button type="button" title="Supprimer">✕</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        this.removeMeasurement(m.id);
      });
      this.listContainer.appendChild(row);
    });
  }

  /**
   * Met à jour la position 2D des étiquettes de mesures à chaque frame
   */
  updateLabelsProjection() {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    for (let i = 0; i < this.measurements.length; i++) {
      const m = this.measurements[i];
      const scr = this._worldToScreen(m.mid, rect);
      if (scr.z > 1) {
        m.badgeEl.style.display = 'none';
      } else {
        m.badgeEl.style.display = 'inline-flex';
        m.badgeEl.style.left = `${scr.x}px`;
        m.badgeEl.style.top = `${scr.y}px`;
      }
    }

    if (this.showGlobalDims) {
      for (let i = 0; i < this.globalDimBadges.length; i++) {
        const gb = this.globalDimBadges[i];
        const scr = this._worldToScreen(gb.mid, rect);
        if (scr.z > 1) {
          gb.badge.style.display = 'none';
        } else {
          gb.badge.style.display = 'inline-flex';
          gb.badge.style.left = `${scr.x}px`;
          gb.badge.style.top = `${scr.y}px`;
        }
      }
    }
  }
}
