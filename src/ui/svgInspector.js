import { PARTS_CATALOG } from '../data/serreData.js';

/**
 * Génère le dessin technique SVG 2D coté en mm pour l'inspecteur de pièce gauche
 * (Zéro texte descriptif verbeux : 100% dessin technique coté)
 */
export function renderPieceInspector2D(partId, containerEl) {
  const part = PARTS_CATALOG[partId];
  if (!part || !containerEl) return;

  if (part.shapeType === 'direct_cylinder' || part.shapeType === 'vent_opener') {
    containerEl.innerHTML = renderDirectCylinderSvg(part);
    return;
  }

  if (part.shapeType === 'toggle_latch') {
    containerEl.innerHTML = renderToggleLatchSvg(part);
    return;
  }

  const svgW = 360;
  const svgH = 440;
  const padX = 54;
  const padY = 62;

  const L = part.length;
  const W = part.width;
  const T = part.thickness;

  // Zone utile pour la vue de face principale (et vue de profil en bas)
  const availW = svgW - padX * 2;
  const availH = 225;

  const scale = Math.min(availW / L, availH / Math.max(W, 90));
  const drawW = Math.max(L * scale, 120);
  const drawH = Math.max(W * scale, 44);

  const scaleX = drawW / L;
  const scaleY = drawH / W;

  const x0 = (svgW - drawW) / 2;
  const y0 = padY;

  // Contour de la vue principale selon le type de pièce
  let shapePolygon = '';
  let slopeAnnotation = '';

  if (part.shapeType === 'gable_sloped') {
    // Lame P06 coupée en diagonale de 145 mm (droite/arrière) à 0 mm (gauche/avant)
    const p1 = `${x0},${y0 + drawH}`;
    const p2 = `${x0 + drawW},${y0 + drawH}`;
    const p3 = `${x0 + drawW},${y0}`;
    shapePolygon = `<polygon points="${p1} ${p2} ${p3}" fill="rgba(191, 148, 96, 0.22)" stroke="#f8fafc" stroke-width="2" />`;
    slopeAnnotation = `
      <path d="M ${x0 + 38} ${y0 + drawH} A 38 38 0 0 0 ${x0 + 35} ${y0 + drawH - 11}" fill="none" stroke="#f59e0b" stroke-width="1.5" />
      <text x="${x0 + 46}" y="${y0 + drawH - 6}" fill="#fde68a" font-family="monospace" font-size="10.5" font-weight="bold">∠ ${part.slopeDeg}° (Pente Toit)</text>
    `;
  } else {
    const fillCol =
      part.materialType === 'polycarbonate'
        ? 'rgba(56, 189, 248, 0.18)'
        : part.materialType === 'metal_galva'
        ? 'rgba(203, 213, 225, 0.25)'
        : 'rgba(191, 148, 96, 0.22)';
    const strokeCol = part.materialType === 'polycarbonate' ? '#38bdf8' : '#f8fafc';

    shapePolygon = `<rect x="${x0}" y="${y0}" width="${drawW}" height="${drawH}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="2" />`;

    if (part.shapeType === 'bevel_post' && part.minLength) {
      // Ligne pointillée du biseau à l'extrémité droite
      const bevelX = x0 + (part.minLength / L) * drawW;
      shapePolygon += `
        <line x1="${bevelX}" y1="${y0}" x2="${bevelX}" y2="${y0 + drawH}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 3" />
      `;
    }
  }

  // Perçages débouchants en rouge + lignes d'axe pointillées + cotes
  const holesSvg = (part.holes || [])
    .map((h, idx) => {
      const cx = x0 + h.x * scaleX;
      const cy = y0 + drawH - h.y * scaleY;
      const r = Math.max(h.d * scaleX * 0.5, 3.2);
      const showLabel = idx === 0 || idx === part.holes.length - 1;
      return `
        <g>
          <line x1="${cx - r - 4}" y1="${cy}" x2="${cx + r + 4}" y2="${cy}" stroke="#ef4444" stroke-width="0.9" stroke-dasharray="2 2" />
          <line x1="${cx}" y1="${cy - r - 4}" x2="${cx}" y2="${cy + r + 4}" stroke="#ef4444" stroke-width="0.9" stroke-dasharray="2 2" />
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(239, 68, 68, 0.28)" stroke="#ef4444" stroke-width="1.5" />
          ${
            showLabel
              ? `<text x="${cx}" y="${cy - r - 5}" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="9">X=${h.x}</text>`
              : ''
          }
        </g>
      `;
    })
    .join('');

  // Vue de coupe latérale / épaisseur (en bas du SVG)
  const sideY0 = y0 + drawH + 82;
  const sideH = Math.min(Math.max(T * 1.15, 22), 54);
  let sideProfileSvg = '';

  if (part.shapeType === 'bevel_post') {
    // Montrer clairement la coupe en biseau de 16.7° sur l'épaisseur (45 mm)
    const bevelDropPx = 16;
    const pA = `${x0},${sideY0 + sideH}`;
    const pB = `${x0 + drawW},${sideY0 + sideH}`;
    const pC = `${x0 + drawW},${sideY0}`;
    const pD = `${x0 + drawW - bevelDropPx},${sideY0}`;
    const pE = `${x0},${sideY0}`;

    sideProfileSvg = `
      <text x="${x0}" y="${sideY0 - 12}" fill="#94a3b8" font-family="monospace" font-size="10">PROFIL ÉPAISSEUR (${T} mm) — COUPE BISEAU TÊTE ${part.bevelTopDeg}°</text>
      <polygon points="${pA} ${pB} ${pC} ${pD} ${pE}" fill="rgba(169, 126, 77, 0.28)" stroke="#f8fafc" stroke-width="1.6" />
      <line x1="${x0 + drawW - bevelDropPx}" y1="${sideY0}" x2="${x0 + drawW}" y2="${sideY0 + sideH}" stroke="#f59e0b" stroke-width="2" />
      <text x="${x0 + drawW - 4}" y="${sideY0 + sideH + 15}" text-anchor="end" fill="#fde68a" font-family="monospace" font-size="10.5" font-weight="bold">
        Lmax=${L} / Lmin=${part.minLength} mm (Biseau ${part.bevelTopDeg}°)
      </text>
      ${renderDimLine(x0 - 20, sideY0, x0 - 20, sideY0 + sideH, `Ép. ${T}`, true)}
    `;
  } else {
    sideProfileSvg = `
      <text x="${x0}" y="${sideY0 - 12}" fill="#94a3b8" font-family="monospace" font-size="10">TRANCHE / ÉPAISSEUR (${T} mm) • ${(part.holes || []).length} perçages Ø5 mm débouchants</text>
      <rect x="${x0}" y="${sideY0}" width="${drawW}" height="${sideH}" fill="rgba(148, 163, 184, 0.16)" stroke="#cbd5e1" stroke-width="1.5" />
      ${(part.holes || [])
        .map((h) => {
          const hx = x0 + h.x * scaleX;
          return `<line x1="${hx}" y1="${sideY0}" x2="${hx}" y2="${sideY0 + sideH}" stroke="#ef4444" stroke-width="1.4" stroke-dasharray="3 2" />`;
        })
        .join('')}
      ${renderDimLine(x0 - 20, sideY0, x0 - 20, sideY0 + sideH, `Ép. ${T}`, true)}
    `;
  }

  containerEl.innerHTML = `
    <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow-cyan-start" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
          <path d="M8,1 L2,4 L8,7" fill="none" stroke="#38bdf8" stroke-width="1.4" />
        </marker>
        <marker id="arrow-cyan-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,1 L6,4 L0,7" fill="none" stroke="#38bdf8" stroke-width="1.4" />
        </marker>
      </defs>

      <!-- Titre technique compact en haut de planche -->
      <text x="14" y="20" fill="#94a3b8" font-family="monospace" font-size="10">
        VUE DE FACE COTÉE (ÉCHELLE AUTO • UNITÉ : MM)
      </text>

      <!-- Lignes de rappel Cotes Extérieures -->
      <line x1="${x0}" y1="${y0 - 26}" x2="${x0}" y2="${y0}" stroke="rgba(56,189,248,0.4)" stroke-width="1" />
      <line x1="${x0 + drawW}" y1="${y0 - 26}" x2="${x0 + drawW}" y2="${y0}" stroke="rgba(56,189,248,0.4)" stroke-width="1" />
      ${renderDimLine(x0, y0 - 18, x0 + drawW, y0 - 18, `${L} mm`, false)}

      <line x1="${x0 + drawW}" y1="${y0}" x2="${x0 + drawW + 26}" y2="${y0}" stroke="rgba(56,189,248,0.4)" stroke-width="1" />
      <line x1="${x0 + drawW}" y1="${y0 + drawH}" x2="${x0 + drawW + 26}" y2="${y0 + drawH}" stroke="rgba(56,189,248,0.4)" stroke-width="1" />
      ${renderDimLine(x0 + drawW + 18, y0, x0 + drawW + 18, y0 + drawH, `${W} mm`, true)}

      <!-- Pièce & Trous débouchants -->
      ${shapePolygon}
      ${holesSvg}
      ${slopeAnnotation}

      <!-- Vue de profil / Épaisseur en bas -->
      ${sideProfileSvg}

      <!-- Cartouche bas -->
      <rect x="12" y="${svgH - 42}" width="${svgW - 24}" height="32" rx="5" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(148, 163, 184, 0.2)" />
      <text x="22" y="${svgH - 22}" fill="#e2e8f0" font-family="monospace" font-size="10.5">
        Réf: ${part.partId} • Brut: ${part.stockSource}
      </text>
    </svg>
  `;
}

