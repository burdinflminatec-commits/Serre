import * as THREE from 'three';

/**
 * Gestionnaire de Coupe CAD Dynamique avec Tranche Pleine (Stencil Buffer Cap)
 * Respecte strictement la convention d'axes métier :
 * - Axe X = Largeur (three.x)
 * - Axe Y = Profondeur (three.z = -Y_cad)
 * - Axe Z = Hauteur (three.y = Z_cad)
 */
export class SectionCapManager {
  constructor(scene, solidMeshes, isLite = false) {
    this.scene = scene;
    this.solidMeshes = solidMeshes;
    this.isLite = isLite;

    this.active = false;
    this.axis = 'X'; // 'X' | 'Y' | 'Z'
    this.flipped = false;
    this.positionMm = 0;

    // Plan de coupe Three.js
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

    this.stencilGroup = new THREE.Group();
    this.scene.add(this.stencilGroup);

    this.stencilEntries = [];
    this.capMesh = null;
    this.helperOutline = null;

    this._initStencilMeshes();
    this.updatePlane();
  }

  _initStencilMeshes() {
    if (!this.isLite) {
      // Passe 1 : BackSide -> IncrementWrap (AVEC clippingPlane actif !)
      const backStencilMat = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        side: THREE.BackSide,
        clippingPlanes: [this.clippingPlane],
        stencilWrite: true,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.IncrementWrapStencilOp
      });

