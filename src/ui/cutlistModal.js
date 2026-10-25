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

  // Cartes de synthèse en haut de la modale
  const summaryHtml = `
    <div class="cutlist-summary-grid">
      <div class="summary-card">
        <div class="lbl">Lames Terrasse 2400×145×27</div>
        <div class="val">14 / 14 en stock (99% utilisé)</div>
      </div>
      <div class="summary-card warn">
        <div class="lbl">Lambourdes Cl.4 2400×70×45</div>
        <div class="val">4 en stock + 2 à acheter</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Polycarbonate 2000×980×10</div>
        <div class="val">1 / 1 en stock (Toit + Façade)</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Trait de scie &amp; Visserie Inox</div>
        <div class="val">Kerf ${SAW_KERF} mm • ~154 / 180 vis</div>
      </div>
    </div>
  `;

  // Section 1 : Les 14 lames de terrasse (regroupées intelligemment ou affichées barre par barre)
  const terraceHtml = STOCK_CUTLIST.terraceBoards
    .map((board) => renderLinearBoardRow(board, highlightedPartId, false))
    .join('');

  // Section 2 : Les 5 lambourdes
  const lambourdesHtml = STOCK_CUTLIST.lambourdes
    .map((board) => renderLinearBoardRow(board, highlightedPartId, false))
    .join('');

  // Section 3 : Plaque Polycarbonate 2D
  const polyHtml = renderPolycarbonate2D(STOCK_CUTLIST.polycarbonateSheet, highlightedPartId, false);

  modalBodyEl.innerHTML = `
    ${summaryHtml}

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>1️⃣ Débit Linéaire — 14 × Lames de Terrasse Pin Vert Cerland (2400 × 145 × 27 mm)</span>
        <span class="stock-pill">✅ 14 / 14 En Stock (Astuce 1900 + 496 mm = 0 chute sur 13 lames)</span>
      </div>
      ${terraceHtml}
    </div>

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>2️⃣ Débit Linéaire — 6 × Lambourdes Pin Vert Classe 4 (2400 × 70 × 45 mm)</span>
        <span class="stock-pill to-buy">⚠️ 4 En Stock + 2 Lambourdes à racheter (LAMB-05 &amp; LAMB-06)</span>
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
  const scale = usableW / board.length;

  // Graduations de mètre ruban tous les 200 mm + cumul des coupes
  const ticks = [];
  for (let mm = 0; mm <= board.length; mm += 200) {
    const tx = padL + mm * scale;
    ticks.push(`
      <line x1="${tx}" y1="12" x2="${tx}" y2="${barY}" stroke="${isPrint ? '#475569' : '#64748b'}" stroke-width="1" />
      <text x="${tx}" y="10" text-anchor="middle" fill="${isPrint ? '#0f172a' : '#94a3b8'}" font-family="monospace" font-size="9.5">${mm}</text>
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
      }

      const endMm = cut.startX + cut.length;
      const kerfX = padL + endMm * scale;

      return `
        <g class="cut-svg-part" data-part-id="${cut.partId}">
          <rect x="${x}" y="${barY}" width="${Math.max(w, 4)}" height="${barH}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          ${
            cut.bevel
              ? `<line x1="${x + w - 8}" y1="${barY}" x2="${x + w}" y2="${barY + barH}" stroke="#f59e0b" stroke-width="2" />`
              : ''
          }
          <text x="${x + w / 2}" y="${barY + 15}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="11" font-weight="bold">
            ${cut.instanceLabel}
          </text>
          <text x="${x + w / 2}" y="${barY + 30}" text-anchor="middle" fill="${isPrint ? '#334155' : '#cbd5e1'}" font-family="monospace" font-size="10">
            ${cut.length} × ${part.width} mm ${cut.bevel ? `(Biseau ${cut.bevel})` : ''}
          </text>
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

  // Zone de chute éventuelle
  const lastCut = board.cuts[board.cuts.length - 1];
  const usedMm = lastCut ? lastCut.startX + lastCut.length : 0;
  const offcutMm = Math.max(0, board.length - usedMm);
  let offcutSvg = '';
  if (offcutMm > 2) {
    const ox = padL + usedMm * scale;
    const ow = offcutMm * scale;
    offcutSvg = `
      <rect x="${ox}" y="${barY}" width="${ow}" height="${barH}" fill="rgba(148, 163, 184, 0.08)" stroke="#475569" stroke-dasharray="4 3" />
      ${
        ow > 45
          ? `<text x="${ox + ow / 2}" y="${barY + 23}" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="9.5">Chute ${offcutMm} mm</text>`
          : ''
      }
    `;
  }

  return `
    <div class="${isPrint ? 'print-board-item' : `board-row ${board.status === 'to_buy' ? 'buy-needed' : ''}`}" data-board-id="${board.stockId}">
      <div class="board-row-header">
        <strong>${board.stockId} — ${board.label} (${board.length} × ${board.width} × ${board.thickness} mm)</strong>
        <span class="stock-pill ${board.status === 'to_buy' ? 'to-buy' : ''}">
          ${board.status === 'to_buy' ? '🛒 À racheter (1 unité)' : `✅ En stock • Chute : ${offcutMm} mm`}
        </span>
      </div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
        <!-- Fond de la planche brute -->
        <rect x="${padL}" y="${barY}" width="${usableW}" height="${barH}" fill="${isPrint ? '#f8fafc' : '#0b1017'}" stroke="#475569" stroke-width="1" />
        ${ticks.join('')}
        ${cutsSvg}
        ${offcutSvg}
      </svg>
    </div>
  `;
}

/**
 * Dessine le calepinage 2D de la plaque de Polycarbonate (2000 × 980 × 10 mm)
 */
function renderPolycarbonate2D(sheet, highlightedPartId, isPrint = false) {
  const svgW = 1080;
  const svgH = 260;
  const padL = 36;
  const padT = 28;
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

  return `
    <div class="${isPrint ? 'print-board-item' : 'board-row'}">
      <div class="board-row-header">
        <strong>${sheet.stockId} — ${sheet.label}</strong>
        <span class="stock-pill">✅ En stock • Rendement 95%</span>
      </div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${padL}" y="${padT}" width="${drawW}" height="${drawH}" fill="${isPrint ? '#fff' : '#0b1017'}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 3" />
        <text x="${padL + drawW / 2}" y="${padT - 8}" text-anchor="middle" fill="${isPrint ? '#000' : '#94a3b8'}" font-family="monospace" font-size="10.5">
          Longueur brute : 2000 mm (Sens des alvéoles sur la pente de 660 mm ou la longueur)
        </text>
        ${panelsSvg}
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

  // Regrouper les lames identiques pour que le schéma d'impression tienne proprement sur A4
  const sampleBoards = [
    {
      ...STOCK_CUTLIST.terraceBoards[0],
      stockId: 'LAMES #1 à #8 (×8)',
      label: '8 Lames de Terrasse identiques : chacune donne 1× P01 (Arrière 1900mm) + 1× P05 (Côté 496mm)'
    },
    {
      ...STOCK_CUTLIST.terraceBoards[8],
      stockId: 'LAMES #9 à #13 (×5)',
      label: '5 Lames de Terrasse identiques : chacune donne 1× P03 (Avant 1900mm) + 1× P05 (Côté 496mm)'
    },
    STOCK_CUTLIST.terraceBoards[13],
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
