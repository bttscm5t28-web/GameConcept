// 占位：墨家旧坊（待完善）
import { makeGrid, fillRect, toRows } from './helpers.js';
export default function ruins(game) {
  const g = makeGrid(30, 30, 'W');
  fillRect(g, 3, 3, 26, 29, 'r');
  return {
    id: 'ruins', name: '墨家旧坊', sub: '机关城遗址 · 黄昏', music: 'ruins', battleBg: 'ruins', grid: toRows(g),
    env: { fog: '#6a6478', skyTop: '#3a3a58', hemi: ['#8a90b8', '#2a2018', 0.9], sun: ['#ffb07a', 1.5], sunDir: [-12, 9, 6], mountain: '#4a4a5e' },
    spawns: { default: { x: 15, z: 28, dir: 'up' }, fromForest: { x: 15, z: 28, dir: 'up' } },
    exits: [{ x0: 12, z0: 29.4, x1: 18, z1: 31, to: 'forest', spawn: 'fromRuins' }],
  };
}
