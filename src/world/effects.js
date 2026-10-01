// 氛围效果：水面、雾气、光束、粒子、遮挡淡出、风吹摇曳
import * as THREE from 'three';
import { radialTex, mistTex } from '../art/textures.js';
import { makeCanvas, pixelTex } from '../art/pixel.js';

export const shared = {
  time: { value: 0 },
  uPlayer: { value: new THREE.Vector3() },
  uCamDir: { value: new THREE.Vector3(0, 0.53, 0.85) },
  uFadeR: { value: 2.1 },
};

// 角色与镜头之间的遮挡物做网点式淡出（HD-2D 常见处理）
export function applyOcclusionFade(mat) {
  if (mat.userData.fade) return mat;
  mat.userData.fade = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.uniforms.uPlayer = shared.uPlayer; sh.uniforms.uCamDir = shared.uCamDir; sh.uniforms.uFadeR = shared.uFadeR;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vFadeW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vFadeW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeW; uniform vec3 uPlayer; uniform vec3 uCamDir; uniform float uFadeR;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        {
          vec3 v = vFadeW - uPlayer;
          float t = dot(v, uCamDir);
          if (t > 0.6) {
            float perp = length(v - uCamDir * t);
            float a = smoothstep(uFadeR * 0.55, uFadeR, perp);
            vec2 sp = floor(gl_FragCoord.xy * 0.5);
            float dither = fract(dot(sp, vec2(0.5, 0.25)) + fract(sp.y * 0.5) * 0.5);
            if (a < 0.35 + dither * 0.6 && a < 0.999) discard;
          }
        }`);
  };
  mat.customProgramCacheKey = () => 'fade' + (prev ? '+' : '');
  mat.needsUpdate = true;
  return mat;
}

// 风吹摇曳（顶点按 uv.y 偏移）
export function applySway(mat, amount = 0.08) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = shared.time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float time;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float ph = 0.0;
          #ifdef USE_INSTANCING
            ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.4;
          #endif
          float k = max(0.0, uv.y);
          transformed.x += sin(time * 1.6 + ph) * ${amount.toFixed(3)} * k * k;
        }`);
  };
  mat.customProgramCacheKey = () => 'sway' + amount;
  return mat;
}

export function waterMaterial({ deep = '#2c5a64', shallow = '#5f9aa0', foam = '#d8eee8', opacity = 0.88 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: shared.time,
      cDeep: { value: new THREE.Color(deep) },
      cShallow: { value: new THREE.Color(shallow) },
      cFoam: { value: new THREE.Color(foam) },
      opacity: { value: opacity },
    }]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float time; uniform vec3 cDeep; uniform vec3 cShallow; uniform vec3 cFoam; uniform float opacity;
      varying vec3 vW;
      void main(){
        vec2 p = floor(vW.xz * 16.0) / 16.0;
        float w = sin(p.x * 0.9 + time * 0.6) * 0.5 + sin(p.y * 1.3 - time * 0.45 + p.x * 0.4) * 0.5;
        vec3 col = mix(cDeep, cShallow, smoothstep(-0.8, 1.0, w) * 0.55);
        // 细碎的像素波光：短横线
        vec2 cell = floor(vW.xz * vec2(2.0, 4.0));
        float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        float ph = fract(time * 0.25 + h);
        float lx = fract(vW.x * 2.0 + h);
        float glint = step(0.92, h) * step(0.25, lx) * step(lx, 0.75) * step(fract(vW.z * 4.0), 0.22) * smoothstep(0.0, 0.3, ph) * smoothstep(1.0, 0.6, ph);
        col = mix(col, cFoam, glint * 0.55);
        float sparkle = step(0.993, fract(sin(dot(p, vec2(12.9898, 78.233)) + floor(time * 2.0)) * 43758.5453));
        col += sparkle * 0.35;
        gl_FragColor = vec4(col, opacity);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function mistLayer({ w = 40, d = 8, y = 0.4, opacity = 0.35, speed = 0.01, color = '#ffffff', seed = 1 } = {}) {
  const tex = mistTex(seed).clone();
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(w / 20, 1); tex.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, color, fog: false }));
  m.rotation.x = -Math.PI / 2.6;
  m.position.y = y;
  m.userData.update = (t) => { tex.offset.x = t * speed; };
  m.renderOrder = 5;
  return m;
}

export function godRays({ count = 6, area = [0, 0, 30, 30], color = '#fff3c8', seed = 1, opacity = 0.16 } = {}) {
  const g = new THREE.Group();
  const [c, ctx] = makeCanvas(32, 128);
  const grd = ctx.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, 'rgba(255,255,255,0.0)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 32, 128);
  const side = ctx.createLinearGradient(0, 0, 32, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = side; ctx.fillRect(0, 0, 32, 128);
  const tex = new THREE.CanvasTexture(c);
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + rnd() * 1.6, 14), mat);
    m.position.set(area[0] + rnd() * (area[2] - area[0]), 5, area[1] + rnd() * (area[3] - area[1]));
    m.rotation.z = 0.45; m.rotation.x = -0.2;
    const ph = rnd() * 6;
    m.userData.update = (t) => { mat.opacity = opacity * (0.6 + 0.4 * Math.sin(t * 0.5 + ph)); };
    g.add(m);
  }
  return g;
}

