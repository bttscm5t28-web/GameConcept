// 在 ?fast 模式下自动通关：反复触发当前地图的触发器、调查点、NPC、出口，直到第一章结束
// 用法（play.mjs 的 eval）：fetch('/tools/autopilot.js').then(r=>r.text()).then(eval)
(async () => {
  const g = window.game;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const idle = async () => { for (let i = 0; i < 400 && (g.mode === 'script' || g.mode === 'transition' || g.ui.modal); i++) await sleep(50); };
  const log = (window.__ap = []);
  const visited = new Set();
  const order = ['town', 'forest', 'ruins'];
  for (let step = 0; step < 400 && !g.state.flags.chapter1Done; step++) {
    await idle();
    const w = g.world, map = w.def.id;
    let acted = false;
    // 触发器
    for (const tr of w.triggers) {
      const key = `trig_${map}_${tr.id}`;
      if (tr.once !== false && g.state.flags[key]) continue;
      if (tr.cond && !tr.cond(g)) continue;
      if (tr.once === false) continue;
      w.player.setPos((tr.x0 + tr.x1) / 2, (tr.z0 + tr.z1) / 2);
      log.push(map + ' trig ' + tr.id);
      await sleep(150); await idle(); acted = true; break;
    }
    if (acted) continue;
    // NPC 与调查点（每个状态只点一次）
    const sig = JSON.stringify(g.state.flags) + '|' + Object.keys(g.state.items).join();
    for (const n of [...w.npcs]) {
      if (!n.def.talk) continue;
      const k = map + ':npc:' + n.id + ':' + sig;
      if (visited.has(k)) continue;
      visited.add(k);
      g.interact({ kind: 'npc', npc: n });
      log.push(map + ' talk ' + n.id);
      await sleep(100); await idle(); acted = true; break;
    }
    if (acted) continue;
    for (const o of [...w.objects]) {
      if (o.enabled && !o.enabled(g)) continue;
      const k = map + ':obj:' + o.x + ',' + o.z + ':' + sig;
      if (visited.has(k)) continue;
      visited.add(k);
      w.player.setPos(o.x, o.z + 0.6);
      g.interact({ kind: 'obj', obj: o });
      log.push(map + ' obj ' + (o.icon || '') + '@' + o.x.toFixed(1) + ',' + o.z.toFixed(1));
      await sleep(100); await idle(); acted = true; break;
    }
    if (acted) continue;
    // 出口：优先去后续地图
    const exits = w.exits.filter((e) => !e.cond || e.cond(g));
    exits.sort((a, b) => order.indexOf(b.to) - order.indexOf(a.to));
    const ex = exits.find((e) => order.indexOf(e.to) > order.indexOf(map)) || exits[0];
    if (!ex) { log.push(map + ' STUCK'); break; }
    log.push(map + ' exit -> ' + ex.to);
    w.player.setPos((ex.x0 + ex.x1) / 2, (ex.z0 + ex.z1) / 2);
    await sleep(300); await idle();
  }
  window.__apDone = { done: !!g.state.flags.chapter1Done, map: g.world.def.id, flags: Object.keys(g.state.flags).length, lv: g.state.heroes.moheng.lv, party: g.state.party, items: g.state.items, equip: g.state.equipBag, souls: g.state.souls, money: g.state.money };
})();
