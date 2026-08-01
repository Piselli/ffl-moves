"use client";

import {
  Component,
  Suspense,
  useEffect,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  MathUtils,
  PCFSoftShadowMap,
} from "three";
import { IpadFrame } from "./IpadFrame";
import { IPAD_BODY_H, IPAD_BODY_W, IpadMesh } from "./IpadMesh";

type Props = {
  raised: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  onPointerInsideChange?: (inside: boolean) => void;
  onModelReady?: () => void;
};

/**
 * Raise/lower is a CSS transform on the wrapper that owns both the WebGL
 * canvas and the Html overlay, so device + menu stay locked together.
 */
export const TABLET_MOTION_MS = 520;
const TABLET_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const TRANSFORM_RAISED =
  "translate3d(0, 8vh, 0) rotateX(0deg) rotateZ(0deg) scale(1)";
const TRANSFORM_LOWERED =
  "translate3d(0, 46vh, 0) rotateX(28deg) rotateZ(1.4deg) scale(0.9)";

function ResponsiveCamera() {
  const { size } = useThree();
  const aspect = size.width / size.height;
  const fov = 30;
  const halfFovTangent = Math.tan(MathUtils.degToRad(fov / 2));
  const targetHeightFill = size.width < 720 ? 0.7 : 0.82;
  const targetWidthFill = 0.78;
  const zForHeight =
    IPAD_BODY_H / (2 * halfFovTangent * targetHeightFill);
  const zForWidth =
    IPAD_BODY_W / (2 * halfFovTangent * aspect * targetWidthFill);
  const z = Math.max(zForHeight, zForWidth);

  return (
    <PerspectiveCamera
      makeDefault
      position={[0, 0, z]}
      fov={fov}
      near={0.01}
      far={4}
    />
  );
}

function IpadLights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#e6ebf2" />
      <directionalLight
        position={[0, 0.2, 1]}
        color="#ffffff"
        intensity={0.48}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00015}
        shadow-camera-near={0.05}
        shadow-camera-far={2}
        shadow-camera-left={-0.35}
        shadow-camera-right={0.35}
        shadow-camera-top={0.3}
        shadow-camera-bottom={-0.3}
      />
      {/* Cool slate bounce from locker walls */}
      <directionalLight
        position={[-0.55, 0.15, 0.35]}
        color="#c8d2e0"
        intensity={0.28}
      />
      <directionalLight
        position={[0.5, 0.05, 0.35]}
        color="#b8c4d4"
        intensity={0.18}
      />
      {/* Soft floor bounce into the underside of the bezel */}
      <directionalLight
        position={[0, -0.45, 0.25]}
        color="#d8dde6"
        intensity={0.16}
      />
    </>
  );
}

function IpadScene({
  raised,
  children,
  onPointerInsideChange,
  onModelReady,
}: Omit<Props, "reduceMotion">) {
  return (
    <>
      <ResponsiveCamera />
      <IpadLights />
      <Suspense fallback={null}>
        <Environment
          preset="studio"
          background={false}
          environmentIntensity={0.22}
        />
      </Suspense>
      <Suspense fallback={null}>
        <IpadMesh
          interactive={raised}
          onPointerInsideChange={onPointerInsideChange}
          onModelReady={onModelReady}
        >
          {children}
        </IpadMesh>
      </Suspense>
    </>
  );
}

type BoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

class SceneErrorBoundary extends Component<
  BoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("3D tablet scene failed:", error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function StaticFallback({
  raised,
  reduceMotion,
  children,
  onPointerInsideChange,
  onModelReady,
}: Props) {
  useEffect(() => {
    onModelReady?.();
  }, [onModelReady]);

  return (
    <div
      className="absolute inset-0 flex items-start justify-center overflow-hidden pt-[4vh]"
      style={{
        pointerEvents: raised ? "auto" : "none",
        perspective: "1200px",
        perspectiveOrigin: "50% 35%",
      }}
    >
      <div
        className="aspect-[0.2816/0.2155] w-[min(92vw,calc(86vh*0.2816/0.2155))] shrink-0 will-change-transform"
        style={{
          transform: raised ? TRANSFORM_RAISED : TRANSFORM_LOWERED,
          transition: reduceMotion
            ? "none"
            : `transform ${TABLET_MOTION_MS}ms ${TABLET_EASE}`,
          transformOrigin: "50% 50%",
        }}
      >
        <IpadFrame onPointerInsideChange={onPointerInsideChange}>
          {children}
        </IpadFrame>
      </div>
    </div>
  );
}

function configureGl(
  gl: {
    setClearColor: (c: number, a: number) => void;
    shadowMap: { type: unknown };
    toneMapping: unknown;
    toneMappingExposure: number;
  },
) {
  gl.setClearColor(0x000000, 0);
  gl.shadowMap.type = PCFSoftShadowMap;
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.02;
}

/** Soft contact shadow + cool room bounce — tablet sits in the locker, not on a JPEG. */
function TabletAtmosphere({ raised }: { raised: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: raised ? 1 : 0.35,
        transition: "opacity 420ms ease-out",
      }}
    >
      <div
        className="absolute left-1/2 top-[46%] h-[34vmin] w-[64vmin] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(170,180,195,0.11) 0%, rgba(140,155,175,0.04) 45%, transparent 70%)",
          mixBlendMode: "soft-light",
        }}
      />
      <div
        className="absolute left-1/2 top-[59%] h-[14vmin] w-[52vmin] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.16) 40%, transparent 72%)",
          filter: "blur(14px)",
        }}
      />
      <div
        className="absolute left-1/2 top-[62%] h-[5vmin] w-[42vmin] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, transparent 70%)",
          filter: "blur(5px)",
        }}
      />
    </div>
  );
}

/** Transparent WebGL layer composited over the photographic locker plate. */
export function TabletScene(props: Props) {
  const fallback = (
    <StaticFallback
      raised={props.raised}
      reduceMotion={props.reduceMotion}
      onPointerInsideChange={props.onPointerInsideChange}
      onModelReady={props.onModelReady}
    >
      {props.children}
    </StaticFallback>
  );

  return (
    <SceneErrorBoundary fallback={fallback}>
      <div
        className="absolute inset-0"
        style={{
          pointerEvents: props.raised ? "auto" : "none",
          perspective: "1400px",
          perspectiveOrigin: "50% 38%",
        }}
      >
        <div
          className="absolute inset-0 origin-center will-change-transform"
          style={{
            transform: props.raised ? TRANSFORM_RAISED : TRANSFORM_LOWERED,
            transition: props.reduceMotion
              ? "none"
              : `transform ${TABLET_MOTION_MS}ms ${TABLET_EASE}`,
          }}
        >
          <TabletAtmosphere raised={props.raised} />
          <Canvas
            shadows
            dpr={[1, 1.75]}
            fallback={fallback}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => configureGl(gl)}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <IpadScene
                raised={props.raised}
                onPointerInsideChange={props.onPointerInsideChange}
                onModelReady={props.onModelReady}
              >
                {props.children}
              </IpadScene>
            </Suspense>
          </Canvas>
        </div>
      </div>
    </SceneErrorBoundary>
  );
}
