/**
 * Renderer SVG das matrizes e alternativas do módulo QI.
 *
 * Desenha os painéis diretamente do formato leve {entities, structure}
 * (ver types.ts). Sem dependência do motor I-RAVEN: o banco já contém os
 * dados serializados — EXERCÍCIOS e SIMULAÇÃO compartilham este mesmo
 * renderer (a separação é no banco, não na renderização).
 */
import React from "react";
import type { EstruturaPainel, PanelLight } from "./types";

/** Conversão nível de tamanho (0..5) → raio/medida da forma (aumentado para clareza). */
const SIZE_SCALE = [36, 46, 58, 72, 88, 106];

/** Cores com alto contraste para acessibilidade visual. */
const COLOR_SHADES = ["#030712", "#1f2937", "#4b5563", "#9ca3af"];

const TYPES = ["circle", "rectangle", "triangle", "pentagon", "cross", "star"];

interface FormaComum {
  kind: string;
  size: number;
  fill: string;
  angle: number;
}

function formFor(panel: PanelLight): FormaComum[] {
  return panel.entities.map((e) => ({
    kind: TYPES[Math.min(Math.max(e[0], 0), TYPES.length - 1)] ?? "circle",
    size: SIZE_SCALE[Math.min(Math.max(e[1], 0), SIZE_SCALE.length - 1)] ?? 20,
    fill: COLOR_SHADES[Math.min(Math.max(e[2], 0), COLOR_SHADES.length - 1)] ?? "#333333",
    angle: (e[3] ?? 0) * 45,
  }));
}

function FormaSVG({ kind, size, fill, angle }: { kind: string; size: number; fill: string; angle: number }) {
  const cx = 0;
  const cy = 0;
  switch (kind) {
    case "rectangle": {
      const w = size * 0.9;
      const h = size * 0.6;
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={fill} transform={`rotate(${angle})`} />;
    }
    case "triangle": {
      const r = size * 0.7;
      return (
        <polygon
          points={`${cx},${cy - r} ${cx - r * 0.9},${cy + r * 0.55} ${cx + r * 0.9},${cy + r * 0.55}`}
          fill={fill}
          transform={`rotate(${angle})`}
        />
      );
    }
    case "pentagon": {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + (angle * Math.PI) / 180;
        return `${cx + size * 0.7 * Math.cos(a)},${cy + size * 0.7 * Math.sin(a)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} />;
    }
    case "cross": {
      const w = size * 0.32;
      const h = size * 0.8;
      return (
        <g transform={`rotate(${angle})`} fill={fill}>
          <rect x={-w} y={-h / 2} width={w * 2} height={h} rx={1} />
          <rect x={-h / 2} y={-w} width={h} height={w * 2} rx={1} />
        </g>
      );
    }
    case "star": {
      const inner = size * 0.4;
      const outer = size * 0.9;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5 + (angle * Math.PI) / 180;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} />;
    }
    case "circle":
    default:
      return <circle cx={cx} cy={cy} r={size * 0.5} fill={fill} />;
  }
}

/**
 * Desenha um painel a partir do formato leve, centralizando as entidades
 * dentro do viewBox 0..100 (o I-RAVEN usa bbox absoluto 0..160; aqui as
 * entidades chegam com bbox e normalizamos o grupo ao centro).
 */
export function PanelDeterministicoSVG({ panel, className }: { panel: PanelLight; className?: string }) {
  const forms = formFor(panel);
  const entities = panel.entities;
  if (entities.length === 0) {
    return <svg viewBox="0 0 100 100" className={className} aria-hidden="true" />;
  }
  // Normaliza os centros das entidades para o viewBox 0..100 sem perder a
  // disposição relativa (importante para problemas de POSIÇÃO).
  const centers = entities.map((e) => [(e[4] + e[6]) / 2, (e[5] + e[7]) / 2]) as Array<[number, number]>;
  const xs = centers.map((c) => c[0]);
  const ys = centers.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  // Margem justa deixa as figuras maiores dentro da célula.
  const margin = 10;
  const scale = Math.min((100 - margin * 2) / spanX, (100 - margin * 2) / spanY, 1.1);
  const map = (px: number, py: number): [number, number] => {
    const cx = ((px - (minX + maxX) / 2) * scale) + 50;
    const cy = ((py - (minY + maxY) / 2) * scale) + 50;
    return [cx, cy];
  };
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {entities.map((e, i) => {
        const f = forms[i];
        if (!f) return null;
        const [x, y] = map(e[4], e[5]);
        const sizeInBox = f.size * (100 / 155); // normaliza o tamanho ao viewBox (maior)
        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <FormaSVG kind={f.kind} size={Math.max(sizeInBox, 12)} fill={f.fill} angle={f.angle} />
          </g>
        );
      })}
    </svg>
  );
}

/** Matriz 3×3 com a lacuna na posição da resposta (índice 8). */
export function MatrixSVG({ panels, gapIndex = 8, className }: { panels: PanelLight[]; gapIndex?: number; className?: string }) {
  const cells = Array.from({ length: 9 }, (_, i) => (i === gapIndex ? undefined : panels[i]));
  return (
    <div className={`qi-matrix ${className ?? ""}`}>
      {cells.map((p, i) => (
        <div key={i} className={`qi-cell${p === undefined ? " qi-cell--gap" : ""}`}>
          {p ? <PanelDeterministicoSVG panel={p} className="w-full h-full" /> : null}
        </div>
      ))}
    </div>
  );
}

export interface RendererTema {
  /** 6 cores das letras A–F (ou fundo das cápsulas). */
  letra: string;
  fundo: string;
}

export type OpcaoComId = { id: string; panel: PanelLight };

/**
 * Renderiza as 6 alternativas grandes (2 colunas × 3 linhas) para toque.
 */
export function OptionsGrid({
  options,
  labels = ["A", "B", "C", "D", "E", "F"],
  selectedIndex,
  onSelect,
  disabled,
}: {
  options: OpcaoComId[];
  labels?: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="qi-options" role="listbox" aria-label="Alternativas de resposta">
      {options.map((opt, i) => {
        const label = labels[i] ?? String.fromCharCode(65 + i);
        const selected = selectedIndex === i;
        return (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onSelect(i)}
            className={`qi-option${selected ? " qi-option--sel" : ""}`}
            data-qi-option={label}
            data-qi-id={opt.id}
          >
            <span className="qi-option-letter" aria-hidden="true">{label}</span>
            <span className="qi-option-panel">
              <PanelDeterministicoSVG panel={opt.panel} className="w-full h-full" />
            </span>
          </button>
        );
      })}
    </div>
  );
}