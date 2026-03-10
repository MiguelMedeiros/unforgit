"use client";

import { useEffect, useRef, memo } from "react";
import * as THREE from "three";

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

    // Multi-frequency organic flow
    float fx = sin(t * 0.3 * aSpeed + p) * 3.0
             + cos(t * 0.17 + pos.z * 0.03) * 2.0;
    float fy = cos(t * 0.23 * aSpeed + p + 1.0) * 3.0
             + sin(t * 0.13 + pos.x * 0.03) * 2.0;
    float fz = sin(t * 0.19 * aSpeed + p * 0.7) * 2.0
             + cos(t * 0.11 + pos.y * 0.02) * 1.5;

    pos.x += fx;
    pos.y += fy;
    pos.z += fz;

    // Subtle breathing
    pos *= 1.0 + 0.025 * sin(t * 0.4);

    // Mouse attraction
    vec3 mWorld = vec3(uMouse * 28.0, 0.0);
    vec3 toM = mWorld - pos;
    float mDist = length(toM);
    pos += normalize(toM + 0.001) * smoothstep(45.0, 0.0, mDist) * 2.5;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    float pulse = 1.0 + 0.35 * sin(t * 1.8 + p);
    gl_PointSize = clamp(aSize * pulse * uPixelRatio * (160.0 / -mv.z), 0.5, 24.0);

    gl_Position = projectionMatrix * mv;

    vAlpha = smoothstep(130.0, 12.0, -mv.z) * (0.25 + 0.3 * pulse);
  }
`;

const FRAGMENT_SHADER = `
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.02, d);
    float glow = exp(-d * 5.0) * 0.5;

    vec3 col = vec3(0.92, 0.92, 0.95) + glow;
    gl_FragColor = vec4(col, core * vAlpha);
  }
`;

interface NeuralParticlesProps {
  count?: number;
  className?: string;
}

export const NeuralParticles = memo(function NeuralParticles({
  count,
  className = "",
}: NeuralParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mobile = window.innerWidth < 768;
    const TOTAL = count ?? (mobile ? 2500 : 5000);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      el.clientWidth / el.clientHeight,
      0.1,
      200
    );
    camera.position.z = 55;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const pos = new Float32Array(TOTAL * 3);
    const sizeArr = new Float32Array(TOTAL);
    const phaseArr = new Float32Array(TOTAL);
    const speedArr = new Float32Array(TOTAL);

    for (let i = 0; i < TOTAL; i++) {
      const i3 = i * 3;

      if (Math.random() < 0.55) {
        const arm = Math.floor(Math.random() * 3);
        const armOff = (arm / 3) * Math.PI * 2;
        const dist = Math.random() * 28 + 4;
        const angle = dist * 0.35 + armOff;
        const spread = Math.random() * 4.5;

        pos[i3] =
          Math.cos(angle) * dist + (Math.random() - 0.5) * spread;
        pos[i3 + 1] =
          Math.sin(angle) * dist + (Math.random() - 0.5) * spread;
        pos[i3 + 2] =
          (Math.random() - 0.5) * 14 + Math.sin(angle * 2) * 3;
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * 38 + 8;

        pos[i3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i3 + 2] = r * Math.cos(phi);
      }

      sizeArr[i] = Math.random() * 2.5 + 0.6;
      phaseArr[i] = Math.random();
      speedArr[i] = Math.random() * 0.8 + 0.6;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizeArr, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phaseArr, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speedArr, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    const targetMouse = new THREE.Vector2(0, 0);
    const smoothMouse = new THREE.Vector2(0, 0);

    const onMove = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      mat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };
    window.addEventListener("resize", onResize);

    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(el);

    const clock = new THREE.Clock();
    let raf: number;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;

      const t = clock.getElapsedTime();
      mat.uniforms.uTime.value = t;

      smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.04;
      smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.04;
      mat.uniforms.uMouse.value.copy(smoothMouse);

      pts.rotation.y = t * 0.035;
      pts.rotation.x = Math.sin(t * 0.018) * 0.12;

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [count]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 -z-10 ${className}`}
    />
  );
});
