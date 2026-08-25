/**
 * Unified input system.
 *
 * Keyboard (PC) and virtual stick / buttons (mobile) write into the SAME state.
 * The engine only reads this state, so there is a single control pipeline:
 *
 *   W/A/S/D  <-> analog stick   -> move
 *   SPACE    <-> X              -> pass
 *   ENTER    <-> B              -> shoot
 *   SHIFT    <-> Y              -> sprint
 *   BACKSPACE<-> A              -> slide tackle
 *   E        <-> Y              -> request ball
 */
export type EngineAction = "pass" | "shoot" | "tackle" | "request";

export class InputSystem {
  /** Normalized move vector: x = right, y = forward (attack direction). */
  readonly move = { x: 0, y: 0 };
  /** Held sprint from keyboard or touch. */
  private sprintKey = false;
  private sprintTouch = false;
  /** Queued one-shot actions, consumed by the engine each tick. */
  private queue: EngineAction[] = [];
  /** Track held pass/shoot buttons (barra de força + auto-marking). */
  private passHeldState = false;
  private shootHeldState = false;
  private passHoldTime = 0;
  /** Track tackle button presses for double-tap desarme. */
  private lastTackleTime = 0;
  private tacklePressCount = 0;

  private keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private detach: (() => void) | null = null;

  get sprint() {
    return this.sprintKey || this.sprintTouch;
  }

  get isPassHeld() {
    return this.passHeldState;
  }

  get isShootHeld() {
    return this.shootHeldState;
  }

  get passHoldDuration() {
    return this.passHoldTime;
  }

  get isDoubleTackle() {
    const now = performance.now() / 1000;
    return this.tacklePressCount >= 2 && (now - this.lastTackleTime) < 0.4;
  }

  attachKeyboard(target: Window | HTMLElement = window) {
    const down = (e: Event) => {
      const ev = e as KeyboardEvent;
      const k = ev.key.toLowerCase();
      if (["w", "a", "s", "d", " ", "enter", "backspace", "shift", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
        ev.preventDefault();
      if (ev.repeat) return;
      this.keys.add(k);
      if (k === "shift") this.sprintKey = true;
      if (k === " ") {
        if (!this.passHeldState) {
          this.press("pass");
          this.passHeldState = true;
          this.passHoldTime = 0;
        }
      }
      if (k === "enter") {
        if (!this.shootHeldState) {
          this.press("shoot");
          this.shootHeldState = true;
        }
      }
      if (k === "backspace") this.press("tackle");
      if (k === "e") this.press("request");
      this.syncKeys();
    };
    const up = (e: Event) => {
      const k = (e as KeyboardEvent).key.toLowerCase();
      this.keys.delete(k);
      if (k === "shift") this.sprintKey = false;
      if (k === " ") {
        this.passHeldState = false;
        this.passHoldTime = 0;
      }
      if (k === "enter") this.shootHeldState = false;
      this.syncKeys();
    };
    const blur = () => {
      this.keys.clear();
      this.sprintKey = false;
      this.passHeldState = false;
      this.shootHeldState = false;
      this.syncKeys();
    };
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    this.detach = () => {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }

  /** Mobile analog stick, values in [-1, 1]. y > 0 means forward. */
  setStick(x: number, y: number) {
    this.stick.x = x;
    this.stick.y = y;
    this.syncKeys();
  }

  setTouchSprint(active: boolean) {
    this.sprintTouch = active;
  }

  /** Segurar/soltar passe ou chute (botões X/B do mobile). */
  setTouchHold(action: "pass" | "shoot", active: boolean) {
    if (action === "pass") {
      this.passHeldState = active;
      if (!active) this.passHoldTime = 0;
    } else {
      this.shootHeldState = active;
    }
  }

  /** Same entry point used by keyboard and by the mobile A/X/B buttons. */
  press(action: EngineAction) {
    if (this.queue.length < 4) this.queue.push(action);
  }

  consume(): EngineAction[] {
    if (!this.queue.length) return [];
    const out = this.queue;
    this.queue = [];
    return out;
  }

  private syncKeys() {
    let x = 0;
    let y = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) y += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    // Touch stick contributes to the very same vector.
    x += this.stick.x;
    y += this.stick.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.move.x = x;
    this.move.y = y;
  }

  dispose() {
    this.detach?.();
    this.detach = null;
    this.keys.clear();
    this.queue = [];
    this.passHeldState = false;
    this.shootHeldState = false;
  }
}
