"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  Group,
  MathUtils,
  PCFSoftShadowMap,
  PerspectiveCamera as ThreePerspectiveCamera,
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
  /**
   * Site homepage: Dom tablet immediately (boot can lift), WebGL upgrades
   * underneath with an opacity crossfade — avoids waiting on the GLB.
   * Lab/desk can pass false to keep Dom-only until WebGL if preferred.
   */
  fastDomPreview?: boolean;
  /**
   * @deprecated Prefer fastDomPreview. When true (default), skip Dom until
   * WebGL settles (old path). Ignored when fastDomPreview is true.
   */
  skipDomFallback?: boolean;
  contentEpoch?: string;
};

const TABLET_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CROSSFADE_MS = 180;

const CANVAS_LOCKER_RAISED = "translate3d(0, 3vh, 0) scale(1)";
const CANVAS_LOCKER_LOWERED = "translate3d(0, 46vh, 0) scale(0.9)";
const CANVAS_DESK_RAISED = "translate3d(0, 4vh, 0) scale(1)";
const CANVAS_DESK_LOWERED = "translate3d(0, 24vh, 0) scale(0.9)";

const SETTLE_FRAMES = 6;
const CAMERA_Z_EPS = 0.0008;

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

function cameraZForSize(width: number, height: number): number {
  const w = Math.max(width, 2);
  const h = Math.max(height, 2);
  const aspect = w / h;
  const fov = 30;
  const halfFovTangent = Math.tan(MathUtils.degToRad(fov / 2));
  const targetHeightFill = w < 720 ? 0.7 : 0.82;
  const targetWidthFill = 0.78;
  const zForHeight = IPAD_BODY_H / (2 * halfFovTangent * targetHeightFill);
  const zForWidth =
    IPAD_BODY_W / (2 * halfFovTangent * aspect * targetWidthFill);
  return Math.max(zForHeight, zForWidth, 0.15);
}

const TILT_SNAP_EPS = 0.00035;

function ResponsiveCamera() {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const zRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!(camera instanceof ThreePerspectiveCamera)) return;
    const next = cameraZForSize(size.width, size.height);
    if (zRef.current != null && Math.abs(zRef.current - next) < CAMERA_Z_EPS) {
      return;
    }
    zRef.current = next;
    camera.position.set(0, 0, next);
    camera.fov = 30;
    camera.near = 0.01;
    camera.far = 4;
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  const initialZ = cameraZForSize(
    typeof window !== "undefined" ? window.innerWidth : 1200,
    typeof window !== "undefined" ? window.innerHeight : 800,
  );

  return (
    <PerspectiveCamera
      makeDefault
      position={[0, 0, initialZ]}
      fov={30}
      near={0.01}
      far={4}
    />
  );
}

