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
function createExtrudedBoardGeometry(length, width, thickness, holes = [], isLite = false) {
  const shape = new THREE.Shape();
  const hw = length / 2;
  const hh = width / 2;

  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  if (holes && holes.length > 0) {
    holes.forEach((h) => {
      const holePath = new THREE.Path();
      const hx = -hw + h.x;
      const hy = -hh + h.y;
      holePath.absarc(hx, hy, h.d / 2, 0, Math.PI * 2, false);
      shape.holes.push(holePath);
    });
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: isLite ? 8 : 14
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
 * Crée une traverse inclinée (P12 / P13) avec coupes d'extrémité verticales (coupes d'aplomb)
 * plaquées parfaitement sans jeu ni collision contre les faces internes verticales des montants.
 */
function createSlopedBraceGeometry(spanY, perpHeight, widthX, zTopAtMinY, zTopAtMaxY) {
  const shape = new THREE.Shape();
  const hy = spanY / 2;
  const slopeRad = Math.atan2(zTopAtMaxY - zTopAtMinY, spanY);
  const vertH = perpHeight / Math.cos(slopeRad);

  // Profil 2D dans le plan (Y_cad, Z_cad) : faces extrêmes 100% verticales en Y = -hy et Y = +hy
  shape.moveTo(-hy, zTopAtMinY - vertH);
  shape.lineTo(hy, zTopAtMaxY - vertH);
  shape.lineTo(hy, zTopAtMaxY);
  shape.lineTo(-hy, zTopAtMinY);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: widthX,
    bevelEnabled: false
  });

  // Réaligner vers Three.js : x = X_cad (-widthX/2..+widthX/2), y = Z_cad, z = -Y_cad
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const sy = pos.getX(i); // Y_cad (-hy .. +hy)
    const sz = pos.getY(i); // Z_cad
    const sx = pos.getZ(i) - widthX / 2; // X_cad (-widthX/2 .. +widthX/2)
    pos.setXYZ(i, sx, sz, -sy);
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Crée la 8ème lame supérieure de pignon (P06) coupée en pente de 145 mm (arrière) à 0 mm (avant)
 */
