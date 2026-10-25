import * as THREE from 'three';
import { PARTS_CATALOG, ROOF_SLOPE_DEG, ROOF_SLOPE_RAD } from '../data/serreData.js';

/**
 * Conversion Repère Métier CAD (X=Largeur, Y=Profondeur, Z=Hauteur)
 * <-> Repère interne Three.js (x=X, y=Z, z=-Y)
 */
export function cadToThree(x, y, z) {
  return new THREE.Vector3(x, z, -y);
}

export function threeToCad(vec3) {
  return {
    x: vec3.x,
    y: -vec3.z,
    z: vec3.y
  };
}

/**
 * Crée une géométrie extrudée rectangulaire avec de vrais trous débouchants (THREE.Shape + .holes)
 * Centrée en X: [-L/2, +L/2], Y: [-W/2, +W/2], Z: [-T/2, +T/2]
 */
function createExtrudedBoardGeometry(length, width, thickness, holes = []) {
  const shape = new THREE.Shape();
  const hw = length / 2;
  const hh = width / 2;

  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  holes.forEach((h) => {
    const holePath = new THREE.Path();
    const hx = -hw + h.x;
    const hy = -hh + h.y;
    holePath.absarc(hx, hy, h.d / 2, 0, Math.PI * 2, false);
    shape.holes.push(holePath);
  });

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 14
  });

  // Centrer l'extrusion sur l'épaisseur Z
  geom.translate(0, 0, -thickness / 2);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Crée un montant vertical dont le sommet est coupé en biseau suivant la pente du toit (16.7°)
 * Profil dessiné dans le plan (Profondeur = thickness, Hauteur = hBack -> hFront)
 * et extrudé selon la largeur X = width.
 */
function createBeveledPostGeometry(widthX, thicknessY, hAtMinY, hAtMaxY) {
  const shape = new THREE.Shape();
  const ht = thicknessY / 2;

  // x du shape = coordonnée locale Y_cad (-thickness/2 à +thickness/2)
  // y du shape = coordonnée locale Z_cad (0 à h)
  shape.moveTo(-ht, 0);
  shape.lineTo(ht, 0);
  shape.lineTo(ht, hAtMaxY);
  shape.lineTo(-ht, hAtMinY);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: widthX,
    bevelEnabled: false
  });

  // Après extrusion :
  // shape.x = Y_cad, shape.y = Z_cad, extrude.z = X_cad (0..widthX)
  // On réaligne pour que Three.js ait : x = X_cad (-widthX/2..+widthX/2), y = Z_cad (0..H), z = -Y_cad
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const sy = pos.getX(i); // Y_cad (-ht .. +ht)
    const sz = pos.getY(i); // Z_cad (0 .. h)
    const sx = pos.getZ(i) - widthX / 2; // X_cad (-widthX/2 .. +widthX/2)
    pos.setXYZ(i, sx, sz, -sy);
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Crée la 8ème lame supérieure de pignon (P06) coupée en pente de 145 mm (arrière) à 0 mm (avant)
 */
function createSlopedGableBoardGeometry(lengthY, maxHeightZ, thicknessX, holes = []) {
  const shape = new THREE.Shape();
  const hy = lengthY / 2; // de -248 (avant) à +248 (arrière)

  // À l'arrière (y_cad = +hy), hauteur = maxHeightZ (145 mm)
  // À l'avant (y_cad = -hy), la pente de 16.7° descend de 496 * tan(16.7°) = 148.8 mm -> arrive à 0 à y_cad = +hy - 145/tan(16.7°) = -235 mm
  const runLength = Math.min(lengthY, maxHeightZ / Math.tan(ROOF_SLOPE_RAD));
  const frontY = hy - runLength;

  shape.moveTo(frontY, 0);
  shape.lineTo(hy, 0);
  shape.lineTo(hy, maxHeightZ);
  shape.closePath();

  holes.forEach((h) => {
    const hx = hy - h.x;
    const hyHole = h.y;
    // Vérifier que le trou est bien dans le triangle
    const maxHAtX = ((hx - frontY) / runLength) * maxHeightZ;
    if (hx > frontY + 12 && hyHole < maxHAtX - 8) {
      const holePath = new THREE.Path();
      holePath.absarc(hx, hyHole, h.d / 2, 0, Math.PI * 2, false);
      shape.holes.push(holePath);
    }
  });

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thicknessX,
    bevelEnabled: false,
    curveSegments: 12
  });

  // Réaligner vers Three.js : x = X_cad (-thicknessX/2..+thicknessX/2), y = Z_cad (0..145), z = -Y_cad
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const yCad = pos.getX(i);
    const zCad = pos.getY(i);
    const xCad = pos.getZ(i) - thicknessX / 2;
    pos.setXYZ(i, xCad, zCad, -yCad);
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Ajoute un maillage solide avec ses arêtes techniques CAD et son userData normalisé
 */
function buildPartMesh({
  geometry,
  material,
  edgeMaterial,
  partId,
  instanceId,
  subGroup,
  explodeVecCad = { x: 0, y: 0, z: 0 },
  registerSolid = true,
  solidMeshes,
  partMeshes
}) {
  const catalogItem = PARTS_CATALOG[partId];
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.userData = {
    partId,
    instanceId,
    name: catalogItem.name,
    category: catalogItem.category,
    subGroup,
    materialType: catalogItem.materialType,
    explodeVecThree: new THREE.Vector3(explodeVecCad.x, explodeVecCad.z, -explodeVecCad.y),
    basePosition: new THREE.Vector3()
  };

  // Arêtes techniques fines
  const edgesGeom = new THREE.EdgesGeometry(geometry, 18);
  const edgesLine = new THREE.LineSegments(edgesGeom, edgeMaterial);
  edgesLine.userData.isEdgeLine = true;
  mesh.add(edgesLine);

  if (registerSolid && catalogItem.materialType !== 'polycarbonate') {
    solidMeshes.push(mesh);
  }
  partMeshes.push(mesh);

  return mesh;
}

