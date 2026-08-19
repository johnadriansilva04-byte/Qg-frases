import { useCallback, useEffect, useRef, useState } from "react";
import {
  FIELD,
  clampImpulse,
  initialDiscs,
  resetPositions,
  step,
  type Disc,
  type Side,
} from "../engine/physics";
import { planAiShot } from "../engine/ai";
import { teamByIdSync, type Team } from "../data/teams";
import type { Difficulty, MatchResult } from "../types";
import { RotateCcw } from "lucide-react";
import { AdsterraBanner } from "@/components/AdsterraBanner";
import { ControlledMonetagButton } from "@/components/ControlledMonetagButton";
import { armarSponsor } from "@/lib/sponsorGate";

type Props = {
  homeId: string;
  awayId: string;
  userSide: Side;
  difficulty: Difficulty;
  turns?: number;
  knockout?: boolean;
  stageLabel: string;
  onFinish: (result: MatchResult) => void;
  onQuit: () => void;
  isOnline?: boolean; // Nova prop para indicar modo online
  customTeam?: Team; // Time personalizado do usuário
  onPlay?: (
    goals: number,
    jogadaData?: { discId: string; ix: number; iy: number; power: number },
    posicoesFinais?: {
      discos: Array<{ id: string; x: number; y: number }>;
      bola: { x: number; y: number };
    },
  ) => void; // Callback chamado quando uma jogada termina (para sincronização online)
  initialTurn?: Side; // Turno inicial (para sincronização online)
  onJogadaAdversaria?: (handler: (jogada: any) => void) => void; // Registra handler para receber jogadas do adversário
  onFimDeTurno?: (
    handler: (payload: {
      discos: Array<{ id: string; x: number; y: number }>;
      bola: { x: number; y: number };
      jogadorId: string;
      novoTurnoId?: string;
    }) => void,
  ) => void; // Registra handler para receber fim de turno
  onGolAdversario?: (resetHandler: () => void) => void; // Registra handler para reset de bola quando o adversário marca gol
  score?: { home: number; away: number }; // Placar sincronizado do servidor (para modo online)
  formation?: Array<[number, number]>; // Formação personalizada PS2 (5 posições)
};

type Aim = { discId: string; px: number; py: number } | null;

