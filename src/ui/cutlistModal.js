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

  // Cartes de synthèse épurées en haut de la modale
  const summaryHtml = `
    <div class="cutlist-summary-grid">
      <div class="summary-card">
        <div class="lbl">Lames Terrasse (145×27)</div>
        <div class="val">2 × 240 cm à couper</div>
        <div class="sub">12×190 cm + 2×6 montées ✅</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Lambourdes Stock (70×45)</div>
        <div class="val">4 montées + 2×120 + 1×240</div>
        <div class="sub">Recoupes droites à 90°</div>
      </div>
      <div class="summary-card warn">
        <div class="lbl">Lambourdes à Acheter</div>
        <div class="val">2 × 240 cm (Cl.4)</div>
        <div class="sub">Pour P04 #2/#3, P12 &amp; P13</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Polycarbonate (2000×980)</div>
        <div class="val">1 Plaque 10 mm</div>
        <div class="sub">Toit P10 + Fenêtre P09</div>
      </div>
    </div>
  `;

  // Section 1 : Les lames de terrasse (les 2 lames entières 240 cm à couper + accordéon compact des 12 lames déjà prêtes)
  const terraceToCut = STOCK_CUTLIST.terraceBoards.filter((b) => b.status === 'to_cut');
  const terraceAlreadyCut = STOCK_CUTLIST.terraceBoards.filter((b) => b.status === 'already_cut');

  const terraceHtml = `
    ${terraceToCut.map((board) => renderLinearBoardRow(board, highlightedPartId, false)).join('')}
    <details class="cutlist-details-box" ${
      highlightedPartId === 'P01' ? 'open' : ''
    }>
      <summary>
        <span>✅ <strong>Déjà débitées &amp; montées</strong> — 12 lames de 190 cm en stock (8×P01 + 4×P03) &amp; 12 lames de 49,6 cm montées sur les 2 côtés (88,5 cm)</span>
        <span class="details-hint">Voir les 2 lots (×8 et ×4) ▾</span>
      </summary>
      <div class="cutlist-details-body">
        ${terraceAlreadyCut.map((board) => renderLinearBoardRow(board, highlightedPartId, false)).join('')}
      </div>
    </details>
  `;

  // Section 2 : Les lambourdes regroupées proprement (6 lignes au lieu de 9)
  const lambourdesHtml = STOCK_CUTLIST.lambourdes
    .map((board) => renderLinearBoardRow(board, highlightedPartId, false))
    .join('');

  // Section 3 : Plaque Polycarbonate 2D
  const polyHtml = renderPolycarbonate2D(STOCK_CUTLIST.polycarbonateSheet, highlightedPartId, false);

  modalBodyEl.innerHTML = `
    ${summaryHtml}

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>1️⃣ Lames de Terrasse Pin Vert (145 × 27 mm)</span>
        <span class="stock-pill">🪚 Seules vos 2 lames entières (240 cm) restent à couper</span>
      </div>
      ${terraceHtml}
    </div>

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>2️⃣ Lambourdes Pin Cl.4 (70 × 45 mm)</span>
        <span class="stock-pill to-buy">🪚 6 demi-lambourdes + 1 entière en stock • 🛒 2 à racheter</span>
      </div>
      ${lambourdesHtml}
    </div>

    <div class="cutlist-category-block">
      <div class="cutlist-category-title">
        <span>3️⃣ Plaque Polycarbonate Alvéolaire (2000 × 980 × 10 mm)</span>
        <span class="stock-pill">✅ 1 coupe longitudinale à Y = 660 mm</span>
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
 * Dessine une barre de débit 1D épurée (sans graduations parasites tous les 200 mm)
 */
function renderLinearBoardRow(board, highlightedPartId, isPrint = false) {
  const svgW = 1080;
  const svgH = 58;
  const padL = 18;
  const padR = 18;
  const barY = 18;
  const barH = 34;
  const usableW = svgW - padL - padR;
  const refMaxLen = 2400;
  const scale = usableW / refMaxLen;
  const boardPxW = board.length * scale;

  // Repères uniquement à 0 et à la fin de la planche (plus les traits de coupe eux-mêmes)
  const endTx = padL + boardPxW;
  const ticks = `
    <text x="${padL}" y="13" text-anchor="start" fill="${isPrint ? '#475569' : '#64748b'}" font-family="monospace" font-size="9.5">0</text>
    <text x="${endTx}" y="13" text-anchor="end" fill="${isPrint ? '#0f172a' : '#94a3b8'}" font-family="monospace" font-size="9.5" font-weight="bold">${board.length} mm</text>
  `;

  // Pièces découpées sur la barre
  const cutsSvg = board.cuts
    .map((cut) => {
      const x = padL + cut.startX * scale;
      const w = cut.length * scale;
      const isHi = highlightedPartId === cut.partId;

      let fill = isPrint ? '#e2e8f0' : 'rgba(56, 189, 248, 0.2)';
      let stroke = isPrint ? '#0f172a' : '#38bdf8';
      let strokeW = isHi ? 2.8 : 1.4;

      if (isHi && !isPrint) {
        fill = 'rgba(245, 158, 11, 0.42)';
        stroke = '#fde047';
      } else if (!isPrint && board.status === 'to_buy') {
        fill = 'rgba(245, 158, 11, 0.2)';
        stroke = '#f59e0b';
      } else if (!isPrint && board.status === 'trim_mounted') {
        fill = 'rgba(16, 185, 129, 0.2)';
        stroke = '#34d399';
      } else if (!isPrint && board.status === 'already_cut') {
        fill = 'rgba(34, 197, 94, 0.14)';
        stroke = '#4ade80';
      }

      const endMm = cut.startX + cut.length;
      const kerfX = padL + endMm * scale;

      let shapeInnerSvg = '';
      if (cut.diagonalGable) {
        const pTL = `${x},${barY}`;
        const pBL = `${x},${barY + barH}`;
        const pBR = `${x + w},${barY + barH}`;
        const pTR = `${x + w},${barY}`;
        shapeInnerSvg = `
          <polygon points="${pTL} ${pTR} ${pBR}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          <polygon points="${pTL} ${pBL} ${pBR}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          <line x1="${x}" y1="${barY}" x2="${x + w}" y2="${barY + barH}" stroke="#f59e0b" stroke-width="2.2" />
          <text x="${x + w * 0.72}" y="${barY + 12}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="9.5" font-weight="bold">P06 #2 (D)</text>
          <text x="${x + w * 0.28}" y="${barY + 29}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="9.5" font-weight="bold">P06 #1 (G)</text>
        `;
      } else if (cut.ripInTwo) {
        const midY = barY + barH / 2;
        shapeInnerSvg = `
          <rect x="${x}" y="${barY}" width="${Math.max(w, 4)}" height="${barH}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          <line x1="${x}" y1="${midY}" x2="${x + w}" y2="${midY}" stroke="#ef4444" stroke-width="1.6" stroke-dasharray="5 3" />
          <text x="${x + w / 2}" y="${barY + 12}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="9.5" font-weight="bold">
            P11 #1 • Sous-Toit Avant (890 × 68 mm)
          </text>
          <text x="${x + w / 2}" y="${barY + 29}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="9.5" font-weight="bold">
            P11 #2 • Sous-Toit Arrière (890 × 68 mm)
          </text>
        `;
      } else {
        shapeInnerSvg = `
          <rect x="${x}" y="${barY}" width="${Math.max(w, 4)}" height="${barH}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
          ${
            cut.bevel
              ? `
                <line x1="${x + 6}" y1="${barY}" x2="${x}" y2="${barY + barH}" stroke="#f59e0b" stroke-width="2" />
                <line x1="${x + w}" y1="${barY}" x2="${x + w - 6}" y2="${barY + barH}" stroke="#f59e0b" stroke-width="2" />
              `
              : ''
          }
          <text x="${x + w / 2}" y="${barY + 14}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="10" font-weight="bold">
            ${cut.instanceLabel}
          </text>
          <text x="${x + w / 2}" y="${barY + 27}" text-anchor="middle" fill="${isPrint ? '#334155' : '#bae6fd'}" font-family="monospace" font-size="9.5">
            ${cut.length} mm${cut.bevel ? ` (∠${cut.bevel})` : ''}
          </text>
        `;
      }

      return `
        <g class="cut-svg-part" data-part-id="${cut.partId}">
          ${shapeInnerSvg}
          ${
            endMm < board.length
              ? `
                <rect x="${kerfX}" y="${barY}" width="${Math.max(SAW_KERF * scale, 2)}" height="${barH}" fill="#ef4444" />
                <text x="${kerfX}" y="13" text-anchor="middle" fill="#f87171" font-family="monospace" font-size="9.5" font-weight="bold">${endMm}</text>
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
      <rect x="${ox}" y="${barY}" width="${ow}" height="${barH}" fill="rgba(148, 163, 184, 0.06)" stroke="#475569" stroke-dasharray="4 3" />
      ${
        ow > 58
          ? `<text x="${ox + ow / 2}" y="${barY + 21}" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="9.5">Chute ${offcutMm} mm</text>`
          : ''
      }
    `;
  }

  // Note concise à droite pour les demi-lambourdes (~120,4 cm)
  let shortBoardNoteSvg = '';
  if (board.length < refMaxLen) {
    const noteX = padL + boardPxW + 16;
    const targetLen = lastCut ? lastCut.length : board.length;
    shortBoardNoteSvg = `
      <text x="${noteX}" y="${barY + 21}" fill="${isPrint ? '#0f172a' : '#94a3b8'}" font-family="monospace" font-size="10">
        ← Demi-lambourde ${board.length} mm : couper à <tspan fill="${isPrint ? '#000' : '#38bdf8'}" font-weight="bold">${targetLen} mm</tspan> (retirer -${offcutMm} mm)
      </text>
    `;
  }

  const badgeText = board.statusBadge || `Chute ${offcutMm} mm`;
  const pillClass =
    board.status === 'to_buy'
      ? 'to-buy'
      : board.status === 'to_cut' || board.status === 'trim_mounted'
      ? 'to-cut'
      : '';

  return `
    <div class="${isPrint ? 'print-board-item' : `board-row ${board.status === 'to_buy' ? 'buy-needed' : ''}`}" data-board-id="${board.stockId}">
      <div class="board-row-header">
        <div class="board-row-title">
          <span class="board-qty-tag">${board.qtyLabel || '×1'}</span>
          <strong>${board.label}</strong>
        </div>
        <span class="stock-pill ${pillClass}">${badgeText}</span>
      </div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${padL}" y="${barY}" width="${boardPxW}" height="${barH}" fill="${isPrint ? '#f8fafc' : '#0b1017'}" stroke="#475569" stroke-width="1" />
        ${ticks}
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
  const svgH = 215;
  const padL = 54;
  const padT = 20;
  const drawW = 860;
  const drawH = (sheet.width / sheet.length) * drawW * 0.42;
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
        : 'rgba(56, 189, 248, 0.22)';
      const stroke = isPrint ? '#0284c7' : isHi ? '#fde047' : '#38bdf8';

      return `
        <g class="cut-svg-part" data-part-id="${p.partId}">
          <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${fill}" stroke="${stroke}" stroke-width="${isHi ? 2.8 : 1.6}" />
          <text x="${px + pw / 2}" y="${py + ph / 2 + 4}" text-anchor="middle" fill="${isPrint ? '#000' : '#f8fafc'}" font-family="monospace" font-size="11.5" font-weight="bold">
            ${p.instanceLabel}
          </text>
        </g>
      `;
    })
    .join('');

  const cutY660 = padT + 660 * scaleY;
  const cutX1900 = padL + 1900 * scaleX;
  const p09TopY = padT + 664 * scaleY;
  const p09BotY = padT + 964 * scaleY;

  return `
    <div class="${isPrint ? 'print-board-item' : 'board-row'}">
      <div class="board-row-header">
        <div class="board-row-title">
          <span class="board-qty-tag">×1</span>
          <strong>${sheet.label}</strong>
        </div>
        <span class="stock-pill">✅ Rendement 95% • Chute 100×300 mm</span>
      </div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${padL}" y="${padT}" width="${drawW}" height="${drawH}" fill="${isPrint ? '#fff' : '#0b1017'}" stroke="#64748b" stroke-width="1.2" stroke-dasharray="4 3" />
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

  const sampleBoards = [
    ...STOCK_CUTLIST.terraceBoards,
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
