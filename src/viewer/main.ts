import "./style.css";
import { createViewer, fitToModels, type Viewer } from "./viewer";
import { loadProject, unloadAll } from "./loader";
import { buildSidebar, hideLoading, setupProjectNav, setupSidebarToggle, showLoading, showOverlayMessage, updateProjectHeading } from "./ui";
import { DEFAULT_PROJECT, PROJECTS } from "./projects";

function canCreateWebGLContext(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function looksLikeWebGLContextFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /WebGL\s*context|getContext|webgl2/i.test(msg);
}

function showMemoryPressureMessage() {
  // Honest message for the case where the browser truly can't give us a
  // context — typically iOS Safari hitting its WebGL context cap because
  // other tabs / apps are holding GPU memory. Reloading alone won't help;
  // the user has to close something. Keep the Refresh button anyway in case
  // they did close a tab, but lead with the actual remedy.
  showOverlayMessage(
    "Ο φυλλομετρητής έμεινε από μνήμη.",
    "Ανανέωση",
    () => window.location.reload(),
    "Κλείστε άλλες καρτέλες ή εφαρμογές που χρησιμοποιούν βίντεο/3D, περιμένετε λίγο και ανανεώστε.",
  );
}

function attachContextLossWatch(canvas: HTMLCanvasElement) {
  // Mobile WebGL contexts can be dropped under memory pressure. Without
  // intervention, the canvas stays blank and the user sees nothing.
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    console.warn("WebGL context lost");
    showMemoryPressureMessage();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    console.info("WebGL context restored");
    // We don't try to re-hydrate the scene in place — three.js / TOC don't
    // make this trivial. Reload (after the user frees memory) is honest.
  });
}

// A: pause the render loop while the viewer is off-screen. Drops thermal /
// GPU load to ~zero when scrolled past, which markedly reduces the chance
// the OS reclaims our context under sustained scroll pressure.
function setupOffscreenPause(viewer: Viewer) {
  const host = viewer.container.closest(".viewer-host") || viewer.container;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const visible = entry.isIntersecting;
        try {
          viewer.world.renderer.enabled = visible;
          if (visible) {
            // Force a frame so the canvas updates immediately on return,
            // not on the next camera nudge.
            viewer.world.renderer.needsUpdate = true;
          }
        } catch (e) {
          console.warn("offscreen pause toggle failed", e);
        }
      }
    },
    { threshold: 0 },
  );
  io.observe(host);
}

// Loads (or reloads) a project's models. Used both for the initial load and
// for every nav click. Serialized via `switching` so rapid taps don't
// interleave disposals with in-flight loads.
let switching: Promise<void> = Promise.resolve();

async function switchToProject(viewer: Viewer, projectNumber: string) {
  switching = switching.then(async () => {
    const meta = PROJECTS.find((p) => p.number === projectNumber);
    if (!meta) {
      console.warn(`Unknown project ${projectNumber}`);
      return;
    }
    showLoading();
    updateProjectHeading(meta.title);
    try {
      await unloadAll(viewer);
      const disciplines = await loadProject(viewer, projectNumber);
      buildSidebar(viewer, disciplines);
      fitToModels(viewer);
      hideLoading();
    } catch (err) {
      console.error(`Failed to load project ${projectNumber}`, err);
      showOverlayMessage(
        "Το μοντέλο δεν μπόρεσε να φορτωθεί σε αυτή τη συσκευή.",
        "Δοκιμάστε ξανά",
        () => window.location.reload(),
        describeError(err),
      );
    }
  });
  return switching;
}

async function main() {
  const container = document.getElementById("viewer");
  if (!container) throw new Error("#viewer container missing");

  setupSidebarToggle();

  // Preflight feature-detect. If we can't create even a throwaway context,
  // the real init will fail the same way — skip straight to the honest
  // message instead of letting the user click a Reload button that's a lie.
  if (!canCreateWebGLContext()) {
    showMemoryPressureMessage();
    return;
  }

  let viewer;
  try {
    viewer = await createViewer(container);
  } catch (err) {
    console.error("Failed to initialise viewer", err);
    if (looksLikeWebGLContextFailure(err)) {
      showMemoryPressureMessage();
    } else {
      showOverlayMessage(
        "Η συσκευή δεν μπόρεσε να αρχικοποιήσει το 3D viewer.",
        "Επαναφόρτωση σελίδας",
        () => window.location.reload(),
        describeError(err),
      );
    }
    return;
  }

  const canvas = container.querySelector("canvas");
  if (canvas) attachContextLossWatch(canvas);

  setupOffscreenPause(viewer);
  setupProjectNav((projectNumber) => switchToProject(viewer, projectNumber));

  await switchToProject(viewer, DEFAULT_PROJECT);
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.name + ": " + err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

main();