function renderDimLine(x1, y1, x2, y2, label, isVertical = false) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  if (!isVertical) {
    return `
      <g>
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="1.4" marker-start="url(#arrow-cyan-start)" marker-end="url(#arrow-cyan-end)" />
        <rect x="${mx - 32}" y="${my - 9}" width="64" height="16" rx="3" fill="#0b1017" />
        <text x="${mx}" y="${my + 3}" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">${label}</text>
      </g>
    `;
  } else {
    return `
      <g>
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="1.4" marker-start="url(#arrow-cyan-start)" marker-end="url(#arrow-cyan-end)" />
        <text x="${mx + 6}" y="${my + 4}" fill="#38bdf8" font-family="monospace" font-size="10.5" font-weight="bold">${label}</text>
      </g>
    `;
  }
}

/**
 * Dessin technique 2D du Cylindre Vérin Thermique Seul en Poussée Verticale Directe
 */
function renderDirectCylinderSvg(part) {
  return `
    <svg viewBox="0 0 360 440" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow-cyan-start" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
          <path d="M8,1 L2,4 L8,7" fill="none" stroke="#38bdf8" stroke-width="1.4" />
        </marker>
        <marker id="arrow-cyan-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,1 L6,4 L0,7" fill="none" stroke="#38bdf8" stroke-width="1.4" />
        </marker>
      </defs>

      <text x="14" y="22" fill="#94a3b8" font-family="monospace" font-size="10">
        MONTAGE CYLINDRE SEUL EN POUSSÉE DIRECTE (SANS COMPAS)
      </text>

      <!-- Traverse sous-toit P11 + Plaque Polycarbonate P10 en haut -->
      <g transform="rotate(-10 180 72)">
        <rect x="65" y="45" width="230" height="12" fill="rgba(56,189,248,0.22)" stroke="#38bdf8" stroke-width="1.5" />
        <rect x="135" y="57" width="90" height="24" fill="rgba(191,148,96,0.3)" stroke="#f8fafc" stroke-width="1.5" />
        <text x="180" y="73" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="9.5">Traverse P11</text>
      </g>

      <!-- Patin d'appui libre en sommet de tige -->
      <rect x="164" y="82" width="32" height="10" rx="3" fill="#334155" stroke="#38bdf8" stroke-width="1.5" />
      <text x="208" y="90" fill="#38bdf8" font-family="monospace" font-size="10" font-weight="bold">Appui libre (non vissé)</text>

      <!-- Tige de piston inox Ø 8 mm (Course directe ~90 mm) -->
      <rect x="175" y="92" width="10" height="86" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
      ${renderDimLine(125, 86, 125, 178, 'Course 90 mm', true)}

      <!-- Équerre / Collier de fixation 45×45 mm sur le montant central P02 -->
      <rect x="152" y="178" width="56" height="26" rx="3" fill="rgba(245,158,11,0.28)" stroke="#f59e0b" stroke-width="1.8" />
      <circle cx="164" cy="191" r="3.5" fill="#ef4444" />
      <circle cx="196" cy="191" r="3.5" fill="#ef4444" />
      <text x="218" y="195" fill="#fde68a" font-family="monospace" font-size="10" font-weight="bold">Collier 45 mm</text>

      <!-- Corps du cylindre thermostatique noir Ø 18 mm × 175 mm -->
      <rect x="168" y="204" width="24" height="168" rx="4" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.8" />
      <text x="180" y="292" text-anchor="middle" transform="rotate(-90 180 292)" fill="#94a3b8" font-family="monospace" font-size="10.5" font-weight="bold">
        CYLINDRE NOIR 175 MM (Ø18)
      </text>
      ${renderDimLine(125, 184, 125, 372, '175 mm', true)}

      <!-- Cartouche bas -->
      <rect x="12" y="394" width="336" height="34" rx="5" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(148, 163, 184, 0.2)" />
      <text x="22" y="415" fill="#e2e8f0" font-family="monospace" font-size="10.5">
        Réf: ${part.partId} • Force directe ~25 kg • Levage libre à 90°
      </text>
    </svg>
  `;
}

