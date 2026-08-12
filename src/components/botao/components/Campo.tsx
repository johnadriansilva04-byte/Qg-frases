import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMPO,
  aplicarToque,
  bola,
  clonar,
  emRepouso,
  formacaoInicial,
  jogadaDaIA,
  passo,
  type Lado,
  type Peca,
} from "@/lib/botao/engine";

/** Paleta do desenho no canvas (canvas não aceita classes utilitárias). */
const TINTA = {
  gramaClaro: "#2f7d4f",
  gramaEscuro: "#2a7047",
  linha: "rgba(255,255,255,0.78)",
  bola: "#f7f5ef",
  mira: "rgba(255,214,102,0.95)",
  sombra: "rgba(0,0,0,0.35)",
  retroGrama: "#6d6350",
  retroGramaEscuro: "#655c4a",
  retroLinha: "rgba(255,247,220,0.7)",
};

export type FimDaJogada = {
  golDe: Lado | null;
  tocouBola: boolean;
};

type Props = {
  coresA: string[];
  coresB: string[];
  ladoAtivo: Lado;
  /** Lados que este dispositivo controla. */
  ladosControlados: Lado[];
  /** Lado jogado pela IA (opcional). */
  iaLado?: Lado | null;
  dificuldadeIA?: number;
  bloqueado?: boolean;
  retro?: boolean;
  resetKey?: number;
  onFimDaJogada: (r: FimDaJogada) => void;
};

