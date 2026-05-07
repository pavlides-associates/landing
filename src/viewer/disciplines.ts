import * as THREE from "three";
import type * as FRAGS from "@thatopen/fragments";
import type { Viewer } from "./viewer";
import type { DisciplineModel } from "./loader";

// Per-model opacity, driven directly through the three.js material flags on
// every mesh under the model's object. This bypasses Fragments' highlight
// system (which is item-keyed and does extra work we don't need here) and
// gives predictable opaque ↔ transparent transitions for whole disciplines.

const desiredOpacity = new Map<string, number>(); // modelId → 0..1
const wired = new WeakSet<FRAGS.FragmentsModel>();

function applyToModel(model: FRAGS.FragmentsModel, value: number) {
  const root = model.object;
  const clamped = Math.max(0, Math.min(1, value));

  if (clamped <= 0.001) {
    root.visible = false;
    return;
  }
  if (!root.visible) root.visible = true;

  const transparent = clamped < 0.999;
  const seen = new Set<THREE.Material>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      m.transparent = transparent;
      m.opacity = clamped;
      // Transparent surfaces shouldn't write depth, otherwise things behind
      // them get culled.
      m.depthWrite = !transparent;
      m.needsUpdate = true;
    }
  });
}

// Subscribe once: when Fragments swaps in new LOD tiles (and creates new
// materials), re-apply the current desired opacity so they match.
function ensureWired(viewer: Viewer, discipline: DisciplineModel) {
  if (wired.has(discipline.model)) return;
  wired.add(discipline.model);
  discipline.model.onViewUpdated.add(() => {
    const v = desiredOpacity.get(discipline.id);
    if (v === undefined || v >= 0.999) return;
    applyToModel(discipline.model, v);
  });
  // Force one render so the very first frame after load reflects defaults.
  viewer.world.renderer?.update();
}

export function setDisciplineOpacity(
  viewer: Viewer,
  discipline: DisciplineModel,
  value: number, // 0..1
) {
  ensureWired(viewer, discipline);
  desiredOpacity.set(discipline.id, value);
  applyToModel(discipline.model, value);
}