/**
 * Construit l'assemblage 3D complet de la Serre 1900 × 500 mm
 */
export function buildSerreAssembly(materials) {
  const rootGroup = new THREE.Group();
  const solidMeshes = [];
  const partMeshes = [];

  // Sous-groupes pour la visibilité et la cinématique
  const groups = {
    backWall: new THREE.Group(),
    frontWall: new THREE.Group(),
    sideLeft: new THREE.Group(),
    sideRight: new THREE.Group(),
    roofPivot: new THREE.Group(), // Pivot exact des charnières arrière (Y=+223, Z=1195)
    hardware: new THREE.Group(),
    trolley: new THREE.Group()
  };

  Object.values(groups).forEach((g) => rootGroup.add(g));

  // ==========================================================================
  // 1. FAÇADE ARRIÈRE : 8 Lames P01 (1900×145×27) + 3 Montants P02 (70×45)
  // ==========================================================================
  const geomP01 = createExtrudedBoardGeometry(1900, 145, 27, PARTS_CATALOG.P01.holes);
  for (let r = 0; r < 8; r++) {
    const zBottom = r * 150;
    const zCenter = zBottom + 145 / 2;
    const yCenter = 250 - 27 / 2; // Y_cad = +236.5 mm

    const mesh = buildPartMesh({
      geometry: geomP01,
      material: materials.wood_deck,
      edgeMaterial: materials.edge_line,
      partId: 'P01',
      instanceId: `P01 #${r + 1}`,
      subGroup: 'backWall',
      explodeVecCad: { x: 0, y: 260 + r * 12, z: (r - 3.5) * 18 },
      solidMeshes,
      partMeshes
    });

    // Dans createExtrudedBoardGeometry : X = length (1900), Y = width (145), Z = thickness (27)
    // En Three.js : three.x = X_cad, three.y = Z_cad, three.z = -Y_cad => aucune rotation requise !
    mesh.position.copy(cadToThree(0, yCenter, zCenter));
    mesh.userData.basePosition.copy(mesh.position);
    groups.backWall.add(mesh);
  }

  // 3 Montants Arrière P02 — Coupe droite à 90° (hauteur = 1180 mm)
  const geomP02 = createBeveledPostGeometry(70, 45, 1180, 1180);
  const backPostX = [-870, 0, +870];
  backPostX.forEach((xCad, idx) => {
    const mesh = buildPartMesh({
      geometry: geomP02,
      material: materials.wood_post,
      edgeMaterial: materials.edge_line,
      partId: 'P02',
      instanceId: `P02 #${idx + 1}`,
      subGroup: 'backWall',
      explodeVecCad: { x: xCad * 0.08, y: 120, z: 0 },
      solidMeshes,
      partMeshes
    });
    mesh.position.copy(cadToThree(xCad, 200.5, 0));
    mesh.userData.basePosition.copy(mesh.position);
    groups.backWall.add(mesh);
  });

  // Unique Traverse Haute Centrale P12 (370 × 70 × 45 mm à X=0) reliant P04 #2 (Avant) et P02 #2 (Arrière)
  // Plaquée sous la pente du toit (16.7°) entre Y_cad = -178 et Y_cad = +178, sans rien au sol !
  const geomP12 = createExtrudedBoardGeometry(370, 70, 45, PARTS_CATALOG.P12.holes);
  geomP12.rotateY(Math.PI / 2);
  geomP12.rotateZ(Math.PI / 2);
  geomP12.rotateX(ROOF_SLOPE_RAD);

  const meshP12 = buildPartMesh({
    geometry: geomP12,
    material: materials.wood_post,
    edgeMaterial: materials.edge_line,
    partId: 'P12',
    instanceId: 'P12 #1 (Portique Central X=0)',
    subGroup: 'backWall',
    explodeVecCad: { x: 0, y: 0, z: 150 },
    solidMeshes,
    partMeshes
  });
  meshP12.position.copy(cadToThree(0, 0, 1073));
  meshP12.userData.basePosition.copy(meshP12.position);
  groups.backWall.add(meshP12);

  // ==========================================================================
  // 2. FAÇADE AVANT : 5 Lames P03 + Fenêtre Poly P09 + 3 Montants P04
  // ==========================================================================
  const geomP03 = createExtrudedBoardGeometry(1900, 145, 27, PARTS_CATALOG.P03.holes);
  for (let r = 0; r < 5; r++) {
    const zBottom = r * 150;
    const zCenter = zBottom + 145 / 2;
    const yCenter = -250 + 27 / 2; // Y_cad = -236.5 mm

    const mesh = buildPartMesh({
      geometry: geomP03,
      material: materials.wood_deck,
      edgeMaterial: materials.edge_line,
      partId: 'P03',
      instanceId: `P03 #${r + 1}`,
      subGroup: 'frontWall',
      explodeVecCad: { x: 0, y: -260 - r * 12, z: (r - 2) * 18 },
      solidMeshes,
      partMeshes
    });
    mesh.position.copy(cadToThree(0, yCenter, zCenter));
    mesh.userData.basePosition.copy(mesh.position);
    groups.frontWall.add(mesh);
  }

  // Fenêtre Polycarbonate Avant P09 (1900 × 300 × 10 mm, couvre Z=745..1045, Y=-228)
  const geomP09 = createExtrudedBoardGeometry(1900, 300, 10, PARTS_CATALOG.P09.holes);
  const meshP09 = buildPartMesh({
    geometry: geomP09,
    material: materials.polycarbonate,
    edgeMaterial: materials.edge_poly,
    partId: 'P09',
    instanceId: 'P09 #1',
    subGroup: 'frontWall',
    explodeVecCad: { x: 0, y: -340, z: 80 },
    registerSolid: false,
    solidMeshes,
    partMeshes
  });
  meshP09.position.copy(cadToThree(0, -228, 745 + 150));
  meshP09.userData.basePosition.copy(meshP09.position);
  groups.frontWall.add(meshP09);

  // 3 Montants Avant P04 — Coupe droite à 90° (hauteur = 1045 mm)
  const geomP04 = createBeveledPostGeometry(70, 45, 1045, 1045);
  backPostX.forEach((xCad, idx) => {
    const mesh = buildPartMesh({
      geometry: geomP04,
      material: materials.wood_post,
      edgeMaterial: materials.edge_line,
      partId: 'P04',
      instanceId: `P04 #${idx + 1}`,
      subGroup: 'frontWall',
      explodeVecCad: { x: xCad * 0.08, y: -120, z: 0 },
      solidMeshes,
      partMeshes
    });
    mesh.position.copy(cadToThree(xCad, -200.5, 0));
    mesh.userData.basePosition.copy(mesh.position);
    groups.frontWall.add(mesh);
  });

  // ==========================================================================
  // 3. CÔTÉS AMOVIBLES GAUCHE (sideLeft) & DROIT (sideRight)
  // ==========================================================================
  const geomP05 = createExtrudedBoardGeometry(496, 145, 27, PARTS_CATALOG.P05.holes);
  // Pour les lames de côté P05, leur longueur (496) est orientée selon Y_cad (three.z)
  // et leur épaisseur (27) selon X_cad (three.x) -> rotation Y de 90° sur la géométrie
  geomP05.rotateY(Math.PI / 2);

  const geomP06 = createSlopedGableBoardGeometry(496, 145, 27, PARTS_CATALOG.P06.holes);
  // Montants de côtés amovibles P07 (1155 mm) et P08 (1030 mm) — Coupe droite à 90°
  const geomP07 = createBeveledPostGeometry(45, 70, 1155, 1155);
  const geomP08 = createBeveledPostGeometry(45, 70, 1030, 1030);

  // Traverse inclinée P13 (320 × 70 × 45 mm) entre les sommets de P08 et P07 pour tenir la lame en pente P06
  const geomP13 = createExtrudedBoardGeometry(320, 70, 45, PARTS_CATALOG.P13.holes);
  geomP13.rotateY(Math.PI / 2);
  geomP13.rotateX(ROOF_SLOPE_RAD);

  const sidesConfig = [
    {
      key: 'sideLeft',
      group: groups.sideLeft,
      dirX: -1,
      slatX: -950 - 27 / 2, // -963.5
      postX: -950 + 45 / 2, // -927.5 (s'emboîte à l'intérieur contre P02/P04 qui sont à -905..-835)
      instOffset: 0
    },
    {
      key: 'sideRight',
      group: groups.sideRight,
      dirX: 1,
      slatX: 950 + 27 / 2, // +963.5
      postX: 950 - 45 / 2, // +927.5
      instOffset: 7
    }
  ];

  sidesConfig.forEach((sc, sIdx) => {
    // 7 lames rectangulaires P05 (rangs 1 à 7)
    for (let r = 0; r < 7; r++) {
      const zBottom = r * 150;
      const zCenter = zBottom + 145 / 2;
      const mesh = buildPartMesh({
        geometry: geomP05,
        material: materials.wood_deck,
        edgeMaterial: materials.edge_line,
        partId: 'P05',
        instanceId: `P05 #${sc.instOffset + r + 1}`,
        subGroup: sc.key,
        explodeVecCad: { x: sc.dirX * (320 + r * 12), y: 0, z: (r - 3) * 15 },
        solidMeshes,
        partMeshes
      });
      mesh.position.copy(cadToThree(sc.slatX, 0, zCenter));
      mesh.userData.basePosition.copy(mesh.position);
      sc.group.add(mesh);
    }

    // 8ème lame supérieure en pente P06
    const meshP06 = buildPartMesh({
      geometry: geomP06,
      material: materials.wood_deck,
      edgeMaterial: materials.edge_line,
      partId: 'P06',
      instanceId: `P06 #${sIdx + 1}`,
      subGroup: sc.key,
      explodeVecCad: { x: sc.dirX * 420, y: 0, z: 90 },
      solidMeshes,
      partMeshes
    });
    meshP06.position.copy(cadToThree(sc.slatX, 0, 7 * 150));
    meshP06.userData.basePosition.copy(meshP06.position);
    sc.group.add(meshP06);

    // Montant arrière du côté amovible P07 (Y de +153 à +223 => Y_center = +188)
    const meshP07 = buildPartMesh({
      geometry: geomP07,
      material: materials.wood_post,
      edgeMaterial: materials.edge_line,
      partId: 'P07',
      instanceId: `P07 #${sIdx + 1}`,
      subGroup: sc.key,
      explodeVecCad: { x: sc.dirX * 220, y: 40, z: 0 },
      solidMeshes,
      partMeshes
    });
    meshP07.position.copy(cadToThree(sc.postX, 188, 0));
    meshP07.userData.basePosition.copy(meshP07.position);
    sc.group.add(meshP07);

    // Montant avant du côté amovible P08 (Y de -223 à -153 => Y_center = -188)
    const meshP08 = buildPartMesh({
      geometry: geomP08,
      material: materials.wood_post,
      edgeMaterial: materials.edge_line,
      partId: 'P08',
      instanceId: `P08 #${sIdx + 1}`,
      subGroup: sc.key,
      explodeVecCad: { x: sc.dirX * 220, y: -40, z: 0 },
      solidMeshes,
      partMeshes
    });
    meshP08.position.copy(cadToThree(sc.postX, -188, 0));
    meshP08.userData.basePosition.copy(meshP08.position);
    sc.group.add(meshP08);

    // Traverse inclinée P13 entre les sommets de P08 (Y=-153) et P07 (Y=+153) pour tenir P06
    const meshP13 = buildPartMesh({
      geometry: geomP13,
      material: materials.wood_post,
      edgeMaterial: materials.edge_line,
      partId: 'P13',
      instanceId: `P13 #${sIdx + 1} (Support P06 ${sIdx === 0 ? 'Gauche' : 'Droit'})`,
      subGroup: sc.key,
      explodeVecCad: { x: sc.dirX * 260, y: 0, z: 80 },
      solidMeshes,
      partMeshes
    });
    meshP13.position.copy(cadToThree(sc.postX, 0, 1088));
    meshP13.userData.basePosition.copy(meshP13.position);
    sc.group.add(meshP13);
  });

  // ==========================================================================
  // 4. TOIT OUVRANT PAR LE HAUT (roofPivot) :
  // Charnières à l'AVANT (bas de pente : Y_cad = -223 mm, Z_cad = 1056 mm)
  // Ouverture par le HAUT (arrière : Y_cad = +223..250 mm, Z_cad = 1195 mm)
  // À Y_cad = +250, la sous-face du toit arrive à 1056 + 473*tan(16.7°) = 1198 mm (> 1195 mm)
  // ==========================================================================
  const frontHingePivotThree = cadToThree(0, -223, 1056);
  groups.roofPivot.position.copy(frontHingePivotThree);

  // Groupe interne incliné de base à +16.7° (monte de l'avant z=+223 vers l'arrière z=-250)
  const roofSlopeGroup = new THREE.Group();
  roofSlopeGroup.rotation.x = ROOF_SLOPE_RAD;
  groups.roofPivot.add(roofSlopeGroup);

  // Plaque Polycarbonate de Toit P10 (2000 × 660 × 10 mm)
  const geomP10 = createExtrudedBoardGeometry(2000, 660, 10, PARTS_CATALOG.P10.holes);
  geomP10.rotateX(-Math.PI / 2);

  const meshP10 = buildPartMesh({
    geometry: geomP10,
    material: materials.polycarbonate,
    edgeMaterial: materials.edge_poly,
    partId: 'P10',
    instanceId: 'P10 #1',
    subGroup: 'roof',
    explodeVecCad: { x: 0, y: 0, z: 320 },
    registerSolid: false,
    solidMeshes,
    partMeshes
  });
  meshP10.position.set(0, 12, -245);
  meshP10.userData.basePosition.copy(meshP10.position);
  roofSlopeGroup.add(meshP10);

  // 2 Lattes Raidisseurs Sous-Toit P11 (890 × 68 × 27 mm)
  const geomP11 = createExtrudedBoardGeometry(890, 68, 27, PARTS_CATALOG.P11.holes);
  geomP11.rotateX(-Math.PI / 2);

  const slatPositions = [
    { label: 'P11 #1 (Traverse Sous-Toit Avant Charnières)', zRamp: -35 },
    { label: 'P11 #2 (Traverse Sous-Toit Arrière Vérin)', zRamp: -375 }
  ];
  slatPositions.forEach((sp) => {
    const meshP11 = buildPartMesh({
      geometry: geomP11,
      material: materials.wood_deck,
      edgeMaterial: materials.edge_line,
      partId: 'P11',
      instanceId: sp.label,
      subGroup: 'roof',
      explodeVecCad: { x: 0, y: 0, z: 210 },
      solidMeshes,
      partMeshes
    });
    meshP11.position.set(0, -6.5, sp.zRamp);
    meshP11.userData.basePosition.copy(meshP11.position);
    roofSlopeGroup.add(meshP11);
  });

  // ==========================================================================
  // 5. QUINCAILLERIE : 3 Charnières Q01 + Compas Vérin TecTake Q02 (46×26.5 cm)
  // ==========================================================================
  const geomQ01 = createExtrudedBoardGeometry(80, 60, 4, PARTS_CATALOG.Q01.holes);
  const hingeMeshes = [];
  backPostX.forEach((xCad, idx) => {
    const meshQ01 = buildPartMesh({
      geometry: geomQ01,
      material: materials.metal_galva,
      edgeMaterial: materials.edge_line,
      partId: 'Q01',
      instanceId: `Q01 #${idx + 1}`,
      subGroup: 'hardware',
      explodeVecCad: { x: 0, y: -180, z: 140 },
      solidMeshes,
      partMeshes
    });
    meshQ01.position.copy(cadToThree(xCad, -225, 1045));
    meshQ01.userData.basePosition.copy(meshQ01.position);
    meshQ01.userData.xCad = xCad;
    hingeMeshes.push(meshQ01);
    groups.hardware.add(meshQ01);
  });

  // --------------------------------------------------------------------------
  // Modélisation du Cylindre Thermique TecTake SEUL en poussée verticale directe :
  // - Sans le grand compas en V : zéro encombrement dans les 500 mm de profondeur !
  // - Équerre/Collier de fixation (45×45×30 mm) vissé en haut du montant central
  // - Cylindre thermostatique noir (Ø 18 mm, L = 175 mm) vertical le long du montant
  // - Tige de piston inox (Ø 8 mm, course directe 0 à 90 mm) + patin d'appui libre
  //   qui pousse directement sous la traverse du toit !
  // --------------------------------------------------------------------------
  const L_CYL = 175; // mm (longueur du cylindre noir)

  // Support/équerre de maintien du cylindre sur le montant central (cliquable Q02)
  const geomQ02Bracket = createExtrudedBoardGeometry(45, 45, 30, [
    { x: 12, y: 22.5, d: 5 },
    { x: 33, y: 22.5, d: 5 }
  ]);
  const meshQ02 = buildPartMesh({
    geometry: geomQ02Bracket,
    material: materials.metal_galva,
    edgeMaterial: materials.edge_line,
    partId: 'Q02',
    instanceId: 'Q02 #1 (Cylindre Thermique Seul - Poussée Directe)',
    subGroup: 'hardware',
    explodeVecCad: { x: 0, y: 90, z: 120 },
    solidMeshes,
    partMeshes
  });
  groups.hardware.add(meshQ02);

  // Corps du cylindre thermostatique noir (175 mm vertical sous le support)
  const blackCylGeom = new THREE.CylinderGeometry(9.5, 9.5, L_CYL, 20);
  const blackCylMesh = new THREE.Mesh(blackCylGeom, materials.metal_dark);
  blackCylMesh.add(
    new THREE.LineSegments(new THREE.EdgesGeometry(blackCylGeom, 25), materials.edge_line)
  );
  // Le haut du cylindre noir traverse l'équerre (à +12 mm), le bas descend à -163 mm
  blackCylMesh.position.set(0, -L_CYL / 2 + 12, 0);
  meshQ02.add(blackCylMesh);

  // Tige de piston argentée (Ø 8 mm) qui sort verticalement vers le haut + patin d'appui libre
  const pistonGroup = new THREE.Group();
  const rodMaxLen = 110;
  const rodGeom = new THREE.CylinderGeometry(4, 4, rodMaxLen, 16);
  // Quand pistonGroup.position.y = sortie (0..90 mm), le haut de la tige pousse le toit
  rodGeom.translate(0, -rodMaxLen / 2, 0);
  const rodMesh = new THREE.Mesh(rodGeom, materials.metal_galva);
  pistonGroup.add(rodMesh);

  // Embout / patin caoutchouc d'appui libre en sommet de tige (le toit se pose dessus sans être vissé)
  const padGeom = new THREE.CylinderGeometry(13, 10, 8, 18);
  padGeom.translate(0, 4, 0);
  const padMesh = new THREE.Mesh(padGeom, materials.metal_dark);
  pistonGroup.add(padMesh);

  meshQ02.add(pistonGroup);

  [blackCylMesh, rodMesh, padMesh].forEach((subM) => {
    subM.userData = meshQ02.userData;
    partMeshes.push(subM);
    solidMeshes.push(subM);
  });

  // --------------------------------------------------------------------------
  // 8 × Fermetures de Caisse Hettich Q03 (Galaxus #58332504 — Plan officiel Hettich) :
  // Montage d'angle à 90° (comme sur la photo officielle Hettich) :
  // 1. Clanche (corps 49 × 13 mm + étrier fil Ø 3 mm de 23 × 23 mm) vissée horizontalement
  //    sur les CÔTÉS LONGS fixes (P01 Arrière / P03 Avant) à Y_cad = ±250 mm (X = ±903..±952 mm).
  // 2. Gâche plate (largeur 15 mm, longueur 36 mm, 2 trous Ø 4 mm à 8,25 et 28,25 mm)
  //    vissée à 90° sur la FACE EXTÉRIEURE des Côtés Amovibles (P05, à X_cad = ±977 mm),
  //    avec son bec recourbé qui déborde à l'arête d'angle (X = ±977, Y = ±250 mm).
  // -> L'étrier de 23 mm enjambe pile l'épaisseur de 27 mm de la tranche de P05 pour tirer
  //    le côté amovible selon X contre les montants fixes P02 et P04 !
  // --------------------------------------------------------------------------
  const geomChassisBase = new THREE.BoxGeometry(38, 13, 6);
  // Gâche plate 36 × 15 × 2 mm (posée dans le plan Y-Z à X = ±978 mm) avec ses 2 trous Ø 4 mm (espacés de 20 mm)
  const geomCatchPlate = createExtrudedBoardGeometry(36, 15, 2, [
    { x: 8.25, y: 7.5, d: 4 },
    { x: 28.25, y: 7.5, d: 4 }
  ]);
  // Orienter la longueur (36 mm) selon Z_three (Y_cad) et l'épaisseur (2 mm) selon X_three (X_cad)
  geomCatchPlate.rotateY(Math.PI / 2);

  const latchConfigs = [
    // Côté Gauche (4 fermetures Hettich : 2 Avant sur rangs 2 et 5, 2 Arrière sur rangs 2 et 7)
    { side: 'left', dirX: -1, face: 'front', zCad: 222.5, label: 'Q03 #1 (Avant-Gauche Rang 2)' },
    { side: 'left', dirX: -1, face: 'front', zCad: 672.5, label: 'Q03 #2 (Avant-Gauche Rang 5)' },
    { side: 'left', dirX: -1, face: 'back', zCad: 222.5, label: 'Q03 #3 (Arrière-Gauche Rang 2)' },
    { side: 'left', dirX: -1, face: 'back', zCad: 972.5, label: 'Q03 #4 (Arrière-Gauche Rang 7)' },
    // Côté Droit (4 fermetures Hettich : 2 Avant sur rangs 2 et 5, 2 Arrière sur rangs 2 et 7)
    { side: 'right', dirX: 1, face: 'front', zCad: 222.5, label: 'Q03 #5 (Avant-Droit Rang 2)' },
    { side: 'right', dirX: 1, face: 'front', zCad: 672.5, label: 'Q03 #6 (Avant-Droit Rang 5)' },
    { side: 'right', dirX: 1, face: 'back', zCad: 222.5, label: 'Q03 #7 (Arrière-Droit Rang 2)' },
    { side: 'right', dirX: 1, face: 'back', zCad: 972.5, label: 'Q03 #8 (Arrière-Droit Rang 7)' }
  ];

  const toggleLatches = [];

  latchConfigs.forEach((lc) => {
    const outZ = lc.face === 'front' ? 1 : -1;
    const faceYCad = lc.face === 'front' ? -253 : 253;

    // 1. Châssis de la clanche sur la façade longue fixe (P01/P03, X_cad = ±933 mm -> va de ±914 à ±952 mm)
    const meshQ03 = buildPartMesh({
      geometry: geomChassisBase,
      material: materials.metal_galva,
      edgeMaterial: materials.edge_line,
      partId: 'Q03',
      instanceId: lc.label,
      subGroup: 'hardware',
      explodeVecCad: { x: lc.dirX * 60, y: lc.face === 'front' ? -140 : 140, z: 0 },
      solidMeshes,
      partMeshes
    });
    meshQ03.position.copy(cadToThree(lc.dirX * 933, faceYCad, lc.zCad));
    meshQ03.userData.basePosition.copy(meshQ03.position);
    meshQ03.userData.latchSide = lc.side;

    // Groupe du levier basculant (49 mm hors-tout avec palette de pouce incurvée, largeur 13 mm)
    const leverPivot = new THREE.Group();
    leverPivot.position.set(lc.dirX * 14, 0, outZ * 3);
    meshQ03.add(leverPivot);

    // Corps plat du levier (36 × 13 × 2.5 mm)
    const leverBodyGeom = new THREE.BoxGeometry(36, 13, 2.5);
    leverBodyGeom.translate(-lc.dirX * 14, 0, outZ * 2);
    const leverMesh = new THREE.Mesh(leverBodyGeom, materials.metal_galva);
    leverMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(leverBodyGeom, 25), materials.edge_line));
    leverPivot.add(leverMesh);

    // Palette de pouce relevée au bout du levier (portant la longueur à 49 mm)
    const thumbTabGeom = new THREE.BoxGeometry(11, 13, 2.5);
    thumbTabGeom.rotateY(-lc.dirX * outZ * 0.38);
    thumbTabGeom.translate(-lc.dirX * 36, 0, outZ * 4.2);
    const thumbTabMesh = new THREE.Mesh(thumbTabGeom, materials.metal_galva);
    thumbTabMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(thumbTabGeom, 25), materials.edge_line));
    leverPivot.add(thumbTabMesh);

    // Étrier en fil d'acier rond Ø 3 mm (23 × 23 mm selon plan Hettich) :
    // Articulé sur les flancs du levier (largeur 23 mm autour du corps de 13 mm, longueur 23 mm)
    const bailPivot = new THREE.Group();
    bailPivot.position.set(lc.dirX * 6, 0, 0);
    leverPivot.add(bailPivot);

    const bailLen = 23; // 23 mm de long : part de X=±953 et rejoint le bec de la gâche à X=±976 mm !
    const bailHalfW = 10; // largeur ext = 20 + 3 = 23 mm !
    const wireRad = 1.5; // Ø 3 mm

    const wireTopGeom = new THREE.CylinderGeometry(wireRad, wireRad, bailLen, 12);
    wireTopGeom.rotateZ(Math.PI / 2);
    wireTopGeom.translate((lc.dirX * bailLen) / 2, bailHalfW, 0);

    const wireBotGeom = new THREE.CylinderGeometry(wireRad, wireRad, bailLen, 12);
    wireBotGeom.rotateZ(Math.PI / 2);
    wireBotGeom.translate((lc.dirX * bailLen) / 2, -bailHalfW, 0);

    const wireFrontGeom = new THREE.CylinderGeometry(wireRad, wireRad, bailHalfW * 2 + 2, 12);
    wireFrontGeom.translate(lc.dirX * bailLen, 0, -outZ * 1.5);

    const wireBackTopGeom = new THREE.CylinderGeometry(wireRad, wireRad, 4.5, 10);
    wireBackTopGeom.translate(0, bailHalfW - 2, 0);
    const wireBackBotGeom = new THREE.CylinderGeometry(wireRad, wireRad, 4.5, 10);
    wireBackBotGeom.translate(0, -bailHalfW + 2, 0);

    const wireTopMesh = new THREE.Mesh(wireTopGeom, materials.metal_galva);
    const wireBotMesh = new THREE.Mesh(wireBotGeom, materials.metal_galva);
    const wireFrontMesh = new THREE.Mesh(wireFrontGeom, materials.metal_galva);
    const wireBackTopMesh = new THREE.Mesh(wireBackTopGeom, materials.metal_galva);
    const wireBackBotMesh = new THREE.Mesh(wireBackBotGeom, materials.metal_galva);
    bailPivot.add(wireTopMesh, wireBotMesh, wireFrontMesh, wireBackTopMesh, wireBackBotMesh);

    [leverMesh, thumbTabMesh, wireTopMesh, wireBotMesh, wireFrontMesh, wireBackTopMesh, wireBackBotMesh].forEach(
      (m) => {
        m.userData = meshQ03.userData;
        partMeshes.push(m);
        solidMeshes.push(m);
      }
    );

    groups.hardware.add(meshQ03);

    // 2. Gâche plate (36 × 15 × 2 mm, 2 trous Ø 4 mm espacés de 20 mm) vissée à 90°
    //    sur la FACE EXTÉRIEURE du Côté Amovible P05 (X_cad = ±978 mm, Y_cad de ±212 à ±248 mm)
    const catchBaseMesh = new THREE.Mesh(geomCatchPlate, materials.metal_galva);
    catchBaseMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geomCatchPlate, 25), materials.edge_line));

    // Bec recourbé à 90° au bout de la gâche (à l'arête d'angle X=±977, Y=±250 mm) qui retient le fil Ø 3 mm de l'étrier
    const hookLipGeom = new THREE.BoxGeometry(5, 15, 6);
    hookLipGeom.rotateY(lc.dirX * outZ * 0.45);
    hookLipGeom.translate(-lc.dirX * 1.5, 0, outZ * 19.5);
    const catchHookMesh = new THREE.Mesh(hookLipGeom, materials.metal_galva);
    catchHookMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(hookLipGeom, 25), materials.edge_line));

    const catchCenterYCad = lc.face === 'front' ? -231 : 231; // s'étend de ±213 à ±249 mm sur la face extérieure de P05
    catchBaseMesh.position.copy(cadToThree(lc.dirX * 978, catchCenterYCad, lc.zCad));
    catchBaseMesh.add(catchHookMesh);

    const catchUserData = {
      ...meshQ03.userData,
      basePosition: catchBaseMesh.position.clone(),
      explodeVecThree: new THREE.Vector3(lc.dirX * 180, 0, 0)
    };
    catchBaseMesh.userData = catchUserData;
    catchHookMesh.userData = catchUserData;

    const sideGrp = lc.side === 'left' ? groups.sideLeft : groups.sideRight;
    sideGrp.add(catchBaseMesh);
    partMeshes.push(catchBaseMesh, catchHookMesh);
    solidMeshes.push(catchBaseMesh, catchHookMesh);

    toggleLatches.push({ lc, outZ, meshQ03, leverPivot, bailPivot, catchBaseMesh });
  });

  // ==========================================================================
  // 6. SOCLE PLANTES À ROULETTES (DÉMO PASSAGE CÔTÉS AMOVIBLES)
  // ==========================================================================
  buildPlantTrolleyDemo(groups.trolley, materials, solidMeshes);

  /**
   * Fonction de mise à jour cinématique :
   * - ventAngleDeg : ouverture automatique par poussée directe du cylindre (0° à 12° -> 0 à 90 mm de course)
   * - roofAngleDeg : levage manuel en grand pour arroser/passer les mains (0° à 73.3° -> toit à 90° vertical)
   * - leftSideOffsetMm / rightSideOffsetMm : dépose des côtés amovibles gauche et droit (0 à 600 mm)
   * - trolleyOffsetX : roulage du plateau plantes sur roulettes (-1300 à +1300 mm)
   */
  function updateKinematics({
    ventAngleDeg = 0,
    roofAngleDeg = 0,
    sidesOffsetMm = 0,
    leftSideOffsetMm = null,
    rightSideOffsetMm = null,
    trolleyOffsetX = 0,
    explodeFactor = 0
  }) {
    const effectiveRoofDeg = Math.max(ventAngleDeg, roofAngleDeg);
    const openRad = (effectiveRoofDeg * Math.PI) / 180;
    const ventRad = (ventAngleDeg * Math.PI) / 180;

    // Pivot du toit sur les charnières AVANT (Y=-223, Z=1056) -> le HAUT (arrière) se soulève jusqu'à la verticale
    const hingeOrigin = cadToThree(0, -223, 1056);
    groups.roofPivot.position.copy(hingeOrigin);
    roofSlopeGroup.rotation.x = ROOF_SLOPE_RAD;
    meshP10.userData.basePosition.set(0, 12, -245);
    roofSlopeGroup.children[1].userData.basePosition.set(0, -6.5, -35);
    roofSlopeGroup.children[2].userData.basePosition.set(0, -6.5, -405);

    groups.roofPivot.rotation.x = openRad;

    hingeMeshes.forEach((hm) => {
      hm.userData.basePosition.copy(cadToThree(hm.userData.xCad, -225, 1048));
    });

    // Support du cylindre fixé contre le flanc du montant central arrière P02 #2 (X=+58, Y_cad=+165, Z_cad=1140)
    // Décalé à X=+58 mm pour ne pas gêner la traverse centrale P12 #2 (X=-35..+35 mm)
    const bracketZCad = 1140;
    meshQ02.userData.basePosition.copy(cadToThree(58, 165, bracketZCad));

    // Hauteur de la sous-face de la traverse P11 #2 à l'aplomb du piston (dist = 405 mm de la charnière avant)
    const distFromHinge = 405;
    const totalSlopeRad = ROOF_SLOPE_RAD + ventRad;
    const roofUndersideY = hingeOrigin.y + distFromHinge * Math.sin(totalSlopeRad) - 18;

    // Le patin du piston monte exactement jusqu'à toucher la sous-face de la traverse pour ventRad
    const tipLocalY = Math.max(14, roofUndersideY - bracketZCad - 8);
    pistonGroup.position.set(0, tipLocalY, 0);

    // Décalage latéral des 2 côtés amovibles (0..250 mm : extraction, 250..600 mm : rotation à 90° dans le plan arrière contre le mur)
    const leftShift = leftSideOffsetMm !== null ? leftSideOffsetMm : sidesOffsetMm;
    const rightShift = rightSideOffsetMm !== null ? rightSideOffsetMm : sidesOffsetMm;

    // Animer l'ouverture du levier et de l'étrier en U des 8 fermetures Hettich Q03 dès qu'un côté s'ouvre
    toggleLatches.forEach(({ lc, outZ, leverPivot, bailPivot }) => {
      const shift = lc.side === 'left' ? leftShift : rightShift;
      const unlockT = Math.min(1, shift / 30);
      leverPivot.rotation.y = lc.dirX * outZ * unlockT * 1.1;
      bailPivot.rotation.y = -lc.dirX * outZ * unlockT * 0.55;
    });

    // Côté Gauche : coin arrière local (-963.5, 0, -236.5) -> pivote de 0° à -90° pour s'aligner avec le mur arrière
    {
      const px = -963.5;
      const pz = -236.5;
      const slideOut = Math.min(leftShift, 250) + Math.max(0, leftShift - 250) * 0.15;
      const rotT = Math.min(1, Math.max(0, (leftShift - 250) / 350));
      const smoothRot = rotT * rotT * (3 - 2 * rotT);
      const theta = -smoothRot * (Math.PI / 2);

      const targetBackX = px - slideOut;
      const targetBackZ = pz;

      groups.sideLeft.rotation.y = theta;
      groups.sideLeft.position.set(
        targetBackX - (px * Math.cos(theta) + pz * Math.sin(theta)),
        0,
        targetBackZ - (-px * Math.sin(theta) + pz * Math.cos(theta))
      );
    }

    // Côté Droit : coin arrière local (+963.5, 0, -236.5) -> pivote de 0° à +90° pour s'aligner avec le mur arrière
    {
      const px = 963.5;
      const pz = -236.5;
      const slideOut = Math.min(rightShift, 250) + Math.max(0, rightShift - 250) * 0.15;
      const rotT = Math.min(1, Math.max(0, (rightShift - 250) / 350));
      const smoothRot = rotT * rotT * (3 - 2 * rotT);
      const theta = smoothRot * (Math.PI / 2);

      const targetBackX = px + slideOut;
      const targetBackZ = pz;

      groups.sideRight.rotation.y = theta;
      groups.sideRight.position.set(
        targetBackX - (px * Math.cos(theta) + pz * Math.sin(theta)),
        0,
        targetBackZ - (-px * Math.sin(theta) + pz * Math.cos(theta))
      );
    }

    // Déplacement du plateau plantes à roulettes selon X (jusqu'à ±2800 mm hors de la serre)
    groups.trolley.position.x = trolleyOffsetX;

    // Vue éclatée (0..1)
    partMeshes.forEach((m) => {
      if (!m.userData.basePosition) return;
      if (
        m === blackCylMesh ||
        m === rodMesh ||
        m === padMesh ||
        (m.userData?.partId === 'Q03' && m !== m.userData?.rootMesh && m.parent !== groups.hardware && m.parent !== groups.sideLeft && m.parent !== groups.sideRight)
      ) {
        return;
      }
      const base = m.userData.basePosition;
      const exp = m.userData.explodeVecThree;
      m.position.set(
        base.x + exp.x * explodeFactor,
        base.y + exp.y * explodeFactor,
        base.z + exp.z * explodeFactor
      );
    });
  }

  // Initialiser la position des bras du vérin dès le démarrage
  updateKinematics({});

  return {
    rootGroup,
    groups,
    solidMeshes,
    partMeshes,
    updateKinematics
  };
}

