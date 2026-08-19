"use client";

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  Group,
  MathUtils,
  PCFSoftShadowMap,
} from "three";
import { IPAD_BODY_H, IPAD_BODY_W, IpadMesh } from "./IpadMesh";
import {
  IPAD_FRAME_SIZE,
  TABLET_MOTION_MS,
  TabletDomFrame,
} from "./TabletDomFrame";

export { TABLET_MOTION_MS };

type Placement = "locker" | "desk";

type Props = {
  raised: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  onPointerInsideChange?: (inside: boolean) => void;
  onModelReady?: () => void;
  placement?: Placement;
  /** Parent already shows TabletDomFrame — don't double-mount screen content. */
  skipDomFallback?: boolean;
};

/**
 * Translate/scale on the CSS wrapper. Tip lives in Three.js on mesh+Html
 * together (coplanar). Canvas uses frameloop="demand" so drei Html stops
 * rewriting its CSS matrix once the tip settles — that was the flicker.
 */
const TABLET_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const CANVAS_LOCKER_RAISED = "translate3d(0, 3vh, 0) scale(1)";
const CANVAS_LOCKER_LOWERED = "translate3d(0, 46vh, 0) scale(0.9)";
const CANVAS_DESK_RAISED = "translate3d(0, 4vh, 0) scale(1)";
const CANVAS_DESK_LOWERED = "translate3d(0, 24vh, 0) scale(0.9)";

function canvasTabletTransform(placement: Placement, raised: boolean): string {
  if (placement === "desk") {
    return raised ? CANVAS_DESK_RAISED : CANVAS_DESK_LOWERED;
  }
  return raised ? CANVAS_LOCKER_RAISED : CANVAS_LOCKER_LOWERED;
}

function threeTilt(
  placement: Placement,
  raised: boolean,
): { x: number; z: number } {
  if (placement === "desk") {
    return raised
      ? { x: 0, z: 0 }
      : { x: MathUtils.degToRad(-14), z: MathUtils.degToRad(-0.3) };
  }
  return raised
    ? { x: 0, z: 0 }
    : { x: MathUtils.degToRad(-28), z: MathUtils.degToRad(-1.4) };
}

const TILT_SNAP_EPS = 0.00035;

function ResponsiveCamera() {
  const { size } = useThree();
  const w = Math.max(size.width, 2);
  const h = Math.max(size.height, 2);
  const aspect = w / h;
  const fov = 30;
  const halfFovTangent = Math.tan(MathUtils.degToRad(fov / 2));
  const targetHeightFill = w < 720 ? 0.7 : 0.82;
  const targetWidthFill = 0.78;
  const zForHeight =
    IPAD_BODY_H / (2 * halfFovTangent * targetHeightFill);
  const zForWidth =
    IPAD_BODY_W / (2 * halfFovTangent * aspect * targetWidthFill);
  const z = Math.max(zForHeight, zForWidth, 0.15);

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
      <directionalLight
        position={[0, -0.45, 0.25]}
        color="#d8dde6"
        intensity={0.16}
      />
    </>
  );
}

function TiltedIpad({
  placement,
  raised,
  reduceMotion,
  children,
  onPointerInsideChange,
  onModelReady,
}: {
  placement: Placement;
  raised: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  onPointerInsideChange?: (inside: boolean) => void;
  onModelReady?: () => void;
}) {
  const group = useRef<Group>(null);
  const target = threeTilt(placement, raised);
  const booted = useRef(false);
  const settleFrames = useRef(0);
  const { invalidate } = useThree();

  // Kick a redraw whenever pose target changes (demand frameloop).
  useEffect(() => {
    booted.current = false;
    settleFrames.current = 0;
    invalidate();
    // Keep drawing through the CSS translate transition too.
    const id = window.setTimeout(() => invalidate(), TABLET_MOTION_MS + 48);
    return () => window.clearTimeout(id);
  }, [raised, placement, invalidate]);

  // Priority -1: apply tip BEFORE drei Html samples matrixWorld this frame.
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    if (reduceMotion) {
      g.rotation.x = target.x;
      g.rotation.z = target.z;
      booted.current = true;
      settleFrames.current = 0;
      invalidate();
      return;
    }

    booted.current = true;

    const dx = Math.abs(g.rotation.x - target.x);
    const dz = Math.abs(g.rotation.z - target.z);
    if (dx < TILT_SNAP_EPS && dz < TILT_SNAP_EPS) {
      g.rotation.x = target.x;
      g.rotation.z = target.z;
      // A few settle frames so Html writes the final tipped matrix, then stop.
      if (settleFrames.current < 4) {
        settleFrames.current += 1;
        invalidate();
      }
      return;
    }

    settleFrames.current = 0;
    g.rotation.x = MathUtils.damp(g.rotation.x, target.x, 10, dt);
    g.rotation.z = MathUtils.damp(g.rotation.z, target.z, 10, dt);
    invalidate();
  }, -1);

  return (
    <group ref={group}>
      <IpadMesh
        interactive={raised}
        onPointerInsideChange={onPointerInsideChange}
        onModelReady={onModelReady}
      >
        {children}
      </IpadMesh>
    </group>
  );
}

