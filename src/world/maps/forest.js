// 占位：竹海古道（待完善）
import { makeGrid, fillRect, toRows } from './helpers.js';
export default function forest(game) {
  const g = makeGrid(30, 40, 'B');
  fillRect(g, 13, 0, 16, 39, ',');
  return {
    id: 'forest', name: '竹海古道', sub: '幽篁深处', music: 'forest', battleBg: 'forest', grid: toRows(g),
    env: { fog: '#c9d8a8', skyTop: '#d8e8c8', hemi: ['#d0ecb0', '#3a4a2a', 1.1], sun: ['#fff0c0', 2.4], sunDir: [6, 16, 6], mountain: '#4e7a5a' },
    spawns: { default: { x: 14.5, z: 38, dir: 'up' }, fromTown: { x: 14.5, z: 38, dir: 'up' }, fromRuins: { x: 14.5, z: 1.5, dir: 'down' } },
    exits: [{ x0: 12, z0: 39.4, x1: 18, z1: 41, to: 'town', spawn: 'fromForest' }, { x0: 12, z0: -1, x1: 18, z1: 0.4, to: 'ruins', spawn: 'fromForest' }],
    encounters: { table: [['bamboo'], ['foxfire', 'bamboo']], bg: 'forest' },
  };
}
