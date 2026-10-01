// 地图网格构建工具
export function makeGrid(W, H, fill = '.') { return Array.from({ length: H }, () => Array(W).fill(fill)); }
export function fillRect(g, x0, z0, x1, z1, ch) {
  for (let z = Math.max(0, z0); z <= Math.min(g.length - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(g[0].length - 1, x1); x++) g[z][x] = ch;
}
export function line(g, pts, ch, w = 1) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / (n || 1)), z = Math.round(z0 + ((z1 - z0) * k) / (n || 1));
      fillRect(g, x - Math.floor((w - 1) / 2), z - Math.floor((w - 1) / 2), x + Math.ceil((w - 1) / 2), z + Math.ceil((w - 1) / 2), ch);
    }
  }
}
export function scatter(g, ch, onto, p, seed = 1) {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let z = 0; z < g.length; z++) for (let x = 0; x < g[0].length; x++) if (onto.includes(g[z][x]) && r() < p) g[z][x] = ch;
}
export const toRows = (g) => g.map((r) => r.join(''));

// 宝箱：返回可调查对象，打开状态记录在存档里
export function chestObj(world, id, x, z, give, P) {
  const g = world.game;
  const key = 'chest_' + id;
  const c = P.chest();
  world.add(c, x, z, { solid: [0.8, 0.5] });
  if (g.state.flags[key]) c.userData.lid.rotation.x = -1.9;
  return {
    x, z: z + 0.3, r: 1.2, icon: '宝',
    enabled: (gg) => !gg.state.flags[key],
    async onInteract(ctx) {
      ctx.flags[key] = true;
      ctx.sfx('door');
      const lid = c.userData.lid; let k = 0;
      await new Promise((res) => { const iv = setInterval(() => { k += 0.1; lid.rotation.x = -1.9 * Math.min(1, k); if (k >= 1) { clearInterval(iv); res(); } }, 16); });
      for (const [it, n] of give) { if (it === 'money') ctx.money(n); else ctx.give(it, n); }
      await ctx.wait(500);
    },
  };
}