function IpadScene({
  raised,
  reduceMotion,
  placement = "locker",
  children,
  onPointerInsideChange,
  onModelReady,
}: Props) {
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
        <TiltedIpad
          placement={placement}
          raised={raised}
          reduceMotion={reduceMotion}
          onPointerInsideChange={onPointerInsideChange}
          onModelReady={onModelReady}
        >
          {children}
        </TiltedIpad>
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
  placement = "locker",
}: Props) {
  useEffect(() => {
    onModelReady?.();
  }, [onModelReady]);

  return (
    <TabletDomFrame
      raised={raised}
      reduceMotion={reduceMotion}
      onPointerInsideChange={onPointerInsideChange}
      placement={placement}
    >
      {children}
    </TabletDomFrame>
  );
}

function configureGl(gl: {
  setClearColor: (c: number, a: number) => void;
  shadowMap: { type: unknown };
  toneMapping: unknown;
  toneMappingExposure: number;
  domElement: HTMLCanvasElement;
}) {
  gl.setClearColor(0x000000, 0);
  gl.shadowMap.type = PCFSoftShadowMap;
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.02;
  gl.domElement.style.position = "absolute";
  gl.domElement.style.inset = "0";
  gl.domElement.style.zIndex = "1";
}

function TabletAtmosphere({
  raised,
  placement = "locker",
}: {
  raised: boolean;
  placement?: Placement;
}) {
  const desk = placement === "desk";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: raised ? 1 : desk ? 0.7 : 0.35,
        transition: "opacity 420ms ease-out",
      }}
    >
      <div
        className="absolute left-1/2 top-[42%] h-[40%] w-[90%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(170,180,195,0.11) 0%, rgba(140,155,175,0.04) 45%, transparent 70%)",
          mixBlendMode: "soft-light",
        }}
      />
      <div
        className={
          desk
            ? "absolute left-1/2 top-[92%] h-[18%] w-[110%] -translate-x-1/2"
            : "absolute left-1/2 top-[88%] h-[14%] w-[100%] -translate-x-1/2"
        }
        style={{
          background: desk
            ? "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 42%, transparent 74%)"
            : "radial-gradient(ellipse at center, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.16) 40%, transparent 72%)",
          filter: "blur(14px)",
        }}
      />
      <div
        className={
          desk
            ? "absolute left-1/2 top-[96%] h-[8%] w-[85%] -translate-x-1/2"
            : "absolute left-1/2 top-[94%] h-[6%] w-[80%] -translate-x-1/2"
        }
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, transparent 70%)",
          filter: "blur(5px)",
        }}
      />
    </div>
  );
}

export function TabletScene(props: Props) {
  const placement = props.placement ?? "locker";
  const [webglReady, setWebglReady] = useState(false);
  const skipDom = props.skipDomFallback === true;
  const showDom = !skipDom && !webglReady;

  const onReady = () => {
    setWebglReady(true);
    props.onModelReady?.();
  };

  const fallback = (
    <StaticFallback
      raised={props.raised}
      reduceMotion={props.reduceMotion}
      onPointerInsideChange={props.onPointerInsideChange}
      onModelReady={props.onModelReady}
      placement={placement}
    >
      {props.children}
    </StaticFallback>
  );

  return (
    <SceneErrorBoundary fallback={fallback}>
      {showDom ? (
        <TabletDomFrame
          raised={props.raised}
          reduceMotion={props.reduceMotion}
          onPointerInsideChange={props.onPointerInsideChange}
          placement={placement}
        >
          {props.children}
        </TabletDomFrame>
      ) : null}
      <div
        className="absolute inset-0 flex items-start justify-center overflow-hidden pt-[4vh]"
        style={{
          pointerEvents: showDom || !props.raised ? "none" : "auto",
          perspective: "1400px",
          perspectiveOrigin: placement === "desk" ? "50% 58%" : "50% 38%",
        }}
        aria-hidden={showDom || undefined}
      >
        <div
          className={`relative ${IPAD_FRAME_SIZE}`}
          style={{
            transform: canvasTabletTransform(placement, props.raised),
            transformOrigin: placement === "desk" ? "50% 85%" : "50% 50%",
            transition: props.reduceMotion
              ? "none"
              : `transform ${TABLET_MOTION_MS}ms ${TABLET_EASE}`,
          }}
        >
          <TabletAtmosphere raised={props.raised} placement={placement} />
          <Canvas
            className="!absolute inset-0 h-full w-full"
            shadows
            dpr={[1, 1.75]}
            fallback={null}
            // Demand: once tip settles we stop the loop so drei Html stops
            // thrashing its CSS matrix (settled flicker on homepage lower).
            frameloop="demand"
            resize={{ debounce: { scroll: 50, resize: 50 } }}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl, invalidate }) => {
              configureGl(gl);
              invalidate();
            }}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <IpadScene
                raised={props.raised}
                reduceMotion={props.reduceMotion}
                placement={placement}
                onPointerInsideChange={
                  showDom ? undefined : props.onPointerInsideChange
                }
                onModelReady={onReady}
              >
                {skipDom || webglReady ? props.children : null}
              </IpadScene>
            </Suspense>
          </Canvas>
        </div>
      </div>
    </SceneErrorBoundary>
  );
}
