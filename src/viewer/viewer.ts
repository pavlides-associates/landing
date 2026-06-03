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

// Frames the camera on the union of all loaded model bounding boxes.
export function fitToModels(viewer: Viewer) {
  const box = new THREE.Box3();
  let hasGeometry = false;

  for (const model of viewer.fragments.list.values()) {
    const modelBox = new THREE.Box3().setFromObject(model.object);
    if (modelBox.isEmpty()) continue;
    box.union(modelBox);
    hasGeometry = true;
  }

  if (!hasGeometry) return;

  // Slide the infinite grid plane down to the bottom of the model. IFC files
  // typically use real-world coordinates (e.g. site at +80m above sea level,
  // basement at -3m), so world Y=0 doesn't line up with the building's slab.
  viewer.grid.three.position.y = box.min.y;

  // Reset the camera direction before fitting. fitToBox preserves the current
  // azimuth/elevation and only dollies/targets — so if the user has orbited
  // on a prior project, that orbit would carry into the next one. Plant the
  // camera at a known oblique angle relative to the new box's centre first,
  // then fitToBox handles distance.
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const offset = Math.max(size.x, size.y, size.z) || 20;
  viewer.world.camera.controls.setLookAt(
    center.x + offset,
    center.y + offset,
    center.z + offset,
    center.x,
    center.y,
    center.z,
    false,
  );

  // Strict-fit framing using camera-controls' built-in. Padding leaves a
  // small breathing edge so geometry doesn't touch the frame.
  const PAD = 0.5;
  void viewer.world.camera.controls.fitToBox(box, true, {
    paddingTop: PAD,
    paddingBottom: PAD,
    paddingLeft: PAD,
    paddingRight: PAD,
  });
}
