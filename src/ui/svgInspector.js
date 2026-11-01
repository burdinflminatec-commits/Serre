import { PARTS_CATALOG } from '../data/serreData.js';

/**
 * Génère un dessin technique SVG 2D épuré, lisible et sans chevauchement
 * pour le volet inspecteur de pièce à gauche.
 */
export function renderPieceInspector2D(partId, containerEl) {
  const part = PARTS_CATALOG[partId];
  if (!part || !containerEl) return;

  if (part.shapeType === 'direct_cylinder' || part.shapeType === 'vent_opener') {
    containerEl.innerHTML = renderDirectCylinderSvg();
    return;
  }

  if (part.shapeType === 'toggle_latch') {
    containerEl.innerHTML = renderToggleLatchSvg();
    return;
  }

  const svgW = 340;
  const svgH = 216;
  const padLeft = 54;
  const padRight = 24;
  const padTop = 38;

  const L = part.length;
  const W = part.width;

  const availW = svgW - padLeft - padRight;
  const availH = 112;

  const scale = Math.min(availW / L, availH / Math.max(W, 85));
  const drawW = Math.max(Math.min(L * scale, availW), 140);
  const drawH = Math.max(Math.min(W * scale, availH), 46);

  const scaleX = drawW / L;
  const scaleY = drawH / W;

  const x0 = Math.round(padLeft + (availW - drawW) / 2);
  const y0 = padTop;

  let shapePolygon = '';
  let bottomNote = '';

  if (part.shapeType === 'gable_sloped') {
    const pTopLeft = `${x0},${y0}`;
    const pBotLeft = `${x0},${y0 + drawH}`;
    const pBotRight = `${x0 + drawW},${y0 + drawH}`;
    const pTopRight = `${x0 + drawW},${y0}`;
    const hypLen = Math.round(Math.hypot(L, W));

    shapePolygon = `
      <polygon points="${pTopLeft} ${pTopRight} ${pBotRight}" fill="rgba(56, 189, 248, 0.1)" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="4 3" />
      <text x="${x0 + drawW - 8}" y="${y0 + 15}" text-anchor="end" fill="#38bdf8" font-family="monospace" font-size="9.5" font-weight="bold">
        P06 #2 (tête-bêche)
      </text>
      <polygon points="${pTopLeft} ${pBotLeft} ${pBotRight}" fill="rgba(191, 148, 96, 0.3)" stroke="#f8fafc" stroke-width="1.8" />
      <line x1="${x0}" y1="${y0}" x2="${x0 + drawW}" y2="${y0 + drawH}" stroke="#f59e0b" stroke-width="2.2" />
    `;
    bottomNote = `🪚 Diag. ${hypLen} mm (${part.slopeDeg}°) • Arrière 145 → Avant 0 mm`;
  } else if (part.shapeType === 'sloped_brace') {
    const skewPx = Math.min(Math.round(drawH * Math.tan((part.slopeDeg * Math.PI) / 180)), 22);
    const p1 = `${x0 + skewPx},${y0}`;
    const p2 = `${x0 + drawW},${y0}`;
    const p3 = `${x0 + drawW - skewPx},${y0 + drawH}`;
    const p4 = `${x0},${y0 + drawH}`;
    shapePolygon = `
      <polygon points="${p1} ${p2} ${p3} ${p4}" fill="rgba(191, 148, 96, 0.26)" stroke="#f8fafc" stroke-width="1.8" />
      <line x1="${x0 + skewPx}" y1="${y0}" x2="${x0}" y2="${y0 + drawH}" stroke="#f59e0b" stroke-width="2.2" />
      <line x1="${x0 + drawW}" y1="${y0}" x2="${x0 + drawW - skewPx}" y2="${y0 + drawH}" stroke="#f59e0b" stroke-width="2.2" />
    `;
    const spanText = part.spanY ? `Entraxe ${part.spanY} mm • ` : '';
    bottomNote = `🪚 ${spanText}Coupes d’aplomb parallèles ∠ ${part.slopeDeg}°`;
  } else if (part.shapeType === 'hinge_plate') {
    const midY = Math.round(y0 + drawH / 2);
    const segW = drawW / 5;
    let knucklesSvg = '';
    for (let k = 0; k < 5; k++) {
      const kx = x0 + k * segW;
      const kFill = k % 2 === 0 ? 'rgba(148, 163, 184, 0.55)' : 'rgba(56, 189, 248, 0.35)';
      knucklesSvg += `<rect x="${kx}" y="${midY - 5}" width="${segW}" height="10" rx="2" fill="${kFill}" stroke="#f8fafc" stroke-width="1.2" />`;
    }
    shapePolygon = `
      <!-- Charnon Mobile (Haut - Toit P10) -->
      <rect x="${x0}" y="${y0}" width="${drawW}" height="${drawH / 2 - 4}" fill="rgba(56, 189, 248, 0.16)" stroke="#38bdf8" stroke-width="1.6" />
      <text x="${x0 + drawW / 2}" y="${y0 + 13}" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold">Charnon Mobile (Sous-Toit P10)</text>
      <!-- Charnon Fixe (Bas - Lame Haute P03 #5) -->
      <rect x="${x0}" y="${midY + 4}" width="${drawW}" height="${drawH / 2 - 4}" fill="rgba(203, 213, 225, 0.25)" stroke="#f8fafc" stroke-width="1.6" />
      <text x="${x0 + drawW / 2}" y="${y0 + drawH - 6}" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="9" font-weight="bold">Charnon Fixe (Haut Lame P03 #5)</text>
      <!-- Axe / Gond central à 5 charnons -->
      <line x1="${x0 - 8}" y1="${midY}" x2="${x0 + drawW + 8}" y2="${midY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2" />
      ${knucklesSvg}
    `;
    bottomNote = `Axe Ø8 mm sur arête P03 #5 • 4 × Ø5 mm (X=20, 60)`;
  } else {
    const fillCol =
      part.materialType === 'polycarbonate'
        ? 'rgba(56, 189, 248, 0.18)'
        : part.materialType === 'metal_galva'
        ? 'rgba(203, 213, 225, 0.25)'
        : 'rgba(191, 148, 96, 0.24)';
    const strokeCol = part.materialType === 'polycarbonate' ? '#38bdf8' : '#f8fafc';

    shapePolygon = `<rect x="${x0}" y="${y0}" width="${drawW}" height="${drawH}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="1.8" />`;
    const holeCount = (part.holes || []).length;
    const holeDia = part.holes?.[0]?.d || 5;
    bottomNote = holeCount > 0 ? `Perçages : ${holeCount} × Ø${holeDia} mm` : 'Sans perçage';
  }

  // Perçages en rouge dans la pièce + cotes X alignées sous la pièce (zéro chevauchement interne)
  const holes = part.holes || [];
  const holesCirclesSvg = holes
    .map((h) => {
      const cx = x0 + h.x * scaleX;
      const cy = y0 + drawH - h.y * scaleY;
      const r = Math.max(h.d * scaleX * 0.5, 3);
      return `
        <g>
          <line x1="${cx - r - 3}" y1="${cy}" x2="${cx + r + 3}" y2="${cy}" stroke="#ef4444" stroke-width="0.9" />
          <line x1="${cx}" y1="${cy - r - 3}" x2="${cx}" y2="${cy + r + 3}" stroke="#ef4444" stroke-width="0.9" />
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" stroke-width="1.4" />
        </g>
      `;
    })
    .join('');

  // Lignes de rappel des X sous le bord inférieur (avec filtrage anti-collision)
  const distinctXs = Array.from(new Set(holes.map((h) => h.x))).sort((a, b) => a - b);
  let lastLabelPx = -999;
  const xLeadersSvg = distinctXs
    .map((hx, idx) => {
      const cx = x0 + hx * scaleX;
      const isEdge = idx === 0 || idx === distinctXs.length - 1;
      if (distinctXs.length > 5 && !isEdge && cx - lastLabelPx < 30) {
        return `<line x1="${cx}" y1="${y0 + drawH}" x2="${cx}" y2="${y0 + drawH + 6}" stroke="rgba(239,68,68,0.45)" stroke-width="1" />`;
      }
      const stagger = cx - lastLabelPx < 26 ? 11 : 0;
      lastLabelPx = cx;
      return `
        <g>
          <line x1="${cx}" y1="${y0 + drawH}" x2="${cx}" y2="${y0 + drawH + 9 + stagger}" stroke="rgba(239,68,68,0.5)" stroke-width="1" stroke-dasharray="2 2" />
          <text x="${cx}" y="${y0 + drawH + 19 + stagger}" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="9.5" font-weight="bold">${hx}</text>
        </g>
      `;
    })
    .join('');

  containerEl.innerHTML = `
    <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow-cyan-start" markerWidth="7" markerHeight="7" refX="2" refY="3.5" orient="auto">
          <path d="M7,1 L2,3.5 L7,6" fill="none" stroke="#38bdf8" stroke-width="1.3" />
        </marker>
        <marker id="arrow-cyan-end" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,1 L5,3.5 L0,6" fill="none" stroke="#38bdf8" stroke-width="1.3" />
        </marker>
      </defs>

      <!-- Cote Horizontale L (en haut) -->
      <line x1="${x0}" y1="${y0 - 22}" x2="${x0}" y2="${y0}" stroke="rgba(56,189,248,0.35)" stroke-width="1" />
      <line x1="${x0 + drawW}" y1="${y0 - 22}" x2="${x0 + drawW}" y2="${y0}" stroke="rgba(56,189,248,0.35)" stroke-width="1" />
      ${renderDimLine(x0, y0 - 15, x0 + drawW, y0 - 15, `${L} mm`, false)}

      <!-- Cote Verticale W (à gauche) -->
      <line x1="${x0 - 30}" y1="${y0}" x2="${x0}" y2="${y0}" stroke="rgba(56,189,248,0.35)" stroke-width="1" />
      <line x1="${x0 - 30}" y1="${y0 + drawH}" x2="${x0}" y2="${y0 + drawH}" stroke="rgba(56,189,248,0.35)" stroke-width="1" />
      ${renderDimLine(x0 - 22, y0, x0 - 22, y0 + drawH, `${W}`, true)}

      <!-- Contour + Perçages + Cotes X en bas -->
      ${shapePolygon}
      ${holesCirclesSvg}
      ${xLeadersSvg}

      <!-- Bandeau résumé concis en bas -->
      <text x="${svgW / 2}" y="${svgH - 10}" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="10" font-weight="bold">
        ${bottomNote}
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
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="1.3" marker-start="url(#arrow-cyan-start)" marker-end="url(#arrow-cyan-end)" />
        <rect x="${mx - 28}" y="${my - 8}" width="56" height="15" rx="3" fill="#0b1017" />
        <text x="${mx}" y="${my + 3}" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="10.5" font-weight="bold">${label}</text>
      </g>
    `;
  } else {
    return `
      <g>
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="1.3" marker-start="url(#arrow-cyan-start)" marker-end="url(#arrow-cyan-end)" />
        <rect x="${mx - 16}" y="${my - 8}" width="32" height="15" rx="3" fill="#0b1017" />
        <text x="${mx}" y="${my + 3}" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="10" font-weight="bold">${label}</text>
      </g>
    `;
  }
}

