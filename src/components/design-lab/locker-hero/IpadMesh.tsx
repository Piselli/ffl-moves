"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { Html, useGLTF } from "@react-three/drei";
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
 * Sketchfab "iPad Pro 13in black M4" (CC-BY), pre-stripped offline:
 * the source is authored as a laptop pose (Magic Keyboard + Apple Pencil),
 * but the slim GLB keeps only the iPad branch, with textures in WebP
 * (17.1 MB → 3.7 MB; see THIRD_PARTY.md).
 *
 * The fit below was computed OFFLINE from the GLB's actual vertices
 * (scripts parsed the binary; see chat 2026-07-25). The iPad geometry is
 * byte-identical to the source, so the constants still hold:
 *   glass  = 0.2648 × 0.1984 m centered at origin, front plane at z = 0
 *   body   = 0.2826 × 0.2163 m, z ∈ [-0.0074, 0]  (fully behind the glass)
 * Do not "improve" these constants without re-measuring.
 */
export const IPAD_BODY_W = 0.2826;
export const IPAD_BODY_H = 0.2163;
export const IPAD_BEZEL = 0.0084;

/** Rotation mapping display normal → +Z, screen-up → +Y, width → +X. */
const FIT_QUAT = new Quaternion(0.183547, -0.682869, -0.183547, 0.682869);
const FIT_SCALE = 1.002652;
const FIT_OFFSET = new Vector3(-0.000001, -0.160799, 0.06025);

/** Active display measured after fit. */
const SCREEN_W = 0.2648;
const SCREEN_H = 0.1984;
const SCREEN_RADIUS = 0.0072;
const HTML_Z = 0.0006;

/**
 * The Html layer is 3D-transformed, so the browser rasterizes it once at its own
 * CSS size — rendering the UI at 1:1 and letting the matrix upscale it is what
 * made text look soft. Lay it out at 1.5× and let the matrix scale down instead.
 */
const SCREEN_LAYOUT_W = 960;
const SCREEN_LAYOUT_H = 720;
const SCREEN_ZOOM = 1.5;
const SCREEN_CSS_W = SCREEN_LAYOUT_W * SCREEN_ZOOM;
const SCREEN_CSS_H = SCREEN_LAYOUT_H * SCREEN_ZOOM;
const HTML_DISTANCE_FACTOR = 10;
const SCREEN_SCALE =
  SCREEN_W / (SCREEN_CSS_W * (HTML_DISTANCE_FACTOR / 400));
const SCREEN_RADIUS_CSS = Math.round((SCREEN_RADIUS / SCREEN_W) * SCREEN_CSS_W);

const IPAD_GLB_URL = "/design-lab/locker-hero/models/ipad-pro13-m4-slim.glb";

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

/** Kill the baked wallpaper so the live Html UI is the display. */
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

  // position/quaternion/scale compose as T·R·S — matches offline math
  // (offset + s·R·p) because scale is uniform.
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

  useEffect(() => {
    onModelReady?.();
  }, [object, onModelReady]);

  return (
    <group>
      <primitive object={object} />

      <Html
        transform
        occlude={false}
        distanceFactor={HTML_DISTANCE_FACTOR}
        position={[0, 0, HTML_Z]}
        scale={SCREEN_SCALE}
        zIndexRange={[30, 10]}
        style={{
          width: SCREEN_CSS_W,
          height: SCREEN_CSS_H,
          borderRadius: SCREEN_RADIUS_CSS,
          overflow: "hidden",
          background: "#0b0d10",
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
            borderRadius: SCREEN_RADIUS_CSS / SCREEN_ZOOM,
            background: "#0b0d10",
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
