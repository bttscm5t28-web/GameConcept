// HD-2D 渲染管线：泛光 → 移轴景深 → 输出 → 宣纸调色/暗角/颗粒
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { paperTex } from '../art/textures.js';

const TiltShift = {
  uniforms: {
    tDiffuse: { value: null },
    dir: { value: new THREE.Vector2(1, 0) },
    res: { value: new THREE.Vector2(1280, 720) },
    focusY: { value: 0.48 },
    band: { value: 0.16 },
    maxBlur: { value: 3.2 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform vec2 res; uniform float focusY; uniform float band; uniform float maxBlur;
    varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - focusY);
      // 上方（远景）比下方（近景）更早开始模糊
      float k = vUv.y > focusY ? 1.15 : 0.9;
      float amt = smoothstep(band, band + 0.32, d * k) * maxBlur;
      vec2 step = dir / res * amt;
      vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
      c += texture2D(tDiffuse, vUv + step * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv - step * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv + step * 3.2307692308) * 0.0702702703;
      c += texture2D(tDiffuse, vUv - step * 3.2307692308) * 0.0702702703;
      gl_FragColor = c;
    }`,
};

const Grade = {
  uniforms: {
    tDiffuse: { value: null },
    tPaper: { value: null },
    time: { value: 0 },
    res: { value: new THREE.Vector2(1280, 720) },
    vignette: { value: 0.42 },
    paper: { value: 0.07 },
    warm: { value: new THREE.Color(1.04, 1.0, 0.92) },
    shadowTint: { value: new THREE.Color(0.9, 0.97, 1.05) },
    saturation: { value: 1.05 },
    contrast: { value: 1.06 },
    fade: { value: 0 },
    desat: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform sampler2D tPaper; uniform float time; uniform vec2 res;
    uniform float vignette; uniform float paper; uniform vec3 warm; uniform vec3 shadowTint;
    uniform float saturation; uniform float contrast; uniform float fade; uniform float desat;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      // 轻微色差
      vec2 cc = uv - 0.5; float r2 = dot(cc, cc);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + cc * r2 * 0.006).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - cc * r2 * 0.006).b;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, saturation * (1.0 - desat));
      col = (col - 0.5) * contrast + 0.5;
      // 分离色调：暗部偏青、亮部偏暖
      col *= mix(shadowTint, warm, smoothstep(0.1, 0.8, l));
      // 宣纸纹理
      vec3 p = texture2D(tPaper, uv * res / 512.0).rgb;
      col *= 1.0 + (p.r - 0.5) * paper * 2.0;
      // 暗角（暖褐色）
      float v = smoothstep(0.85, 0.2, length(cc * vec2(1.0, 0.85)) * (1.0 + vignette));
      col = mix(col * vec3(0.45, 0.36, 0.3), col, v);
      // 胶片颗粒
      col += (hash(uv * res + fract(time) * 100.0) - 0.5) * 0.025;
      col = mix(col, vec3(0.04, 0.03, 0.025), fade);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Renderer {
  constructor(container) {
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    container.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
    this.composer = new EffectComposer(r);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(640, 360), 0.55, 0.6, 0.82);
    this.composer.addPass(this.bloom);
    this.tiltH = new ShaderPass(TiltShift);
    this.tiltV = new ShaderPass(TiltShift);
    this.tiltV.uniforms.dir.value.set(0, 1);
    this.composer.addPass(this.tiltH);
    this.composer.addPass(this.tiltV);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(Grade);
    this.grade.uniforms.tPaper.value = paperTex();
    this.composer.addPass(this.grade);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  setView(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.renderPass.scene = scene; this.renderPass.camera = camera;
    this.resize();
  }
  setLook({ bloom = 0.55, bloomThreshold = 0.82, tilt = 3.2, band = 0.16, focusY = 0.48, vignette = 0.42, exposure = 1.0, saturation = 1.05, warm, shadowTint } = {}) {
    this.bloom.strength = bloom; this.bloom.threshold = bloomThreshold;
    for (const p of [this.tiltH, this.tiltV]) { p.uniforms.maxBlur.value = tilt; p.uniforms.band.value = band; p.uniforms.focusY.value = focusY; }
    const u = this.grade.uniforms;
    u.vignette.value = vignette; u.saturation.value = saturation;
    if (warm) u.warm.value.set(...warm); if (shadowTint) u.shadowTint.value.set(...shadowTint);
    this.renderer.toneMappingExposure = exposure;
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    const pr = this.renderer.getPixelRatio();
    for (const p of [this.tiltH, this.tiltV, this.grade]) p.uniforms.res.value.set(w * pr, h * pr);
  }
  render(t) {
    this.grade.uniforms.time.value = t;
    this.composer.render();
  }
}
