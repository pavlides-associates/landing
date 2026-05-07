import type * as FRAGS from "@thatopen/fragments";
import type { Viewer } from "./viewer";

export interface DisciplineModel {
  id: string;
  name: string;
  model: FRAGS.FragmentsModel;
}

// "01 Structural.ifc" -> "Structural" ; "architecture.ifc" -> "Architecture".
function prettifyName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const stripped = base.replace(/^[\d\s_-]+/, "").trim();
  const words = (stripped || base).split(/[\s_-]+/);
  return words
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

interface DiscoveredFile {
  id: string;
  name: string;
  url: string;
}

// /models/index.json is written by `npm run convert`. Files in public/ aren't
// visible to import.meta.glob, so the converter publishes a manifest and we
// fetch it at runtime from the static host.
async function discoverFiles(): Promise<DiscoveredFile[]> {
  const res = await fetch("/models/index.json", { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(
      "No /models/index.json found. Run `npm run convert` to produce .frag files and the manifest.",
    );
  }
  const names = (await res.json()) as string[];
  const files = names.map((name) => ({
    id: name.replace(/\.frag$/i, ""),
    name: prettifyName(name),
    url: `/models/${encodeURIComponent(name)}`,
  }));
  files.sort((a, b) => a.name.localeCompare(b.name));
  return files;
}

async function loadFrag(viewer: Viewer, file: DiscoveredFile): Promise<FRAGS.FragmentsModel> {
  const buffer = await fetch(file.url).then((r) => r.arrayBuffer());
  const model = await viewer.fragments.core.load(buffer, { modelId: file.id });
  return model;
}

export async function loadAll(viewer: Viewer): Promise<DisciplineModel[]> {
  const files = await discoverFiles();
  // Sequential, not parallel: peak memory is one model's geometry at a time
  // instead of all of them. Mobile browsers OOM under the parallel pattern.
  // Total time is the sum, but for 3 small .frag files that's ~1s difference.
  const results: DisciplineModel[] = [];
  for (const file of files) {
    const model = await loadFrag(viewer, file);
    results.push({ id: file.id, name: file.name, model });
  }
  return results;
}
