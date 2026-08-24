import * as THREE from "three";
import { FIELD, buildField } from "./field";
import { formationSlots } from "./formations";
import { InputSystem } from "./input";
import { createBallMesh, createPlayerRig, type PlayerRig } from "./playerModel";
import type {
  MatchEvent,
  MatchLiveState,
  MatchPlayerInput,
  MatchPlayerStats,
  MatchResult,
  MatchSetup,
  MatchTeamInput,
  TeamSide,
} from "./types";

type PlayerState = "idle" | "run" | "sprint" | "pass" | "shoot" | "slide" | "recover" | "celebrate" | "save";

interface Sim {
  data: MatchPlayerInput;
  side: TeamSide;
  rig: PlayerRig;
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  state: PlayerState;
  stateTimer: number;
  stamina: number;
  isControlled: boolean;
  isKeeper: boolean;
  slot: { nx: number; nz: number };
  animPhase: number;
  actionCooldown: number;
  stats: MatchPlayerStats;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface EngineCallbacks {
  onEvent?: (e: MatchEvent) => void;
  onState?: (s: MatchLiveState) => void;
  onFinish?: (r: MatchResult) => void;
}

export class MatchEngine {
  readonly input = new InputSystem();

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private players: Sim[] = [];
  private ball = {
    pos: new THREE.Vector3(0, 0.11, 0),
    vel: new THREE.Vector3(),
    mesh: createBallMesh(),
    owner: null as Sim | null,
    lastToucher: null as Sim | null,
    kickLock: 0,
  };

  private raf = 0;
  private last = 0;
  private stateAcc = 0;
  private running = false;
  private finished = false;
  private freeze = 0;
  private minute = 0;
  private half: 1 | 2 = 1;
  private score = { home: 0, away: 0 };
  private possTicks = { home: 0, away: 0 };
  private shots = { home: 0, away: 0 };
  private events: MatchEvent[] = [];
  private minutesPerHalf: number;
  private realSecondsPerHalf: number;
  private minutesPerSecond: number;
  private quality: "low" | "high";
  private resizeObs: ResizeObserver | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private setup: MatchSetup,
    private cb: EngineCallbacks = {}
  ) {
    this.canvas = canvas;
    this.setup = setup;
    this.cb = cb;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.5, 400);
    this.ball = {
      mesh: createBallMesh(),
      pos: new THREE.Vector3(0, 0.11, 0),
      vel: new THREE.Vector3(0, 0, 0),
      owner: null,
      lastToucher: null,
      kickLock: 0,
    };
    this.players = [];
    this.events = [];
    this.score = { home: 0, away: 0 };
    this.minute = 0;
    this.minutesPerHalf = setup.minutesPerHalf ?? 45;
    this.realSecondsPerHalf = setup.realSecondsPerHalf ?? 120;
    this.minutesPerSecond = this.minutesPerHalf / this.realSecondsPerHalf;
    this.running = false;
    this.finished = false;
    this.raf = 0;
    this.last = 0;
    this.freeze = 0;

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
    this.camera.position.set(0, 14, -26);

    buildField(this.scene, this.quality);
    this.scene.add(this.ball.mesh);

    this.spawnTeam(setup.home, "home");
    this.spawnTeam(setup.away, "away");

