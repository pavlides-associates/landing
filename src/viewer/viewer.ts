import * as OBC from "@thatopen/components";
import * as THREE from "three";
import CameraControls from "camera-controls";

type World = OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;

export interface Viewer {
  components: OBC.Components;
  world: World;
  fragments: OBC.FragmentsManager;
  grid: OBC.SimpleGrid;
  container: HTMLElement;
}

// Sets up a single World with SimpleScene/SimpleCamera/SimpleRenderer per current
// @thatopen/components 3.4.x docs. SimpleRenderer mounts its own canvas into `container`.
export async function createViewer(container: HTMLElement): Promise<Viewer> {
  const components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);

  const world: World = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBC.SimpleRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.SimpleCamera(components);

  // Suppress the bottom-left That Open Company logo overlay. Non-essential —
  // don't let a TOC API change on this property break init.
  try { world.renderer.showLogo = false; } catch (e) { console.warn("showLogo failed", e); }

  components.init();

  // Cap pixel ratio. On a 3× retina phone the renderbuffer is 9× larger than
  // 1×, which is a major contributor to mobile WebGL crashes on this scene.
  // Coarse pointer ≈ touch device → tighter cap. Defensive try/catch — if
  // the renderer is in a weird state, we'd rather render slightly blurrier
  // than abort init entirely.
  try {
    const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const dprCap = isTouch ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    world.renderer.three.setPixelRatio(dpr);
  } catch (e) {
    console.warn("setPixelRatio failed", e);
  }

  // Default lighting + environment.
  world.scene.setup();
  world.scene.three.background = new THREE.Color(0x1a1a1a);

  world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);

  // Don't hijack page scrolling. The viewer is embedded in a long page, so:
  //   - mouse wheel without modifier → page scrolls (default browser behavior)
  //   - Cmd / Ctrl + wheel → dolly the camera (manual handler below)
  //   - one-finger touch → page scrolls (instead of orbiting)
  //   - two-finger pinch / drag → dolly + orbit
  //   - three-finger drag → pan
  // Mac trackpad pinch sends wheel events with ctrlKey set automatically, so
  // it lands in the dolly path "for free".
  const controls = world.camera.controls;
  controls.mouseButtons.wheel = CameraControls.ACTION.NONE;
  controls.touches.one = CameraControls.ACTION.NONE;
  controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_ROTATE;
  controls.touches.three = CameraControls.ACTION.TOUCH_TRUCK;

  container.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return; // page scrolls
      e.preventDefault();
      const factor = e.deltaMode === 0 ? 0.01 : 0.3;
      controls.dolly(-e.deltaY * factor, true);
    },
    { passive: false },
  );

  // Single-finger page-scroll passthrough.
  //
  // camera-controls is uncooperative here: on connect it forces
  // canvas.style.touchAction = 'none' AND in its document pointermove
  // handler it calls preventDefault() unconditionally. Even with
  // touches.one = NONE that preventDefault still fires, which blocks the
  // browser's native vertical pan scroll.
  //
  // We override both:
  //   1. After init, restore touch-action: pan-y on the canvas so the
  //      browser knows it may handle vertical pans natively.
  //   2. Track active touch pointers ourselves; in capture-phase, if only
  //      one touch is down, stopImmediatePropagation on document pointermove
  //      so camera-controls' bubble-phase handler never fires (and never
  //      preventDefaults the move).
  //
  // Two-finger and beyond pass through unchanged → pinch/rotate still work.
  const canvas = container.querySelector<HTMLCanvasElement>("canvas");
  if (canvas) canvas.style.touchAction = "pan-y";

  const activeTouches = new Set<number>();
  const onDownCapture = (e: PointerEvent) => {
    if (e.pointerType === "touch") activeTouches.add(e.pointerId);
  };
  const onUpCapture = (e: PointerEvent) => {
    if (e.pointerType === "touch") activeTouches.delete(e.pointerId);
  };
  const onMoveCapture = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    if (activeTouches.size <= 1) e.stopImmediatePropagation();
  };
  container.addEventListener("pointerdown", onDownCapture, { capture: true });
  document.addEventListener("pointerup", onUpCapture, { capture: true });
  document.addEventListener("pointercancel", onUpCapture, { capture: true });
  document.addEventListener("pointermove", onMoveCapture, { capture: true });

  const grid = components.get(OBC.Grids).create(world);

  // Fragments worker — TOC 3.4.x ships the worker URL helper. Models added to
  // fragments.list are wired into the scene via the onItemSet callback below.
  const workerUrl = await OBC.FragmentsManager.getWorker();
  const fragments = components.get(OBC.FragmentsManager);
  fragments.init(workerUrl);

  world.camera.controls.addEventListener("update", () => fragments.core.update());

  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(world.camera.three);
    world.scene.three.add(model.object);
    fragments.core.update(true);
  });

  return { components, world, fragments, grid, container };
}