/**
 * Dessin technique 2D de la Grenouillère de Serrage Rapide Inox Q03 (Loquet à levier + Gâche)
 */
function renderToggleLatchSvg(part) {
  return `
    <svg viewBox="0 0 360 440" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow-cyan-start" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
          <path d="M8,1 L2,4 L8,7" fill="none" stroke="#38bdf8" stroke-width="1.4" />
        </marker>
        <marker id="arrow-cyan-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,1 L6,4 L0,7" fill="none" stroke="#38bdf8" stroke-width="1.4" />
        </marker>
      </defs>

      <text x="14" y="22" fill="#94a3b8" font-family="monospace" font-size="10">
        HETTICH #58332504 (CLANCHE 49×13 + ÉTRIER 23×23 + GÂCHE 15MM)
      </text>

      <!-- Dessin coté exact selon plan Hettich : Corps 49×13, Étrier Ø3 23×23, Gâche 15 mm (trous Ø4 à 20 et 8,25 mm) -->
      ${renderDimLine(55, 52, 185, 52, '49 mm (Levier)', false)}
      ${renderDimLine(155, 74, 218, 74, '23 mm', false)}
      ${renderDimLine(34, 96, 34, 158, '23 mm', true)}

      <!-- Clanche 49 × 13 mm (sur Côté Long P01/P03) -->
      <rect x="55" y="109" width="130" height="36" rx="4" fill="rgba(148,163,184,0.32)" stroke="#f8fafc" stroke-width="1.8" />
      <text x="112" y="131" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="9.5" font-weight="bold">CLANCHE 49×13</text>
      <text x="120" y="176" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="9.5">Sur Côté Long (P01/P03)</text>

      <!-- Étrier en fil Ø 3 mm (23 × 23 mm) qui enjambe les 27 mm de tranche de P05 -->
      <rect x="155" y="96" width="63" height="62" rx="7" fill="none" stroke="#38bdf8" stroke-width="4" />
      <text x="186" y="90" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="9">Fil Ø3 (23×23)</text>

      <!-- Gâche plate 15 mm posée à 90° sur la face extérieure de P05 (2 trous Ø4 à 20 mm + 8,25 mm) -->
      <rect x="214" y="104" width="102" height="46" rx="3" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" stroke-width="1.8" />
      <rect x="210" y="104" width="10" height="46" rx="2" fill="#f59e0b" />
      <circle cx="242" cy="127" r="5.5" fill="rgba(239,68,68,0.35)" stroke="#ef4444" stroke-width="1.5" />
      <circle cx="292" cy="127" r="5.5" fill="rgba(239,68,68,0.35)" stroke="#ef4444" stroke-width="1.5" />
      ${renderDimLine(242, 82, 292, 82, '20 mm', false)}
      <text x="267" y="176" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="9.5">Gâche 15 mm (à 90° sur P05)</text>

      <!-- Coupe horizontale d'un coin : Clanche sur P01/P03 + Étrier 23mm + Gâche à 90° sur face ext. de P05 -->
      <text x="14" y="216" fill="#94a3b8" font-family="monospace" font-size="10">
        COUPE D'ANGLE HORIZONTALE : MONTAGE À 90° (SANS VIS EN BOUT)
      </text>

      <!-- Lame Façade P01/P03 -->
      <rect x="45" y="242" width="165" height="28" fill="rgba(191,148,96,0.35)" stroke="#f8fafc" stroke-width="1.4" />
      <text x="125" y="260" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="9.5">Côté Long Fixe P01/P03</text>

      <!-- Montant Fixe P02/P04 -->
      <rect x="135" y="270" width="75" height="50" fill="rgba(160,115,68,0.4)" stroke="#f8fafc" stroke-width="1.4" />
      <text x="172" y="299" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="9.5">Fixe P02/P04</text>

      <!-- Montant Côté Amovible P07/P08 (emboîté en butée contre P02/P04) -->
      <rect x="210" y="270" width="50" height="75" fill="rgba(56,189,248,0.25)" stroke="#38bdf8" stroke-width="1.6" />
      <text x="235" y="310" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold">P07/P08</text>

      <!-- Lame Côté Amovible P05 (épaisseur 27 mm entre X=950 et X=977) -->
      <rect x="210" y="242" width="32" height="28" fill="rgba(191,148,96,0.5)" stroke="#38bdf8" stroke-width="1.6" />
      <rect x="260" y="242" width="32" height="125" fill="rgba(191,148,96,0.35)" stroke="#38bdf8" stroke-width="1.6" />
      <text x="276" y="312" text-anchor="middle" transform="rotate(-90 276 312)" fill="#f8fafc" font-family="monospace" font-size="9.5">Côté Amovible P05 (27mm)</text>

      <!-- Clanche sur P01/P03 + Étrier 23mm enjambant la tranche 27mm + Gâche à 90° sur la face ext. de P05 -->
      <rect x="145" y="233" width="65" height="8" rx="2" fill="#94a3b8" stroke="#f8fafc" stroke-width="1" />
      <path d="M202,235 L298,235 L298,244" fill="none" stroke="#38bdf8" stroke-width="3.2" />
      <path d="M292,240 L299,240 L299,298" fill="none" stroke="#f59e0b" stroke-width="3.5" />
      <text x="225" y="226" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="9.5" font-weight="bold">Clanche (Façade) ➔ Étrier 23mm ➔ Gâche 90° (Côté)</text>

      <!-- Cartouche bas -->
      <rect x="12" y="394" width="336" height="34" rx="5" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(148, 163, 184, 0.2)" />
      <text x="22" y="415" fill="#e2e8f0" font-family="monospace" font-size="10.5">
        Réf: ${part.partId} • 8 unités (4/côté) • Dépose en 3 sec sans outil
      </text>
    </svg>
  `;
}
