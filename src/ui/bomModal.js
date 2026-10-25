import { PARTS_CATALOG } from '../data/serreData.js';

/**
 * Rendu de la modale Nomenclature & Fiche Technique avec bouton "📐 Voir 2D"
 */
export function renderBomModal(modalBodyEl, onViewPart2D) {
  if (!modalBodyEl) return;

  const partsList = Object.values(PARTS_CATALOG);
  const totalPieces = partsList.reduce((acc, p) => acc + p.qty, 0);

  const rowsHtml = partsList
    .map((p) => {
      const isHw = p.partId.startsWith('Q');
      const statusBadge =
        p.partId === 'Q03'
          ? '<a href="https://www.galaxus.ch/fr/s4/product/hettich-kistenverschluss-1-pcs-connecteurs-en-bois-58332504" target="_blank" rel="noopener noreferrer" class="stock-pill to-buy" style="text-decoration:underline;">🛒 Galaxus #58332504 (×8 à commander)</a>'
          : p.stockStatus === 'to_buy'
          ? '<span class="stock-pill to-buy">🛒 Lambourdes #5/#6 à acheter</span>'
          : '<span class="stock-pill">✅ En stock</span>';

      return `
        <tr>
          <td><span class="bom-ref ${isHw ? 'hw' : ''}">${p.partId}</span></td>
          <td>
            <strong>${p.name}</strong>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${p.category} • ${p.stockSource}</div>
          </td>
          <td style="font-family:var(--font-mono);font-weight:700;text-align:center;">${p.qty}</td>
          <td style="font-family:var(--font-mono);">${p.thickness} mm</td>
          <td style="font-family:var(--font-mono);font-weight:600;color:#fde68a;">
            ${p.length} × ${p.width} mm
            ${p.minLength ? `<div style="font-size:10.5px;color:#38bdf8;">Lmin: ${p.minLength} mm (Biseau ${p.bevelTopDeg}°)</div>` : ''}
          </td>
          <td>
            <div style="margin-bottom:3px;">${statusBadge}</div>
            <div style="font-size:11.5px;color:#cbd5e1;">${p.notes}</div>
          </td>
          <td style="text-align:right;">
            <button type="button" class="btn-bom-2d" data-part-id="${p.partId}">
              📐 Voir 2D
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  modalBodyEl.innerHTML = `
    <div class="cutlist-summary-grid" style="margin-bottom:16px;">
      <div class="summary-card">
        <div class="lbl">Références Nomenclature</div>
        <div class="val">${partsList.length} réf. (${totalPieces} pièces)</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Dimensions Hors-Tout</div>
        <div class="val">1900 × 500 × 1195 mm</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Visserie Inox A2 5×60 mm</div>
        <div class="val">154 vis utilisées / 180 en stock</div>
      </div>
      <div class="summary-card warn">
        <div class="lbl">Achats complémentaires</div>
        <div class="val">2 Lambourdes + 8 Hettich (#58332504)</div>
      </div>
    </div>

    <table class="bom-table">
      <thead>
        <tr>
          <th>Réf</th>
          <th>Désignation &amp; Origine Brut</th>
          <th style="text-align:center;">Qté</th>
          <th>Épaisseur</th>
          <th>Dimensions L × l</th>
          <th>Statut Stock, Usinages &amp; Notes</th>
          <th style="text-align:right;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  modalBodyEl.querySelectorAll('.btn-bom-2d').forEach((btn) => {
    btn.addEventListener('click', () => {
      const partId = btn.getAttribute('data-part-id');
      if (partId && onViewPart2D) {
        onViewPart2D(partId);
      }
    });
  });
}
