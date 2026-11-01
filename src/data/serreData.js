// ============================================================================
// DONNÉES COMPLÈTES DU PROJET : SERRE BOIS & POLYCARBONATE (1900 × 500 mm)
// Repère Métier : X = Largeur (1900), Y = Profondeur (500), Z = Hauteur (1195)
// ============================================================================

export const ROOF_SLOPE_DEG = 16.7; // arctan(150 / 500) = 16.699°
export const ROOF_SLOPE_RAD = (ROOF_SLOPE_DEG * Math.PI) / 180;
export const SAW_KERF = 4; // Trait de scie en mm

/**
 * Catalogue des pièces types (Nomenclature & Dessins 2D)
 */
export const PARTS_CATALOG = {
  P01: {
    partId: 'P01',
    name: 'Lame Horizontale Façade Arrière',
    category: 'Façade Arrière',
    group: 'backWall',
    materialType: 'wood_deck',
    stockSource: '8 × Lames de 190 cm déjà coupées en stock',
    stockStatus: 'in_stock',
    qty: 8,
    length: 1900,
    width: 145,
    thickness: 27,
    shapeType: 'rect_board',
    holes: [
      // 3 rangées de 2 vis (Montant G X=80, Montant C X=950, Montant D X=1820)
      { x: 80, y: 35, d: 5 },
      { x: 80, y: 110, d: 5 },
      { x: 950, y: 35, d: 5 },
      { x: 950, y: 110, d: 5 },
      { x: 1820, y: 35, d: 5 },
      { x: 1820, y: 110, d: 5 }
    ],
    notes: '✅ Déjà coupées (8 lames sur votre stock de 12 × 190 cm). Aucune recoupe nécessaire.'
  },

  P02: {
    partId: 'P02',
    name: 'Montant Vertical Arrière (Coupe Droite 90°)',
    category: 'Façade Arrière',
    group: 'backWall',
    materialType: 'wood_post',
    stockSource: '2 demi-lambourdes (~120,1 & 120,4 cm) + 1 lambourde entière (240 cm)',
    stockStatus: 'in_stock',
    qty: 3,
    length: 1180,
    width: 70,
    thickness: 45,
    shapeType: 'rect_board',
    holes: [
      { x: 72, y: 35, d: 5 },
      { x: 222, y: 35, d: 5 },
      { x: 372, y: 35, d: 5 },
      { x: 522, y: 35, d: 5 },
      { x: 672, y: 35, d: 5 },
      { x: 822, y: 35, d: 5 },
      { x: 972, y: 35, d: 5 },
      { x: 1122, y: 35, d: 5 }
    ],
    notes: 'P02 #1 et #2 : recouper vos 2 demi-lambourdes libres (120,1 et 120,4 cm) à 1180 mm • P02 #3 : couper 1180 mm dans votre lambourde entière (2400 mm).'
  },

  P03: {
    partId: 'P03',
    name: 'Lame Horizontale Façade Avant',
    category: 'Façade Avant',
    group: 'frontWall',
    materialType: 'wood_deck',
    stockSource: '4 × Lames de 190 cm déjà coupées + 1ère Lame entière 240 cm',
    stockStatus: 'in_stock',
    qty: 5,
    length: 1900,
    width: 145,
    thickness: 27,
    shapeType: 'rect_board',
    holes: [
      { x: 80, y: 35, d: 5 },
      { x: 80, y: 110, d: 5 },
      { x: 950, y: 35, d: 5 },
      { x: 950, y: 110, d: 5 },
      { x: 1820, y: 35, d: 5 },
      { x: 1820, y: 110, d: 5 }
    ],
    notes: '✅ P03 #1 à #4 déjà coupées (les 4 dernières de vos 12 × 190 cm) • 🪚 P03 #5 à couper (1900 mm) dans la 1ère lame entière de 2400 mm.'
  },

  P04: {
    partId: 'P04',
    name: 'Montant Vertical Avant (Coupe Droite 90°)',
    category: 'Façade Avant',
    group: 'frontWall',
    materialType: 'wood_post',
    stockSource: 'P04 #1 : chute Lambourde entière (1216 mm) • P04 #2 & #3 : Lambourde à racheter',
    stockStatus: 'to_buy',
    qty: 3,
    length: 1045,
    width: 70,
    thickness: 45,
    shapeType: 'rect_board',
    holes: [
      { x: 72, y: 35, d: 5 },
      { x: 222, y: 35, d: 5 },
      { x: 372, y: 35, d: 5 },
      { x: 522, y: 35, d: 5 },
      { x: 672, y: 35, d: 5 },
      { x: 785, y: 35, d: 5 },
      { x: 1005, y: 35, d: 5 }
    ],
    notes: '🪚 P04 #1 (1045 mm) pris dans le reste (1216 mm) de votre lambourde entière après P02 #3 • 🛒 P04 #2 et #3 (2 × 1045 mm) pris dans la 1ère lambourde à racheter.'
  },

  P05: {
    partId: 'P05',
    name: 'Lame Horizontale Côté Amovible',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_deck',
    stockSource: '12 lames déjà montées sur les 2 côtés (2×6 = 88,5 cm) + 2 à couper dans les 2 lames entières',
    stockStatus: 'in_stock',
    qty: 14,
    length: 496,
    width: 145,
    thickness: 27,
    shapeType: 'rect_board',
    holes: [
      { x: 60, y: 35, d: 5 },
      { x: 60, y: 110, d: 5 },
      { x: 436, y: 35, d: 5 },
      { x: 436, y: 110, d: 5 }
    ],
    notes: '✅ 6 lames par côté (88,5 cm de haut) sont DÉJÀ MONTÉES • 🪚 Il ne reste que 2 lames P05 (Rang 7 G et D, 496 mm) à couper dans vos 2 lames entières de 2400 mm.'
  },

  P06: {
    partId: 'P06',
    name: 'Lame Pignon Supérieure en Pente (Rang 8)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_deck',
    stockSource: '2ème Lame Terrasse entière (2400×145×27)',
    stockStatus: 'in_stock',
    qty: 2,
    length: 496,
    width: 145,
    minWidth: 0,
    thickness: 27,
    slopeDeg: 16.7,
    shapeType: 'gable_sloped',
    holes: [
      { x: 60, y: 35, d: 5 },
      { x: 60, y: 95, d: 5 },
      { x: 190, y: 52, d: 5 },
      { x: 330, y: 24, d: 5 }
    ],
    notes: '🪚 Découpés dans la 2ème lame entière (2400 mm) : un seul tronçon de 496 × 145 mm refendu en diagonale (16.7°, trait 517 mm) donne les 2 pignons P06 (#1 Gauche et #2 Droit tête-bêche).'
  },

  P07: {
    partId: 'P07',
    name: 'Montant Arrière de Côté Amovible (Coupe Droite 90°)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_post',
    stockSource: 'Lambourdes de 120,4 cm DÉJÀ MONTÉES à l’arrière des 2 côtés',
    stockStatus: 'in_stock',
    qty: 2,
    length: 1155,
    width: 70,
    thickness: 45,
    shapeType: 'rect_board',
    holes: [
      { x: 72, y: 35, d: 5 },
      { x: 222, y: 35, d: 5 },
      { x: 372, y: 35, d: 5 },
      { x: 522, y: 35, d: 5 },
      { x: 672, y: 35, d: 5 },
      { x: 822, y: 35, d: 5 },
      { x: 972, y: 35, d: 5 },
      { x: 1110, y: 35, d: 5 }
    ],
    notes: '✅ Déjà montés sur vos 2 côtés (actuellement ~1204 mm) • 🪚 Recouper simplement le haut de -49 mm en place pour les ramener à 1155 mm (sous la pente du toit).'
  },

  P08: {
    partId: 'P08',
    name: 'Montant Avant de Côté Amovible (Coupe Droite 90°)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_post',
    stockSource: 'Lambourdes de 120,4 cm DÉJÀ MONTÉES à l’avant des 2 côtés',
    stockStatus: 'in_stock',
    qty: 2,
    length: 1030,
    width: 70,
    thickness: 45,
    shapeType: 'rect_board',
    holes: [
      { x: 72, y: 35, d: 5 },
      { x: 222, y: 35, d: 5 },
      { x: 372, y: 35, d: 5 },
      { x: 522, y: 35, d: 5 },
      { x: 672, y: 35, d: 5 },
      { x: 822, y: 35, d: 5 },
      { x: 972, y: 35, d: 5 }
    ],
    notes: '✅ Déjà montés sur vos 2 côtés (actuellement ~1204 mm) • 🪚 Recouper simplement le haut de -174 mm en place pour les ramener à 1030 mm (juste au-dessus de la 7ème lame P05).'
  },

  P09: {
    partId: 'P09',
    name: 'Fenêtre Avant Polycarbonate (Rangs 6-7)',
    category: 'Vitrage Polycarbonate',
    group: 'frontWall',
    materialType: 'polycarbonate',
    stockSource: 'Plaque Polycarbonate 2000×980×10 (Chute)',
    stockStatus: 'in_stock',
    qty: 1,
    length: 1900,
    width: 300,
    thickness: 10,
    shapeType: 'rect_board',
    holes: [
      { x: 80, y: 40, d: 5 },
      { x: 80, y: 260, d: 5 },
      { x: 950, y: 40, d: 5 },
      { x: 950, y: 260, d: 5 },
      { x: 1820, y: 40, d: 5 },
      { x: 1820, y: 260, d: 5 }
    ],
    notes: 'Issu de la chute de 316 mm de la plaque de toit. Laisse entrer la lumière en façade.'
  },

  P10: {
    partId: 'P10',
    name: 'Toit Ouvrant Polycarbonate Alvéolaire',
    category: 'Toit Ouvrant',
    group: 'roof',
    materialType: 'polycarbonate',
    stockSource: 'Plaque Polycarbonate 2000×980×10',
    stockStatus: 'in_stock',
    qty: 1,
    length: 2000,
    width: 660,
    thickness: 10,
    shapeType: 'rect_board',
    holes: [
      { x: 110, y: 100, d: 5 },
      { x: 150, y: 100, d: 5 },
      { x: 980, y: 100, d: 5 },
      { x: 1020, y: 100, d: 5 },
      { x: 1850, y: 100, d: 5 },
      { x: 1890, y: 100, d: 5 }
    ],
    notes: 'Conserve la longueur 2000 mm (débords G/D de 23 mm) et 660 mm de rampant. 6 perçages Ø5 mm (Y=100 mm) alignés sur les 3 charnières Q01.'
  },

  P11: {
    partId: 'P11',
    name: 'Latte Raidisseur Sous-Toit (Support Charnières)',
    category: 'Toit Ouvrant',
    group: 'roof',
    materialType: 'wood_deck',
    stockSource: '2ème Lame Terrasse entière (tronçon 890×145×27 déligné en 2)',
    stockStatus: 'in_stock',
    qty: 2,
    length: 890,
    width: 68,
    thickness: 27,
    shapeType: 'rect_board',
    holes: [
      { x: 60, y: 34, d: 5 },
      { x: 445, y: 34, d: 5 },
      { x: 830, y: 34, d: 5 }
    ],
    notes: '🪚 Tirées d’un tronçon de 890 mm dans votre 2ème lame entière (2400 mm), déligné en 2 lattes de 68 mm.'
  },

  P12: {
    partId: 'P12',
    name: 'Traverse Haute Centrale Avant↔Arrière (Chevron)',
    category: 'Structure Portique (Haut)',
    group: 'backWall',
    materialType: 'wood_post',
    stockSource: '2ème Lambourde à racheter (70×45 mm)',
    stockStatus: 'to_buy',
    qty: 1,
    length: 370,
    width: 70,
    thickness: 45,
    slopeDeg: 16.7,
    shapeType: 'sloped_brace',
    holes: [
      { x: 25, y: 35, d: 5 },
      { x: 345, y: 35, d: 5 }
    ],
    notes: '🛒 Unique traverse centrale (X=0, entraxe horizontal 356 mm / longueur rampante 370 mm, coupes d’extrémité parallèles à 16.7°) reliant P04 #2 à P02 #2 sous le toit.'
  },

  P13: {
    partId: 'P13',
    name: 'Traverse Inclinée Support Pignon P06 (Côtés Amovibles)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_post',
    stockSource: '2ème Lambourde à racheter (70×45 mm)',
    stockStatus: 'to_buy',
    qty: 2,
    length: 320,
    width: 70,
    thickness: 45,
    slopeDeg: 16.7,
    shapeType: 'sloped_brace',
    holes: [
      { x: 30, y: 35, d: 5 },
      { x: 140, y: 35, d: 5 },
      { x: 280, y: 35, d: 5 }
    ],
    notes: '🛒 Relie les faces internes des montants P08 et P07 (entraxe horizontal 306 mm / longueur rampante 320 mm, coupes parallèles à 16.7°) sur chaque côté amovible pour soutenir la lame en biais P06.'
  },

  Q01: {
    partId: 'Q01',
    name: 'Charnière Inox de Toiture 80×60 mm',
    category: 'Quincaillerie',
    group: 'hardware',
    materialType: 'metal_galva',
    stockSource: 'Quincaillerie Atelier',
    stockStatus: 'in_stock',
    qty: 3,
    length: 80,
    width: 60,
    thickness: 4,
    shapeType: 'hinge_plate',
    holes: [
      { x: 20, y: 15, d: 5 },
      { x: 60, y: 15, d: 5 },
      { x: 20, y: 45, d: 5 },
      { x: 60, y: 45, d: 5 }
    ],
    notes: 'Charnon fixe (80×30 mm) vissé à plat sur le sommet des 3 montants AVANT P04 (Z=1045) • Gond Ø8 mm coaxial (Y=-223, Z=1050.5) • Charnon mobile (80×30 mm) boulonné sous le toit P10.'
  },

  Q02: {
    partId: 'Q02',
    name: 'Cylindre Vérin Thermique Seul TecTake (Poussée Directe)',
    category: 'Quincaillerie',
    group: 'hardware',
    materialType: 'metal_galva',
    stockSource: 'Cylindre dévissé du kit TecTake 402775 (Corps 175 mm)',
    stockStatus: 'in_stock',
    qty: 1,
    length: 175,
    width: 45,
    thickness: 45,
    shapeType: 'direct_cylinder',
    holes: [
      { x: 20, y: 22.5, d: 5 },
      { x: 40, y: 22.5, d: 5 }
    ],
    notes: 'Monté verticalement sans le compas : course directe ~90 mm (ouverture ~11° = 9,5 cm sur 1900 mm). Appui libre sous le toit.'
  },

  Q03: {
    partId: 'Q03',
    name: 'Fermeture de Caisse Hettich 49×13 mm + Étrier 23×23 + Gâche 15 mm (#58332504)',
    category: 'Quincaillerie',
    group: 'hardware',
    materialType: 'metal_galva',
    stockSource: 'Galaxus #58332504 — Hettich Kistenverschluss Acier galvanisé (×8)',
    stockStatus: 'to_buy',
    qty: 8,
    length: 49,
    width: 23,
    thickness: 15,
    shapeType: 'toggle_latch',
    holes: [
      { x: 8.25, y: 7.5, d: 4 },
      { x: 28.25, y: 7.5, d: 4 }
    ],
    notes: 'Montage d’angle à 90° : Clanche (49×13 mm) sur les Côtés Longs fixes (P01/P03) + Gâche plate (15 mm, entraxe 20 mm) sur la face extérieure des Côtés Amovibles (P05). L’étrier Ø3 (23 mm) enjambe la tranche de 27 mm de P05.'
  }
};

