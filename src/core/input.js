// 统一输入：键盘 + 触屏虚拟键；按帧检测按下沿
const MAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm', KeyJ: 'confirm',
  Escape: 'cancel', KeyX: 'cancel', KeyK: 'cancel', Backspace: 'cancel',
  KeyM: 'menu', Tab: 'menu', ShiftLeft: 'dash', ShiftRight: 'dash',
  KeyQ: 'boostDown', KeyE: 'boostUp',
};

export class Input {
  constructor() {
    this.held = new Set();
    this.down = new Set();
    this.anyDown = false;
    window.addEventListener('keydown', (e) => {
      const a = MAP[e.code];
      if (a) { e.preventDefault(); if (!this.held.has(a)) this.down.add(a); this.held.add(a); }
      this.anyDown = true;
    });
    window.addEventListener('keyup', (e) => { const a = MAP[e.code]; if (a) this.held.delete(a); });
    window.addEventListener('blur', () => this.held.clear());
  }
  press(a) { this.down.add(a); }
  hold(a, on) { if (on) { if (!this.held.has(a)) this.down.add(a); this.held.add(a); } else this.held.delete(a); }
  pressed(a) { return this.down.has(a); }
  isHeld(a) { return this.held.has(a); }
  consume(a) { const h = this.down.has(a); this.down.delete(a); return h; }
  endFrame() { this.down.clear(); this.anyDown = false; }
  axis() {
    let x = 0, z = 0;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('right')) x += 1;
    if (this.held.has('up')) z -= 1;
    if (this.held.has('down')) z += 1;
    if (this.stick) { x += this.stick.x; z += this.stick.y; }
    const l = Math.hypot(x, z);
    return l > 1 ? { x: x / l, z: z / l } : { x, z };
  }
}
