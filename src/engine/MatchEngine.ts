import * as THREE from "three";
import { buildField, FIELD } from "./field";
import { createBallMesh, createPlayerRigWithFallback, type PlayerRig } from "./playerModel";
import { playerModelCache, FBX_PATHS } from "./playerModelCache";
import { InputSystem } from "./input";
import {
  TOTAL_COBRANCAS,
  DESFECHO_ROTULO,
  tipoDaCobranca,
  distanciaDaCobranca,
  swipeParaChute,
  alcanceGoleiro,
  escolherMergulhoGoleiro,
  calcularDesfecho,
  resolverCobrancaAdversaria,
  type ChuteParams,
  type Desfecho,
  type SwipeInput,
} from "./cobrancas";
import type {
  MatchEvent,
  MatchLiveState,
  MatchPlayerInput,
  MatchPlayerStats,
  MatchResult,
  MatchSetup,
  TeamSide,
} from "./types";

export interface EngineCallbacks {
  onEvent?: (e: MatchEvent) => void;
  onState?: (s: MatchLiveState) => void;
  onFinish?: (r: MatchResult) => void;
}

type Fase = "aim" | "flight" | "outcome" | "finished";
type EstadoAtor = "idle" | "run" | "save" | "recover" | "celebrate";

/** Ator da disputa: só existem DOIS — o cobrador (controlado) e o goleiro. */
interface Ator {
  rig: PlayerRig;
  data: MatchPlayerInput;
  side: TeamSide;
  x: number;
  z: number;
  heading: number;
  state: EstadoAtor;
  stateTimer: number;
  isKeeper: boolean;
  isControlled: boolean;
  saves: number;
  currentAnimation?: string | undefined;
}

interface CobrancaEmVoo {
  chute: ChuteParams;
  keeperZ: number;
  alcance: number;
  desfecho: Desfecho;
  tFlight: number;
  resolvido: boolean;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * MOTOR DA DISPUTA DE COBRANÇAS (pênaltis + faltas).
 *
 * Escopo cirúrgico: a partida NÃO é mais futebol em tempo real. O jogador
 * executa 15 cobranças por SWIPE (direção + força + elevação); o adversário
 * tem 15 cobranças resolvidas deterministicamente (nunca exibidas). O
 * contrato público (MatchSetup → MatchResult, mesma classe/callbacks) é
 * preservado — carreira, SOV e persistência não foram tocados.
 *
 * Reutilizados do motor anterior: campo/estádio (buildField), bola
 * (createBallMesh + física de gravidade/quique), rigs FBX com fallback
 * procedural (createPlayerRigWithFallback + playerModelCache), o clip de
 * defesa do goleiro e a regra de alcance espacial da defesa.
 *
 * Removidos do fluxo (não fazem mais parte do jogo): corrida, movimentação
 * livre, carrinho, desarme, contato físico, IA de linha, posse, drible,
 * passes, marcação, tática, impedimento, laterais/escanteios.
 */
export class MatchEngine {
  readonly input = new InputSystem();

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private quality: "low" | "high";

  private ball: { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3 };
  private keeper!: Ator;
  private taker!: Ator;
  /** Exposto para ferramentas de depuração/E2E (os DOIS atores da disputa). */
  readonly players: Ator[] = [];

  private events: MatchEvent[] = [];
  private score = { home: 0, away: 0 };

  // ---- Estado da disputa ----
  private phase: Fase = "aim";
  private shotIndex = 1; // 1..TOTAL_COBRANCAS (cobrança atual do jogador)
  private playerGoals = 0;
  private opponentShots = 0;
  private opponentGoals = 0;
  private advResults: Desfecho[] = [];
  private voo: CobrancaEmVoo | null = null;
  private outcomeTimer = 0;
  private lastOutcome: string | undefined;
  private opponentFeed: string | undefined;

  private running = false;
  private finished = false;
  private raf = 0;
  private last = 0;
  private resizeObs: ResizeObserver | null = null;

