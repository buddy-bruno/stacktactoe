'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { Player, PieceSize } from '@/lib/game/stt';

/** Proof-of-Concept: Eine Figur als WebGL-Glas (Three.js MeshPhysicalMaterial mit transmission).
 *  Zeigt, dass realistische Glasfiguren machbar sind. Optional ins Spiel integrierbar. */
export function PieceGlassPoc({
  player,
  size,
  className = '',
  width = 80,
  height = 120,
}: {
  player: Player;
  size: PieceSize;
  className?: string;
  width?: number;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 2.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Glas-Kugel als PoC (Bauer/Dame/König mit Zylinder+Kugel+Extras wären nächster Schritt)
    const scale = size === 'small' ? 0.85 : size === 'medium' ? 1 : 1.15;
    const geometry = new THREE.SphereGeometry(0.48 * scale, 32, 32);
    const tint = player === 'human' ? 0x38bdf8 : 0xfb923c;
    const material = new THREE.MeshPhysicalMaterial({
      color: tint,
      transparent: true,
      opacity: 0.92,
      transmission: 0.96,
      thickness: 0.15,
      roughness: 0.05,
      metalness: 0,
      envMapIntensity: 0.8,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Leichtes Umgebungslicht, damit Glas Reflexionen hat
    const envLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(envLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 2, 3);
    scene.add(dirLight);

    let frameId: number;
    function animate() {
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [player, size, width, height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, minWidth: width, minHeight: height }}
      aria-hidden
    />
  );
}
