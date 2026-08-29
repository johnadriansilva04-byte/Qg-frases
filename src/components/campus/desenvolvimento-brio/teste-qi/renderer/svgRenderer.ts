/**
 * Renderizador SVG — tradução de rendering.py (I-RAVEN) para SVG.
 *
 * Gera strings SVG com viewBox fixo de 160x160 por painel: basta aplicar
 * `width: 100%; height: auto` no CSS para ter renderização responsiva no PWA.
 * O desenho replica a geometria e a escala de cinza do gerador original.
 */
import {
  ANGLE_VALUES, COLOR_VALUES, DEFAULT_WIDTH, IMAGE_SIZE, SIZE_VALUES, TYPE_VALUES,
} from '../constants';
import type { EntityState, GeneratedProblem, PanelState } from '../types';

const S = IMAGE_SIZE;

function gray(level: number): string {
  const v = COLOR_VALUES[Math.max(0, Math.min(COLOR_VALUES.length - 1, level))];
  return `rgb(${v},${v},${v})`;
}

/** Desenha uma entidade (forma geométrica) como elemento SVG. */
export function renderEntity(entity: EntityState): string {
  const type = TYPE_VALUES[entity.typeLevel] ?? 'none';
  if (type === 'none') return '';

  // Mesma convenção do rendering.py: centro = (bbox[1] * S, bbox[0] * S).
  const cx = entity.bbox[1] * S;
  const cy = entity.bbox[0] * S;
  const unit = (Math.min(entity.bbox[2], entity.bbox[3]) * S) / 2;
  const size = SIZE_VALUES[Math.max(0, Math.min(SIZE_VALUES.length - 1, entity.sizeLevel))]!;
  const angle = ANGLE_VALUES[Math.max(0, Math.min(ANGLE_VALUES.length - 1, entity.angleLevel))]!;

  let shape = '';
  switch (type) {
    case 'triangle': {
      const dl = unit * size;
      const dx = (dl / 2) * Math.sqrt(3);
      const dy = dl / 2;
      shape = `<polygon points="${cx},${cy - dl} ${cx + dx},${cy + dy} ${cx - dx},${cy + dy}"/>`;
      break;
    }
    case 'square': {
      const dl = (unit / 2) * Math.sqrt(2) * size;
      shape = `<rect x="${cx - dl}" y="${cy - dl}" width="${2 * dl}" height="${2 * dl}"/>`;
      break;
    }
    case 'pentagon': {
      const dl = unit * size;
      const c10 = Math.cos(Math.PI / 10);
      const s10 = Math.sin(Math.PI / 10);
      const s5 = Math.sin(Math.PI / 5);
      const c5 = Math.cos(Math.PI / 5);
      shape = `<polygon points="${cx},${cy - dl} ${cx - dl * c10},${cy - dl * s10} ${cx - dl * s5},${cy + dl * c5} ${cx + dl * s5},${cy + dl * c5} ${cx + dl * c10},${cy - dl * s10}"/>`;
      break;
    }
    case 'hexagon': {
      const dl = unit * size;
      const dx = (dl / 2) * Math.sqrt(3);
      const dy = dl / 2;
      shape = `<polygon points="${cx},${cy - dl} ${cx - dx},${cy - dy} ${cx - dx},${cy + dy} ${cx},${cy + dl} ${cx + dx},${cy + dy} ${cx + dx},${cy - dy}"/>`;
      break;
    }
    case 'circle': {
      shape = `<circle cx="${cx}" cy="${cy}" r="${unit * size}"/>`;
      break;
    }
  }
  return `<g transform="rotate(${angle} ${cx} ${cy})" fill="${gray(entity.colorLevel)}" stroke="#000" stroke-width="${DEFAULT_WIDTH}">${shape}</g>`;
}

/** Linhas divisórias da estrutura (render_structure do rendering.py). */
function renderStructure(panel: PanelState): string {
  if (panel.structure === 'Left_Right') {
    return `<line x1="${S / 2}" y1="0" x2="${S / 2}" y2="${S}" stroke="#000" stroke-width="1"/>`;
  }
  if (panel.structure === 'Up_Down') {
    return `<line x1="0" y1="${S / 2}" x2="${S}" y2="${S / 2}" stroke="#000" stroke-width="1"/>`;
  }
  return '';
}

/** Renderiza um painel completo (uma célula da matriz ou uma opção). */
export function renderPanel(panel: PanelState): string {
  const entities = panel.components.flatMap((c) => c.layout.entities).map(renderEntity).join('');
  return `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg" role="img">`
    + `<rect width="${S}" height="${S}" fill="#fff"/>`
    + entities
    + renderStructure(panel)
    + `<rect x="0.5" y="0.5" width="${S - 1}" height="${S - 1}" fill="none" stroke="#000" stroke-width="1"/>`
    + `</svg>`;
}

/** Célula "?" da matriz (posição da resposta). */
function placeholderCell(x: number, y: number): string {
  return `<g><rect x="${x}" y="${y}" width="${S}" height="${S}" fill="#fff" stroke="#000"/>`
    + `<text x="${x + S / 2}" y="${y + S / 2}" font-size="48" text-anchor="middle" dominant-baseline="central" fill="#666">?</text></g>`;
}

/** Renderiza a matriz 3x3 com a célula da resposta vazia. */
export function renderMatrix(problem: GeneratedProblem): string {
  const W = S * 3;
  let cells = '';
  problem.context.forEach((panel, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    cells += `<svg x="${col * S}" y="${row * S}" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`
      + panel.components.flatMap((c) => c.layout.entities).map(renderEntity).join('')
      + renderStructure(panel)
      + `</svg>`;
  });
  cells += placeholderCell(2 * S, 2 * S);
  return `<svg viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Matriz de raciocínio">`
    + `<rect width="${W}" height="${W}" fill="#fff"/>`
    + cells
    + `<line x1="${S}" y1="0" x2="${S}" y2="${W}" stroke="#000" stroke-width="2"/>`
    + `<line x1="${2 * S}" y1="0" x2="${2 * S}" y2="${W}" stroke="#000" stroke-width="2"/>`
    + `<line x1="0" y1="${S}" x2="${W}" y2="${S}" stroke="#000" stroke-width="2"/>`
    + `<line x1="0" y1="${2 * S}" x2="${W}" y2="${2 * S}" stroke="#000" stroke-width="2"/>`
    + `</svg>`;
}

/** Renderiza as 8 opções em grade 4x2. */
export function renderOptions(problem: GeneratedProblem): string {
  const W = S * 4;
  const H = S * 2;
  let cells = '';
  problem.options.forEach((panel, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    cells += `<svg data-option="${idx}" x="${col * S}" y="${row * S}" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`
      + panel.components.flatMap((c) => c.layout.entities).map(renderEntity).join('')
      + renderStructure(panel)
      + `</svg>`;
  });
  let grid = '';
  for (let i = 1; i < 4; i++) grid += `<line x1="${i * S}" y1="0" x2="${i * S}" y2="${H}" stroke="#000" stroke-width="2"/>`;
  grid += `<line x1="0" y1="${S}" x2="${W}" y2="${S}" stroke="#000" stroke-width="2"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Opções de resposta">`
    + `<rect width="${W}" height="${H}" fill="#fff"/>`
    + cells + grid
    + `</svg>`;
}

/** Monta matriz + opções em um container HTML existente (helper para o PWA). */
export function mountProblem(container: HTMLElement, problem: GeneratedProblem): void {
  container.innerHTML = `<div class="iq-matrix">${renderMatrix(problem)}</div>`
    + `<div class="iq-options">${renderOptions(problem)}</div>`;
}