  /** Linha discreta de dica de trajetória (visível só durante o arraste). */
  private aimLine: THREE.Line;
  private aimLineGeo: THREE.BufferGeometry;

  private readonly goalX = -FIELD.halfLength; // gol atacado (sempre -x)

  constructor(
    private canvas: HTMLCanvasElement,
    private setup: MatchSetup,
    private cb: EngineCallbacks = {}
  ) {
    this.scene = new THREE.Scene();
    this.ball = {
      mesh: createBallMesh(),
      pos: new THREE.Vector3(0, 0.11, 0),
      vel: new THREE.Vector3(0, 0, 0),
    };

    const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.quality = mobile ? "low" : "high";

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.3 : 2));
    this.renderer.shadowMap.enabled = this.quality === "high";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.camera = new THREE.PerspectiveCamera(mobile ? 62 : 55, 16 / 9, 0.5, 400);

    buildField(this.scene, this.quality);
    this.scene.add(this.ball.mesh);

    // Dica de trajetória (linha discreta bola → alvo previsto).
    this.aimLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.aimLine = new THREE.Line(
      this.aimLineGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
    );
    this.aimLine.visible = false;
    this.scene.add(this.aimLine);

    // Preload dos modelos FBX (upgrade-in-place quando chegar).
    this.preloadModels().catch((err: unknown) => {
      console.warn("[MatchEngine] Preload FBX falhou — rigs procedurais:", err);
    });

    this.spawnAtores();

    // Resultados do adversário: pré-computados e DETERMINÍSTICOS (matchId +
    // índice) — F5 nunca transforma nem duplica uma cobrança.
    const atk = this.mediaAttr(this.timeAdversario().players, "shooting", (p) => p.role === "FW");
    const gkDef = this.timeControlado().players[0]?.attributes.defending ?? 60;
    this.advResults = Array.from({ length: TOTAL_COBRANCAS }, (_, i) =>
      resolverCobrancaAdversaria(setup.matchId, i + 1, atk, gkDef)
    );

    // Swipe: dedo OU mouse sobre o canvas; soltar = cobrar.
    this.input.attachSwipe(canvas);
    this.input.onSwipeEnd = (s) => this.executarCobranca(s);