/**
 * Plan de Découpe Optimisé adapté à l'inventaire réel de l'atelier :
 * - Lames : 12 × 190 cm (déjà coupées) + 2×6 lames de 49,6 cm (déjà montées sur les 2 côtés = 88,5 cm) + 2 lames entières 240 cm à couper.
 * - Lambourdes : 4 × ~120,4 cm déjà montées sur les 2 côtés (à recouper en haut) + 2 × ~120 cm libres (120,1 et 120,4 cm) + 1 entière 240 cm + 2 à racheter.
 */
export const STOCK_CUTLIST = {
  // 1. LAMES DE TERRASSE 2400 × 145 × 27 mm
  terraceBoards: [
    // --- A. LES 2 LAMES ENTIÈRES (2400 mm) EN STOCK À DÉBITER ---
    {
      stockId: 'LAME-FULL-1',
      label: '1ère Lame Entière en stock (240 cm — À COUPER)',
      length: 2400,
      width: 145,
      thickness: 27,
      status: 'to_cut',
      statusBadge: '🪚 En stock (240 cm entière) — À couper • Chute : 0 mm',
      cuts: [
        { partId: 'P03', instanceLabel: 'P03 #5 (5ème lame Façade Avant R5)', length: 1900, startX: 0 },
        { partId: 'P05', instanceLabel: 'P05 #7 (7ème lame Côté G R7)', length: 496, startX: 1904 }
      ],
      offcut: 0
    },
    {
      stockId: 'LAME-FULL-2',
      label: '2ème Lame Entière en stock (240 cm — À COUPER)',
      length: 2400,
      width: 145,
      thickness: 27,
      status: 'to_cut',
      statusBadge: '🪚 En stock (240 cm entière) — À couper • Chute : 510 mm',
      cuts: [
        { partId: 'P05', instanceLabel: 'P05 #14 (7ème lame Côté D R7)', length: 496, startX: 0 },
        { partId: 'P06', instanceLabel: 'P06 #1 + #2 (2 Pignons tête-bêche)', length: 496, startX: 500, diagonalGable: true },
        { partId: 'P11', instanceLabel: 'P11 ×2 (Déligné 2×68mm)', length: 890, startX: 1000, ripInTwo: true }
      ],
      offcut: 510
    },
    // --- B. LES 12 LAMES DÉJÀ COUPÉES (12 × 190 cm + 12 × 49,6 cm montées sur les 2 côtés) ---
    ...Array.from({ length: 6 }, (_, idx) => {
      const num = idx + 1;
      return {
        stockId: `LAME-${String(num).padStart(2, '0')}`,
        label: `Lame #${num} — 190 cm en stock + 49,6 cm déjà monté Côté Gauche (R${num})`,
        length: 2400,
        width: 145,
        thickness: 27,
        status: 'already_cut',
        statusBadge: '✅ Déjà coupé (190 cm libre + 49,6 cm monté Côté G)',
        cuts: [
          { partId: 'P01', instanceLabel: `P01 #${num} (Arrière R${num} — 190 cm prêt)`, length: 1900, startX: 0 },
          { partId: 'P05', instanceLabel: `P05 #${num} (Monté Côté G R${num})`, length: 496, startX: 1904 }
        ],
        offcut: 0
      };
    }),
    ...Array.from({ length: 2 }, (_, idx) => {
      const num = idx + 7;
      const sideRow = idx + 1;
      return {
        stockId: `LAME-${String(num).padStart(2, '0')}`,
        label: `Lame #${num} — 190 cm en stock + 49,6 cm déjà monté Côté Droit (R${sideRow})`,
        length: 2400,
        width: 145,
        thickness: 27,
        status: 'already_cut',
        statusBadge: '✅ Déjà coupé (190 cm libre + 49,6 cm monté Côté D)',
        cuts: [
          { partId: 'P01', instanceLabel: `P01 #${num} (Arrière R${num} — 190 cm prêt)`, length: 1900, startX: 0 },
          { partId: 'P05', instanceLabel: `P05 #${num + 1} (Monté Côté D R${sideRow})`, length: 496, startX: 1904 }
        ],
        offcut: 0
      };
    }),
    ...Array.from({ length: 4 }, (_, idx) => {
      const num = idx + 9;
      const fIdx = idx + 1;
      const sideRow = idx + 3;
      return {
        stockId: `LAME-${String(num).padStart(2, '0')}`,
        label: `Lame #${num} — 190 cm en stock + 49,6 cm déjà monté Côté Droit (R${sideRow})`,
        length: 2400,
        width: 145,
        thickness: 27,
        status: 'already_cut',
        statusBadge: '✅ Déjà coupé (190 cm libre + 49,6 cm monté Côté D)',
        cuts: [
          { partId: 'P03', instanceLabel: `P03 #${fIdx} (Avant R${fIdx} — 190 cm prêt)`, length: 1900, startX: 0 },
          { partId: 'P05', instanceLabel: `P05 #${num + 1} (Monté Côté D R${sideRow})`, length: 496, startX: 1904 }
        ],
        offcut: 0
      };
    })
  ],

  // 2. LAMBOURDES 70 × 45 mm (Inventaire réel : 4 montées de ~120,4 cm + 2 libres de 120,1 & 120,4 cm + 1 entière 240 cm + 2 à racheter)
  lambourdes: [
    // --- A. LES 4 LAMBOURDES DE ~120,4 cm DÉJÀ MONTÉES SUR LES 2 CÔTÉS (À RECOUPER EN HAUT SUR PLACE) ---
    {
      stockId: 'LAMB-COTE-G-ARR',
      label: 'Montant Arrière Côté Gauche (Déjà monté : ~120,4 cm)',
      length: 1204,
      width: 70,
      thickness: 45,
      status: 'trim_mounted',
      statusBadge: '🪚 Déjà monté sur Côté G — Recouper le haut de -49 mm (→ 1155 mm)',
      cuts: [
        { partId: 'P07', instanceLabel: 'P07 #1 (Côté G Arrière — 1155 mm)', length: 1155, startX: 0 }
      ],
      offcut: 49
    },
    {
      stockId: 'LAMB-COTE-D-ARR',
      label: 'Montant Arrière Côté Droit (Déjà monté : ~120,4 cm)',
      length: 1204,
      width: 70,
      thickness: 45,
      status: 'trim_mounted',
      statusBadge: '🪚 Déjà monté sur Côté D — Recouper le haut de -49 mm (→ 1155 mm)',
      cuts: [
        { partId: 'P07', instanceLabel: 'P07 #2 (Côté D Arrière — 1155 mm)', length: 1155, startX: 0 }
      ],
      offcut: 49
    },
    {
      stockId: 'LAMB-COTE-G-AV',
      label: 'Montant Avant Côté Gauche (Déjà monté : ~120,4 cm)',
      length: 1204,
      width: 70,
      thickness: 45,
      status: 'trim_mounted',
      statusBadge: '🪚 Déjà monté sur Côté G — Recouper le haut de -174 mm (→ 1030 mm)',
      cuts: [
        { partId: 'P08', instanceLabel: 'P08 #1 (Côté G Avant — 1030 mm)', length: 1030, startX: 0 }
      ],
      offcut: 174
    },
    {
      stockId: 'LAMB-COTE-D-AV',
      label: 'Montant Avant Côté Droit (Déjà monté : ~120,4 cm)',
      length: 1204,
      width: 70,
      thickness: 45,
      status: 'trim_mounted',
      statusBadge: '🪚 Déjà monté sur Côté D — Recouper le haut de -174 mm (→ 1030 mm)',
      cuts: [
        { partId: 'P08', instanceLabel: 'P08 #2 (Côté D Avant — 1030 mm)', length: 1030, startX: 0 }
      ],
      offcut: 174
    },
    // --- B. LES 2 DEMI-LAMBOURDES LIBRES EN STOCK (120,1 cm et 120,4 cm) ---
    {
      stockId: 'LAMB-120-A',
      label: 'Demi-Lambourde libre #1 en stock (120,1 cm = 1201 mm)',
      length: 1201,
      width: 70,
      thickness: 45,
      status: 'to_cut',
      statusBadge: '🪚 En stock libre (120,1 cm) — Recouper -21 mm (→ 1180 mm)',
      cuts: [
        { partId: 'P02', instanceLabel: 'P02 #1 (Montant Arrière Gauche — 1180 mm)', length: 1180, startX: 0 }
      ],
      offcut: 21
    },
    {
      stockId: 'LAMB-120-B',
      label: 'Demi-Lambourde libre #2 en stock (120,4 cm = 1204 mm)',
      length: 1204,
      width: 70,
      thickness: 45,
      status: 'to_cut',
      statusBadge: '🪚 En stock libre (120,4 cm) — Recouper -24 mm (→ 1180 mm)',
      cuts: [
        { partId: 'P02', instanceLabel: 'P02 #2 (Montant Arrière Centre — 1180 mm)', length: 1180, startX: 0 }
      ],
      offcut: 24
    },
    // --- C. LA LAMBOURDE ENTIÈRE EN STOCK (2400 mm) ---
    {
      stockId: 'LAMB-FULL-1',
      label: 'Lambourde Entière en stock (240 cm = 2400 mm)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'to_cut',
      statusBadge: '🪚 En stock (240 cm entière) — À couper • Chute : 171 mm',
      cuts: [
        { partId: 'P02', instanceLabel: 'P02 #3 (Arrière Droite)', length: 1180, startX: 0 },
        { partId: 'P04', instanceLabel: 'P04 #1 (Avant Gauche)', length: 1045, startX: 1184 }
      ],
      offcut: 171
    },
    // --- D. LES 2 LAMBOURDES ENTIÈRES À RACHETER (2 × 2400 mm) ---
    {
      stockId: 'LAMB-ACHAT-1',
      label: 'Lambourde à racheter #1 (Pin Cl.4 2400 × 70 × 45 mm)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'to_buy',
      statusBadge: '🛒 À racheter (#1/2) • Chute : 306 mm',
      cuts: [
        { partId: 'P04', instanceLabel: 'P04 #2 (Avant Centre)', length: 1045, startX: 0 },
        { partId: 'P04', instanceLabel: 'P04 #3 (Avant Droite)', length: 1045, startX: 1049 }
      ],
      offcut: 306
    },
    {
      stockId: 'LAMB-ACHAT-2',
      label: 'Lambourde à racheter #2 (Pin Cl.4 2400 × 70 × 45 mm)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'to_buy',
      statusBadge: '🛒 À racheter (#2/2) • Chute : 1382 mm',
      cuts: [
        { partId: 'P12', instanceLabel: 'P12 #1 (Portique Central X=0)', length: 370, startX: 0, bevel: '16.7°' },
        { partId: 'P13', instanceLabel: 'P13 #1 (Support P06 Côté G)', length: 320, startX: 374, bevel: '16.7°' },
        { partId: 'P13', instanceLabel: 'P13 #2 (Support P06 Côté D)', length: 320, startX: 698, bevel: '16.7°' }
      ],
      offcut: 1382
    }
  ],

  // 3. PLAQUE POLYCARBONATE 2000 × 980 × 10 mm (1 en stock)
  polycarbonateSheet: {
    stockId: 'POLY-01',
    label: 'Plaque Polycarbonate Alvéolaire 2000 × 980 × 10 mm',
    length: 2000,
    width: 980,
    thickness: 10,
    status: 'in_stock',
    panels: [
      {
        partId: 'P10',
        instanceLabel: 'P10 — Toit Ouvrant (2000 × 660 mm)',
        x: 0,
        y: 0,
        w: 2000,
        h: 660
      },
      {
        partId: 'P09',
        instanceLabel: 'P09 — Fenêtre Façade Avant (1900 × 300 mm)',
        x: 0,
        y: 664,
        w: 1900,
        h: 300
      }
    ]
  }
};