// GPU 粒子：漂浮（尘埃、萤火、灵气）或飘落（花瓣、竹叶）
export function particles({ count = 200, area = [0, 0, 30, 30], y = [0, 6], color = '#fff0c0', size = 0.12, kind = 'float', additive = true, speed = 1, tex = null, opacity = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = area[0] + Math.random() * (area[2] - area[0]);
    pos[i * 3 + 1] = y[0] + Math.random() * (y[1] - y[0]);
    pos[i * 3 + 2] = area[1] + Math.random() * (area[3] - area[1]);
    ph[i] = Math.random() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      time: shared.time, color: { value: new THREE.Color(color) }, size: { value: size * 600 },
      yMin: { value: y[0] }, yRange: { value: y[1] - y[0] }, speed: { value: speed },
      map: { value: tex || radialTex() }, opacity: { value: opacity },
      fall: { value: kind === 'fall' ? 1 : kind === 'smoke' ? 2 : 0 },
    },
    vertexShader: `
      attribute float phase; uniform float time; uniform float size; uniform float yMin; uniform float yRange; uniform float speed; uniform float fall;
      varying float vA; varying float vRot;
      void main(){
        vec3 p = position;
        float t = time * speed + phase;
        if (fall > 1.5) {
          float k = fract(t * 0.12);
          p.y = yMin + k * yRange;
          p.x += sin(t * 0.7) * 0.15 + k * 1.2; p.z += cos(t * 0.5) * 0.1;
          vA = (1.0 - k) * smoothstep(0.0, 0.15, k);
          vRot = 3.0 + k * 4.0;
        } else if (fall > 0.5) {
          p.y = yMin + mod(position.y - yMin - t * 0.6, yRange);
          p.x += sin(t * 0.9) * 0.6; p.z += cos(t * 0.7) * 0.3;
          vRot = t * 2.0;
        } else {
          p.x += sin(t * 0.37) * 0.8; p.y += sin(t * 0.53) * 0.4; p.z += cos(t * 0.29) * 0.8;
          vRot = 0.0;
        }
        if (fall < 1.5) vA = fall > 0.5 ? 1.0 : 0.35 + 0.65 * (0.5 + 0.5 * sin(t * 2.1));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size / -mv.z * (fall > 1.5 ? vRot : 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform sampler2D map; uniform float opacity; uniform float fall;
      varying float vA; varying float vRot;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        if (fall > 1.5) { vec4 tx = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, tx.a * vA * opacity); return; }
        if (fall > 0.5) { float c = cos(vRot), s = sin(vRot); uv = vec2(c*uv.x - s*uv.y, s*uv.x + c*uv.y); uv.y *= 2.2; if (length(uv) > 0.45) discard; gl_FragColor = vec4(color, opacity); return; }
        vec4 tx = texture2D(map, uv + 0.5);
        gl_FragColor = vec4(color, tx.a * vA * opacity);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 6;
  return pts;
}

// 飞鸟（白鹭/燕子）：像素精灵沿路线循环飞过
export function flyingBirds({ count = 3, from = [0, 6, 20], to = [40, 7, 18], period = 26, color = '#f4f2ea', size = 0.9, seed = 1 } = {}) {
  const g = new THREE.Group();
  const frames = [0, 1].map((f) => {
    const [c, x] = makeCanvas(16, 8);
    x.fillStyle = color;
    if (f === 0) { x.fillRect(1, 1, 2, 1); x.fillRect(3, 2, 3, 1); x.fillRect(6, 3, 4, 2); x.fillRect(10, 2, 3, 1); x.fillRect(13, 1, 2, 1); }
    else { x.fillRect(6, 3, 4, 2); x.fillRect(3, 4, 3, 1); x.fillRect(1, 5, 2, 1); x.fillRect(10, 4, 3, 1); x.fillRect(13, 5, 2, 1); }
    x.fillStyle = '#e8a040'; x.fillRect(10, 3, 1, 1);
    return pixelTex(c, { mip: false });
  });
  const birds = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size / 2), new THREE.MeshBasicMaterial({ map: frames[0], transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, fog: false }));
    m.userData = { off: i * 0.9 + seed, ph: i * 1.7, dy: (i % 2) * 0.6 };
    g.add(m); birds.push(m);
  }
  g.userData.update = (t) => {
    birds.forEach((b) => {
      const k = ((t + b.userData.off * 3) % period) / period;
      b.position.set(from[0] + (to[0] - from[0]) * k + b.userData.off, from[1] + (to[1] - from[1]) * k + Math.sin(t * 1.3 + b.userData.ph) * 0.3 + b.userData.dy, from[2] + (to[2] - from[2]) * k);
      b.material.map = frames[Math.floor(t * 4 + b.userData.ph) % 2];
      b.scale.x = to[0] > from[0] ? -1 : 1;
    });
  };
  return g;
}