      // Passe 2 : FrontSide -> DecrementWrap (AVEC clippingPlane actif !)
      const frontStencilMat = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        side: THREE.FrontSide,
        clippingPlanes: [this.clippingPlane],
        stencilWrite: true,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.DecrementWrapStencilOp
      });

      this.solidMeshes.forEach((sourceMesh) => {
        const mBack = new THREE.Mesh(sourceMesh.geometry, backStencilMat);
        const mFront = new THREE.Mesh(sourceMesh.geometry, frontStencilMat);
        mBack.renderOrder = 1;
        mFront.renderOrder = 1;
        mBack.matrixAutoUpdate = false;
        mFront.matrixAutoUpdate = false;
        mBack.frustumCulled = false;
        mFront.frustumCulled = false;
        this.stencilGroup.add(mBack);
        this.stencilGroup.add(mFront);
        this.stencilEntries.push({ sourceMesh, mBack, mFront });
      });

      // Plan de bouchage (Tranche pleine opaque là où stencil != 0)
      const capGeom = new THREE.PlaneGeometry(5000, 5000);
      const capMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#7c8ea3'),
        roughness: 0.55,
        metalness: 0.1,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ReplaceStencilOp,
        stencilZFail: THREE.ReplaceStencilOp,
        stencilZPass: THREE.ReplaceStencilOp
      });

      this.capMesh = new THREE.Mesh(capGeom, capMat);
      this.capMesh.renderOrder = 2;
      this.capMesh.frustumCulled = false;
      this.capMesh.visible = false;
      this.scene.add(this.capMesh);
    }

    // Cadre visuel interactif du plan de coupe (cliquable pour tirer/pousser le plan en 3D)
    const frameW = 2250;
    const frameH = 1480;
    const frameGeom = new THREE.EdgesGeometry(new THREE.PlaneGeometry(frameW, frameH));
    const frameMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      transparent: true,
      opacity: 0.65
    });
    this.helperOutline = new THREE.LineSegments(frameGeom, frameMat);
    this.helperOutline.visible = false;

    // Voile vitré très léger permettant d'attraper le plan de coupe à la souris
    const glassGeom = new THREE.PlaneGeometry(frameW, frameH);
    this.glassMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      transparent: true,
      opacity: 0.045,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.interactivePlaneMesh = new THREE.Mesh(glassGeom, this.glassMat);
    this.interactivePlaneMesh.userData = { isSectionPlane: true, isSectionGlass: true };
    this.helperOutline.add(this.interactivePlaneMesh);

    // 4 Poignées 3D sur les bords du cadre de coupe pour tirer/pousser intuitivement
    this.handleMeshes = [];
    const handleMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#38bdf8')
    });
    const handlePositions = [
      { x: -frameW / 2, y: 0, w: 26, h: 140 },
      { x: frameW / 2, y: 0, w: 26, h: 140 },
      { x: 0, y: frameH / 2, w: 180, h: 26 },
      { x: 0, y: -frameH / 2, w: 180, h: 26 }
    ];
    handlePositions.forEach((hp) => {
      const hGeom = new THREE.BoxGeometry(hp.w, hp.h, 14);
      const hMesh = new THREE.Mesh(hGeom, handleMat);
      hMesh.position.set(hp.x, hp.y, 0);
      hMesh.userData = { isSectionPlane: true, isSectionHandle: true };
      this.helperOutline.add(hMesh);
      this.handleMeshes.push(hMesh);
    });

    this.scene.add(this.helperOutline);
  }

  setHighlight(highlighted) {
    if (!this.glassMat) return;
    this.glassMat.opacity = highlighted ? 0.12 : 0.045;
    this.helperOutline.material.opacity = highlighted ? 0.95 : 0.65;
  }

  /**
   * Synchronise les transformations des maillages Stencil avec les pièces 3D visibles
   */
  syncTransforms() {
    if (!this.active) {
      this.stencilGroup.visible = false;
      if (this.capMesh) this.capMesh.visible = false;
      this.helperOutline.visible = false;
      return;
    }

    this.helperOutline.visible = true;
    if (this.isLite) return;

    this.stencilGroup.visible = true;
    if (this.capMesh) this.capMesh.visible = true;

    for (let i = 0; i < this.stencilEntries.length; i++) {
      const { sourceMesh, mBack, mFront } = this.stencilEntries[i];
      const isVisible = this._isMeshEffectivelyVisible(sourceMesh);
      mBack.visible = isVisible;
      mFront.visible = isVisible;
      if (isVisible) {
        sourceMesh.updateMatrixWorld();
        mBack.matrix.copy(sourceMesh.matrixWorld);
        mFront.matrix.copy(sourceMesh.matrixWorld);
        mBack.matrixWorld.copy(sourceMesh.matrixWorld);
        mFront.matrixWorld.copy(sourceMesh.matrixWorld);
      }
    }
  }

  _isMeshEffectivelyVisible(mesh) {
    let curr = mesh;
    while (curr) {
      if (!curr.visible) return false;
      curr = curr.parent;
    }
    return true;
  }

  getBoundsForAxis(axis) {
    if (axis === 'X') return { min: -1050, max: 1050, defaultPos: 0 };
    if (axis === 'Y') return { min: -350, max: 350, defaultPos: 0 };
    if (axis === 'Z') return { min: 0, max: 1300, defaultPos: 600 };
    return { min: -1000, max: 1000, defaultPos: 0 };
  }

  setConfig({ active, axis, flipped, positionMm }) {
    if (typeof active === 'boolean') this.active = active;
    if (axis) this.axis = axis;
    if (typeof flipped === 'boolean') this.flipped = flipped;
    if (typeof positionMm === 'number') this.positionMm = positionMm;
    this.updatePlane();
  }

  updatePlane() {
    if (!this.active) {
      // Déplacer le plan très loin pour ne rien couper quand inactif
      this.clippingPlane.normal.set(0, -1, 0);
      this.clippingPlane.constant = 999999;
      if (this.capMesh) this.capMesh.visible = false;
      this.helperOutline.visible = false;
      this.stencilGroup.visible = false;
      return;
    }

    const s = this.flipped ? 1 : -1;
    // Repère métier -> Three.js :
    // X_cad = three.x
    // Y_cad = -three.z  => couper à Y_cad = pos revient à three.z = -pos
    // Z_cad = three.y
    if (this.axis === 'X') {
      this.clippingPlane.normal.set(s, 0, 0);
      this.clippingPlane.constant = -s * this.positionMm;
    } else if (this.axis === 'Y') {
      // Si normal = (0, 0, -s), alors normal.dot(p) + constant = -s*three.z + constant = s*Y_cad + constant
      this.clippingPlane.normal.set(0, 0, -s);
      this.clippingPlane.constant = -s * this.positionMm;
    } else if (this.axis === 'Z') {
      this.clippingPlane.normal.set(0, s, 0);
      this.clippingPlane.constant = -s * this.positionMm;
    }

    // Positionner le capMesh et le cadre sur le plan de coupe
    const planePoint = new THREE.Vector3();
    this.clippingPlane.coplanarPoint(planePoint);

    // Ajuster le centre du cadre visuel au milieu de la serre
    if (this.axis === 'X') {
      planePoint.y = 600;
      planePoint.z = 0;
    } else if (this.axis === 'Y') {
      planePoint.x = 0;
      planePoint.y = 600;
    } else if (this.axis === 'Z') {
      planePoint.x = 0;
      planePoint.z = 0;
    }

    if (this.capMesh) {
      this.capMesh.position.copy(planePoint);
      this.capMesh.lookAt(planePoint.clone().add(this.clippingPlane.normal));
    }

    this.helperOutline.position.copy(planePoint);
    this.helperOutline.lookAt(planePoint.clone().add(this.clippingPlane.normal));
  }
}