    this.handleResize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObs = new ResizeObserver(() => this.handleResize());
      if (canvas.parentElement) this.resizeObs.observe(canvas.parentElement);
    }
    window.addEventListener("resize", this.handleResize);

    // Gancho de teste/depuração: expõe o motor no window (sem custo em prod).
    (window as unknown as { __engine3d?: MatchEngine }).__engine3d = this;

    this.setupCobranca();
    this.emit({
      type: "kickoff",
      minute: 0,
      detail: `${setup.home.name} x ${setup.away.name} — disputa de cobranças`,
    });
  }

  // ---------------------------------------------------------------- setup

  private timeControlado() {
    return this.setup.controlledSide === "home" ? this.setup.home : this.setup.away;
  }

  private timeAdversario() {
    return this.setup.controlledSide === "home" ? this.setup.away : this.setup.home;
  }

  private mediaAttr(
    players: MatchPlayerInput[],
    attr: keyof MatchPlayerInput["attributes"],
    filtro?: (p: MatchPlayerInput) => boolean
  ): number {
    const lista = filtro ? players.filter(filtro) : players;
    const base = lista.length ? lista : players;
    if (!base.length) return 60;
    return base.reduce((s, p) => s + p.attributes[attr], 0) / base.length;
  }

  private spawnAtores() {
    const meu = this.timeControlado();
    const adv = this.timeAdversario();
    const cobradorData =
      meu.players.find((p) => p.id === this.setup.controlledPlayerId) ??
      meu.players[meu.players.length - 1]!;
    const goleiroData = adv.players[0]!; // primeiro do elenco é o goleiro

    const rigTaker = createPlayerRigWithFallback(meu.colors.primary, meu.colors.secondary, true, false);
    const rigKeeper = createPlayerRigWithFallback(adv.colors.primary, adv.colors.secondary, false, true);

    this.taker = {
      rig: rigTaker,
      data: cobradorData,
      side: this.setup.controlledSide,
      x: 0,
      z: 0,
      heading: -Math.PI / 2,
      state: "idle",
      stateTimer: 0,
      isKeeper: false,
      isControlled: true,
      saves: 0,
    };
    this.keeper = {
      rig: rigKeeper,
      data: goleiroData,
      side: this.setup.controlledSide === "home" ? "away" : "home",
      x: this.goalX + 0.7,
      z: 0,
      heading: Math.PI / 2,
      state: "idle",
      stateTimer: 0,
      isKeeper: true,
      isControlled: false,
      saves: 0,
    };
    this.players.push(this.taker, this.keeper);
    this.scene.add(rigTaker.group, rigKeeper.group);
  }

  private async preloadModels(): Promise<void> {
    console.log("[MatchEngine.preloadModels] Iniciando preload de modelos FBX...");
    const animationMap = new Map<string, string>([
      ["run", FBX_PATHS.ANIMATIONS.run],
      ["save", FBX_PATHS.ANIMATIONS.save],
      ["trip", FBX_PATHS.ANIMATIONS.trip],
    ]);
    await playerModelCache.loadModel(FBX_PATHS.BASE_MODEL, animationMap);
    console.log("[MatchEngine.preloadModels] ✓ Preload concluído");
    this.upgradeRigsToFBX();
  }

  /**
   * Troca rigs procedurais pelos FBX no meio da partida, preservando
   * posição/rotação — os dois atores ganham o modelo real assim que o
   * download de 50MB termina.
   */
  private upgradeRigsToFBX() {
    for (const a of this.players) {
      if (a.rig.fbxRig) continue;
      const cores = a.isControlled ? this.timeControlado().colors : this.timeAdversario().colors;
      const novo = createPlayerRigWithFallback(cores.primary, cores.secondary, a.isControlled, a.isKeeper);
      if (!novo.fbxRig) continue;
      novo.group.position.copy(a.rig.group.position);
      novo.group.rotation.copy(a.rig.group.rotation);
      this.scene.remove(a.rig.group);
      this.scene.add(novo.group);
      a.rig = novo;
    }
  }

  /** Posiciona bola, cobrador, goleiro e câmera para a cobrança atual. */
  private setupCobranca() {
    const dist = distanciaDaCobranca(this.shotIndex);
    const bolaX = this.goalX + dist;

    this.ball.pos.set(bolaX, 0.11, 0);
    this.ball.vel.set(0, 0, 0);
    this.ball.mesh.position.copy(this.ball.pos);

    this.keeper.x = this.goalX + 0.7;
    this.keeper.z = 0;
    this.keeper.heading = Math.PI / 2;
    this.keeper.state = "idle";
    this.keeper.stateTimer = 0;

    this.taker.x = bolaX + 2.4;
    this.taker.z = 1.2;
    this.taker.heading = -Math.PI / 2;
    this.taker.state = "idle";
    this.taker.stateTimer = 0;

    this.voo = null;
    this.phase = "aim";
    this.lastOutcome = undefined;
    this.opponentFeed = undefined;
    this.aimLine.visible = false;

    // Câmera atrás da bola, voltada para o gol (profundidade de campo).
    this.camera.position.set(bolaX + 7.5, 3.1, 2.6);
    this.camera.lookAt(this.goalX, 1.5, 0);
  }

  // ---------------------------------------------------------------- loop

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.step(dt);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private step(dt: number) {
    for (const a of this.players) {
      if (a.stateTimer > 0) {
        a.stateTimer -= dt;
        if (a.stateTimer <= 0 && (a.state === "save" || a.state === "recover" || a.state === "run")) {
          a.state = "idle";
        }
      }
    }

    if (this.phase === "aim") this.updateAim();
    else if (this.phase === "flight") this.updateFlight(dt);
    else if (this.phase === "outcome") {
      this.outcomeTimer -= dt;
      this.updateBallFisica(dt); // bola rola/assenta durante o resultado
      if (this.outcomeTimer <= 0) {
        if (this.shotIndex >= TOTAL_COBRANCAS) this.finish(false);
        else {
          this.shotIndex++;
          this.setupCobranca();
        }
      }
    }

    this.updateAtores(dt);
    this.emitState();
  }

  // ---------------------------------------------------------------- aim

  private updateAim() {
    const drag = this.input.swipeDrag;
    if (!drag.active) {
      this.aimLine.visible = false;
      return;
    }
    // Prévia do chute com o arraste atual (dica discreta, sem mira complexa).
    const preview = swipeParaChute(
      {
        dx: drag.cx - drag.sx,
        dy: drag.cy - drag.sy,
        dtMs: Math.max(16, performance.now() - drag.t0),
      },
      tipoDaCobranca(this.shotIndex),
      this.taker.data.attributes.shooting
    );
    const pts = this.aimLineGeo.attributes["position"] as THREE.BufferAttribute;
    pts.setXYZ(0, this.ball.pos.x, this.ball.pos.y, this.ball.pos.z);
    pts.setXYZ(1, this.goalX, clamp(preview.alvoY, 0.2, 3.6), clamp(preview.alvoZ, -4.4, 4.4));
    pts.needsUpdate = true;
    this.aimLine.visible = true;
  }

  // ---------------------------------------------------------------- cobrança

  /** Entrada do swipe (dedo/mouse) — também usada pelo gancho de depuração. */
  executarCobranca(swipe: SwipeInput) {
    if (this.phase !== "aim" || this.finished) return;
    const tipo = tipoDaCobranca(this.shotIndex);
    const chute = swipeParaChute(swipe, tipo, this.taker.data.attributes.shooting);
    const keeperZ = escolherMergulhoGoleiro(`${this.setup.matchId}:${this.shotIndex}`);
    const alcance = alcanceGoleiro(this.keeper.data.attributes.defending, chute.forca);
    const desfecho = calcularDesfecho(
      { z: chute.alvoZ, y: chute.alvoY },
      chute.forca,
      keeperZ,
      alcance,
      FIELD.goalHalfWidth,
      FIELD.goalHeight
    );

    // Balística: velocidade exata para atingir o alvo no plano do gol.
    const dist = Math.abs(this.ball.pos.x - this.goalX);
    const velHoriz = 13 + chute.forca * 17; // 13..30 m/s
    const T = clamp(dist / velHoriz, 0.45, 1.7);
    const g = 22;
    this.ball.vel.set(
      (this.goalX - this.ball.pos.x) / T,
      (chute.alvoY - this.ball.pos.y + 0.5 * g * T * T) / T,
      (chute.alvoZ - this.ball.pos.z) / T
    );

    // Goleiro reage: mergulho no canto sorteado (determinístico).
    this.keeper.state = "save";
    this.keeper.stateTimer = 1.2;
    this.keeper.heading = Math.atan2(this.ball.pos.x - this.keeper.x, chute.alvoZ - this.keeper.z);

    // Cobrador: pequena arrancada de cobrança.
    this.taker.state = "run";
    this.taker.stateTimer = 0.5;

    this.voo = { chute, keeperZ, alcance, desfecho, tFlight: 0, resolvido: false };
    this.phase = "flight";
    this.aimLine.visible = false;

    this.emit({
      type: "penalty",
      minute: this.mm(),
      side: this.setup.controlledSide,
      playerId: this.taker.data.id,
      playerName: this.taker.data.name,
      detail: `${tipo} ${this.shotIndex}/${TOTAL_COBRANCAS}`,
    });
  }

  /** Gancho de depuração/E2E: executa uma cobrança como se fosse um swipe. */
  debugCobrar(dx: number, dy: number, dtMs = 300) {
    this.executarCobranca({ dx, dy, dtMs });
  }

  private updateFlight(dt: number) {
    const voo = this.voo;
    if (!voo) return;
    voo.tFlight += dt;

    // Goleiro vai ao canto do mergulho.
    this.keeper.z = lerp(this.keeper.z, voo.keeperZ, clamp(6 * dt, 0, 1));

    this.updateBallFisica(dt);

    const b = this.ball;
    const keeperPlaneX = this.keeper.x;

    // 1) Defesa: bola chega ao alcance do goleiro mergulhado.
    if (!voo.resolvido && voo.desfecho === "save" && b.pos.x <= keeperPlaneX + 0.9) {
      b.pos.x = keeperPlaneX + 0.55;
      b.pos.z = lerp(b.pos.z, this.keeper.z, 0.7);
      b.vel.set(0, 0, 0);
      this.keeper.saves++;
      this.resolver("save");
      return;
    }

    // 2) Cruzamento da linha do gol.
    if (!voo.resolvido && b.pos.x <= this.goalX) {
      if (voo.desfecho === "goal") {
        b.pos.x = this.goalX - 0.9; // rede
        b.vel.multiplyScalar(0.12);
        this.resolver("goal");
      } else if (voo.desfecho === "post") {
        b.pos.x = this.goalX + 0.3;
        b.vel.x *= -0.45;
        b.vel.z += Math.sign(voo.chute.alvoZ || 1) * 2.5;
        b.vel.y = Math.max(b.vel.y, 1.5);
        this.resolver("post");
      } else {
        this.resolver("out"); // bola segue para fora
      }
      return;
    }

    // 3) Segurança: nunca deixar a bola "presa" no ar.
    if (!voo.resolvido && voo.tFlight > 3) this.resolver("out");
  }

  /** Física da bola em voo/quique — mesma receita do motor anterior. */
  private updateBallFisica(dt: number) {
    const b = this.ball;
    if (b.vel.lengthSq() < 1e-6) return;
    b.vel.y -= 22 * dt;
    b.pos.addScaledVector(b.vel, dt);
    if (b.pos.y <= 0.11) {
      b.pos.y = 0.11;
      if (b.vel.y < 0) b.vel.y = -b.vel.y * 0.45;
      if (Math.abs(b.vel.y) < 0.5) b.vel.y = 0;
      const fr = 1 - 0.85 * dt;
      b.vel.x *= fr;
      b.vel.z *= fr;
    } else {
      const air = 1 - 0.1 * dt;
      b.vel.x *= air;
      b.vel.z *= air;
    }
    if (Math.hypot(b.vel.x, b.vel.z) < 0.15 && b.pos.y <= 0.11) {
      b.vel.x = 0;
      b.vel.z = 0;
    }
    b.mesh.position.copy(b.pos);
    b.mesh.rotation.x -= b.vel.z * dt * 2;
    b.mesh.rotation.z += b.vel.x * dt * 2;
  }

  /** Registra o desfecho, revela a cobrança do adversário e pausa. */
  private resolver(desfecho: Desfecho) {
    if (!this.voo || this.voo.resolvido) return;
    this.voo.resolvido = true;

    if (desfecho === "goal") {
      this.playerGoals++;
      this.score[this.setup.controlledSide]++;
      this.taker.state = "celebrate";
      this.taker.stateTimer = 1.4;
    }
    this.lastOutcome = DESFECHO_ROTULO[desfecho];

    const minute = this.mm();
    const side = this.setup.controlledSide;
    if (desfecho === "goal") {
      this.emit({
        type: "goal",
        minute,
        side,
        playerId: this.taker.data.id,
        playerName: this.taker.data.name,
        detail: `${this.shotIndex}/${TOTAL_COBRANCAS}`,
      });
    } else if (desfecho === "save") {
      this.emit({
        type: "save",
        minute,
        side: this.keeper.side,
        playerId: this.keeper.data.id,
        playerName: this.keeper.data.name,
        detail: `${this.shotIndex}/${TOTAL_COBRANCAS}`,
      });
    } else {
      this.emit({
        type: "out",
        minute,
        side,
        playerId: this.taker.data.id,
        playerName: this.taker.data.name,
        detail: desfecho === "post" ? "na trave" : "para fora",
      });
    }

    // Cobrança do adversário: resultado revelado sem exibição da execução.
    const adv = this.advResults[this.opponentShots];
    if (adv !== undefined) {
      this.opponentShots++;
      const advSide: TeamSide = side === "home" ? "away" : "home";
      if (adv === "goal") {
        this.opponentGoals++;
        this.score[advSide]++;
      }
      this.opponentFeed = `ADV ${this.opponentShots}/${TOTAL_COBRANCAS} — ${DESFECHO_ROTULO[adv]}`;
      this.emit({
        type: adv === "goal" ? "goal" : adv === "save" ? "save" : "out",
        minute,
        side: advSide,
        detail: `cobrança ${this.opponentShots}/${TOTAL_COBRANCAS} (${DESFECHO_ROTULO[adv]})`,
      });
    }

    this.phase = "outcome";
    this.outcomeTimer = 1.7;
  }

  // ---------------------------------------------------------------- atores

  private updateAtores(dt: number) {
    for (const a of this.players) {
      const g = a.rig.group;
      g.position.set(a.x, 0, a.z);
      // Giro suave até o heading (menor arco).
      let diff = a.heading - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * clamp(9 * dt, 0, 1);

      this.animarAtor(a, dt);
    }
  }

  /** Animação mínima: goleiro mergulha (clip save / queda lateral no
   *  procedural); cobrador faz a arrancada (clip run / balanço de pernas). */
  private animarAtor(a: Ator, dt: number) {
    const rig = a.rig;
    if (rig.mixer) rig.mixer.update(dt);

    if (rig.fbxRig) {
      const quer = a.state === "save" || a.state === "recover" ? "save" : "run";
      if (a.currentAnimation !== quer) {
        const clip = rig.fbxRig.animations.get(quer);
        if (clip && rig.mixer) {
          rig.currentAction?.fadeOut(0.15);
          const action = rig.mixer.clipAction(clip);
          action.reset();
          if (quer === "save") {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          } else {
            action.setLoop(THREE.LoopRepeat, Infinity);
          }
          action.fadeIn(0.15).play();
          rig.currentAction = action;
          a.currentAnimation = quer;
        }
      }
      // Idle sem clip próprio: congela no frame ereto medido do ciclo de
      // corrida (t≈0.253s) — nunca T-pose, nunca corrida em câmera lenta.
      if (a.currentAnimation === "run" && rig.currentAction) {
        const action = rig.currentAction;
        if (a.state === "idle") {
          const dur = action.getClip().duration;
          const tm = action.time % dur;
          if (Math.abs(tm - 0.253) < 0.06) action.paused = true;
          else if (!action.paused) action.timeScale = 1.2;
        } else {
          action.paused = false;
          action.timeScale = 1.4;
        }
      }
      return;
    }

    // Fallback procedural: mergulho = tomba o corpo para o lado do canto.
    if (a.isKeeper) {
      const alvo = a.state === "save" ? -Math.sign(this.voo?.keeperZ ?? 0) * 0.95 : 0;
      rig.group.rotation.z = lerp(rig.group.rotation.z, alvo, clamp(8 * dt, 0, 1));
    } else if (a.state === "run") {
      const t = performance.now() / 1000;
      rig.legL.rotation.x = Math.sin(t * 14) * 0.6;
      rig.legR.rotation.x = -Math.sin(t * 14) * 0.6;
    } else {
      rig.legL.rotation.x = lerp(rig.legL.rotation.x, 0, clamp(8 * dt, 0, 1));
      rig.legR.rotation.x = lerp(rig.legR.rotation.x, 0, clamp(8 * dt, 0, 1));
    }
  }

  // ---------------------------------------------------------------- estado/resultado

  private mm() {
    return Math.min(90, this.shotIndex * 6);
  }

  private emit(e: MatchEvent) {
    this.events.push(e);
    this.cb.onEvent?.(e);
  }

  private emitState() {
    const s: MatchLiveState = {
      minute: this.mm(),
      half: 1,
      score: { ...this.score },
      possession: { home: 50, away: 50 },
      possessionSide: null,
      stamina: 100,
      charge: this.phase === "aim" ? this.input.swipePower : 0,
      lastEvent: this.events[this.events.length - 1],
      running: this.running && !this.finished,
      shotIndex: this.shotIndex,
      shotsTotal: TOTAL_COBRANCAS,
      playerGoals: this.playerGoals,
      opponentShots: this.opponentShots,
      opponentGoals: this.opponentGoals,
      phase: this.phase,
      tipo: tipoDaCobranca(this.shotIndex),
      lastOutcome: this.lastOutcome,
      opponentFeed: this.opponentFeed,
    };
    this.cb.onState?.(s);
  }

  private buildStats(a: Ator, goals: number, shots: number): MatchPlayerStats {
    return {
      playerId: a.data.id,
      name: a.data.name,
      side: a.side,
      goals,
      shots,
      passes: 0,
      passesCompleted: 0,
      tackles: 0,
      fouls: 0,
      touches: a.isKeeper ? a.saves : shots,
      distanceKm: 0,
      rating: clamp(6 + goals * 0.25 + (a.isKeeper ? a.saves * 0.3 : 0), 0, 10),
    };
  }

  private buildResult(aborted: boolean): MatchResult {
    const outcome: MatchResult["outcome"] =
      this.score.home > this.score.away ? "home" : this.score.home < this.score.away ? "away" : "draw";
    // Empate: permanece empate — resolverDesempate() (cobrancas.ts) é o
    // ponto de entrada da futura morte súbita.
    return {
      matchId: this.setup.matchId,
      score: { ...this.score },
      possession: { home: 50, away: 50 },
      shots: { home: TOTAL_COBRANCAS, away: TOTAL_COBRANCAS },
      events: [...this.events],
      players: [
        this.buildStats(this.taker, this.playerGoals, TOTAL_COBRANCAS),
        this.buildStats(this.keeper, 0, 0),
      ],
      controlledPlayer: this.buildStats(this.taker, this.playerGoals, TOTAL_COBRANCAS),
      outcome,
      finishedAt: new Date().toISOString(),
      aborted,
    };
  }

  finish(aborted: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.phase = "finished";
    this.running = false;
    if (!aborted) {
      this.emit({ type: "fulltime", minute: 90, detail: `${this.score.home} x ${this.score.away}` });
    }
    this.cb.onFinish?.(this.buildResult(aborted));
  }

  private handleResize = () => {
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.input.dispose();
    this.resizeObs?.disconnect();
    window.removeEventListener("resize", this.handleResize);
    const w = window as unknown as { __engine3d?: MatchEngine };
    if (w.__engine3d === this) delete w.__engine3d;
    // Rigs FBX: geometria/textura são COMPARTILHADAS com o playerModelCache —
    // dispose aqui quebraria a próxima partida. Só saem os materiais clonados
    // por ator e geometrias próprias.
    for (const a of this.players) {
      if (a.rig.fbxRig) {
        a.rig.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.userData["ownGeometry"]) m.geometry?.dispose();
          const disposeMat = (mat: THREE.Material | undefined) => {
            if (mat?.userData["ownMaterial"]) mat.dispose();
          };
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach(disposeMat);
          else disposeMat(mat);
        });
        a.rig.mixer?.stopAllAction();
        a.rig.mixer?.uncacheRoot(a.rig.group);
      }
      this.scene.remove(a.rig.group);
    }
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
  }
}
