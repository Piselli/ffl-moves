"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";

/**
 * Sketchfab "iPad Pro 13in black M4" (CC-BY), pre-stripped offline.
 * Fit constants measured offline — do not change without re-measuring.
 */
export const IPAD_BODY_W = 0.2826;
export const IPAD_BODY_H = 0.2163;
export const IPAD_BEZEL = 0.0084;

const FIT_QUAT = new Quaternion(0.183547, -0.682869, -0.183547, 0.682869);
const FIT_SCALE = 1.002652;
const FIT_OFFSET = new Vector3(-0.000001, -0.160799, 0.06025);

const SCREEN_W = 0.2648;
const SCREEN_RADIUS = 0.0072;
const HTML_Z = 0.0006;

const SCREEN_LAYOUT_W = 960;
const SCREEN_LAYOUT_H = 720;
const SCREEN_ZOOM = 1.5;
const HTML_DISTANCE_FACTOR = 10;

const IPAD_GLB_URL = "/design-lab/locker-hero/models/ipad-pro13-m4-slim.glb";
const HTML_WRAPPER_CLASS = "ipad-html-layer";

type Props = {
  children: ReactNode;
  interactive: boolean;
  onPointerInsideChange?: (inside: boolean) => void;
  onModelReady?: () => void;
};

function isDisplayMaterial(mat: MeshStandardMaterial) {
  const emissiveSum =
    (mat.emissive?.r ?? 0) + (mat.emissive?.g ?? 0) + (mat.emissive?.b ?? 0);
  return !!mat.emissiveMap || emissiveSum > 0.05 || mat.emissiveIntensity > 1.01;
}

function muteBakedScreen(root: Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      if (!mat || !(mat instanceof MeshStandardMaterial)) continue;
      if (isDisplayMaterial(mat)) {
        mat.emissive.set("#000000");
        mat.emissiveMap = null;
        mat.emissiveIntensity = 0;
        mat.color.set("#000000");
        mat.map = null;
        mat.metalness = 0;
        mat.roughness = 0.28;
      }
      mat.side = DoubleSide;
      mat.envMapIntensity = Math.min(mat.envMapIntensity ?? 1, 0.85);
      mat.needsUpdate = true;
    }
  });
}

function buildIpad(scene: Object3D): Group {
  const root = scene.clone(true);
  muteBakedScreen(root);

  const fitted = new Group();
  fitted.quaternion.copy(FIT_QUAT);
  fitted.scale.setScalar(FIT_SCALE);
  fitted.position.copy(FIT_OFFSET);
  fitted.add(root);

  const wrapper = new Group();
  wrapper.add(fitted);
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

export function IpadMesh({
  children,
  interactive,
  onPointerInsideChange,
  onModelReady,
}: Props) {
  const { scene } = useGLTF(IPAD_GLB_URL);
  const object = useMemo(() => buildIpad(scene), [scene]);
  const { invalidate } = useThree();

  const cssW = SCREEN_LAYOUT_W * SCREEN_ZOOM;
  const cssH = SCREEN_LAYOUT_H * SCREEN_ZOOM;
  const screenScale = SCREEN_W / (cssW * (HTML_DISTANCE_FACTOR / 400));
  const radiusCss = Math.round((SCREEN_RADIUS / SCREEN_W) * cssW);

  useEffect(() => {
    invalidate();
    onModelReady?.();
  }, [object, onModelReady, invalidate]);

  useEffect(() => {
    const id = "ipad-html-layer-css";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = `
      .${HTML_WRAPPER_CLASS}{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        z-index:20!important;
      }
    `;
    document.head.appendChild(tag);
  }, []);

  return (
    <group>
      <primitive object={object} />

      <Html
        transform
        occlude={false}
        distanceFactor={HTML_DISTANCE_FACTOR}
        position={[0, 0, HTML_Z]}
        scale={screenScale}
        zIndexRange={[40, 20]}
        wrapperClass={HTML_WRAPPER_CLASS}
        onOcclude={() => {}}
        style={{
          width: cssW,
          height: cssH,
          borderRadius: radiusCss,
          overflow: "hidden",
          background: "#000000",
          pointerEvents: interactive ? "auto" : "none",
          userSelect: "none",
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: SCREEN_LAYOUT_W,
            height: SCREEN_LAYOUT_H,
            zoom: SCREEN_ZOOM,
            borderRadius: radiusCss / SCREEN_ZOOM,
            background: "#000000",
          }}
          onMouseEnter={() => onPointerInsideChange?.(true)}
          onMouseLeave={() => onPointerInsideChange?.(false)}
        >
          {children}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[60]"
            style={{
              background:
                "linear-gradient(118deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 8%, transparent 16%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[62]"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <div className="absolute bottom-[7px] left-1/2 h-[2.5px] w-[84px] -translate-x-1/2 rounded-full bg-black/30" />
          </div>
        </div>
      </Html>
    </group>
  );
}

useGLTF.preload(IPAD_GLB_URL);