export function MatchView({
  homeId,
  awayId,
  userSide,
  difficulty,
  turns = 24,
  knockout = false,
  stageLabel,
  onFinish,
  onQuit,
  isOnline = false,
  customTeam,
  onPlay,
  initialTurn,
  onJogadaAdversaria,
  onFimDeTurno,
  onGolAdversario,
  score: serverScore,
  formation,
}: Props) {
  // Função auxiliar para buscar time, usando o time personalizado se necessário
  const getTeam = (teamId: string): Team => {
    if (customTeam && teamId === customTeam.id) return customTeam;
    return teamByIdSync(teamId);
  };

  const home = getTeam(homeId);
  const away = getTeam(awayId);
  const cpuSide: Side = userSide === "home" ? "away" : "home";
  // No modo online, não há CPU - ambos os lados são jogadores reais
  const hasCpu = !isOnline;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const discsRef = useRef<Disc[]>(initialDiscs(formation));
  const aimRef = useRef<Aim>(null);
  const simRef = useRef(false);
  const turnRef = useRef<Side>(initialTurn || "home");
  const portraitRef = useRef(false);
  const scaleRef = useRef(1);
  const initializedRef = useRef(false); // Flag para evitar re-inicialização

  const [score, setScore] = useState({ home: 0, away: 0 });
  const [turnsLeft, setTurnsLeft] = useState(turns);
  const [turn, setTurn] = useState<Side>(initialTurn || "home");
  const [flash, setFlash] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [pens, setPens] = useState<{ home: number[]; away: number[] } | null>(null);
  const [aimPower, setAimPower] = useState(0);
  const [goalCooldown, setGoalCooldown] = useState<number | null>(null); // Cooldown de 5 segundos após gol
  // Intervalo da partida (halftime): exibe um container TV com anúncio AdSense
  // quando a partida cruza a metade das jogadas. Dispara uma única vez.
  const [halftime, setHalftime] = useState(false);
  const halftimeShownRef = useRef(false);

  // Sincronizar turnsLeft com a prop turns (para modo online)
  useEffect(() => {
    setTurnsLeft(turns);
  }, [turns]);

  // Sincronizar placar com a prop score (para modo online)
  useEffect(() => {
    if (serverScore && isOnline) {
      setScore(serverScore);
    }
  }, [serverScore, isOnline]);

  // Sincronizar turnsRef com turnsLeft (para uso interno)
  useEffect(() => {
    turnsRef.current = turnsLeft;
  }, [turnsLeft]);

  // Dispara o intervalo (halftime) quando a partida cruza a metade das jogadas.
  // No modo online não interrompe (evita dessincronizar o oponente).
  useEffect(() => {
    if (isOnline) return;
    if (halftimeShownRef.current || ended) return;
    const metade = Math.floor(turns / 2);
    if (turnsLeft <= metade && turnsLeft > 0) {
      halftimeShownRef.current = true;
      setHalftime(true);
    }
  }, [turnsLeft, turns, isOnline, ended]);

  // FIX CRÍTICO: Resetar flag de "já chutou" sempre que virar o turno do usuário
  // (modo offline). Sem isso, após o 1º chute o botão fica travado nas próximas jogadas.
  useEffect(() => {
    if (isOnline) return;
    if (turn === userSide && !simRef.current) {
      hasShotThisTurnRef.current = false;
      jogadaEmAndamentoRef.current = false;
    }
  }, [turn, userSide, isOnline]);

  const scoreRef = useRef(score);
  scoreRef.current = score;
  const turnsRef = useRef(turnsLeft);
  const endedRef = useRef(false);
  const historyRef = useRef<any[]>([]);
  const scoreHistoryRef = useRef<any[]>([]);
  const turnsHistoryRef = useRef<number[]>([]);
  const turnHistoryRef = useRef<Side[]>([]);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const jogadaEmAndamentoRef = useRef(false);
  const hasShotThisTurnRef = useRef(false); // Flag para prevenir disparo duplo de jogada
  const isRemotePlayRef = useRef(false); // Flag para diferenciar jogada remota de local

  const verificarFimDeMovimento = useCallback(() => {
    // Verificar se todos os discos e a bola estão em repouso
    const todosParados = discsRef.current.every((d) => {
      const velocidade = Math.hypot(d.vx, d.vy);
      return velocidade < 0.15;
    });

    if (todosParados && jogadaEmAndamentoRef.current) {
      // Limpar timer de segurança
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }

      // Congelar posições finais
      discsRef.current.forEach((d) => {
        d.vx = 0;
        d.vy = 0;
      });

      jogadaEmAndamentoRef.current = false;

      // Resetar flag de jogada remota
      isRemotePlayRef.current = false;
    }
  }, [isOnline, onPlay]);

  // Sincronizar turno com initialTurn quando mudar (modo online)
  // APENAS atualiza a flag de interatividade, não reinicializa o jogo
  useEffect(() => {
    if (initialTurn && isOnline && !initializedRef.current) {
      // Primeira inicialização
      turnRef.current = initialTurn;
      setTurn(initialTurn);
      initializedRef.current = true;
    } else if (initialTurn && isOnline && initializedRef.current) {
      // Atualizações subsequentes - sempre atualizar o turno
      if (!endedRef.current) {
        const turnoAnterior = turnRef.current;
        turnRef.current = initialTurn;
        setTurn(initialTurn);

        // Resetar flag de jogada quando o turno muda
        if (turnoAnterior !== initialTurn) {
          hasShotThisTurnRef.current = false;
        }
      }
    }
  }, [initialTurn, isOnline]);

  /* ---------- render loop ---------- */
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const W = wrap.clientWidth;
      const portrait = W < 620;
      portraitRef.current = portrait;
      const s = portrait ? W / FIELD.h : W / FIELD.w;
      scaleRef.current = s;
      const cw = W;
      const ch = portrait ? FIELD.w * s : FIELD.h * s;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        canvas.style.height = `${ch}px`;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      if (portrait) ctx.setTransform(0, s * dpr, -s * dpr, 0, cw * dpr, 0);
      else ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);

      drawField(ctx);
      drawDiscs(
        ctx,
        discsRef.current,
        home.primary,
        home.secondary,
        away.primary,
        away.secondary,
        // Rótulos dos botões aparecem no lado do usuário (home ou away).
        userSide === "home" ? home.botoesNomes : away.botoesNomes,
        userSide,
      );
      const aim = aimRef.current;
      if (aim) {
        const d = discsRef.current.find((x) => x.id === aim.discId);
        if (d) drawAim(ctx, d, aim.px, aim.py);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [home.primary, home.secondary, away.primary, away.secondary]);

  /* ---------- turn flow ---------- */
  const finishMatch = useCallback(
    (hg: number, ag: number) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setEnded(true);
      if (knockout && hg === ag) {
        const shoot = (): number[] =>
          Array.from({ length: 5 }, () => (Math.random() < 0.72 ? 1 : 0));
        let h = shoot();
        let a = shoot();
        let hs = h.reduce((x, y) => x + y, 0);
        let as = a.reduce((x, y) => x + y, 0);
        while (hs === as) {
          const eh = Math.random() < 0.7 ? 1 : 0;
          const ea = Math.random() < 0.7 ? 1 : 0;
          h = [...h, eh];
          a = [...a, ea];
          hs += eh;
          as += ea;
        }
        setPens({ home: h, away: a });
        setTimeout(
          () =>
            onFinish({ homeId, awayId, homeGoals: hg, awayGoals: ag, penHome: hs, penAway: as }),
          2600,
        );
      } else {
        setTimeout(() => onFinish({ homeId, awayId, homeGoals: hg, awayGoals: ag }), 1400);
      }
    },
    [knockout, onFinish, homeId, awayId],
  );

  const runSimulation = useCallback(() => {
    simRef.current = true;
    let frames = 0;
    let ownGoalDetected = false;
    const loop = () => {
      let goal: Side | null = null;
      for (let i = 0; i < 2; i++) {
        const r = step(discsRef.current);
        if (r.goal) goal = r.goal;
        if (r.ownGoal) ownGoalDetected = true;
        if (goal) break;
      }
      frames++;
      const moving = discsRef.current.some((d) => d.vx !== 0 || d.vy !== 0);

      // Verificar fim de movimento no modo online (chamar sempre se jogada em andamento)
      if (isOnline && jogadaEmAndamentoRef.current) {
        verificarFimDeMovimento();
      }

      if (goal) {
        const next = { ...scoreRef.current, [goal]: scoreRef.current[goal] + 1 };
        setScore(next);

        if (ownGoalDetected) {
          setFlash("GOL CONTRA!");
          setTimeout(() => setFlash(null), 1500);
          resetPositions(discsRef.current, formation);
          simRef.current = false;
          // No gol contra, quem sofreu o gol recebe a bola (não quem fez)
          const conceding: Side = goal === "home" ? "home" : "away";
          turnRef.current = conceding;
          setTurn(conceding);
          // Decrementa turnos normalmente (apenas no modo offline)
          if (!isOnline) {
            const left = turnsRef.current - 1;
            setTurnsLeft(left);
          }
          // Chamar onPlay para sincronização online (gol contra)
          if (onPlay) onPlay(1, { discId: "own_goal", ix: 0, iy: 0, power: 0 });
          if (!isOnline && turnsRef.current - 1 <= 0) {
            finishMatch(next.home, next.away);
            return;
          }
          return;
        }

        setFlash("GOOOOL!");
        resetPositions(discsRef.current, formation);
        setTimeout(() => setFlash(null), 1200);
        const conceding: Side = goal === "home" ? "away" : "home";
        // Quem sofreu o gol (conceding) recebe o próximo turno
        simRef.current = false;
        // Decrementa turnos normalmente (apenas no modo offline)
        const left = isOnline ? turnsRef.current : turnsRef.current - 1;
        if (!isOnline) {
          setTurnsLeft(left);
        }
        // Chamar onPlay para sincronização online (gol normal)
        if (onPlay) onPlay(1, { discId: "goal", ix: 0, iy: 0, power: 0 });
        if (left <= 0) {
          finishMatch(next.home, next.away);
          return;
        }

        // Dar 5 segundos para quem sofreu o gol tirar a bola do meio
        turnRef.current = conceding;
        setTurn(conceding);

        // Online: o turno é autoritativo do servidor (via Postgres Changes →
        // initialTurn). Não iniciar cooldown nem auto-pass local — isso evita
        // dessincronizar o turno com o servidor. Apenas offline tem o auto-pass.
        if (!isOnline) {
          setGoalCooldown(5);
          const cooldownInterval = setInterval(() => {
            setGoalCooldown((prev) => {
              if (prev === null || prev <= 1) {
                clearInterval(cooldownInterval);
                // Passar a vez automaticamente após 5 segundos
                if (!simRef.current && !ended) {
                  const nextTurn = conceding === "home" ? "away" : "home";
                  turnRef.current = nextTurn;
                  setTurn(nextTurn);
                  // Chamar onPlay para sincronização online quando passa a vez
                  if (onPlay) onPlay(0, { discId: "pass_turn", ix: 0, iy: 0, power: 0 });
                }
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }

        return;
      }
      if (!moving || frames > 900) {
        simRef.current = false;
        // Decrementa turnos normalmente (apenas no modo offline)
        if (!isOnline) {
          const left = turnsRef.current - 1;
          setTurnsLeft(left);
          if (left <= 0) {
            finishMatch(scoreRef.current.home, scoreRef.current.away);
            return;
          }
        } else {
          // No modo online, chamar onPlay para sincronizar jogada sem gol
          if (onPlay) onPlay(0, { discId: "no_goal", ix: 0, iy: 0, power: 0 });
        }

        // No modo online, enviar posições finais e NÃO alternar turno localmente
        if (isOnline) {
          // Coletar posições finais de todos os discos e da bola
          const posicoesFinais = {
            discos: discsRef.current.map((d) => ({ id: d.id, x: d.x, y: d.y })),
            bola: discsRef.current.find((d) => d.side === "ball") || { x: 0, y: 0 },
          };
          // Chamar onPlay com posições finais para sincronização
          if (onPlay) onPlay(0, { discId: "no_goal", ix: 0, iy: 0, power: 0 }, posicoesFinais);
        } else {
          turnRef.current = turnRef.current === "home" ? "away" : "home";
          setTurn(turnRef.current);
          if (onPlay) onPlay(0, { discId: "no_goal", ix: 0, iy: 0, power: 0 });
        }
        return;
      }
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }, [finishMatch, isOnline]);

  // Receber e aplicar jogadas do adversário
  useEffect(() => {
    if (!isOnline || !onJogadaAdversaria) return;

    const handleJogadaAdversaria = (jogada: any) => {
      // Encontrar o disco correspondente
      const disco = discsRef.current.find((d) => d.id === jogada.id_botao);
      if (!disco) {
        return;
      }

      // Aplicar a força recebida do adversário
      // Usar forca_x e forca_y se disponíveis, caso contrário calcular do ângulo
      let ix, iy;
      if (jogada.forca_x !== undefined && jogada.forca_y !== undefined) {
        ix = jogada.forca_x;
        iy = jogada.forca_y;
      } else {
        const rad = (jogada.angulo * Math.PI) / 180;
        const forcaNormalizada = jogada.forca / 100;
        ix = Math.cos(rad) * forcaNormalizada;
        iy = Math.sin(rad) * forcaNormalizada;
      }

      // Marcar como jogada remota para não disparar onPlay ao terminar
      isRemotePlayRef.current = true;
      jogadaEmAndamentoRef.current = true;

      // Aplicar velocidade ao disco
      disco.vx = ix;
      disco.vy = iy;

      // Iniciar simulação imediatamente
      runSimulation();
    };

    // Registrar o handler
    onJogadaAdversaria(handleJogadaAdversaria);
  }, [isOnline, onJogadaAdversaria, runSimulation]);

  // Receber e aplicar posições finais do fim de turno
  useEffect(() => {
    if (!isOnline || !onFimDeTurno) return;

    const handleFimDeTurno = (payload: {
      discos: Array<{ id: string; x: number; y: number }>;
      bola: { x: number; y: number };
      jogadorId: string;
    }) => {
      // Resetar flag de jogada quando receber fim de turno
      hasShotThisTurnRef.current = false;

      // Aplicar posições finais aos discos
      payload.discos.forEach((discoFinal) => {
        const discoLocal = discsRef.current.find((d) => d.id === discoFinal.id);
        if (discoLocal) {
          discoLocal.x = discoFinal.x;
          discoLocal.y = discoFinal.y;
          discoLocal.vx = 0;
          discoLocal.vy = 0;
        }
      });

      // Aplicar posição final da bola
      const bolaLocal = discsRef.current.find((d) => d.side === "ball");
      if (bolaLocal) {
        bolaLocal.x = payload.bola.x;
        bolaLocal.y = payload.bola.y;
        bolaLocal.vx = 0;
        bolaLocal.vy = 0;
      }

      // Forçar re-renderização
      setAimPower((prev) => prev); // Trigger re-render
    };

    // Registrar o handler passando a função callback
    if (typeof onFimDeTurno === "function") {
      onFimDeTurno(handleFimDeTurno);
    }
  }, [isOnline, onFimDeTurno]);

  // Reset de bola/discos quando o ADVERSÁRIO marca um gol (recebido via broadcast).
  // O lado que sofreu o gol precisa recolocar a bola ao centro, mesmo que sua
  // física local não tenha detectado o gol (divergência de simulação).
  useEffect(() => {
    if (!isOnline || !onGolAdversario) return;
    const resetarAposGolAdversario = () => {
      resetPositions(discsRef.current, formation);
      simRef.current = false;
      jogadaEmAndamentoRef.current = false;
      hasShotThisTurnRef.current = false;
      isRemotePlayRef.current = false;
      setGoalCooldown(null);
      setAimPower((prev) => prev); // força re-render
    };
    if (typeof onGolAdversario === "function") {
      onGolAdversario(resetarAposGolAdversario);
    }
  }, [isOnline, onGolAdversario]);

  // jogada da CPU (desabilitado no modo online)
  useEffect(() => {
    if (!hasCpu || ended || turn !== cpuSide || simRef.current) return;
    const cpuTeam = cpuSide === "home" ? home : away;
    const t = setTimeout(() => {
      const shot = planAiShot(discsRef.current, cpuSide, difficulty, cpuTeam.power);
      if (!shot) return;
      const d = discsRef.current.find((x) => x.id === shot.discId);
      if (!d) return;
      d.vx = shot.ix;
      d.vy = shot.iy;
      runSimulation();
    }, 750);
    return () => clearTimeout(t);
  }, [hasCpu, turn, cpuSide, difficulty, ended, home, away, runSimulation]);

  // Timer de 10 segundos para jogar (apenas no modo offline)
  useEffect(() => {
    if (isOnline || ended) return;
    // Só iniciar timer se for o turno do usuário e não estiver simulando
    if (turn !== userSide) return;
    if (simRef.current) return;

    const timer = window.setTimeout(() => {
      // Passar a vez após 10 segundos sem chutar
      if (simRef.current || endedRef.current) return;
      const nextTurn = turn === "home" ? "away" : "home";
      turnRef.current = nextTurn;
      setTurn(nextTurn);
    }, 10000);

    return () => {
      clearTimeout(timer);
    };
  }, [turn, userSide, ended, isOnline]);

  /* ---------- input ---------- */
  const toField = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const s = scaleRef.current;
    if (portraitRef.current) return { x: sy / s, y: (rect.width - sx) / s };
    return { x: sx / s, y: sy / s };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // No modo online, bloqueia input se não for o turno do usuário
    if (ended || simRef.current) return;
    if (!isOnline && turn !== userSide) return;
    if (isOnline && turn !== userSide) {
      return; // Input bloqueado - não é seu turno
    }
    // Bloquear input durante cooldown após gol
    if (goalCooldown !== null) return;
    const { x, y } = toField(e);
    const hit = discsRef.current
      .filter((d) => d.side === userSide)
      .find((d) => Math.hypot(d.x - x, d.y - y) < d.r * 1.5);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aimRef.current = { discId: hit.id, px: x, py: y };
    setAimPower(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!aimRef.current) return;
    const { x, y } = toField(e);
    aimRef.current = { ...aimRef.current, px: x, py: y };
    const d = discsRef.current.find((dd) => dd.id === aimRef.current!.discId);
    if (d) setAimPower(clampImpulse(d.x - x, d.y - y).power);
  };

  const onPointerUp = () => {
    const aim = aimRef.current;
    aimRef.current = null;
    setAimPower(0);
    if (!aim || ended || simRef.current) return;
    const d = discsRef.current.find((x) => x.id === aim.discId);
    if (!d) return;
    const { ix, iy, power } = clampImpulse(d.x - aim.px, d.y - aim.py);
    if (power < 0.06) return;

    // Prevenir disparo duplo de jogada no mesmo turno
    if (hasShotThisTurnRef.current) {
      return;
    }

    // Salvar estado antes da jogada
    historyRef.current.push(JSON.parse(JSON.stringify(discsRef.current)));
    scoreHistoryRef.current.push({ ...scoreRef.current });
    turnsHistoryRef.current.push(turnsRef.current);
    turnHistoryRef.current.push(turnRef.current);

    d.vx = ix;
    d.vy = iy;

    // Marcar jogada como em andamento e marcar que já jogou neste turno
    jogadaEmAndamentoRef.current = true;
    hasShotThisTurnRef.current = true;

    // Iniciar timer de segurança de 6 segundos
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
    }
    safetyTimerRef.current = setTimeout(() => {
      // Forçar parada após 6 segundos
      if (jogadaEmAndamentoRef.current) {
        discsRef.current.forEach((disc) => {
          disc.vx = 0;
          disc.vy = 0;
        });
        jogadaEmAndamentoRef.current = false;

        // Enviar posições finais mesmo com timeout
        if (isOnline && onPlay) {
          const posicoesFinais = {
            discos: discsRef.current.map((d) => ({ id: d.id, x: d.x, y: d.y })),
            bola: discsRef.current.find((d) => d.side === "ball") || { x: 0, y: 0 },
          };
          onPlay(0, { discId: "no_goal", ix: 0, iy: 0, power: 0 }, posicoesFinais);
        }
      }
    }, 6000);

    // No modo online, enviar broadcast imediato da jogada com vetor de força
    if (isOnline && onPlay) {
      onPlay(0, { discId: d.id, ix, iy, power });
    }

    runSimulation();
  };

  const userTeam = userSide === "home" ? home : away;
  const yourTurn = turn === userSide && !ended;

  // Função para voltar uma jogada
  const undoLastMove = () => {
    if (historyRef.current.length === 0 || simRef.current || ended) return;

    // Restaurar estado anterior
    const previousDiscs = historyRef.current.pop();
    const previousScore = scoreHistoryRef.current.pop();
    const previousTurns = turnsHistoryRef.current.pop();
    const previousTurn = turnHistoryRef.current.pop();

    if (previousDiscs) {
      discsRef.current = previousDiscs;
      setScore(previousScore || { home: 0, away: 0 });
      setTurnsLeft(previousTurns || turns);
      setTurn(previousTurn || "home");

      // Atualizar refs
      scoreRef.current = previousScore || { home: 0, away: 0 };
      turnsRef.current = previousTurns || turns;
      turnRef.current = previousTurn || "home";
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-8">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {stageLabel}
          </p>
          <h2 className="truncate font-display text-lg text-foreground sm:text-2xl">
            {home.short} <span className="text-muted-foreground">vs</span> {away.short}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={undoLastMove}
            disabled={historyRef.current.length === 0 || simRef.current || ended}
            className="btn-ghost shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Voltar jogada"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onQuit} className="btn-ghost shrink-0">
            Sair
          </button>
        </div>
      </div>

      <div className="scoreboard mb-3">
        <TeamChip team={home} align="left" />
        <div className="text-center">
          <div className="font-display text-3xl leading-none text-foreground sm:text-4xl">
            {score.home} <span className="text-muted-foreground">-</span> {score.away}
          </div>
          <div className="mt-1 text-[11px] tracking-widest text-muted-foreground uppercase">
            {ended ? "Fim de jogo" : `${turnsLeft} jogadas`}
          </div>
        </div>
        <TeamChip team={away} align="right" />
      </div>

      <div ref={wrapRef} className="relative">
        <canvas
          ref={canvasRef}
          className={`pitch-canvas w-full touch-none select-none`}
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={(e) => {
            e.preventDefault();
          }}
          onTouchMove={(e) => {
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
          }}
        />
        {isOnline && turn !== userSide && !ended && (
          <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2">
            <div className="bg-black/70 px-3 py-1 rounded-full">
              <p className="font-display text-xs text-white">Aguardando oponente...</p>
            </div>
          </div>
        )}
        {flash && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="goal-flash font-display text-4xl sm:text-6xl">{flash}</span>
          </div>
        )}
        {goalCooldown !== null && (
          <div className="pointer-events-none absolute top-4 right-4">
            <div className="flex flex-col items-end gap-1">
              <span className="font-display text-sm text-muted-foreground">Tirar bola do meio</span>
              <span className="font-mono text-2xl text-primary font-bold">{goalCooldown}s</span>
            </div>
          </div>
        )}
        {pens && (
          <div className="absolute inset-0 grid place-items-center bg-background/85 px-4">
            <div className="text-center">
              <p className="font-display text-2xl text-foreground">Disputa de pênaltis</p>
              <p className="mt-2 font-mono text-sm text-muted-foreground">
                {home.short}: {pens.home.map((v) => (v ? "●" : "○")).join(" ")}
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {away.short}: {pens.away.map((v) => (v ? "●" : "○")).join(" ")}
              </p>
            </div>
          </div>
        )}

        {/* Intervalo da partida: container TV com anúncio e botão controlado de Monetag.
            Pausa o jogo até o treinador continuar (botão "Voltar ao jogo"). */}
        {halftime && !ended && (
          <div className="halftime-tv">
            <div className="halftime-tv-frame">
              <div className="halftime-tv-bar">
                <span className="halftime-tv-dot" />
                Intervalo · Patrocínio
              </div>
              <div className="p-3">
                <AdsterraBanner slotId="intervalo" className="min-h-[120px]" />
              </div>
              <div className="my-3">
                <ControlledMonetagButton
                  className="w-full text-xs"
                  message="Uma página de patrocinador pode abrir durante o intervalo. Deseja continuar?"
                >
                  Ver patrocinador
                </ControlledMonetagButton>
              </div>
              <div className="my-4 text-center text-xs text-muted-foreground">
                Publicidade
              </div>
              <button
                onClick={() => setHalftime(false)}
                className="halftime-tv-continue btn-primary"
              >
                Voltar ao jogo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {ended ? (
            "Apurando o resultado..."
          ) : yourTurn ? (
            <>
              Sua vez, <span className="text-foreground">{userTeam.short}</span> — arraste um botão
              pra trás e solte.
            </>
          ) : isOnline ? (
            "Aguardando o oponente..."
          ) : (
            "A CPU está pensando..."
          )}
        </p>
        <div className="power-bar shrink-0" aria-hidden>
          <span style={{ width: `${Math.round(aimPower * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function TeamChip({ team, align }: { team: Team; align: "left" | "right" }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <span 
        className="text-2xl sm:text-3xl"
        style={{ 
          background: `linear-gradient(135deg, ${team.primary}, ${team.secondary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
        }}
      >
        {team.escudo || "⚽"}
      </span>
      <span className="truncate font-display text-sm text-foreground sm:text-base">
        {team.short}
      </span>
    </div>
  );
}

/* ---------- drawing ---------- */
function drawField(ctx: CanvasRenderingContext2D) {
  const { w, h, margin, goalHeight } = FIELD;
  ctx.fillStyle = "#0e6b3c";
  ctx.fillRect(0, 0, w, h);
  // listras
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let i = 0; i < 10; i += 2)
    ctx.fillRect(
      margin + (i * (w - margin * 2)) / 10,
      margin,
      (w - margin * 2) / 10,
      h - margin * 2,
    );

  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
  ctx.beginPath();
  ctx.moveTo(w / 2, margin);
  ctx.lineTo(w / 2, h - margin);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 78, 0, Math.PI * 2);
  ctx.stroke();

  const areaH = 300;
  const areaW = 130;
  ctx.strokeRect(margin, (h - areaH) / 2, areaW, areaH);
  ctx.strokeRect(w - margin - areaW, (h - areaH) / 2, areaW, areaH);

  // gols
  const gt = (h - goalHeight) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(margin - 22, gt, 22, goalHeight);
  ctx.fillRect(w - margin, gt, 22, goalHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.strokeRect(margin - 22, gt, 22, goalHeight);
  ctx.strokeRect(w - margin, gt, 22, goalHeight);
}

function drawDiscs(
  ctx: CanvasRenderingContext2D,
  discs: Disc[],
  hp: string,
  hs: string,
  ap: string,
  as: string,
  userNomes?: string[],
  userSide: "home" | "away" = "home",
) {
  for (const d of discs) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(d.x, d.y + 3, d.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    if (d.side === "ball") {
      ctx.fillStyle = "#fdfdfd";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#333";
      ctx.stroke();
    } else {
      const primary = d.side === "home" ? hp : ap;
      const secondary = d.side === "home" ? hs : as;
      const grad = ctx.createRadialGradient(
        d.x - d.r * 0.35,
        d.y - d.r * 0.4,
        d.r * 0.15,
        d.x,
        d.y,
        d.r,
      );
      grad.addColorStop(0, "rgba(255,255,255,0.55)");
      grad.addColorStop(0.35, primary);
      grad.addColorStop(1, primary);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = d.keeper ? 6 : 4;
      ctx.strokeStyle = secondary;
      ctx.stroke();
      if (d.keeper) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = secondary;
        ctx.fill();
      }
      // Rótulo do botão (nome do jogador) para o lado do usuário.
      if (d.side === userSide && !d.keeper) {
        const idx = Number(d.id.replace(`${userSide}-`, "")) - 1;
        const nome = userNomes?.[idx];
        if (nome) {
          ctx.font = "700 18px var(--font-display, system-ui)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "rgba(0,0,0,0.75)";
          ctx.strokeText(nome.slice(0, 10), d.x, d.y);
          ctx.fillStyle = "#fff";
          ctx.fillText(nome.slice(0, 10), d.x, d.y);
        }
      }
    }
    ctx.restore();
  }
}

function drawAim(ctx: CanvasRenderingContext2D, d: Disc, px: number, py: number) {
  const { ix, iy, power } = clampImpulse(d.x - px, d.y - py);
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = `rgba(255, 214, 90, ${0.4 + power * 0.6})`;
  ctx.beginPath();
  ctx.moveTo(d.x, d.y);
  ctx.lineTo(d.x + ix * 9, d.y + iy * 9);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,214,90,0.85)";
  ctx.fill();
  ctx.restore();
}