/**
 * Schéma épuré du Cylindre Vérin Thermique (Q02)
 */
function renderDirectCylinderSvg() {
  return `
    <svg viewBox="0 0 340 216" xmlns="http://www.w3.org/2000/svg">
      <rect x="85" y="18" width="170" height="14" rx="2" fill="rgba(191,148,96,0.3)" stroke="#f8fafc" stroke-width="1.4" />
      <text x="170" y="28" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="9">Traverse Toit P11 (Appui libre)</text>

      <rect x="165" y="34" width="10" height="52" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <text x="190" y="64" fill="#38bdf8" font-family="monospace" font-size="9.5" font-weight="bold">Course +90 mm</text>

      <rect x="146" y="86" width="48" height="20" rx="3" fill="rgba(245,158,11,0.28)" stroke="#f59e0b" stroke-width="1.5" />
      <text x="136" y="99" text-anchor="end" fill="#fde68a" font-family="monospace" font-size="9.5">Collier P02</text>

      <rect x="159" y="106" width="22" height="82" rx="3" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.5" />
      <text x="190" y="150" fill="#94a3b8" font-family="monospace" font-size="9.5">Cylindre Ø18 × 175 mm</text>

      <text x="170" y="206" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="10" font-weight="bold">
        Poussée directe ~25 kg • Levage toit libre à 90°
      </text>
    </svg>
  `;
}