// Where the camera sits relative to the model centre, in spherical degrees.
//   azimuth   — rotation around Y; 0 looks along +Z, 90 along +X
//   elevation — pitch above horizontal; 0 is eye-level, 90 is straight down
//   zoom      — multiplier on the bbox-fit distance (default 1 = exact fit;
//               <1 dollies the camera closer past wider site geometry).
//   target    — world-unit offset of the look-at point from the bbox centre.
//               Use to pan the view onto the building when the bbox centre
//               sits in empty slab.
export interface ViewAngle {
  azimuth: number;
  elevation: number;
  zoom?: number;
  target?: { x?: number; y?: number; z?: number };
}

// Matches the angle previously hard-coded as (offset, offset, offset):
// azimuth 45°, elevation arctan(1/√2) ≈ 35°. Calm 3/4 architectural view.
export const DEFAULT_VIEW: ViewAngle = { azimuth: 45, elevation: 35 };

// Frames the camera on the union of all loaded model bounding boxes.
// `view` is the per-project camera angle override (see ProjectMeta.view).
export function fitToModels(viewer: Viewer, view: ViewAngle = DEFAULT_VIEW) {
  const box = new THREE.Box3();
  let hasGeometry = false;

  for (const model of viewer.fragments.list.values()) {
    // Use the model's own bounding box (from fragment metadata) rather than
    // setFromObject(model.object). The latter only sees meshes the fragments
    // worker has already culled into the scene, which on the very first load
    // (cold worker) aren't there yet — leaving the box empty and the camera
    // stuck at its default angle. model.box is populated as soon as load()
    // resolves and is independent of culling.
    const modelBox = model.box;
    if (modelBox.isEmpty()) continue;
    box.union(modelBox);
    hasGeometry = true;
  }

  if (!hasGeometry) return;

  // Slide the infinite grid plane down to the bottom of the model. IFC files
  // typically use real-world coordinates (e.g. site at +80m above sea level,
  // basement at -3m), so world Y=0 doesn't line up with the building's slab.
  viewer.grid.three.position.y = box.min.y;

  // Compute camera position directly from the view angle + bbox bounding
  // sphere. We previously used fitToBox to handle distance, but with very
  // flat boxes (a site slab much wider than tall) it stops preserving the
  // direction we set — the camera ends up nearly straight down. Sphere-fit
  // works for any direction and any aspect.
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius;
  const perspective = viewer.world.camera.three as THREE.PerspectiveCamera;
  const fov = ((perspective.fov ?? 60) * Math.PI) / 180;
  // Small breathing room beyond the strict sphere fit so geometry doesn't
  // graze the frame.
  const fitDist = (radius / Math.sin(fov / 2)) * 1.05;

  const azRad = (view.azimuth * Math.PI) / 180;
  const elRad = (view.elevation * Math.PI) / 180;
  const dir = new THREE.Vector3(
    Math.sin(azRad) * Math.cos(elRad),
    Math.sin(elRad),
    Math.cos(azRad) * Math.cos(elRad),
  );

  const tgtOffset = new THREE.Vector3(
    view.target?.x ?? 0,
    view.target?.y ?? 0,
    view.target?.z ?? 0,
  );
  const target = center.clone().add(tgtOffset);
  const distance = fitDist * (view.zoom ?? 1);
  const cam = target.clone().add(dir.multiplyScalar(distance));

  viewer.world.camera.controls.setLookAt(
    cam.x, cam.y, cam.z,
    target.x, target.y, target.z,
    true,
  );
}

// Dev/inspector hook. Returns the current camera + bbox state so a
// positioning script can read what the user has dialled in and convert it
// to a ViewAngle config.
export interface CameraState {
  cam: [number, number, number];
  tgt: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
  dist: number;
  fov: number;
}

export function getCameraState(viewer: Viewer): CameraState | null {
  const pos = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  viewer.world.camera.controls.getPosition(pos);
  viewer.world.camera.controls.getTarget(tgt);
  const box = new THREE.Box3();
  let any = false;
  for (const model of viewer.fragments.list.values()) {
    const b = new THREE.Box3().setFromObject(model.object);
    if (b.isEmpty()) continue;
    box.union(b);
    any = true;
  }
  if (!any) return null;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const perspective = viewer.world.camera.three as THREE.PerspectiveCamera;
  return {
    cam: [pos.x, pos.y, pos.z],
    tgt: [tgt.x, tgt.y, tgt.z],
    center: [center.x, center.y, center.z],
    size: [size.x, size.y, size.z],
    dist: viewer.world.camera.controls.distance,
    fov: perspective.fov ?? 60,
  };
}
