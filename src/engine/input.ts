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

  // ---- Swipe (modo disputa de cobranças): toque OU mouse sobre o canvas ----
  /** Arraste em andamento (para a dica de trajetória), em px de tela. */
  readonly swipeDrag = { active: false, sx: 0, sy: 0, cx: 0, cy: 0, t0: 0 };
  /** Chamado uma vez ao SOLTAR o gesto (swipe válido). */
  onSwipeEnd: ((s: { dx: number; dy: number; dtMs: number }) => void) | null = null;
  private detachSwipe: (() => void) | null = null;

  /** Toque + arrastar + soltar (pointer events cobrem dedo e mouse). */
  attachSwipe(el: HTMLElement) {
    const down = (e: Event) => {
      const ev = e as PointerEvent;
      if (this.swipeDrag.active) return;
      this.swipeDrag.active = true;
      this.swipeDrag.sx = this.swipeDrag.cx = ev.clientX;
      this.swipeDrag.sy = this.swipeDrag.cy = ev.clientY;
      this.swipeDrag.t0 = performance.now();
      el.setPointerCapture?.(ev.pointerId);
      ev.preventDefault();
    };
    const move = (e: Event) => {
      if (!this.swipeDrag.active) return;
      const ev = e as PointerEvent;
      this.swipeDrag.cx = ev.clientX;
      this.swipeDrag.cy = ev.clientY;
      ev.preventDefault();
    };
    const up = (e: Event) => {
      if (!this.swipeDrag.active) return;
      const ev = e as PointerEvent;
      const dx = ev.clientX - this.swipeDrag.sx;
      const dy = ev.clientY - this.swipeDrag.sy;
      const dtMs = Math.max(16, performance.now() - this.swipeDrag.t0);
      this.swipeDrag.active = false;
      // Toque sem arraste (tap) não é cobrança.
      if (Math.hypot(dx, dy) >= 24) this.onSwipeEnd?.({ dx, dy, dtMs });
    };
    const cancel = () => {
      this.swipeDrag.active = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    this.detachSwipe = () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
  }

  /** Potência do arraste em andamento (0..1) — alimenta a barra de força. */
  get swipePower(): number {
    if (!this.swipeDrag.active) return 0;
    const len = Math.hypot(this.swipeDrag.cx - this.swipeDrag.sx, this.swipeDrag.cy - this.swipeDrag.sy);
    return Math.min(1, len / 340);
  }

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
    this.detachSwipe?.();
    this.detachSwipe = null;
    this.swipeDrag.active = false;
    this.onSwipeEnd = null;
    this.keys.clear();
    this.queue = [];
    this.passHeldState = false;
    this.shootHeldState = false;
  }
}