function createSlopedGableBoardGeometry(lengthY, maxHeightZ, thicknessX, holes = [], isLite = false) {
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

  if (holes && holes.length > 0) {
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
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thicknessX,
    bevelEnabled: false,
    curveSegments: isLite ? 8 : 12
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
  isLite = false,
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
export function buildSerreAssembly(materials, isLite = false) {
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
  const geomP01 = createExtrudedBoardGeometry(1900, 145, 27, PARTS_CATALOG.P01.holes, isLite);
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
      isLite,
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
      isLite,
      solidMeshes,
      partMeshes
    });
    mesh.position.copy(cadToThree(xCad, 200.5, 0));
    mesh.userData.basePosition.copy(mesh.position);
    groups.backWall.add(mesh);
  });

  // Unique Traverse Haute Centrale P12 (370 × 70 × 45 mm à X=0) reliant P04 #2 (Avant, Y=-178) et P02 #2 (Arrière, Y=+178)
  // Coupes d'aplomb verticales aux 2 extrémités (sans collision dans P04/P02) et plaquée sous les traverses P11 (Z_top = 1038 -> 1144.8 mm)
  const geomP12 = createSlopedBraceGeometry(356, 70, 45, 1038, 1144.8);

  const meshP12 = buildPartMesh({
    geometry: geomP12,
    material: materials.wood_post,
    edgeMaterial: materials.edge_line,
    partId: 'P12',
    instanceId: 'P12 #1 (Portique Central X=0)',
    subGroup: 'backWall',
    explodeVecCad: { x: 0, y: 0, z: 150 },
    isLite,
    solidMeshes,
    partMeshes
  });
  meshP12.position.copy(cadToThree(0, 0, 0));
  meshP12.userData.basePosition.copy(meshP12.position);
  groups.backWall.add(meshP12);

  // ==========================================================================
  // 2. FAÇADE AVANT : 4 Lames basses P03 (R1-R4) + Fenêtre Poly P09 (R5-R6) + 1 Lame haute P03 #5 (R7) + 3 Montants P04
  // ==========================================================================
  const geomP03 = createExtrudedBoardGeometry(1900, 145, 27, PARTS_CATALOG.P03.holes, isLite);
  const frontSlatRows = [0, 1, 2, 3, 6]; // Rangs 1 à 4 en bas (Z=0..595) + Rang 7 tout en haut (Z=900..1045, bandeau support charnières)
  frontSlatRows.forEach((rowIdx, idx) => {
    const zBottom = rowIdx * 150;
    const zCenter = zBottom + 145 / 2;
    const yCenter = -250 + 27 / 2; // Y_cad = -236.5 mm

    const mesh = buildPartMesh({
      geometry: geomP03,
      material: materials.wood_deck,
      edgeMaterial: materials.edge_line,
      partId: 'P03',
      instanceId: `P03 #${idx + 1} (Rang ${rowIdx + 1})`,
      subGroup: 'frontWall',
      explodeVecCad: { x: 0, y: -260 - idx * 12, z: (rowIdx - 2.5) * 18 },
      isLite,
      solidMeshes,
      partMeshes
    });
    mesh.position.copy(cadToThree(0, yCenter, zCenter));
    mesh.userData.basePosition.copy(mesh.position);
    groups.frontWall.add(mesh);
  });

  // Fenêtre Polycarbonate Avant P09 (1900 × 300 × 10 mm, encadrée entre Rang 4 Z=595 et Rang 7 Z=900, Y=-228)
  const geomP09 = createExtrudedBoardGeometry(1900, 300, 10, PARTS_CATALOG.P09.holes, isLite);
  const meshP09 = buildPartMesh({
    geometry: geomP09,
    material: materials.polycarbonate,
    edgeMaterial: materials.edge_poly,
    partId: 'P09',
    instanceId: 'P09 #1 (Fenêtre Avant Rangs 5-6)',
    subGroup: 'frontWall',
    explodeVecCad: { x: 0, y: -340, z: 40 },
    registerSolid: false,
    isLite,
    solidMeshes,
    partMeshes
  });
  meshP09.position.copy(cadToThree(0, -228, 597.5 + 150));
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
      isLite,
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
  const geomP05 = createExtrudedBoardGeometry(496, 145, 27, PARTS_CATALOG.P05.holes, isLite);
  // Pour les lames de côté P05, leur longueur (496) est orientée selon Y_cad (three.z)
  // et leur épaisseur (27) selon X_cad (three.x) -> rotation Y de 90° sur la géométrie
  geomP05.rotateY(Math.PI / 2);

  const geomP06 = createSlopedGableBoardGeometry(496, 145, 27, PARTS_CATALOG.P06.holes, isLite);
  // Montants de côtés amovibles P07 (1155 mm) et P08 (1030 mm) — Coupe droite à 90°
  const geomP07 = createBeveledPostGeometry(45, 70, 1155, 1155);
  const geomP08 = createBeveledPostGeometry(45, 70, 1030, 1030);

  // Traverse inclinée P13 (entraxe 306 mm, 70 × 45 mm) reliant affleurant le sommet de P08 (Y=-153, Z=1030) au sommet de P07 (Y=+153, Z=1155)
  const geomP13 = createSlopedBraceGeometry(306, 70, 45, 1030, 1155);

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
        isLite,
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
      isLite,
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
      isLite,
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
      isLite,
      solidMeshes,
      partMeshes
    });
    meshP08.position.copy(cadToThree(sc.postX, -188, 0));
    meshP08.userData.basePosition.copy(meshP08.position);
    sc.group.add(meshP08);

    // Traverse inclinée P13 entre les sommets de P08 (Y=-153, Z=1030) et P07 (Y=+153, Z=1155) pour tenir P06
    const meshP13 = buildPartMesh({
      geometry: geomP13,
      material: materials.wood_post,
      edgeMaterial: materials.edge_line,
      partId: 'P13',
      instanceId: `P13 #${sIdx + 1} (Support P06 ${sIdx === 0 ? 'Gauche' : 'Droit'})`,
      subGroup: sc.key,
      explodeVecCad: { x: sc.dirX * 260, y: 0, z: 80 },
      isLite,
      solidMeshes,
      partMeshes
    });
    meshP13.position.copy(cadToThree(sc.postX, 0, 0));
    meshP13.userData.basePosition.copy(meshP13.position);
    sc.group.add(meshP13);
  });

  // ==========================================================================
  // 4. TOIT OUVRANT PAR LE HAUT (roofPivot) :
  // Axe des 3 charnières Q01 sur l'arête supérieure avant de la 5ème lame P03 #5 (Y_cad = -248 mm, Z_cad = 1046.5 mm)
  // Charnon fixe vissé à plat verticalement sur la face avant haute de P03 #5 (Rang 7, Z = 1015..1045 mm)
  // Charnon mobile incliné à 16.7° boulonné sous la plaque de toit P10
  // ==========================================================================
  const HINGE_Y_CAD = -248;
  const HINGE_Z_CAD = 1046.5;
  const frontHingePivotThree = cadToThree(0, HINGE_Y_CAD, HINGE_Z_CAD);
  groups.roofPivot.position.copy(frontHingePivotThree);

  // Groupe interne incliné de base à +16.7° (monte de l'avant vers l'arrière)
  const roofSlopeGroup = new THREE.Group();
  roofSlopeGroup.rotation.x = ROOF_SLOPE_RAD;
  groups.roofPivot.add(roofSlopeGroup);

  // Plaque Polycarbonate de Toit P10 (2000 × 660 × 10 mm, sous-face à y_loc = +3.5 mm)
  const geomP10 = createExtrudedBoardGeometry(2000, 660, 10, PARTS_CATALOG.P10.holes, isLite);
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
    isLite,
    solidMeshes,
    partMeshes
  });
  meshP10.position.set(0, 8.5, -271);
  meshP10.userData.basePosition.copy(meshP10.position);
  roofSlopeGroup.add(meshP10);

  // 2 Lattes Raidisseurs Sous-Toit P11 (890 × 68 × 27 mm, plaquées sous P10 de y_loc = -23.5 à +3.5 mm)
  const geomP11 = createExtrudedBoardGeometry(890, 68, 27, PARTS_CATALOG.P11.holes, isLite);
  geomP11.rotateX(-Math.PI / 2);

  const slatPositions = [
    { label: 'P11 #1 (Traverse Sous-Toit Avant)', zRamp: -111 },
    { label: 'P11 #2 (Traverse Sous-Toit Arrière Vérin)', zRamp: -431 }
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
      isLite,
      solidMeshes,
      partMeshes
    });
    meshP11.position.set(0, -10, sp.zRamp);
    meshP11.userData.basePosition.copy(meshP11.position);
    roofSlopeGroup.add(meshP11);
  });

  // ==========================================================================
  // 5. QUINCAILLERIE : 3 Charnières articulées Q01 (80×60 mm) + Vérin Q02 + 8 × Hettich Q03
  // ==========================================================================
  // Charnon unitaire 80 × 30 × 3.5 mm avec ses 2 perçages Ø 5 mm (x = 20 et 60 mm, y = 15 mm)
  const leafHoles = [
    { x: 20, y: 15, d: 5 },
    { x: 60, y: 15, d: 5 }
  ];
  const geomQ01FixedLeaf = createExtrudedBoardGeometry(80, 30, 3.5, leafHoles, isLite);
  // Plaqué verticalement contre la face avant extérieure de la lame haute P03 #5 (Y_cad = -250 mm, Z_cad = 1015..1045 mm)
  geomQ01FixedLeaf.translate(0, -16.5, 3.75);

  const geomQ01MovingLeaf = createExtrudedBoardGeometry(80, 30, 3.5, leafHoles, isLite);
  geomQ01MovingLeaf.rotateX(-Math.PI / 2);
  // Plaqué sous la face inférieure de P10 (dy_rot = 0..+3.5 mm, dz_rot = 0..-30 mm le long du rampant)
  geomQ01MovingLeaf.translate(0, 1.75, -15);

  const hingeMeshes = [];
  backPostX.forEach((xCad, idx) => {
    const posLabel = idx === 0 ? 'Gauche' : idx === 1 ? 'Centre' : 'Droite';
    const meshQ01 = buildPartMesh({
      geometry: geomQ01FixedLeaf,
      material: materials.metal_galva,
      edgeMaterial: materials.edge_line,
      partId: 'Q01',
      instanceId: `Q01 #${idx + 1} (Charnière Avant ${posLabel} X=${xCad})`,
      subGroup: 'hardware',
      explodeVecCad: { x: 0, y: -140, z: 120 },
      isLite,
      solidMeshes,
      partMeshes
    });
    meshQ01.position.copy(cadToThree(xCad, HINGE_Y_CAD, HINGE_Z_CAD));
    meshQ01.userData.basePosition.copy(meshQ01.position);
    meshQ01.userData.xCad = xCad;

    // Groupe du charnon supérieur mobile articulé exactement sur l'axe du gond (0, 0, 0)
    const movingLeafPivot = new THREE.Group();
    movingLeafPivot.rotation.x = ROOF_SLOPE_RAD;
    meshQ01.add(movingLeafPivot);
    meshQ01.userData.movingLeafPivot = movingLeafPivot;

    const movingLeafMesh = new THREE.Mesh(geomQ01MovingLeaf, materials.metal_galva);
    movingLeafMesh.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(geomQ01MovingLeaf, 25), materials.edge_line)
    );
    movingLeafPivot.add(movingLeafMesh);

    const subQ01Meshes = [movingLeafMesh];
    const cylSegs = isLite ? 10 : 16;

    // Axe inox central Ø 4.8 × 82 mm + 5 charnons cylindriques imbriqués (3 fixes + 2 mobiles) + 4 têtes de vis
    const pinGeom = new THREE.CylinderGeometry(2.4, 2.4, 83, cylSegs);
    pinGeom.rotateZ(Math.PI / 2);
    const pinMesh = new THREE.Mesh(pinGeom, materials.metal_dark);
    meshQ01.add(pinMesh);
    subQ01Meshes.push(pinMesh);

    const knuckleSegGeom = new THREE.CylinderGeometry(4, 4, 15.4, cylSegs);
    knuckleSegGeom.rotateZ(Math.PI / 2);

    // 3 charnons cylindriques solidaires du charnon fixe (x = -32, 0, +32 mm)
    [-32, 0, 32].forEach((kx) => {
      const kMesh = new THREE.Mesh(knuckleSegGeom, materials.metal_galva);
      kMesh.position.set(kx, 0, 0);
      kMesh.add(
        new THREE.LineSegments(new THREE.EdgesGeometry(knuckleSegGeom, 25), materials.edge_line)
      );
      meshQ01.add(kMesh);
      subQ01Meshes.push(kMesh);
    });

    // 2 charnons cylindriques solidaires du charnon mobile (x = -16, +16 mm)
    [-16, 16].forEach((kx) => {
      const kMesh = new THREE.Mesh(knuckleSegGeom, materials.metal_galva);
      kMesh.position.set(kx, 0, 0);
      kMesh.add(
        new THREE.LineSegments(new THREE.EdgesGeometry(knuckleSegGeom, 25), materials.edge_line)
      );
      movingLeafPivot.add(kMesh);
      subQ01Meshes.push(kMesh);
    });

    // Têtes de vis inox sur le charnon fixe (vissées horizontalement dans la face avant de P03 #5 + P04)
    // et boulons/rondelles d'étanchéité traversant le toit P10 sur le charnon mobile
    const screwHeadGeom = new THREE.CylinderGeometry(4.2, 2.5, 1.8, isLite ? 8 : 12);
    const roofBoltCapGeom = new THREE.CylinderGeometry(5.5, 5.5, 2.2, isLite ? 8 : 14);
    [-20, 20].forEach((sx) => {
      const fixedScrew = new THREE.Mesh(screwHeadGeom, materials.metal_dark);
      fixedScrew.rotation.x = Math.PI / 2;
      fixedScrew.position.set(sx, -16.5, 5.8);
      meshQ01.add(fixedScrew);

      const movingScrew = new THREE.Mesh(screwHeadGeom, materials.metal_dark);
      movingScrew.rotation.x = Math.PI;
      movingScrew.position.set(sx, -0.4, -15);
      movingLeafPivot.add(movingScrew);

      const topWasherCap = new THREE.Mesh(roofBoltCapGeom, materials.metal_dark);
      topWasherCap.position.set(sx, 14.5, -15);
      movingLeafPivot.add(topWasherCap);

      subQ01Meshes.push(fixedScrew, movingScrew, topWasherCap);
    });

    subQ01Meshes.forEach((subM) => {
      subM.userData = meshQ01.userData;
      partMeshes.push(subM);
      solidMeshes.push(subM);
    });

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
  const geomQ02Bracket = createExtrudedBoardGeometry(
    45,
    45,
    30,
    [
      { x: 12, y: 22.5, d: 5 },
      { x: 33, y: 22.5, d: 5 }
    ],
    isLite
  );
  const meshQ02 = buildPartMesh({
    geometry: geomQ02Bracket,
    material: materials.metal_galva,
    edgeMaterial: materials.edge_line,
    partId: 'Q02',
    instanceId: 'Q02 #1 (Cylindre Thermique Seul - Poussée Directe)',
    subGroup: 'hardware',
    explodeVecCad: { x: 0, y: 90, z: 120 },
    isLite,
    solidMeshes,
    partMeshes
  });
  groups.hardware.add(meshQ02);

  // Corps du cylindre thermostatique noir (175 mm vertical sous le support)
  const blackCylGeom = new THREE.CylinderGeometry(9.5, 9.5, L_CYL, isLite ? 8 : 20);
  const blackCylMesh = new THREE.Mesh(blackCylGeom, materials.metal_dark);
  if (!isLite) {
    blackCylMesh.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(blackCylGeom, 25), materials.edge_line)
    );
  }
  // Le haut du cylindre noir traverse l'équerre (à +12 mm), le bas descend à -163 mm
  blackCylMesh.position.set(0, -L_CYL / 2 + 12, 0);
  meshQ02.add(blackCylMesh);

  // Tige de piston argentée (Ø 8 mm) qui sort verticalement vers le haut + patin d'appui libre
  const pistonGroup = new THREE.Group();
  const rodMaxLen = 110;
  const rodGeom = new THREE.CylinderGeometry(4, 4, rodMaxLen, isLite ? 8 : 16);
  // Quand pistonGroup.position.y = sortie (0..90 mm), le haut de la tige pousse le toit
  rodGeom.translate(0, -rodMaxLen / 2, 0);
  const rodMesh = new THREE.Mesh(rodGeom, materials.metal_galva);
  pistonGroup.add(rodMesh);

  // Embout / patin caoutchouc d'appui libre en sommet de tige (le toit se pose dessus sans être vissé)
  const padGeom = new THREE.CylinderGeometry(13, 10, 8, isLite ? 8 : 18);
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
  const geomCatchPlate = createExtrudedBoardGeometry(
    36,
    15,
    2,
    [
      { x: 8.25, y: 7.5, d: 4 },
      { x: 28.25, y: 7.5, d: 4 }
    ],
    isLite
  );
  // Orienter la longueur (36 mm) selon Z_three (Y_cad) et l'épaisseur (2 mm) selon X_three (X_cad)
  geomCatchPlate.rotateY(Math.PI / 2);

  const latchConfigs = [
    // Côté Gauche (4 fermetures Hettich : 2 Avant sur rangs 2 et 7, 2 Arrière sur rangs 2 et 7)
    { side: 'left', dirX: -1, face: 'front', zCad: 222.5, label: 'Q03 #1 (Avant-Gauche Rang 2)' },
    { side: 'left', dirX: -1, face: 'front', zCad: 972.5, label: 'Q03 #2 (Avant-Gauche Rang 7)' },
    { side: 'left', dirX: -1, face: 'back', zCad: 222.5, label: 'Q03 #3 (Arrière-Gauche Rang 2)' },
    { side: 'left', dirX: -1, face: 'back', zCad: 972.5, label: 'Q03 #4 (Arrière-Gauche Rang 7)' },
    // Côté Droit (4 fermetures Hettich : 2 Avant sur rangs 2 et 7, 2 Arrière sur rangs 2 et 7)
    { side: 'right', dirX: 1, face: 'front', zCad: 222.5, label: 'Q03 #5 (Avant-Droit Rang 2)' },
    { side: 'right', dirX: 1, face: 'front', zCad: 972.5, label: 'Q03 #6 (Avant-Droit Rang 7)' },
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
      isLite,
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

    // Axe d'articulation de la boucle (étrier) décalé côté levier (-dirX * 5, outZ * 1.5)
    // pour un vrai effet genouillère : à l'ouverture, l'axe avance vers +outZ (loin du bois !)
    const bailPivot = new THREE.Group();
    bailPivot.position.set(-lc.dirX * 5, 0, outZ * 1.5);
    leverPivot.add(bailPivot);

    const bailLen = 34; // Franchit la distance entre bailPivot (X=±942) et le bec de gâche (X=±976)

    // Corps plat du levier (36 × 13 × 2.5 mm)
    const leverBodyGeom = new THREE.BoxGeometry(36, 13, 2.5);
    leverBodyGeom.translate(-lc.dirX * 14, 0, outZ * 2);
    const leverMesh = new THREE.Mesh(leverBodyGeom, materials.metal_galva);
    leverMesh.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(leverBodyGeom, 25), materials.edge_line)
    );
    leverPivot.add(leverMesh);

    // Palette de pouce relevée au bout du levier (portant la longueur à 49 mm)
    const thumbTabGeom = new THREE.BoxGeometry(11, 13, 2.5);
    thumbTabGeom.rotateY(-lc.dirX * outZ * 0.38);
    thumbTabGeom.translate(-lc.dirX * 36, 0, outZ * 4.2);
    const thumbTabMesh = new THREE.Mesh(thumbTabGeom, materials.metal_galva);
    thumbTabMesh.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(thumbTabGeom, 25), materials.edge_line)
    );
    leverPivot.add(thumbTabMesh);

    // Étrier en fil d'acier rond Ø 3 mm (largeur 23 mm) :
    // Part de bailPivot (|X|=942, |Z|=257.5) jusqu'au bec de gâche (|X|=976, |Z|=252.5),
    // donc 9.5 mm devant le bois P05 (|Z|<=248) sans aucune collision !
    const bailHalfW = 10;
    const wireRad = 1.5;
    const wireSegs = isLite ? 8 : 12;

    const wireTopGeom = new THREE.CylinderGeometry(wireRad, wireRad, bailLen, wireSegs);
    wireTopGeom.rotateZ(Math.PI / 2);
    wireTopGeom.translate((lc.dirX * bailLen) / 2, bailHalfW, 0);

    const wireBotGeom = new THREE.CylinderGeometry(wireRad, wireRad, bailLen, wireSegs);
    wireBotGeom.rotateZ(Math.PI / 2);
    wireBotGeom.translate((lc.dirX * bailLen) / 2, -bailHalfW, 0);

    const wireFrontGeom = new THREE.CylinderGeometry(wireRad, wireRad, bailHalfW * 2 + 2, wireSegs);
    wireFrontGeom.translate(lc.dirX * bailLen, 0, -outZ * 3.5);

    const wireBackTopGeom = new THREE.CylinderGeometry(wireRad, wireRad, 4.5, wireSegs);
    wireBackTopGeom.translate(0, bailHalfW - 2, 0);
    const wireBackBotGeom = new THREE.CylinderGeometry(wireRad, wireRad, 4.5, wireSegs);
    wireBackBotGeom.translate(0, -bailHalfW + 2, 0);

    const wireTopMesh = new THREE.Mesh(wireTopGeom, materials.metal_galva);
    const wireBotMesh = new THREE.Mesh(wireBotGeom, materials.metal_galva);
    const wireFrontMesh = new THREE.Mesh(wireFrontGeom, materials.metal_galva);
    const wireBackTopMesh = new THREE.Mesh(wireBackTopGeom, materials.metal_galva);
    const wireBackBotMesh = new THREE.Mesh(wireBackBotGeom, materials.metal_galva);
    bailPivot.add(wireTopMesh, wireBotMesh, wireFrontMesh, wireBackTopMesh, wireBackBotMesh);

    [
      leverMesh,
      thumbTabMesh,
      wireTopMesh,
      wireBotMesh,
      wireFrontMesh,
      wireBackTopMesh,
      wireBackBotMesh
    ].forEach((m) => {
      m.userData = meshQ03.userData;
      partMeshes.push(m);
      solidMeshes.push(m);
    });

    groups.hardware.add(meshQ03);

    // 2. Gâche plate (36 × 15 × 2 mm, 2 trous Ø 4 mm espacés de 20 mm) vissée à 90°
    //    sur la FACE EXTÉRIEURE du Côté Amovible P05 (X_cad = ±978 mm, Y_cad de ±212 à ±248 mm)
    const catchBaseMesh = new THREE.Mesh(geomCatchPlate, materials.metal_galva);
    catchBaseMesh.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(geomCatchPlate, 25), materials.edge_line)
    );

    // Bec recourbé à 90° au bout de la gâche (à l'arête d'angle X=±977, Y=±250 mm) qui retient le fil Ø 3 mm de l'étrier
    const hookLipGeom = new THREE.BoxGeometry(5, 15, 6);
    hookLipGeom.rotateY(lc.dirX * outZ * 0.45);
    hookLipGeom.translate(-lc.dirX * 1.5, 0, outZ * 19.5);
    const catchHookMesh = new THREE.Mesh(hookLipGeom, materials.metal_galva);
    catchHookMesh.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(hookLipGeom, 25), materials.edge_line)
    );

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
  buildPlantTrolleyDemo(groups.trolley, materials, solidMeshes, isLite);

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

    // Pivot du toit sur l'axe exact des 3 charnières AVANT (Y=-248, Z=1046.5) -> le HAUT (arrière) se soulève jusqu'à la verticale
    const hingeOrigin = cadToThree(0, HINGE_Y_CAD, HINGE_Z_CAD);
    groups.roofPivot.position.copy(hingeOrigin);
    roofSlopeGroup.rotation.x = ROOF_SLOPE_RAD;
    meshP10.userData.basePosition.set(0, 8.5, -271);
    roofSlopeGroup.children[1].userData.basePosition.set(0, -10, -111);
    roofSlopeGroup.children[2].userData.basePosition.set(0, -10, -431);

    groups.roofPivot.rotation.x = openRad;

    // Articulation synchronisée des 3 charnières Q01 :
    // - Le charnon inférieur reste fixe verticalement sur le haut de la lame P03 #5 (Rang 7, Z=1015..1045 mm)
    // - Le charnon supérieur pivote autour du gond (Y=-248, Z=1046.5) exactement avec le toit (ROOF_SLOPE_RAD + openRad)
    hingeMeshes.forEach((hm) => {
      hm.userData.basePosition.copy(cadToThree(hm.userData.xCad, HINGE_Y_CAD, HINGE_Z_CAD));
      if (hm.userData.movingLeafPivot) {
        hm.userData.movingLeafPivot.rotation.x = ROOF_SLOPE_RAD + openRad;
      }
    });

    // Support du cylindre fixé contre le flanc du montant central arrière P02 #2 (X=+58, Y_cad=+165, Z_cad=1122)
    // Décalé à X=+58 mm pour ne pas gêner la traverse centrale P12 (X=-22.5..+22.5 mm)
    const bracketZCad = 1122;
    meshQ02.userData.basePosition.copy(cadToThree(58, 165, bracketZCad));

    // Hauteur de la sous-face de la traverse P11 #2 (y_loc = -23.5 mm) à l'aplomb du piston (dist = 431 mm de l'axe charnière)
    const distFromHinge = 431;
    const totalSlopeRad = ROOF_SLOPE_RAD + ventRad;
    const roofUndersideY =
      hingeOrigin.y +
      distFromHinge * Math.sin(totalSlopeRad) -
      23.5 * Math.cos(totalSlopeRad);

    // Le patin du piston monte exactement jusqu'à toucher la sous-face de la traverse pour ventRad
    const tipLocalY = Math.max(14, roofUndersideY - bracketZCad - 8);
    pistonGroup.position.set(0, tipLocalY, 0);

    // Décalage latéral des 2 côtés amovibles (0..250 mm : extraction, 250..600 mm : rotation à 90° dans le plan arrière contre le mur)
    const leftShift = leftSideOffsetMm !== null ? leftSideOffsetMm : sidesOffsetMm;
    const rightShift = rightSideOffsetMm !== null ? rightSideOffsetMm : sidesOffsetMm;

    // Animer l'ouverture en 2 temps des 8 fermetures Hettich Q03 (zéro collision avec le bois P05) :
    // 1. shift = 0..16 mm : Le levier s'ouvre et la boucle s'écarte vers l'AVANT/ARRIÈRE (+outZ, loin du bois) pour franchir le bec de gâche
    // 2. shift = 16..34 mm : La boucle bascule à ~135° vers la façade fixe (|X| < 948 mm) hors du couloir du panneau mobile
    toggleLatches.forEach(({ lc, outZ, leverPivot, bailPivot }) => {
      const shift = lc.side === 'left' ? leftShift : rightShift;
      const u1 = Math.min(1, Math.max(0, shift / 16));
      const u2 = Math.min(1, Math.max(0, (shift - 16) / 18));

      // Angle d'ouverture du levier (0 -> 95°)
      const thetaLever = (u1 * 1.15 + u2 * 0.5);
      // Angle monde de la boucle vers l'extérieur (+outZ) : 0 -> 45° (décrochage) -> 135° (repli côté façade fixe)
      const betaWorld = u1 * 0.78 + u2 * 1.57;

      leverPivot.rotation.y = lc.dirX * outZ * thetaLever;
      // Comme bailPivot est enfant de leverPivot, on retranche thetaLever + betaWorld pour tourner la boucle vers +outZ (loin du bois !)
      bailPivot.rotation.y = -lc.dirX * outZ * (thetaLever + betaWorld);
    });

    // Le panneau amovible P05 commence à glisser (shift > 20 mm) uniquement une fois la boucle Q03 décrochée et dégagée !
    const UNLOCK_CLEAR_MM = 20;

    // Côté Gauche : coin arrière local (-963.5, 0, -236.5) -> pivote de 0° à -90° pour s'aligner avec le mur arrière
    {
      const px = -963.5;
      const pz = -236.5;
      const effLeft = Math.max(0, leftShift - UNLOCK_CLEAR_MM);
      const slideOut = Math.min(effLeft, 250) + Math.max(0, effLeft - 250) * 0.15;
      const rotT = Math.min(1, Math.max(0, (effLeft - 250) / 330));
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
      const effRight = Math.max(0, rightShift - UNLOCK_CLEAR_MM);
      const slideOut = Math.min(effRight, 250) + Math.max(0, effRight - 250) * 0.15;
      const rotT = Math.min(1, Math.max(0, (effRight - 250) / 330));
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
        (m.userData?.partId === 'Q01' && m.parent !== groups.hardware) ||
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
function buildPlantTrolleyDemo(trolleyGroup, materials, solidMeshes, isLite = false) {
  // Plateau bois 1500 × 380 × 22 mm sur 4 roulettes
  const deckGeom = new THREE.BoxGeometry(1500, 22, 380);
  const deckMesh = new THREE.Mesh(deckGeom, materials.trolley_wood);
  deckMesh.position.copy(cadToThree(0, 0, 65));
  deckMesh.castShadow = !isLite;
  deckMesh.receiveShadow = !isLite;
  trolleyGroup.add(deckMesh);
  solidMeshes.push(deckMesh);

  // 4 Roulettes
  const wheelGeom = new THREE.CylinderGeometry(24, 24, 18, isLite ? 8 : 16);
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
    const potGeom = new THREE.CylinderGeometry(85, 62, 160, isLite ? 8 : 18);
    const potMesh = new THREE.Mesh(potGeom, materials.terracotta);
    potMesh.position.copy(cadToThree(px, 0, 156));
    potMesh.castShadow = !isLite;
    trolleyGroup.add(potMesh);
    solidMeshes.push(potMesh);

    const plantHeight = 220 + (i % 2) * 70;
    const foliageGeom = new THREE.DodecahedronGeometry(88, isLite ? 0 : 1);
    foliageGeom.scale(0.9, plantHeight / 176, 0.9);
    const foliageMesh = new THREE.Mesh(foliageGeom, materials.plant_foliage);
    foliageMesh.position.copy(cadToThree(px, 0, 238 + plantHeight / 2));
    foliageMesh.castShadow = !isLite;
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