    this.input.attachKeyboard(window);
    this.handleResize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObs = new ResizeObserver(() => this.handleResize());
      if (canvas.parentElement) this.resizeObs.observe(canvas.parentElement);
    }
    window.addEventListener("resize", this.handleResize);

    this.resetPositions("home");
    this.emit({ type: "kickoff", minute: 0, detail: `${setup.home.name} x ${setup.away.name}` });
  }

  // ---------------------------------------------------------------- setup

  private spawnTeam(team: MatchTeamInput, side: TeamSide) {
    const slots = formationSlots(team.formation);
    team.players.slice(0, 11).forEach((p, i) => {
      const slot = slots[i] ?? slots[10]!;
      const isKeeper = i === 0 || p.role === "GK";
      const isControlled = side === this.setup.controlledSide && p.id === this.setup.controlledPlayerId;
      const rig = createPlayerRig(team.colors.primary, team.colors.secondary, isControlled, isKeeper);
      if (this.quality === "high") rig.group.traverse((o) => (o.castShadow = true));
      this.scene.add(rig.group);
      this.players.push({
        data: p,
        side,
        rig,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        heading: 0,
        state: "idle",
        stateTimer: 0,
        stamina: 100,
        isControlled,
        isKeeper,
        slot: { nx: slot.nx, nz: slot.nz },
        animPhase: Math.random() * 6,
        actionCooldown: 0,
        stats: {
          playerId: p.id,
          name: p.name,
          side,
          goals: 0,
          shots: 0,
          passes: 0,
          passesCompleted: 0,
          tackles: 0,
          fouls: 0,
          touches: 0,
          distanceKm: 0,
          rating: 6,
        },
      });
    });
  }

  /** +1 means this side attacks towards +x. */
  private dir(side: TeamSide) {
    const homeDir = this.half === 1 ? 1 : -1;
    return side === "home" ? homeDir : -homeDir;
  }

  private slotWorld(p: Sim, ballX: number) {
    const d = this.dir(p.side);
    const shift = clamp(ballX * d * 0.35, -14, 16);
    const x = d * (p.slot.nx * 44) + d * shift;
    const z = p.slot.nz * 28;
    return { x: clamp(x, -FIELD.halfLength + 2, FIELD.halfLength - 2), z: clamp(z, -31, 31) };
  }

  private resetPositions(kickoffSide: TeamSide) {
    this.ball.pos.set(0, 0.11, 0);
    this.ball.vel.set(0, 0, 0);
    this.ball.owner = null;
    this.ball.kickLock = 0;
    for (const p of this.players) {
      const s = this.slotWorld(p, 0);
      const d = this.dir(p.side);
      // Keep everyone in their own half for the kickoff.
      p.x = p.isKeeper ? d * -(FIELD.halfLength - 1.2) : Math.min(s.x * d, -2) * d;
      p.z = s.z;
      p.vx = p.vz = 0;
      p.state = "idle";
      p.stateTimer = 0;
      p.heading = d > 0 ? 0 : Math.PI;
      p.rig.group.position.set(p.x, 0, p.z);
    }
    const starter = this.players.find((p) => p.side === kickoffSide && p.data.role === "FW") ??
      this.players.find((p) => p.side === kickoffSide && !p.isKeeper)!;
    starter.x = -0.6 * this.dir(kickoffSide);
    starter.z = 0.4;
    this.ball.owner = starter;
    this.ball.lastToucher = starter;
    this.freeze = 0.6;
  }

  // ---------------------------------------------------------------- loop

  start() {
    if (this.running || this.finished) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      if (this.running) this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    this.running = false;
    this.pushState();
  }

  resume() {
    if (this.finished) return;
    this.running = true;
    this.last = performance.now();
    this.pushState();
  }

  private update(dt: number) {
    if (this.freeze > 0) {
      this.freeze -= dt;
      this.input.consume();
    } else {
      this.minute += dt * this.minutesPerSecond;
    }

    // Track pass hold duration for auto-marking
    if (this.input.isPassHeld) {
      (this.input as any).passHoldTime += dt;
    }

    const owner = this.ball.owner;
    if (owner) this.possTicks[owner.side] += dt;

    for (const p of this.players) {
      if (p.isControlled) this.updateControlled(p, dt);
      else this.updateAI(p, dt);
      this.integrate(p, dt);
    }
    this.separate();
    this.updateBall(dt);
    this.updateAnimation(dt);
    this.updateCamera(dt);

    // Half / full time
    if (this.half === 1 && this.minute >= this.minutesPerHalf) {
      this.half = 2;
      this.minute = this.minutesPerHalf;
      this.emit({ type: "halftime", minute: Math.round(this.minute) });
      this.resetPositions("away");
    } else if (this.half === 2 && this.minute >= this.minutesPerHalf * 2) {
      this.finish(false);
      return;
    }

    this.stateAcc += dt;
    if (this.stateAcc > 0.2) {
      this.stateAcc = 0;
      this.pushState();
    }
  }

  // ---------------------------------------------------------------- movement

  private maxSpeed(p: Sim) {
    const base = 4.8 + (p.data.attributes.pace / 100) * 3.2;
    const tired = p.stamina < 25 ? 0.82 : 1;
    return base * tired;
  }

  private integrate(p: Sim, dt: number) {
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.x = clamp(p.x, -FIELD.halfLength - 2, FIELD.halfLength + 2);
    p.z = clamp(p.z, -FIELD.halfWidth - 2, FIELD.halfWidth + 2);
    const sp = Math.hypot(p.vx, p.vz);
    p.stats.distanceKm += (sp * dt) / 1000;
    if (sp > 0.4) p.heading = Math.atan2(p.vx, p.vz);
    p.rig.group.position.set(p.x, 0, p.z);
    p.rig.group.rotation.y = p.heading;
    if (p.stateTimer > 0) {
      p.stateTimer -= dt;
      if (p.stateTimer <= 0 && (p.state === "slide" || p.state === "recover")) p.state = "idle";
    }
    if (p.actionCooldown > 0) p.actionCooldown -= dt;
  }

  private drive(p: Sim, dx: number, dz: number, speed: number, dt: number) {
    const len = Math.hypot(dx, dz);
    let tx = 0;
    let tz = 0;
    if (len > 0.001) {
      tx = (dx / len) * speed;
      tz = (dz / len) * speed;
    }
    const accel = p.state === "slide" ? 2 : 14;
    p.vx = lerp(p.vx, tx, clamp(accel * dt, 0, 1));
    p.vz = lerp(p.vz, tz, clamp(accel * dt, 0, 1));
  }

  private separate() {
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i]!;
        const b = this.players[j]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0.64 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (0.8 - d) / 2;
        const ux = dx / d;
        const uz = dz / d;
        a.x -= ux * push;
        a.z -= uz * push;
        b.x += ux * push;
        b.z += uz * push;
      }
    }
  }

  // ---------------------------------------------------------------- controlled player

  private updateControlled(p: Sim, dt: number) {
    const actions = this.input.consume();
    const d = this.dir(p.side);
    const mv = this.input.move;
    // Move vector: x = right/left, y = forward/back
    // Standard WASD mapping:
    // W (y>0) = forward toward goal = attack direction on X axis
    // S (y<0) = backward toward own goal = opposite attack direction on X axis
    // A (x<0) = left = negative Z
    // D (x>0) = right = positive Z
    // Invert Z for camera perspective
    const dx = mv.y * d;
    const dz = -mv.x;

    const wantsSprint = this.input.sprint && Math.hypot(mv.x, mv.y) > 0.1 && p.stamina > 2;
    let speed = this.maxSpeed(p) * (wantsSprint ? 1.28 : 1);
    if (p.state === "slide") speed = 0;

    if (wantsSprint) p.stamina = clamp(p.stamina - dt * (10 - p.data.attributes.stamina / 14), 0, 100);
    else p.stamina = clamp(p.stamina + dt * 3.5, 0, 100);

    // Auto-marking when holding pass button
    if (this.input.isPassHeld && (this.input as any).passHoldTime > 0.5) {
      // Find nearest opponent to mark
      let nearestOpponent: Sim | null = null;
      let nearestDist = Infinity;
      for (const o of this.players) {
        if (o.side === p.side) continue;
        const dist = Math.hypot(o.x - p.x, o.z - p.z);
        if (dist < nearestDist && dist < 8) {
          nearestDist = dist;
          nearestOpponent = o;
        }
      }
      if (nearestOpponent) {
        // Move towards opponent to mark
        const markDx = nearestOpponent.x - p.x;
        const markDz = nearestOpponent.z - p.z;
        this.drive(p, markDx, markDz, speed * 0.9, dt);
      }
    } else if (p.state === "slide") {
      this.slideStep(p, dt);
    } else {
      this.drive(p, dx, dz, Math.hypot(mv.x, mv.y) > 0.08 ? speed : 0, dt);
      p.state = Math.hypot(p.vx, p.vz) < 0.5 ? "idle" : wantsSprint ? "sprint" : "run";
    }

    for (const a of actions) {
      if (this.freeze > 0) break;
      if (a === "pass" && this.ball.owner === p) this.doPass(p);
      else if (a === "shoot" && this.ball.owner === p) this.doShot(p);
      else if (a === "tackle") {
        if ((this.input as any).isDoubleTackle) {
          // Double-tap tackle: more aggressive desarme
          this.aggressiveTackle(p);
        } else {
          this.startSlide(p);
        }
      }
      else if (a === "request" && this.ball.owner && this.ball.owner.side === p.side && this.ball.owner !== p) {
        this.doRequestBall(p);
      }
    }
  }

  // ---------------------------------------------------------------- AI

  private nearestBall(side?: TeamSide) {
    let best: Sim | null = null;
    let bd = Infinity;
    for (const p of this.players) {
      if (side && p.side !== side) continue;
      if (p.isKeeper) continue;
      const d = Math.hypot(p.x - this.ball.pos.x, p.z - this.ball.pos.z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  private updateAI(p: Sim, dt: number) {
    p.stamina = clamp(p.stamina + dt * 2, 0, 100);
    if (p.state === "slide") {
      this.slideStep(p, dt);
      return;
    }
    if (p.isKeeper) return this.updateKeeper(p, dt);

    const b = this.ball.pos;
    const d = this.dir(p.side);
    const owner = this.ball.owner;
    const slot = this.slotWorld(p, b.x);
    const distBall = Math.hypot(p.x - b.x, p.z - b.z);
    const chaser = this.nearestBall(p.side);
    const speed = this.maxSpeed(p);

    if (owner === p) {
      // Carrying the ball: drive at goal, then decide pass or shot.
      const goalX = d * FIELD.halfLength;
      const toGoal = Math.hypot(goalX - p.x, 0 - p.z);
      const pressure = this.players.some(
        (o) => o.side !== p.side && Math.hypot(o.x - p.x, o.z - p.z) < 2.6
      );
      
      // Look for teammates ahead to pass to
      let bestTeammate: Sim | null = null;
      let bestScore = -Infinity;
      for (const tm of this.players) {
        if (tm.side !== p.side || tm === p || tm.isKeeper) continue;
        const tmToGoal = Math.hypot(goalX - tm.x, 0 - tm.z);
        const distToTM = Math.hypot(tm.x - p.x, tm.z - p.z);
        // Prefer teammates closer to goal and not too far
        if (tmToGoal < toGoal && distToTM < 25 && distToTM > 3) {
          const score = (toGoal - tmToGoal) - distToTM * 0.3;
          if (score > bestScore) {
            bestScore = score;
            bestTeammate = tm;
          }
        }
      }
      
      if (bestTeammate && (pressure || toGoal > 18)) {
        // Pass to teammate
        this.drive(p, bestTeammate.x - p.x, bestTeammate.z - p.z, speed * 0.85, dt);
      } else {
        this.drive(p, goalX - p.x, -p.z * 0.35, speed * 0.92, dt);
      }
      p.state = "run";
      if (p.actionCooldown <= 0) {
        if (toGoal < 22 && (p.data.attributes.shooting > 55 || toGoal < 14)) this.doShot(p);
        else if (pressure || Math.random() < dt * 1.2) this.doPass(p);
      }
      return;
    }

    const teamHasBall = owner ? owner.side === p.side : false;

    if (!owner) {
      // Loose ball: closest player of each team contests it.
      if (p === chaser && distBall < 30) {
        this.drive(p, b.x - p.x, b.z - p.z, speed, dt);
        p.state = distBall > 6 ? "sprint" : "run";
        return;
      }
    } else if (!teamHasBall) {
      // Defending
      if (p === chaser && distBall < 26) {
        this.drive(p, owner.x - p.x, owner.z - p.z, speed, dt);
        p.state = "sprint";
        if (distBall < 1.6 && p.actionCooldown <= 0 && Math.random() < dt * 2.5) this.startSlide(p);
        return;
      }
      // Mark the nearest opponent in your zone, otherwise hold a covering line.
      let mark: Sim | null = null;
      let md = 12;
      for (const o of this.players) {
        if (o.side === p.side || o.isKeeper) continue;
        const dd = Math.hypot(o.x - slot.x, o.z - slot.z);
        if (dd < md) {
          md = dd;
          mark = o;
        }
      }
      const tx = mark ? lerp(mark.x, slot.x, 0.35) - d * 1.2 : slot.x - d * 4;
      const tz = mark ? lerp(mark.z, slot.z, 0.35) : slot.z;
      this.drive(p, tx - p.x, tz - p.z, speed * 0.8, dt);
      p.state = Math.hypot(p.vx, p.vz) < 0.5 ? "idle" : "run";
      return;
    } else {
      // Attacking without the ball: offer support / make runs.
      const supportX = clamp(lerp(slot.x, b.x + d * 9, 0.5), -FIELD.halfLength + 6, FIELD.halfLength - 6);
      const supportZ = lerp(slot.z, b.z, 0.25);
      this.drive(p, supportX - p.x, supportZ - p.z, speed * 0.78, dt);
      p.state = Math.hypot(p.vx, p.vz) < 0.5 ? "idle" : "run";
      return;
    }

    this.drive(p, slot.x - p.x, slot.z - p.z, speed * 0.7, dt);
    p.state = Math.hypot(p.vx, p.vz) < 0.5 ? "idle" : "run";
  }

  private updateKeeper(p: Sim, dt: number) {
    const d = this.dir(p.side);
    const b = this.ball.pos;
    const goalX = d * -(FIELD.halfLength - 0.8);
    const insideBox = d < 0 ? b.x > FIELD.halfLength - 20 : b.x < -FIELD.halfLength + 20;
    const targetZ = clamp(b.z * 0.55, -5, 5);
    let targetX = goalX;
    if (insideBox) targetX = goalX + d * Math.min(6, Math.abs(b.x - goalX) * 0.35);

    if (this.ball.owner === p) {
      // Play it out quickly.
      p.state = "idle";
      this.drive(p, 0, 0, 0, dt);
      if (p.actionCooldown <= 0) this.doPass(p, true);
      return;
    }

    const distBall = Math.hypot(p.x - b.x, p.z - b.z);
    if (insideBox && distBall < 9 && (!this.ball.owner || this.ball.owner.side !== p.side)) {
      this.drive(p, b.x - p.x, b.z - p.z, this.maxSpeed(p) * 0.95, dt);
      p.state = "save";
    } else {
      this.drive(p, targetX - p.x, targetZ - p.z, this.maxSpeed(p) * 0.7, dt);
      p.state = Math.hypot(p.vx, p.vz) < 0.4 ? "idle" : "run";
    }

    // Save attempt
    if (distBall < 2.3 && b.y < 2.6 && !this.ball.owner) {
      const skill = 0.45 + p.data.attributes.defending / 250;
      if (Math.random() < skill) {
        this.ball.owner = p;
        this.ball.lastToucher = p;
        p.stats.touches++;
        p.stats.rating = clamp(p.stats.rating + 0.25, 0, 10);
        p.actionCooldown = 0.9;
        this.emit({ type: "save", minute: this.mm(), side: p.side, playerId: p.data.id, playerName: p.data.name });
      }
    }
  }

  // ---------------------------------------------------------------- actions

  private startSlide(p: Sim) {
    p.state = "slide";
    p.stateTimer = 0.55;
    p.actionCooldown = 1.4;
    const sp = Math.hypot(p.vx, p.vz) || 1;
    const ux = sp > 0.2 ? p.vx / sp : Math.sin(p.heading);
    const uz = sp > 0.2 ? p.vz / sp : Math.cos(p.heading);
    p.vx = ux * 9;
    p.vz = uz * 9;
  }

  private aggressiveTackle(p: Sim) {
    // More aggressive standing tackle - higher chance to win ball, higher foul risk
    p.state = "slide";
    p.stateTimer = 0.35;
    p.actionCooldown = 0.8;
    
    // Look for nearest opponent with ball
    let target: Sim | null = null;
    let nearestDist = Infinity;
    for (const o of this.players) {
      if (o.side === p.side) continue;
      const dist = Math.hypot(o.x - p.x, o.z - p.z);
      if (dist < nearestDist && dist < 3) {
        nearestDist = dist;
        target = o;
      }
    }
    
    if (target) {
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      p.vx = (dx / len) * 11;
      p.vz = (dz / len) * 11;
      
      // Immediate ball contact check
      if (this.ball.owner === target) {
        const win = 0.5 + (p.data.attributes.defending - target.data.attributes.technique) / 150;
        if (Math.random() < win) {
          this.ball.owner = null;
          this.ball.lastToucher = p;
          this.ball.vel.set((dx / len) * 5, 0.8, (dz / len) * 5);
          this.ball.kickLock = 0.1;
          p.stats.tackles++;
          p.stats.rating = clamp(p.stats.rating + 0.2, 0, 10);
          this.emit({ type: "tackle", minute: this.mm(), side: p.side, playerId: p.data.id, playerName: p.data.name });
          p.stateTimer = 0.1;
        } else {
          this.foul(p, target);
        }
      }
    } else {
      // No target, just lunge forward
      const sp = Math.hypot(p.vx, p.vz) || 1;
      const ux = sp > 0.2 ? p.vx / sp : Math.sin(p.heading);
      const uz = sp > 0.2 ? p.vz / sp : Math.cos(p.heading);
      p.vx = ux * 11;
      p.vz = uz * 11;
    }
  }

  private slideStep(p: Sim, dt: number) {
    p.vx *= 1 - 2.2 * dt;
    p.vz *= 1 - 2.2 * dt;
    if (p.stateTimer <= 0) {
      p.state = "recover";
      p.stateTimer = 0.45;
      return;
    }
    // Ball contact
    const db = Math.hypot(p.x - this.ball.pos.x, p.z - this.ball.pos.z);
    if (db < 1.5 && this.ball.pos.y < 1) {
      const carrier = this.ball.owner;
      if (carrier && carrier.side !== p.side) {
        const win = 0.35 + (p.data.attributes.defending - carrier.data.attributes.technique) / 200;
        if (Math.random() < win) {
          this.ball.owner = null;
          this.ball.lastToucher = p;
          this.ball.vel.set(Math.sin(p.heading) * 6, 1.2, Math.cos(p.heading) * 6);
          this.ball.kickLock = 0.15;
          p.stats.tackles++;
          p.stats.rating = clamp(p.stats.rating + 0.15, 0, 10);
          this.emit({ type: "tackle", minute: this.mm(), side: p.side, playerId: p.data.id, playerName: p.data.name });
          p.stateTimer = 0.15;
        } else {
          this.foul(p, carrier);
        }
      } else if (!carrier) {
        this.ball.owner = null;
        this.ball.vel.set(Math.sin(p.heading) * 8, 1, Math.cos(p.heading) * 8);
        this.ball.lastToucher = p;
        this.ball.kickLock = 0.2;
        p.stats.tackles++;
        p.stateTimer = 0.15;
      }
      return;
    }
    // Player contact without ball = foul
    for (const o of this.players) {
      if (o.side === p.side) continue;
      if (Math.hypot(o.x - p.x, o.z - p.z) < 1) {
        this.foul(p, o);
        return;
      }
    }
  }

  private foul(offender: Sim, victim: Sim) {
    offender.stats.fouls++;
    offender.stats.rating = clamp(offender.stats.rating - 0.2, 0, 10);
    offender.state = "recover";
    offender.stateTimer = 1;
    offender.vx = offender.vz = 0;
    this.emit({
      type: "foul",
      minute: this.mm(),
      side: offender.side,
      playerId: offender.data.id,
      playerName: offender.data.name,
      detail: `falta sobre ${victim.data.name}`,
    });
    this.ball.pos.set(clamp(victim.x, -50, 50), 0.11, clamp(victim.z, -32, 32));
    this.ball.vel.set(0, 0, 0);
    this.ball.owner = victim;
    this.ball.lastToucher = victim;
    this.freeze = 0.5;
  }

  private doRequestBall(requester: Sim) {
    const owner = this.ball.owner;
    if (!owner || owner.side !== requester.side || owner === requester) return;
    
    // Calculate pass direction from owner to requester
    const dx = requester.x - owner.x;
    const dz = requester.z - owner.z;
    const dist = Math.hypot(dx, dz);
    
    if (dist > 35) return; // Too far
    
    const power = Math.min(dist * 0.35 + 8, 18);
    const angle = Math.atan2(dx, dz);
    
    this.ball.owner = null;
    this.ball.lastToucher = owner;
    this.ball.vel.set(Math.sin(angle) * power, 1.5, Math.cos(angle) * power);
    this.ball.kickLock = 0.2;
    
    owner.stats.passes++;
    this.emit({
      type: "pass",
      minute: this.mm(),
      side: owner.side,
      playerId: owner.data.id,
      playerName: owner.data.name,
      detail: `para ${requester.data.name}`,
    });
  }

  private bestPassTarget(p: Sim) {
    const d = this.dir(p.side);
    let best: Sim | null = null;
    let bestScore = -Infinity;
    for (const t of this.players) {
      if (t === p || t.side !== p.side) continue;
      const dx = t.x - p.x;
      const dz = t.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3 || dist > 42) continue;
      const forward = (dx * d) / Math.max(dist, 1);
      let openness = 6;
      for (const o of this.players) {
        if (o.side === p.side) continue;
        const od = Math.hypot(o.x - t.x, o.z - t.z);
        openness = Math.min(openness, od);
      }
      const facing = Math.sin(p.heading) * (dx / dist) + Math.cos(p.heading) * (dz / dist);
      const score = forward * 4 + openness * 1.2 - dist * 0.12 + facing * 2 + (t.isKeeper ? -6 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    return best;
  }

  private doPass(p: Sim, longKick = false) {
    const target = this.bestPassTarget(p);
    if (!target) return;
    const lead = 0.25;
    const tx = target.x + target.vx * lead;
    const tz = target.z + target.vz * lead;
    const dx = tx - p.x;
    const dz = tz - p.z;
    const dist = Math.hypot(dx, dz);
    const acc = (p.data.attributes.passing + p.data.attributes.technique) / 2;
    const err = ((100 - acc) / 100) * (dist / 22);
    const ang = Math.atan2(dx, dz) + (Math.random() - 0.5) * err * 0.5;
    const power = clamp(dist * (longKick ? 0.95 : 0.86) + 6, 8, longKick ? 34 : 26);

    this.ball.owner = null;
    this.ball.kickLock = 0.28;
    this.ball.lastToucher = p;
    this.ball.pos.y = 0.15;
    this.ball.vel.set(Math.sin(ang) * power, dist > 22 || longKick ? 4.2 : 1.1, Math.cos(ang) * power);
    p.state = "pass";
    p.stateTimer = 0.25;
    p.actionCooldown = 0.45;
    p.stats.passes++;
    p.stats.touches++;
    this.pendingPass = { from: p, to: target };
    this.emit({
      type: "pass",
      minute: this.mm(),
      side: p.side,
      playerId: p.data.id,
      playerName: p.data.name,
      detail: `para ${target.data.name}`,
    });
  }

  private pendingPass: { from: Sim; to: Sim } | null = null;

  private doShot(p: Sim) {
    const d = this.dir(p.side);
    const goalX = d * FIELD.halfLength;
    const dist = Math.hypot(goalX - p.x, -p.z);
    const acc = p.data.attributes.shooting;
    
    // Improved aiming: aim for corners based on shooting skill
    const spread = (1 - acc / 100) * clamp(dist / 8, 0.4, 3) + 0.25;
    const aimCorner = acc > 65 && Math.random() < 0.4;
    const aimZ = aimCorner 
      ? (Math.random() < 0.5 ? -4.5 : 4.5) + (Math.random() - 0.5) * spread
      : clamp((Math.random() - 0.5) * 2 * spread, -5, 5);
    
    const dx = goalX - p.x;
    const dz = aimZ - p.z;
    const len = Math.hypot(dx, dz) || 1;
    
    // Power based on distance and shooting attribute
    const power = clamp(14 + dist * 0.7 + acc / 10, 16, 32);
    
    // Ball height - higher for closer shots, lower for power shots
    const ballHeight = clamp(2.0 + dist * 0.05 + (aimCorner ? 0.8 : 0), 1.8, 4.5);

    this.ball.owner = null;
    this.ball.kickLock = 0.3;
    this.ball.lastToucher = p;
    this.ball.pos.y = 0.2;
    this.ball.vel.set((dx / len) * power, ballHeight, (dz / len) * power);
    p.state = "shoot";
    p.stateTimer = 0.3;
    p.actionCooldown = 0.7;
    p.stats.shots++;
    p.stats.touches++;
    this.shots[p.side]++;
    this.pendingPass = null;
    this.emit({ type: "shot", minute: this.mm(), side: p.side, playerId: p.data.id, playerName: p.data.name });
  }

  // ---------------------------------------------------------------- ball

  private checkOffside(): boolean {
    const b = this.ball;
    const L = FIELD.halfLength;
    const last = b.lastToucher;
    
    if (!last) return false;
    
    // Find the second-last defender (last defender is usually the keeper)
    const defenders = this.players.filter(p => p.side !== last.side && !p.isKeeper);
    defenders.sort((a, b) => {
      const distA = Math.abs(a.x - (last.side === "home" ? -L : L));
      const distB = Math.abs(b.x - (last.side === "home" ? -L : L));
      return distA - distB;
    });
    
    if (defenders.length < 2) return false;
    
    const secondLastDefender = defenders[1];
    if (!secondLastDefender) return false;
    const offsideLine = secondLastDefender.x;
    
    // Check if any attacking player is offside
    for (const p of this.players) {
      if (p.side === last.side && p !== last && !p.isKeeper) {
        const attackerInOffsidePosition = (last.side === "home" && p.x > offsideLine) || 
                                           (last.side === "away" && p.x < offsideLine);
        
        if (attackerInOffsidePosition && Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 3) {
          // Player is involved in play while offside
          this.emit({
            type: "foul",
            minute: this.mm(),
            side: last.side,
            playerId: p.data.id,
            playerName: p.data.name,
            detail: "impedimento",
          });
          return true;
        }
      }
    }
    
    return false;
  }

  private updateBall(dt: number) {
    const b = this.ball;
    if (b.kickLock > 0) b.kickLock -= dt;

    if (b.owner) {
      const o = b.owner;
      const ahead = o.state === "idle" ? 0.45 : 0.75;
      const tx = o.x + Math.sin(o.heading) * ahead;
      const tz = o.z + Math.cos(o.heading) * ahead;
      b.pos.x = lerp(b.pos.x, tx, clamp(14 * dt, 0, 1));
      b.pos.z = lerp(b.pos.z, tz, clamp(14 * dt, 0, 1));
      b.pos.y = 0.11;
      b.vel.set(0, 0, 0);
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.x -= Math.hypot(o.vx, o.vz) * dt * 3;
      this.checkGoal();
      return;
    }

    // Physics - improved ball physics
    b.vel.y -= 22 * dt; // Stronger gravity
    b.pos.addScaledVector(b.vel, dt);
    if (b.pos.y <= 0.11) {
      b.pos.y = 0.11;
      if (b.vel.y < 0) b.vel.y = -b.vel.y * 0.55; // Better bounce
      if (Math.abs(b.vel.y) < 0.4) b.vel.y = 0;
      const fr = 1 - 1.2 * dt; // More realistic friction
      b.vel.x *= fr;
      b.vel.z *= fr;
    } else {
      const air = 1 - 0.08 * dt; // Less air resistance
      b.vel.x *= air;
      b.vel.z *= air;
    }
    if (Math.hypot(b.vel.x, b.vel.z) < 0.1) {
      b.vel.x = 0;
      b.vel.z = 0;
    }

    this.postCollision();
    if (this.checkGoal()) return;
    if (this.checkOffside()) {
      // Offside detected - give ball to defending team
      const defendingSide = this.ball.lastToucher?.side === "home" ? "away" : "home";
      this.restart(this.ball.pos.x, this.ball.pos.z, defendingSide, "foul", "impedimento");
      return;
    }
    this.checkOut();

    // Possession pickup
    if (b.kickLock <= 0 && b.pos.y < 0.9) {
      let best: Sim | null = null;
      let bd = 1.15;
      for (const p of this.players) {
        if (p.state === "recover") continue;
        const d = Math.hypot(p.x - b.pos.x, p.z - b.pos.z);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (best) {
        const speed = Math.hypot(b.vel.x, b.vel.z);
        const control = 0.35 + best.data.attributes.technique / 160;
        if (speed < 12 || Math.random() < control) {
          if (this.pendingPass && this.pendingPass.to === best && this.pendingPass.from.side === best.side)
            this.pendingPass.from.stats.passesCompleted++;
          this.pendingPass = null;
          b.owner = best;
          b.lastToucher = best;
          best.stats.touches++;
        } else {
          // Deflection
          b.vel.multiplyScalar(-0.4);
          b.kickLock = 0.2;
        }
      }
    }

    b.mesh.position.copy(b.pos);
    b.mesh.rotation.x -= b.vel.z * dt * 2;
    b.mesh.rotation.z += b.vel.x * dt * 2;
  }

  private postCollision() {
    const b = this.ball;
    const L = FIELD.halfLength;
    for (const s of [-1, 1]) {
      if (Math.abs(b.pos.x - s * L) < 0.35 && b.pos.y < FIELD.goalHeight + 0.2) {
        for (const z of [-FIELD.goalHalfWidth, FIELD.goalHalfWidth]) {
          if (Math.abs(b.pos.z - z) < 0.24) {
            b.vel.x *= -0.6;
            b.vel.z = (b.pos.z - z) * 6;
            b.pos.x = s * L - s * 0.36;
            this.emit({ type: "out", minute: this.mm(), detail: "na trave!" });
            return;
          }
        }
        if (Math.abs(b.pos.z) < FIELD.goalHalfWidth && Math.abs(b.pos.y - FIELD.goalHeight) < 0.2 && b.vel.y > 0) {
          b.vel.y *= -0.5;
        }
      }
    }
  }

  private checkGoal(): boolean {
    const b = this.ball;
    const L = FIELD.halfLength;
    if (Math.abs(b.pos.x) < L + 0.1) return false;
    if (Math.abs(b.pos.z) > FIELD.goalHalfWidth || b.pos.y > FIELD.goalHeight) return false;

    const scoringSide: TeamSide = b.pos.x > 0 ? (this.dir("home") > 0 ? "home" : "away") : this.dir("home") > 0 ? "away" : "home";
    this.score[scoringSide]++;
    const scorer = b.lastToucher && b.lastToucher.side === scoringSide ? b.lastToucher : null;
    if (scorer) {
      scorer.stats.goals++;
      scorer.stats.rating = clamp(scorer.stats.rating + 1.2, 0, 10);
      scorer.state = "celebrate";
      scorer.stateTimer = 1.5;
    }
    this.emit({
      type: "goal",
      minute: this.mm(),
      side: scoringSide,
      ...(scorer ? { playerId: scorer.data.id, playerName: scorer.data.name } : {}),
      detail: `${this.score.home} x ${this.score.away}`,
    });
    this.resetPositions(scoringSide === "home" ? "away" : "home");
    this.freeze = 1.4;
    return true;
  }

  private checkOut() {
    const b = this.ball;
    const L = FIELD.halfLength;
    const W = FIELD.halfWidth;
    const last = b.lastToucher;
    const other: TeamSide = last ? (last.side === "home" ? "away" : "home") : "home";

    if (Math.abs(b.pos.z) > W) {
      const z = Math.sign(b.pos.z) * (W - 0.2);
      this.restart(clamp(b.pos.x, -L + 2, L - 2), z, other, "out", "lateral");
    } else if (Math.abs(b.pos.x) > L) {
      const attackingSide = last?.side ?? "home";
      const towardsOpponentGoal = Math.sign(b.pos.x) === this.dir(attackingSide);
      
      // Check for penalty (ball out in goal area)
      const inGoalArea = Math.abs(b.pos.z) < FIELD.goalHalfWidth + 2;
      
      if (inGoalArea && !towardsOpponentGoal) {
        // Penalty for the attacking team
        this.restart(Math.sign(b.pos.x) * (L - FIELD.penaltySpot), 0, other, "penalty", "pênalti");
      } else if (towardsOpponentGoal) {
        // corner for the attacking team
        this.restart(Math.sign(b.pos.x) * (L - 0.5), Math.sign(b.pos.z || 1) * (W - 0.5), attackingSide, "corner", "escanteio");
      } else {
        this.restart(Math.sign(b.pos.x) * (L - 6), 0, other, "goalkick", "tiro de meta");
      }
    }
  }

  private restart(x: number, z: number, side: TeamSide, type: MatchEvent["type"], detail: string) {
    this.ball.pos.set(x, 0.11, z);
    this.ball.vel.set(0, 0, 0);
    let best: Sim | null = null;
    let bd = Infinity;
    for (const p of this.players) {
      if (p.side !== side) continue;
      if (type === "goalkick" && !p.isKeeper) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best) {
      best.x = x - 0.6;
      best.z = z;
      best.vx = best.vz = 0;
      this.ball.owner = best;
      this.ball.lastToucher = best;
    }
    this.ball.kickLock = 0.2;
    this.freeze = 0.4;
    this.emit({ type, minute: this.mm(), side, detail });
  }

  // ---------------------------------------------------------------- visuals

  private updateAnimation(dt: number) {
    for (const p of this.players) {
      const sp = Math.hypot(p.vx, p.vz);
      const rig = p.rig;
      if (p.state === "slide") {
        rig.group.rotation.x = -1.15;
        rig.group.position.y = 0.1;
        rig.legL.rotation.x = 0.5;
        rig.legR.rotation.x = -0.3;
        continue;
      }
      rig.group.rotation.x = 0;
      rig.group.position.y = 0;
      if (p.state === "celebrate") {
        p.animPhase += dt * 10;
        rig.armL.rotation.x = -2.4;
        rig.armR.rotation.x = -2.4;
        rig.group.position.y = Math.abs(Math.sin(p.animPhase)) * 0.25;
        continue;
      }
      if (p.state === "pass" || p.state === "shoot") {
        rig.legR.rotation.x = -1.1;
        rig.legL.rotation.x = 0.3;
        rig.armL.rotation.x = 0.6;
        rig.armR.rotation.x = -0.6;
        continue;
      }
      if (p.state === "recover") {
        rig.legL.rotation.x = 0.2;
        rig.legR.rotation.x = -0.2;
        rig.group.position.y = -0.25;
        continue;
      }
      if (p.state === "save") {
        rig.armL.rotation.x = -1.8;
        rig.armR.rotation.x = -1.8;
      } else {
        rig.armL.rotation.x = Math.sin(p.animPhase) * 0.5 * clamp(sp / 6, 0, 1);
        rig.armR.rotation.x = -rig.armL.rotation.x;
      }
      p.animPhase += dt * (2 + sp * 1.6);
      const amp = clamp(sp / 5, 0, 1) * (p.state === "sprint" ? 1.1 : 0.85);
      rig.legL.rotation.x = Math.sin(p.animPhase) * amp;
      rig.legR.rotation.x = -Math.sin(p.animPhase) * amp;
      if (rig.marker) rig.marker.rotation.z += dt;
    }
  }

  private camTarget = new THREE.Vector3();
  private camLook = new THREE.Vector3();

  private updateCamera(dt: number) {
    const me = this.players.find((p) => p.isControlled);
    if (!me) return;
    const d = this.dir(me.side);
    
    // Dynamic camera that follows ball more aggressively during attacks
    const ballDist = Math.hypot(me.x - this.ball.pos.x, me.z - this.ball.pos.z);
    const ballInFront = (this.ball.pos.x - me.x) * d > 0;
    
    // Focus point: blend between player and ball based on possession
    const focusBlend = ballInFront ? 0.6 : 0.3;
    const focusX = lerp(me.x, this.ball.pos.x, focusBlend);
    const focusZ = lerp(me.z, this.ball.pos.z, focusBlend);

    // Dynamic distance based on game situation - CLOSER to player
    const back = ballInFront && ballDist < 15 ? 10 : 14;
    const height = ballInFront ? 9 : 7;
    
    this.camTarget.set(focusX - d * back, height, focusZ);
    this.camTarget.x = clamp(this.camTarget.x, -FIELD.halfLength - 20, FIELD.halfLength + 20);
    this.camTarget.z = clamp(this.camTarget.z, -FIELD.halfWidth - 10, FIELD.halfWidth + 10);
    
    // Smoother camera movement
    const k = clamp(3 * dt, 0, 1);
    this.camera.position.lerp(this.camTarget, k);
    if (this.camera.position.y < 4) this.camera.position.y = 4;
    
    // Look ahead in attack direction
    const lookAhead = ballInFront ? 6 : 3;
    this.camLook.lerp(new THREE.Vector3(focusX + d * lookAhead, 1.2, focusZ), k);
    this.camera.lookAt(this.camLook);
  }

  private handleResize = () => {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.fov = w / h < 1 ? 72 : w / h < 1.6 ? 62 : 55;
    this.camera.updateProjectionMatrix();
  };

  // ---------------------------------------------------------------- reporting

  private mm() {
    return Math.min(Math.round(this.minute), this.minutesPerHalf * 2);
  }

  private emit(e: MatchEvent) {
    this.events.push(e);
    this.cb.onEvent?.(e);
    this.lastEvent = e;
  }

  private lastEvent: MatchEvent | undefined;

  private pushState() {
    const total = this.possTicks.home + this.possTicks.away || 1;
    const me = this.players.find((p) => p.isControlled);
    this.cb.onState?.({
      minute: this.mm(),
      half: this.half,
      score: { ...this.score },
      possession: {
        home: Math.round((this.possTicks.home / total) * 100),
        away: Math.round((this.possTicks.away / total) * 100),
      },
      possessionSide: this.ball.owner ? this.ball.owner.side : null,
      stamina: me ? Math.round(me.stamina) : 100,
      ...(this.lastEvent ? { lastEvent: this.lastEvent } : {}),
      running: this.running,
    });
  }

  /** Builds the standardized result handed back to the main game system. */
  buildResult(aborted: boolean): MatchResult {
    const total = this.possTicks.home + this.possTicks.away || 1;
    const players = this.players.map((p) => ({
      ...p.stats,
      distanceKm: Math.round(p.stats.distanceKm * 100) / 100,
      rating: Math.round(clamp(p.stats.rating, 1, 10) * 10) / 10,
    }));
    const me = this.players.find((p) => p.isControlled)!;
    return {
      matchId: this.setup.matchId,
      score: { ...this.score },
      possession: {
        home: Math.round((this.possTicks.home / total) * 100),
        away: Math.round((this.possTicks.away / total) * 100),
      },
      shots: { ...this.shots },
      events: [...this.events],
      players,
      controlledPlayer: players.find((p) => p.playerId === me.data.id)!,
      outcome: this.score.home === this.score.away ? "draw" : this.score.home > this.score.away ? "home" : "away",
      finishedAt: new Date().toISOString(),
      aborted,
    };
  }

  /** Ends the match and hands the result back. */
  finish(aborted: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    if (!aborted) this.emit({ type: "fulltime", minute: this.mm(), detail: `${this.score.home} x ${this.score.away}` });
    this.cb.onFinish?.(this.buildResult(aborted));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.input.dispose();
    this.resizeObs?.disconnect();
    window.removeEventListener("resize", this.handleResize);
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
