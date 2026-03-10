"use client";

import { useEffect, useRef, memo } from "react";
import * as THREE from "three";

const CLUSTER_CENTERS = [
  [-32, 10, -3],
  [28, -8, 4],
  [-15, -12, -5],
  [32, 12, -2],
  [-5, 4, 6],
  [12, -14, -4],
  [-25, -4, 3],
  [0, 14, -3],
] as const;

const VERTEX_SHADER = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;

  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float t = uTime;
    float p = aPhase * 6.2831853;

    float orbitR = 1.2 + aPhase * 2.5;
    pos.x += sin(t * 0.35 * aSpeed + p) * orbitR;
    pos.y += cos(t * 0.3 * aSpeed + p) * orbitR;
    pos.z += sin(t * 0.2 * aSpeed + p * 0.7) * orbitR * 0.4;

    pos *= 1.0 + 0.015 * sin(t * 0.25);

    vec3 mW = vec3(uMouse * 35.0, 0.0);
    vec3 d = mW - pos;
    pos += normalize(d + 0.001) * smoothstep(20.0, 0.0, length(d)) * 1.5;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float pulse = 1.0 + 0.25 * sin(t * 1.3 + p);
    gl_PointSize = clamp(aSize * pulse * uPixelRatio * (100.0 / -mv.z), 0.5, 14.0);
    gl_Position = projectionMatrix * mv;

    vAlpha = smoothstep(120.0, 8.0, -mv.z) * (0.08 + 0.1 * pulse);
  }
`;

const FRAGMENT_SHADER = `
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.02, d);
    float glow = exp(-d * 5.0) * 0.2;
    vec3 col = vec3(0.88, 0.88, 0.92) + glow;
    gl_FragColor = vec4(col, core * vAlpha);
  }
`;

export const SemanticParticles = memo(function SemanticParticles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mobile = window.innerWidth < 768;
    const N = mobile ? 400 : 900;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(
      65,
      el.clientWidth / el.clientHeight,
      0.1,
      200
    );
    cam.position.z = 45;

    const gl = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    gl.setSize(el.clientWidth, el.clientHeight);
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gl.domElement.style.display = "block";
    el.appendChild(gl.domElement);

    const pos = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const phases = new Float32Array(N);
    const speeds = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);

      if (Math.random() < 0.45) {
        const c = CLUSTER_CENTERS[i % CLUSTER_CENTERS.length];
        const r = Math.random() * 10 + 1;
        pos[i3] = c[0] + r * Math.sin(ph) * Math.cos(th);
        pos[i3 + 1] = c[1] + r * Math.sin(ph) * Math.sin(th);
        pos[i3 + 2] = c[2] + r * Math.cos(ph);
      } else {
        pos[i3] = (Math.random() - 0.5) * 80;
        pos[i3 + 1] = (Math.random() - 0.5) * 40;
        pos[i3 + 2] = (Math.random() - 0.5) * 20;
      }

      sizes[i] = Math.random() * 1.8 + 0.4;
      phases[i] = Math.random();
      speeds[i] = Math.random() * 0.5 + 0.7;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: gl.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    const tMouse = new THREE.Vector2(0, 0);
    const sMouse = new THREE.Vector2(0, 0);

    const onMove = (e: MouseEvent) => {
      tMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      tMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      if (!el) return;
      cam.aspect = el.clientWidth / el.clientHeight;
      cam.updateProjectionMatrix();
      gl.setSize(el.clientWidth, el.clientHeight);
      mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    };
    window.addEventListener("resize", onResize);

    let vis = true;
    const obs = new IntersectionObserver(
      ([e]) => { vis = e.isIntersecting; },
      { threshold: 0.05 }
    );
    obs.observe(el);

    const clock = new THREE.Clock();
    let raf: number;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!vis) return;

      const t = clock.getElapsedTime();
      mat.uniforms.uTime.value = t;

      sMouse.x += (tMouse.x - sMouse.x) * 0.03;
      sMouse.y += (tMouse.y - sMouse.y) * 0.03;
      mat.uniforms.uMouse.value.copy(sMouse);

      pts.rotation.y = t * 0.005;
      pts.rotation.x = Math.sin(t * 0.008) * 0.03;

      gl.render(scene, cam);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      gl.dispose();
      if (el.contains(gl.domElement)) el.removeChild(gl.domElement);
    };
  }, []);

  return <div ref={ref} className="absolute inset-0 -z-10" />;
});