/**
 * Construit un plateau à roulettes avec plantes (volumes fermés inclus dans Stencil pour coupe pleine)
 */
function buildPlantTrolleyDemo(trolleyGroup, materials, solidMeshes) {
  // Plateau bois 1500 × 380 × 22 mm sur 4 roulettes
  const deckGeom = new THREE.BoxGeometry(1500, 22, 380);
  const deckMesh = new THREE.Mesh(deckGeom, materials.trolley_wood);
  deckMesh.position.copy(cadToThree(0, 0, 65));
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  trolleyGroup.add(deckMesh);
  solidMeshes.push(deckMesh);

  // 4 Roulettes
  const wheelGeom = new THREE.CylinderGeometry(24, 24, 18, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const wheelPositions = [
    [-650, -140],
    [-650, 140],
    [650, -140],
    [650, 140]
  ];
  wheelPositions.forEach(([wx, wy]) => {
    const w = new THREE.Mesh(wheelGeom, materials.metal_dark);
    w.position.copy(cadToThree(wx, wy, 24));
    trolleyGroup.add(w);
    solidMeshes.push(w);
  });

  // 4 Pots en terre cuite + plantes stylisées (sans chevauchement pour coupe Stencil nette)
  const potXs = [-520, -180, 180, 520];
  potXs.forEach((px, i) => {
    const potGeom = new THREE.CylinderGeometry(85, 62, 160, 18);
    const potMesh = new THREE.Mesh(potGeom, materials.terracotta);
    potMesh.position.copy(cadToThree(px, 0, 156));
    potMesh.castShadow = true;
    trolleyGroup.add(potMesh);
    solidMeshes.push(potMesh);

    const plantHeight = 220 + (i % 2) * 70;
    const foliageGeom = new THREE.DodecahedronGeometry(88, 1);
    foliageGeom.scale(0.9, plantHeight / 176, 0.9);
    const foliageMesh = new THREE.Mesh(foliageGeom, materials.plant_foliage);
    foliageMesh.position.copy(cadToThree(px, 0, 238 + plantHeight / 2));
    foliageMesh.castShadow = true;
    trolleyGroup.add(foliageMesh);
    solidMeshes.push(foliageMesh);
  });

  // Marquer tous les éléments du plateau à roulettes comme manipulables en 3D
  trolleyGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData = {
        subGroup: 'trolley',
        isTrolley: true,
        name: 'Plateau Plantes à Roulettes'
      };
    }
  });
}