/**
 * Schéma épuré de la Fermeture Hettich 49×13 mm (Q03)
 */
function renderToggleLatchSvg() {
  return `
    <svg viewBox="0 0 340 216" xmlns="http://www.w3.org/2000/svg">
      <!-- Clanche 49 × 13 mm -->
      <rect x="45" y="68" width="115" height="34" rx="4" fill="rgba(148,163,184,0.32)" stroke="#f8fafc" stroke-width="1.6" />
      <text x="102" y="89" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="9.5" font-weight="bold">Clanche 49×13</text>
      <text x="102" y="118" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="9">Sur Façade (P01/P03)</text>

      <!-- Étrier 23 × 23 mm -->
      <rect x="142" y="58" width="56" height="54" rx="6" fill="none" stroke="#38bdf8" stroke-width="3.5" />
      <text x="170" y="48" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="9.5" font-weight="bold">Étrier 23 mm</text>

      <!-- Gâche 15 mm à 90° -->
      <rect x="194" y="64" width="96" height="42" rx="3" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" stroke-width="1.6" />
      <circle cx="222" cy="85" r="4.5" fill="rgba(239,68,68,0.35)" stroke="#ef4444" stroke-width="1.4" />
      <circle cx="264" cy="85" r="4.5" fill="rgba(239,68,68,0.35)" stroke="#ef4444" stroke-width="1.4" />
      <text x="242" y="122" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="9">Gâche à 90° sur Côté (P05)</text>

      <text x="170" y="198" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="10" font-weight="bold">
        Hettich #58332504 • 8 unités (4/côté) • Dépose sans outil
      </text>
    </svg>
  `;
}
