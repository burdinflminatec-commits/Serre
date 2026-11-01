import { PARTS_CATALOG, STOCK_CUTLIST, SAW_KERF } from '../data/serreData.js';

/**
 * Rendu du Plan de Découpe Interactif (1D Lames + 1D Lambourdes + 2D Polycarbonate)
 * et génération de la fiche d'impression A4 Paysage (@media print)
 */
export function renderCutlistModal({
  modalBodyEl,
  printSheetEl,
  highlightedPartId = null,
  onSelectPart
}) {
  if (!modalBodyEl) return;

  // Cartes de synthèse en haut de la modale (adaptées à l'inventaire réel de l'atelier)
  const summaryHtml = `
    <div class="cutlist-summary-grid">
      <div class="summary-card">
        <div class="lbl">Lames Terrasse (145×27 mm)</div>
        <div class="val">2×240 cm à couper • 12×190 cm + 2×6 montées ✅</div>
      </div>
      <div class="summary-card warn">
        <div class="lbl">Lambourdes Cl.4 (70×45 mm)</div>
        <div class="val">4 montées + 2×120 cm + 1×240 cm (+ 2 à acheter)</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Côtés G/D Pré-assemblés</div>
        <div class="val">6 lames (88,5 cm) + 2 lambourdes (120,4 cm)/côté</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Polycarbonate &amp; Visserie</div>
        <div class="val">1 Plaque 2000×980 • Kerf ${SAW_KERF} mm • ~154 vis</div>
      </div>
    </div>
  `;

  // Section 1 : Les lames de terrasse (les 2 lames entières 240 cm à couper en tête, suivies des 12 lames déjà coupées/montées)
  const terraceToCut = STOCK_CUTLIST.terraceBoards.filter((b) => b.status === 'to_cut');
  const terraceAlreadyCut = STOCK_CUTLIST.terraceBoards.filter((b) => b.status === 'already_cut');

  const terraceHtml = `
    <div style="margin-bottom:8px;font-size:12px;color:#38bdf8;font-weight:600;">
      🪚 À DÉBITER EN ATELIER — Vos 2 lames entières restantes (2 × 2400 mm) :
    </div>
    ${terraceToCut.map((board) => renderLinearBoardRow(board, highlightedPartId, false)).join('')}
    <details style="margin-top:10px;background:rgba(15,23,42,0.55);border:1px solid rgba(148,163,184,0.18);border-radius:8px;padding:8px 12px;" ${
      highlightedPartId === 'P01' || highlightedPartId === 'P03' || highlightedPartId === 'P05' ? 'open' : ''
    }>
      <summary style="cursor:pointer;font-size:12px;font-weight:600;color:#86efac;user-select:none;">
        ✅ DÉJÀ COUPÉES &amp; MONTÉES — Vos 12 lames de 190 cm (8×P01 + 4×P03) et vos 2×6 lames de côté montées (12×P05 = 88,5 cm/côté) — Cliquer pour afficher le détail (12 lames)
      </summary>
      <div style="margin-top:10px;">
        ${terraceAlreadyCut.map((board) => renderLinearBoardRow(board, highlightedPartId, false)).join('')}
      </div>
    </details>
  `;

  // Section 2 : Les lambourdes (4 montées sur côtés à recouper en haut + 2 demi-lambourdes libres + 1 entière + 2 à racheter)
  const lambourdesHtml = STOCK_CUTLIST.lambourdes
    .map((board) => renderLinearBoardRow(board, highlightedPartId, false))
    .join('');

  // Section 3 : Plaque Polycarbonate 2D
  const polyHtml = renderPolycarbonate2D(STOCK_CUTLIST.polycarbonateSheet, highlightedPartId, false);

  modalBodyEl.innerHTML = `
    ${summaryHtml}

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>1️⃣ Lames de Terrasse Pin Vert (145 × 27 mm) — 2 × 240 cm à couper + 12 × 190 cm prêtes + 2×6 lames montées</span>
        <span class="stock-pill">✅ 100% en stock (Seules les 2 lames entières de 240 cm restent à couper)</span>
      </div>
      ${terraceHtml}
    </div>

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>2️⃣ Lambourdes Pin Cl.4 (70 × 45 mm) — 4×120,4 cm montées + 2×120 cm libres + 1×240 cm entière + 2 à acheter</span>
        <span class="stock-pill to-buy">⚠️ Recouper les 4 montées &amp; les 2 demi-lambourdes + 2 Lambourdes à racheter</span>
      </div>
      ${lambourdesHtml}
    </div>

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>3️⃣ Débit Surfacique 2D — 1 × Plaque Polycarbonate Alvéolaire (2000 × 980 × 10 mm)</span>
        <span class="stock-pill">✅ 1 / 1 En Stock (1 seule coupe longitudinale à 660 mm)</span>
      </div>
      ${polyHtml}
    </div>
  `;

  // Attacher l'événement de clic sur chaque pièce SVG (surbrillance bidirectionnelle)
  modalBodyEl.querySelectorAll('.cut-svg-part').forEach((el) => {
    el.addEventListener('click', () => {
      const pid = el.getAttribute('data-part-id');
      if (pid && onSelectPart) {
        onSelectPart(pid);
      }
    });
  });

  // Faire défiler jusqu'à la première pièce en surbrillance si ouverture depuis l'inspecteur 2D
  if (highlightedPartId) {
    const firstHighlighted = modalBodyEl.querySelector(
      `.cut-svg-part[data-part-id="${highlightedPartId}"]`
    );
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Générer également la feuille d'impression A4 Paysage (@media print)
  if (printSheetEl) {
    renderPrintableSheet(printSheetEl);
  }
}

/**
 * Dessine une barre de débit 1D avec mètre ruban gradué en haut
 */
function renderLinearBoardRow(board, highlightedPartId, isPrint = false) {
  const svgW = 1080;
  const svgH = 74;
  const padL = 16;
  const padR = 16;
  const barY = 26;
  const barH = 38;
  const usableW = svgW - padL - padR;
  const refMaxLen = 2400;
  const scale = usableW / refMaxLen;
  const boardPxW = board.length * scale;

  // Graduations de mètre ruban tous les 200 mm jusqu'à board.length
  const ticks = [];
  for (let mm = 0; mm <= board.length; mm += 200) {
    const tx = padL + mm * scale;
    ticks.push(`
      <line x1="${tx}" y1="12" x2="${tx}" y2="${barY}" stroke="${isPrint ? '#475569' : '#64748b'}" stroke-width="1" />
      <text x="${tx}" y="10" text-anchor="middle" fill="${isPrint ? '#0f172a' : '#94a3b8'}" font-family="monospace" font-size="9.5">${mm}</text>
    `);
  }
  if (board.length % 200 !== 0) {
    const endTx = padL + board.length * scale;
    ticks.push(`
      <line x1="${endTx}" y1="12" x2="${endTx}" y2="${barY}" stroke="${isPrint ? '#0284c7' : '#38bdf8'}" stroke-width="1.2" />
      <text x="${endTx}" y="10" text-anchor="middle" fill="${isPrint ? '#0284c7' : '#38bdf8'}" font-family="monospace" font-size="9.5" font-weight="bold">${board.length}</text>
    `);
  }

  // Pièces découpées sur la barre
  const cutsSvg = board.cuts
    .map((cut) => {
      const part = PARTS_CATALOG[cut.partId];
      const x = padL + cut.startX * scale;
      const w = cut.length * scale;
      const isHi = highlightedPartId === cut.partId;

      let fill = isPrint ? '#e2e8f0' : 'rgba(56, 189, 248, 0.22)';
      let stroke = isPrint ? '#0f172a' : '#38bdf8';
      let strokeW = isHi ? 3 : 1.5;

      if (isHi && !isPrint) {
        fill = 'rgba(245, 158, 11, 0.45)';
        stroke = '#fde047';
      } else if (!isPrint && board.status === 'to_buy') {
        fill = 'rgba(245, 158, 11, 0.22)';
        stroke = '#f59e0b';
      } else if (!isPrint && board.status === 'trim_mounted') {
        fill = 'rgba(16, 185, 129, 0.22)';
        stroke = '#34d399';
      } else if (!isPrint && board.status === 'already_cut') {
        fill = 'rgba(34, 197, 94, 0.14)';
        stroke = '#4ade80';
      }

      const endMm = cut.startX + cut.length;
      const kerfX = padL + endMm * scale;

      // Rendu spécifique selon le type de coupe (P06 coupe diagonale pignon, P11 délignage en 2, P12/P13 coupes 16.7°)
      let shapeInnerSvg = '';
      if (cut.diagonalGable) {
        // Les 2 pignons P06 (#1 et #2) sont découpés tête-bêche dans le MÊME rectangle de 496×145 mm
        const pTL = `${x},${barY}`;
        const pBL = `${x},${barY + barH}`;
        const pBR = `${x + w},${barY + barH}`;
        const pTR = `${x + w},${barY}`;
        shapeInnerSvg = `
          <polygon points="${pTL} ${pTR} ${pBR}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          <polygon points="${pTL} ${pBL} ${pBR}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          <line x1="${x}" y1="${barY}" x2="${x + w}" y2="${barY + barH}" stroke="#f59e0b" stroke-width="2.4" />
          <text x="${x + w * 0.72}" y="${barY + 13}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="9.5" font-weight="bold">P06 #2 (D)</text>
          <text x="${x + w * 0.28}" y="${barY + 32}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="9.5" font-weight="bold">P06 #1 (G)</text>
        `;
      } else if (cut.ripInTwo) {
        // Délignage longitudinal en 2 lattes de 68 mm (P11 #1 et P11 #2) dans la largeur de 145 mm
        const midY = barY + barH / 2;
        shapeInnerSvg = `
          <rect x="${x}" y="${barY}" width="${Math.max(w, 4)}" height="${barH}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          <line x1="${x}" y1="${midY}" x2="${x + w}" y2="${midY}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="5 3" />
          <text x="${x + w / 2}" y="${barY + 13}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="10" font-weight="bold">
            P11 #1 — Traverse Sous-Toit Avant (890 × 68 mm)
          </text>
          <text x="${x + w / 2}" y="${barY + 32}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="10" font-weight="bold">
            P11 #2 — Traverse Sous-Toit Arrière (890 × 68 mm)
          </text>
        `;
      } else {
        shapeInnerSvg = `
          <rect x="${x}" y="${barY}" width="${Math.max(w, 4)}" height="${barH}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          ${
            cut.bevel
              ? `
                <line x1="${x + 7}" y1="${barY}" x2="${x}" y2="${barY + barH}" stroke="#f59e0b" stroke-width="2" />
                <line x1="${x + w}" y1="${barY}" x2="${x + w - 7}" y2="${barY + barH}" stroke="#f59e0b" stroke-width="2" />
              `
              : ''
          }
          <text x="${x + w / 2}" y="${barY + 15}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="10.5" font-weight="bold">
            ${cut.instanceLabel}
          </text>
          <text x="${x + w / 2}" y="${barY + 30}" text-anchor="middle" fill="${isPrint ? '#334155' : '#cbd5e1'}" font-family="monospace" font-size="9.5">
            ${cut.length} × ${part.width} mm ${cut.bevel ? `(∠${cut.bevel})` : ''}
          </text>
        `;
      }

      return `
        <g class="cut-svg-part" data-part-id="${cut.partId}">
          ${shapeInnerSvg}
          <!-- Trait de scie (4 mm) et cote cumulée -->
          ${
            endMm < board.length
              ? `
                <rect x="${kerfX}" y="${barY}" width="${Math.max(SAW_KERF * scale, 2)}" height="${barH}" fill="#ef4444" />
                <text x="${kerfX}" y="${barY - 3}" text-anchor="middle" fill="#f87171" font-family="monospace" font-size="9" font-weight="bold">${endMm}</text>
              `
              : ''
          }
        </g>
      `;
    })
    .join('');

  // Zone de chute éventuelle (sur la longueur réelle board.length)
  const lastCut = board.cuts[board.cuts.length - 1];
  const usedMm = lastCut ? lastCut.startX + lastCut.length : 0;
  const offcutMm = Math.max(0, board.length - usedMm);
  let offcutSvg = '';
  if (offcutMm > 2) {
    const ox = padL + usedMm * scale;
    const ow = offcutMm * scale;
    offcutSvg = `
      <rect x="${ox}" y="${barY}" width="${ow}" height="${barH}" fill="rgba(239, 68, 68, 0.12)" stroke="#ef4444" stroke-dasharray="4 3" />
      ${
        ow > 55
          ? `<text x="${ox + ow / 2}" y="${barY + 23}" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="9.5">-${offcutMm} mm</text>`
          : ''
      }
    `;
  }

  // Note explicative à droite pour les demi-lambourdes (~120,1 ou 120,4 cm)
  let shortBoardNoteSvg = '';
  if (board.length < refMaxLen) {
    const noteX = padL + boardPxW + 18;
    const targetLen = lastCut ? lastCut.length : board.length;
    shortBoardNoteSvg = `
      <text x="${noteX}" y="${barY + 15}" fill="${isPrint ? '#0f172a' : '#34d399'}" font-family="monospace" font-size="10.5" font-weight="bold">
        📏 Pièce actuelle : ${board.length} mm (${(board.length / 10).toFixed(1)} cm)
      </text>
      <text x="${noteX}" y="${barY + 31}" fill="${isPrint ? '#334155' : '#94a3b8'}" font-family="monospace" font-size="9.5">
        🪚 Recouper à ${targetLen} mm (retirer ${offcutMm} mm en haut)
      </text>
    `;
  }

  const badgeText =
    board.statusBadge ||
    (board.status === 'to_buy'
      ? '🛒 À racheter (1 unité)'
      : `✅ En stock • Chute : ${offcutMm} mm`);

  return `
    <div class="${isPrint ? 'print-board-item' : `board-row ${board.status === 'to_buy' ? 'buy-needed' : ''}`}" data-board-id="${board.stockId}">
      <div class="board-row-header">
        <strong>${board.stockId} — ${board.label} (${board.length} × ${board.width} × ${board.thickness} mm)</strong>
        <span class="stock-pill ${board.status === 'to_buy' ? 'to-buy' : ''}">
          ${badgeText}
        </span>
      </div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
        <!-- Fond de la planche brute (échelle proportionnelle à 2400 mm) -->
        <rect x="${padL}" y="${barY}" width="${boardPxW}" height="${barH}" fill="${isPrint ? '#f8fafc' : '#0b1017'}" stroke="#475569" stroke-width="1" />
        ${ticks.join('')}
        ${cutsSvg}
        ${offcutSvg}
        ${shortBoardNoteSvg}
      </svg>
    </div>
  `;
}

/**
 * Dessine le calepinage 2D de la plaque de Polycarbonate (2000 × 980 × 10 mm)
 */
function renderPolycarbonate2D(sheet, highlightedPartId, isPrint = false) {
  const svgW = 1080;
  const svgH = 265;
  const padL = 54;
  const padT = 32;
  const drawW = 860;
  const drawH = (sheet.width / sheet.length) * drawW * 0.45; // proportion lisible
  const scaleX = drawW / sheet.length;
  const scaleY = drawH / sheet.width;

  const panelsSvg = sheet.panels
    .map((p) => {
      const px = padL + p.x * scaleX;
      const py = padT + p.y * scaleY;
      const pw = p.w * scaleX;
      const ph = p.h * scaleY;
      const isHi = highlightedPartId === p.partId;

      const fill = isPrint
        ? '#e0f2fe'
        : isHi
        ? 'rgba(245, 158, 11, 0.45)'
        : 'rgba(56, 189, 248, 0.24)';
      const stroke = isPrint ? '#0284c7' : isHi ? '#fde047' : '#38bdf8';

      return `
        <g class="cut-svg-part" data-part-id="${p.partId}">
          <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${fill}" stroke="${stroke}" stroke-width="${isHi ? 3 : 1.8}" />
          <text x="${px + pw / 2}" y="${py + ph / 2 - 4}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="12" font-weight="bold">
            ${p.instanceLabel}
          </text>
          <text x="${px + pw / 2}" y="${py + ph / 2 + 12}" text-anchor="middle" fill="${isPrint ? '#334155' : '#bae6fd'}" font-family="monospace" font-size="10.5">
            Cote : ${p.w} × ${p.h} mm (Ép. 10 mm)
          </text>
        </g>
      `;
    })
    .join('');

  // Lignes de coupe (longitudinale à Y=660 mm et recoupe à X=1900 mm sur P09) + zone de chute 100×300 mm
  const cutY660 = padT + 660 * scaleY;
  const cutX1900 = padL + 1900 * scaleX;
  const p09TopY = padT + 664 * scaleY;
  const p09BotY = padT + 964 * scaleY;

  return `
    <div class="${isPrint ? 'print-board-item' : 'board-row'}">
      <div class="board-row-header">
        <strong>${sheet.stockId} — ${sheet.label}</strong>
        <span class="stock-pill">✅ En stock • Rendement 95% (Chute 100×300 + lisière 16 mm)</span>
      </div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${padL}" y="${padT}" width="${drawW}" height="${drawH}" fill="${isPrint ? '#fff' : '#0b1017'}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 3" />
        <text x="${padL + drawW / 2}" y="${padT - 10}" text-anchor="middle" fill="${isPrint ? '#000' : '#94a3b8'}" font-family="monospace" font-size="10.5">
          Longueur brute : 2000 mm • Largeur brute : 980 mm (1 coupe longitudinale à Y=660 mm + 1 recoupe à X=1900 mm)
        </text>
        ${panelsSvg}
        <!-- Trait de coupe longitudinal rouge à Y = 660 mm -->
        <line x1="${padL}" y1="${cutY660}" x2="${padL + drawW}" y2="${cutY660}" stroke="#ef4444" stroke-width="2" stroke-dasharray="5 3" />
        <text x="${padL - 6}" y="${cutY660 + 3}" text-anchor="end" fill="#f87171" font-family="monospace" font-size="9.5" font-weight="bold">Y=660</text>
        <text x="${padL - 6}" y="${padT + 8}" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="9">0</text>
        <text x="${padL - 6}" y="${padT + drawH}" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="9">980</text>
        <!-- Trait de recoupe à X = 1900 mm et Chute 100 × 300 mm -->
        <line x1="${cutX1900}" y1="${p09TopY}" x2="${cutX1900}" y2="${p09BotY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2" />
        <text x="${cutX1900}" y="${p09BotY + 14}" text-anchor="middle" fill="#f87171" font-family="monospace" font-size="9.5" font-weight="bold">X=1900</text>
        <text x="${padL + drawW}" y="${p09BotY + 14}" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="9">2000</text>
        <text x="${(cutX1900 + padL + drawW) / 2}" y="${(p09TopY + p09BotY) / 2 + 3}" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="8.5">Chute 100×300</text>
      </svg>
    </div>
  `;
}

/**
 * Génère la fiche imprimable A4 Paysage complète (schémas vectoriels + check-list d'atelier [ ])
 */
function renderPrintableSheet(printSheetEl) {
  const checklistRows = Object.values(PARTS_CATALOG)
    .map(
      (p) => `
      <tr>
        <td style="font-family:monospace;font-weight:bold;">[ &nbsp; ] ${p.partId}</td>
        <td><strong>${p.name}</strong> (${p.category})</td>
        <td style="font-family:monospace;text-align:center;"><strong>${p.qty}</strong></td>
        <td style="font-family:monospace;">${p.length} × ${p.width} × ${p.thickness} mm</td>
        <td>${p.bevelTopDeg ? `Biseau ${p.bevelTopDeg}° • ` : ''}${p.notes}</td>
      </tr>
    `
    )
    .join('');

  // Regrouper les lames déjà coupées pour que le schéma d'impression tienne proprement sur A4
  const sampleBoards = [
    STOCK_CUTLIST.terraceBoards[0], // LAME-FULL-1 (À couper)
    STOCK_CUTLIST.terraceBoards[1], // LAME-FULL-2 (À couper)
    {
      ...STOCK_CUTLIST.terraceBoards[2],
      stockId: 'LAMES #01 à #12 (×12 DÉJÀ PRÊTES)',
      label: '12 × Lames de 190 cm (8×P01 + 4×P03) + 12 × Lames 49,6 cm déjà montées sur les 2 côtés (6/côté = 88,5 cm)'
    },
    ...STOCK_CUTLIST.lambourdes
  ];

  printSheetEl.innerHTML = `
    <div class="print-header">
      <div>
        <h1>FICHE DE DÉBIT ATELIER — SERRE BOIS &amp; POLYCARBONATE (1900 × 500 mm)</h1>
        <div>Hauteur Arrière : 1195 mm (8 lames) • Hauteur Avant : 1045 mm (5 lames + vitrage 300 mm) • Espacement lames : 5 mm • Pente : 16.7°</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:9.5pt;">
        Trait de scie : 4 mm<br/>
        Unité : millimètres (mm)
      </div>
    </div>

    <div class="print-section-title">1. CHECK-LIST DE DÉBIT &amp; USINAGE À L'ATELIER</div>
    <table class="print-checklist-table">
      <thead>
        <tr>
          <th style="width:75px;">Fait</th>
          <th>Désignation</th>
          <th style="width:45px;text-align:center;">Qté</th>
          <th style="width:155px;">Dimensions (L × l × Ép)</th>
          <th>Angles &amp; Instructions d'atelier</th>
        </tr>
      </thead>
      <tbody>
        ${checklistRows}
      </tbody>
    </table>

    <div class="print-section-title">2. SCHÉMAS DE CALEPINAGE DES BOIS &amp; DU POLYCARBONATE</div>
    ${sampleBoards.map((b) => renderLinearBoardRow(b, null, true)).join('')}
    ${renderPolycarbonate2D(STOCK_CUTLIST.polycarbonateSheet, null, true)}
  `;
}