export function Campo({
  coresA,
  coresB,
  ladoAtivo,
  ladosControlados,
  iaLado = null,
  dificuldadeIA = 0.7,
  bloqueado = false,
  retro = false,
  resetKey = 0,
  onFimDaJogada,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pecasRef = useRef<Peca[]>(formacaoInicial());
  const animRef = useRef<number | null>(null);
  const rodandoRef = useRef(false);
  const arrastoRef = useRef<{ pecaId: string; x: number; y: number } | null>(null);
  const [, forcarRender] = useState(0);

  const escala = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return canvas.clientWidth / CAMPO.w;
  }, []);

  /* ------------------------------- Desenho ------------------------------- */
  const desenhar = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const larguraCss = canvas.clientWidth;
    const alturaCss = (larguraCss * CAMPO.h) / CAMPO.w;
    if (canvas.width !== Math.round(larguraCss * dpr) || canvas.height !== Math.round(alturaCss * dpr)) {
      canvas.width = Math.round(larguraCss * dpr);
      canvas.height = Math.round(alturaCss * dpr);
      canvas.style.height = `${alturaCss}px`;
    }
    const s = larguraCss / CAMPO.w;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    ctx.clearRect(0, 0, CAMPO.w, CAMPO.h);

    const claro = retro ? TINTA.retroGrama : TINTA.gramaClaro;
    const escuro = retro ? TINTA.retroGramaEscuro : TINTA.gramaEscuro;
    const linha = retro ? TINTA.retroLinha : TINTA.linha;

    // faixas do gramado
    const faixas = 10;
    for (let i = 0; i < faixas; i++) {
      ctx.fillStyle = i % 2 === 0 ? claro : escuro;
      ctx.fillRect(0, (i * CAMPO.h) / faixas, CAMPO.w, CAMPO.h / faixas + 0.2);
    }

    // linhas
    ctx.strokeStyle = linha;
    ctx.lineWidth = 0.6;
    ctx.strokeRect(2, 2, CAMPO.w - 4, CAMPO.h - 4);
    ctx.beginPath();
    ctx.moveTo(2, CAMPO.h / 2);
    ctx.lineTo(CAMPO.w - 2, CAMPO.h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CAMPO.w / 2, CAMPO.h / 2, 13, 0, Math.PI * 2);
    ctx.stroke();

    // áreas e gols
    const areaX = (CAMPO.w - CAMPO.areaW) / 2;
    ctx.strokeRect(areaX, 2, CAMPO.areaW, CAMPO.areaH);
    ctx.strokeRect(areaX, CAMPO.h - 2 - CAMPO.areaH, CAMPO.areaW, CAMPO.areaH);
    const golX = (CAMPO.w - CAMPO.golW) / 2;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "#f5f3ec";
    ctx.beginPath();
    ctx.moveTo(golX, 2);
    ctx.lineTo(golX + CAMPO.golW, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(golX, CAMPO.h - 2);
    ctx.lineTo(golX + CAMPO.golW, CAMPO.h - 2);
    ctx.stroke();

    // peças
    for (const p of pecasRef.current) {
      const cores = p.lado === "A" ? coresA : coresB;
      ctx.beginPath();
      ctx.arc(p.x + 0.7, p.y + 1, p.r, 0, Math.PI * 2);
      ctx.fillStyle = TINTA.sombra;
      ctx.fill();

      if (p.lado === "BOLA") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = TINTA.bola;
        ctx.fill();
        ctx.lineWidth = 0.35;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.stroke();
        continue;
      }

      // botão: base + anel + miolo com as 3 cores do time
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = cores[0] ?? "#dddddd";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.68, 0, Math.PI * 2);
      ctx.fillStyle = cores[1] ?? "#ffffff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = cores[2] ?? "#333333";
      ctx.fill();
      ctx.lineWidth = 0.3;
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.stroke();

      if (p.gk) {
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.88, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // linha de mira do estilingue
    const arr = arrastoRef.current;
    if (arr) {
      const peca = pecasRef.current.find((p) => p.id === arr.pecaId);
      if (peca) {
        ctx.strokeStyle = TINTA.mira;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 1.6]);
        ctx.beginPath();
        ctx.moveTo(peca.x, peca.y);
        ctx.lineTo(peca.x - (arr.x - peca.x), peca.y - (arr.y - peca.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [coresA, coresB, retro]);

  /* ------------------------------ Simulação ------------------------------ */
  const simular = useCallback(() => {
    let tocouBola = false;
    let golDe: Lado | null = null;
    let ultimo = performance.now();
    rodandoRef.current = true;

    const loop = (agora: number) => {
      const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
      ultimo = agora;
      for (let i = 0; i < 3; i++) {
        const r = passo(pecasRef.current, dt / 3);
        if (r.bolaTocadaPor === ladoAtivo) tocouBola = true;
        if (r.golDe && !golDe) golDe = r.golDe;
      }
      desenhar();

      if (golDe || emRepouso(pecasRef.current)) {
        rodandoRef.current = false;
        animRef.current = null;
        if (golDe) {
          pecasRef.current = formacaoInicial();
          desenhar();
        }
        onFimDaJogada({ golDe, tocouBola });
        forcarRender((n) => n + 1);
        return;
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, [desenhar, ladoAtivo, onFimDaJogada]);

  /* ---------------------------- Toque do jogador -------------------------- */
  const posicaoDoEvento = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const s = escala();
    return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s };
  };

  const podeJogar =
    !bloqueado && !rodandoRef.current && ladosControlados.includes(ladoAtivo) && iaLado !== ladoAtivo;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!podeJogar) return;
    const { x, y } = posicaoDoEvento(e);
    const alvo = pecasRef.current
      .filter((p) => p.lado === ladoAtivo)
      .find((p) => Math.hypot(p.x - x, p.y - y) < p.r * 2);
    if (!alvo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastoRef.current = { pecaId: alvo.id, x, y };
    desenhar();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!arrastoRef.current) return;
    const { x, y } = posicaoDoEvento(e);
    arrastoRef.current = { ...arrastoRef.current, x, y };
    desenhar();
  };

  const onPointerUp = () => {
    const arr = arrastoRef.current;
    arrastoRef.current = null;
    if (!arr || !podeJogar) {
      desenhar();
      return;
    }
    const peca = pecasRef.current.find((p) => p.id === arr.pecaId);
    if (!peca) return;
    const dirX = peca.x - arr.x;
    const dirY = peca.y - arr.y;
    const dist = Math.hypot(dirX, dirY);
    if (dist < 1.5) {
      desenhar();
      return;
    }
    aplicarToque(peca, dirX, dirY, Math.min(dist / 32, 1));
    simular();
  };

  /* ------------------------------- Efeitos ------------------------------- */
  useEffect(() => {
    pecasRef.current = formacaoInicial();
    desenhar();
  }, [resetKey, desenhar]);

  useEffect(() => {
    desenhar();
    const onResize = () => desenhar();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [desenhar]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // IA joga sozinha quando é a vez dela
  useEffect(() => {
    if (!iaLado || iaLado !== ladoAtivo || bloqueado) return;
    const timer = window.setTimeout(() => {
      if (rodandoRef.current) return;
      const jogada = jogadaDaIA(clonar(pecasRef.current), iaLado, dificuldadeIA);
      const peca = pecasRef.current.find((p) => p.id === jogada.pecaId);
      if (!peca) return;
      aplicarToque(peca, jogada.dirX, jogada.dirY, jogada.forca);
      simular();
    }, 850);
    return () => window.clearTimeout(timer);
  }, [iaLado, ladoAtivo, bloqueado, dificuldadeIA, simular]);

  const b = bola(pecasRef.current);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="w-full touch-none rounded-2xl border border-border shadow-card select-none"
        aria-label="Tabuleiro de futebol de botão"
      />
      <span className="sr-only">
        Bola em {Math.round(b.x)}, {Math.round(b.y)}
      </span>
    </div>
  );
}
