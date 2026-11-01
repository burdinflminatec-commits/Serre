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
    stockSource: 'Lame Terrasse Pin Vert 2400×145×27',
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
    notes: 'Coupe droite à 1900 mm (laisse 496 mm de chute = 1 lame de côté P05).'
  },

  P02: {
    partId: 'P02',
    name: 'Montant Vertical Arrière (Coupe Droite 90°)',
    category: 'Façade Arrière',
    group: 'backWall',
    materialType: 'wood_post',
    stockSource: 'Lambourde Pin Cl.4 2400×70×45',
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
    notes: 'Coupe droite à 90° (1180 mm : 15 mm en retrait sous le haut de la 8ème lame pour laisser passer la pente du toit).'
  },

  P03: {
    partId: 'P03',
    name: 'Lame Horizontale Façade Avant',
    category: 'Façade Avant',
    group: 'frontWall',
    materialType: 'wood_deck',
    stockSource: 'Lame Terrasse Pin Vert 2400×145×27',
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
    notes: '5 lames basses (Z=0 à 745 mm). Chute de 496 mm utilisée pour P05.'
  },

  P04: {
    partId: 'P04',
    name: 'Montant Vertical Avant (Coupe Droite 90°)',
    category: 'Façade Avant',
    group: 'frontWall',
    materialType: 'wood_post',
    stockSource: 'Lambourde Pin Cl.4 2400×70×45',
    stockStatus: 'in_stock',
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
    notes: 'Coupe droite à 90° (1045 mm, aligné avec le haut du vitrage avant P09 ; 5 trous bas au pas de 150 mm + 2 trous hauts à 785 et 1005 mm pour P09).'
  },

  P05: {
    partId: 'P05',
    name: 'Lame Horizontale Côté Amovible',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_deck',
    stockSource: 'Chute Lame Terrasse (2400 - 1900)',
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
    notes: '7 lames par côté amovible (rangs 1 à 7). Issues des chutes de P01 et P03.'
  },

  P06: {
    partId: 'P06',
    name: 'Lame Pignon Supérieure en Pente (Rang 8)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_deck',
    stockSource: 'Lame Terrasse #14 (2400×145×27)',
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
    notes: 'Triangle rectangle : hauteur 145 mm à l’Arrière (X=0) décroissant en diagonale (pente 16.7°, trait de coupe 517 mm) jusqu’à 0 mm à l’Avant (X=496 mm). Fixée à X=60 mm dans le montant arrière P07 et à X=190 / 330 mm dans la traverse inclinée P13.'
  },

  P07: {
    partId: 'P07',
    name: 'Montant Arrière de Côté Amovible (Coupe Droite 90°)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_post',
    stockSource: 'Lambourde Pin Cl.4 2400×70×45',
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
    notes: 'Coupe droite à 90° (1155 mm : passe sous la pente du toit sans frotter).'
  },

  P08: {
    partId: 'P08',
    name: 'Montant Avant de Côté Amovible (Coupe Droite 90°)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_post',
    stockSource: 'Lambourde #5 (À racheter) 2400×70×45',
    stockStatus: 'to_buy',
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
    notes: 'Coupe droite à 90° (1030 mm : s’emboîte contre le montant d’angle avant P04).'
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
      { x: 130, y: 75, d: 5 },
      { x: 1000, y: 75, d: 5 },
      { x: 1870, y: 75, d: 5 },
      { x: 1000, y: 535, d: 5 }
    ],
    notes: 'Conserve la longueur 2000 mm (débords G/D de 23 mm) et 660 mm de rampant.'
  },

  P11: {
    partId: 'P11',
    name: 'Latte Raidisseur Sous-Toit (Support Charnières)',
    category: 'Toit Ouvrant',
    group: 'roof',
    materialType: 'wood_deck',
    stockSource: 'Chute Lame #14 (900×145×27 délignée en 2)',
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
    notes: 'Tirées de la chute restante (900 mm) de la 14ème lame délignée en 2 tasseaux.'
  },

  P12: {
    partId: 'P12',
    name: 'Traverse Haute Centrale Avant↔Arrière (Chevron)',
    category: 'Structure Portique (Haut)',
    group: 'backWall',
    materialType: 'wood_post',
    stockSource: 'Lambourde #6 (70×45 mm)',
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
    notes: 'Unique traverse centrale (X=0, entraxe horizontal 356 mm / longueur rampante 370 mm, coupes d’extrémité parallèles à 16.7°) reliant le montant Avant central (P04 #2) au montant Arrière central (P02 #2) sous le toit.'
  },

  P13: {
    partId: 'P13',
    name: 'Traverse Inclinée Support Pignon P06 (Côtés Amovibles)',
    category: 'Côtés Amovibles (G/D)',
    group: 'sides',
    materialType: 'wood_post',
    stockSource: 'Lambourde #6 (70×45 mm)',
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
    notes: 'Relie les faces internes des montants P08 et P07 (entraxe horizontal 306 mm / longueur rampante 320 mm, coupes d’extrémité parallèles à 16.7°) sur chaque côté amovible pour soutenir et visser la lame en biais P06.'
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
    notes: 'Fixées en sommet des 3 montants AVANT P04 (axe charnière en bas de pente).'
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
 * Plan de Découpe Optimisé (1D Lames, 1D Lambourdes, 2D Polycarbonate)
 */
export const STOCK_CUTLIST = {
  // 1. LAMES DE TERRASSE 2400 × 145 × 27 mm (14 en stock)
  terraceBoards: Array.from({ length: 14 }, (_, idx) => {
    const num = idx + 1;
    if (num <= 8) {
      return {
        stockId: `LAME-${String(num).padStart(2, '0')}`,
        label: `Lame Terrasse #${num} (Pin Vert Cerland)`,
        length: 2400,
        width: 145,
        thickness: 27,
        status: 'in_stock',
        cuts: [
          { partId: 'P01', instanceLabel: `P01 #${num} (Arrière R${num})`, length: 1900, startX: 0 },
          { partId: 'P05', instanceLabel: `P05 #${num} (Côté G R${num <= 7 ? num : 1})`, length: 496, startX: 1904 }
        ],
        offcut: 0
      };
    } else if (num <= 13) {
      const fIdx = num - 8;
      const sIdx = num;
      return {
        stockId: `LAME-${String(num).padStart(2, '0')}`,
        label: `Lame Terrasse #${num} (Pin Vert Cerland)`,
        length: 2400,
        width: 145,
        thickness: 27,
        status: 'in_stock',
        cuts: [
          { partId: 'P03', instanceLabel: `P03 #${fIdx} (Avant R${fIdx})`, length: 1900, startX: 0 },
          { partId: 'P05', instanceLabel: `P05 #${sIdx} (Côté D)`, length: 496, startX: 1904 }
        ],
        offcut: 0
      };
    } else {
      // 14ème lame : 1 × P05 (496) + 2 × P06 (496 avec refente diagonale 145->0mm) + 2 × P11 (délignées 2×68mm dans 890 mm)
      return {
        stockId: 'LAME-14',
        label: 'Lame Terrasse #14 (Pin Vert Cerland)',
        length: 2400,
        width: 145,
        thickness: 27,
        status: 'in_stock',
        cuts: [
          { partId: 'P05', instanceLabel: 'P05 #14 (Côté D R7)', length: 496, startX: 0 },
          { partId: 'P06', instanceLabel: 'P06 #1 (Pignon G : 145→0mm)', length: 496, startX: 500, diagonalGable: true },
          { partId: 'P06', instanceLabel: 'P06 #2 (Pignon D : 145→0mm)', length: 496, startX: 1000, diagonalGable: true },
          { partId: 'P11', instanceLabel: 'P11 ×2 (Déligné 2×68mm)', length: 890, startX: 1500, ripInTwo: true }
        ],
        offcut: 10
      };
    }
  }),

  // 2. LAMBOURDES 2400 × 70 × 45 mm (4 en stock + 1 à acheter — 100% COUPES DROITES 90°)
  lambourdes: [
    {
      stockId: 'LAMB-01',
      label: 'Lambourde #1 (Pin Cl.4 45×70×2400)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'in_stock',
      cuts: [
        { partId: 'P02', instanceLabel: 'P02 #1 (Arrière Gauche)', length: 1180, startX: 0 },
        { partId: 'P02', instanceLabel: 'P02 #2 (Arrière Centre)', length: 1180, startX: 1184 }
      ],
      offcut: 36
    },
    {
      stockId: 'LAMB-02',
      label: 'Lambourde #2 (Pin Cl.4 45×70×2400)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'in_stock',
      cuts: [
        { partId: 'P02', instanceLabel: 'P02 #3 (Arrière Droite)', length: 1180, startX: 0 },
        { partId: 'P07', instanceLabel: 'P07 #1 (Côté G Arrière)', length: 1155, startX: 1184 }
      ],
      offcut: 61
    },
    {
      stockId: 'LAMB-03',
      label: 'Lambourde #3 (Pin Cl.4 45×70×2400)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'in_stock',
      cuts: [
        { partId: 'P07', instanceLabel: 'P07 #2 (Côté D Arrière)', length: 1155, startX: 0 },
        { partId: 'P04', instanceLabel: 'P04 #1 (Avant Gauche)', length: 1045, startX: 1159 }
      ],
      offcut: 196
    },
    {
      stockId: 'LAMB-04',
      label: 'Lambourde #4 (Pin Cl.4 45×70×2400)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'in_stock',
      cuts: [
        { partId: 'P04', instanceLabel: 'P04 #2 (Avant Centre)', length: 1045, startX: 0 },
        { partId: 'P04', instanceLabel: 'P04 #3 (Avant Droite)', length: 1045, startX: 1049 }
      ],
      offcut: 306
    },
    {
      stockId: 'LAMB-05',
      label: 'Lambourde #5 (Pin Cl.4 45×70×2400 — À RACHETER)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'to_buy',
      cuts: [
        { partId: 'P08', instanceLabel: 'P08 #1 (Côté G Avant)', length: 1030, startX: 0 },
        { partId: 'P08', instanceLabel: 'P08 #2 (Côté D Avant)', length: 1030, startX: 1034 }
      ],
      offcut: 336
    },
    {
      stockId: 'LAMB-06',
      label: 'Lambourde #6 (Pin Cl.4 45×70×2400 — À RACHETER)',
      length: 2400,
      width: 70,
      thickness: 45,
      status: 'to_buy',
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