function IpadLights() {
  return (
    <>
      <ambientLight intensity={0.62} color="#e6ebf2" />
      <directionalLight
        position={[0, 0.2, 1]}
        color="#ffffff"
        intensity={0.55}
        castShadow
        shadow-mapSize={[512, 512]}
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
        intensity={0.32}
      />
      <directionalLight
        position={[0.5, 0.05, 0.35]}
        color="#b8c4d4"
        intensity={0.2}
      />
      <directionalLight
        position={[0, -0.45, 0.25]}
        color="#d8dde6"
        intensity={0.18}
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
  contentEpoch,
}: {
  placement: Placement;
  raised: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  onPointerInsideChange?: (inside: boolean) => void;
  onModelReady?: () => void;
  contentEpoch?: string;
}) {
  const group = useRef<Group>(null);
  const target = threeTilt(placement, raised);
  const snappedPose = useRef(false);
  const settleFrames = useRef(0);
  const { invalidate } = useThree();

  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.x = target.x;
    g.rotation.z = target.z;
    snappedPose.current = true;
    settleFrames.current = 0;
    invalidate();
  }, [raised, placement, target.x, target.z, invalidate]);

  useEffect(() => {
    const id = window.setTimeout(() => invalidate(), TABLET_MOTION_MS + 48);
    return () => window.clearTimeout(id);
  }, [raised, placement, invalidate]);

  useEffect(() => {
    if (contentEpoch == null) return;
    settleFrames.current = 0;
    invalidate();
  }, [contentEpoch, invalidate]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    if (reduceMotion || !snappedPose.current) {
      g.rotation.x = target.x;
      g.rotation.z = target.z;
      settleFrames.current = 0;
      invalidate();
      return;
    }

    const dx = Math.abs(g.rotation.x - target.x);
    const dz = Math.abs(g.rotation.z - target.z);
    if (dx < TILT_SNAP_EPS && dz < TILT_SNAP_EPS) {
      g.rotation.x = target.x;
      g.rotation.z = target.z;
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
  contentEpoch,
}: Props) {
  return (
    <>
      <ResponsiveCamera />
      <IpadLights />
      <Suspense fallback={null}>
        <TiltedIpad
          placement={placement}
          raised={raised}
          reduceMotion={reduceMotion}
          onPointerInsideChange={onPointerInsideChange}
          onModelReady={onModelReady}
          contentEpoch={contentEpoch}
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
  const fastPreview = props.fastDomPreview === true;
  /** Legacy: hide Dom until WebGL — only when not using fast preview. */
  const waitForWebgl = !fastPreview && props.skipDomFallback !== false;

  const [modelReady, setModelReady] = useState(false);
  /** Mesh + camera settled; Html may mount under opacity 0. */
  const [webglSettled, setWebglSettled] = useState(false);
  /** Crossfade Dom → WebGL (primary visible). */
  const [webglLive, setWebglLive] = useState(false);
  const [domRetired, setDomRetired] = useState(false);
  const settleStarted = useRef(false);
  const uiSettleStarted = useRef(false);
  const readyNotified = useRef(false);
  const invalidateRef = useRef<(() => void) | null>(null);
  const onReadyProp = props.onModelReady;

  const notifyReady = useCallback(() => {
    if (readyNotified.current) return;
    readyNotified.current = true;
    onReadyProp?.();
  }, [onReadyProp]);

  // Fast path: Dom is interactive immediately — don't block homepage boot on GLB.
  useEffect(() => {
    if (!fastPreview) return;
    notifyReady();
  }, [fastPreview, notifyReady]);

  // Phase 1: mesh loaded → settle camera/pose under the boot / Dom.
  useEffect(() => {
    if (!modelReady || settleStarted.current) return;
    settleStarted.current = true;
    let frames = 0;
    let raf = 0;
    const tick = () => {
      invalidateRef.current?.();
      frames += 1;
      if (frames >= SETTLE_FRAMES) {
        setWebglSettled(true);
        if (!fastPreview) notifyReady();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [modelReady, fastPreview, notifyReady]);

  // Phase 2: Html UI mounted under opacity 0 → settle matrix, then crossfade.
  // Dom keeps its own UI instance until after the fade (no empty-frame blink).
  useEffect(() => {
    if (!webglSettled || uiSettleStarted.current) return;
    uiSettleStarted.current = true;
    let frames = 0;
    let raf = 0;
    const tick = () => {
      invalidateRef.current?.();
      frames += 1;
      if (frames >= SETTLE_FRAMES) {
        setWebglLive(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [webglSettled]);

  // Phase 3: after crossfade, drop Dom so we don't keep two full UIs.
  useEffect(() => {
    if (!webglLive) return;
    const id = window.setTimeout(() => setDomRetired(true), CROSSFADE_MS + 80);
    return () => window.clearTimeout(id);
  }, [webglLive]);

  // Ignore squad hydrate contentEpoch until after upgrade — first epoch change
  // was rewriting drei Html’s CSS matrix and flashing the settled iPad.
  const [epochArmed, setEpochArmed] = useState(false);
  useEffect(() => {
    if (!webglLive) return;
    const id = window.setTimeout(() => setEpochArmed(true), 600);
    return () => window.clearTimeout(id);
  }, [webglLive]);

  const showDom = fastPreview
    ? !domRetired
    : waitForWebgl
      ? !webglLive
      : !webglLive;
  /** Mount WebGL UI as soon as mesh settled (still invisible) so Html can warm up. */
  const webglHasUi = webglSettled;
  const canvasVisible = webglLive;

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
        <div
          className="absolute inset-0"
          style={{
            opacity: webglLive ? 0 : 1,
            transition: props.reduceMotion
              ? "none"
              : `opacity ${CROSSFADE_MS}ms ease-out`,
            pointerEvents: webglLive
              ? "none"
              : props.raised
                ? "auto"
                : "none",
            zIndex: canvasVisible ? 1 : 2,
          }}
        >
          <TabletDomFrame
            raised={props.raised}
            reduceMotion={props.reduceMotion}
            onPointerInsideChange={
              webglLive ? undefined : props.onPointerInsideChange
            }
            placement={placement}
            matchWebglScale={fastPreview}
          >
            {/* Keep Dom UI through the fade — retiring only after opacity hits 0. */}
            {domRetired ? null : props.children}
          </TabletDomFrame>
        </div>
      ) : null}

      <div
        className="absolute inset-0 flex items-start justify-center overflow-hidden pt-[4vh]"
        style={{
          opacity: canvasVisible ? 1 : 0,
          transition: props.reduceMotion
            ? "none"
            : `opacity ${CROSSFADE_MS}ms ease-out`,
          pointerEvents:
            !canvasVisible || !props.raised ? "none" : "auto",
          perspective: "1400px",
          perspectiveOrigin: placement === "desk" ? "50% 58%" : "50% 38%",
          zIndex: 2,
        }}
        aria-hidden={!canvasVisible ? true : undefined}
      >
        <div
          className={`relative ${IPAD_FRAME_SIZE}`}
          style={{
            transform: canvasTabletTransform(placement, props.raised),
            transformOrigin: placement === "desk" ? "50% 85%" : "50% 50%",
            // Never animate transform on first reveal — only on raise/lower after live.
            transition:
              props.reduceMotion || !canvasVisible
                ? "none"
                : `transform ${TABLET_MOTION_MS}ms ${TABLET_EASE}`,
          }}
        >
          <TabletAtmosphere raised={props.raised} placement={placement} />
          <Canvas
            className="!absolute inset-0 h-full w-full"
            shadows
            dpr={[1, 1.5]}
            fallback={null}
            frameloop="demand"
            resize={{ debounce: { scroll: 0, resize: 0 } }}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl, invalidate }) => {
              configureGl(gl);
              invalidateRef.current = invalidate;
              invalidate();
            }}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <IpadScene
                raised={props.raised}
                reduceMotion={props.reduceMotion}
                placement={placement}
                contentEpoch={epochArmed ? props.contentEpoch : undefined}
                onPointerInsideChange={
                  webglLive ? props.onPointerInsideChange : undefined
                }
                onModelReady={() => setModelReady(true)}
              >
                {webglHasUi ? props.children : null}
              </IpadScene>
            </Suspense>
          </Canvas>
        </div>
      </div>
    </SceneErrorBoundary>
  );
}
