import type * as FRAGS from "@thatopen/fragments";
import type { Viewer } from "./viewer";

export interface DisciplineModel {
  id: string;
  name: string;
  model: FRAGS.FragmentsModel;
}

// Greek labels for the disciplines that appear in the firm's IFC pipeline.
// Keyed case-insensitively against the prettified filename so source files
// stay in English (e.g. "406.1 Structural.ifc") while the sidebar reads in
// Greek. Already-Greek filenames pass through untouched.
const DISCIPLINE_LABELS: Record<string, string> = {
  structural: "Στατικά",
  architectural: "Αρχιτεκτονικά",
  architecture: "Αρχιτεκτονικά",
  mep: "Μηχανολογικά",
  mechanical: "Μηχανολογικά",
  "m e p": "Μηχανολογικά",
  equipment: "Εξοπλισμός",
  envelope: "Επικάλυψη",
};

// Fragment filenames are `<projectNumber> <discipline>.frag`, e.g.
// "406.1 Structural.frag" or "413 Envelope.frag". projectNumber allows a
// decimal segment so 406.1 parses as one token.
const FILENAME_RE = /^(\d+(?:\.\d+)*)\s+(.+)$/;

// "Structural" -> "Στατικά" ; "Envelope" -> "Επικάλυψη".
function prettifyDiscipline(raw: string): string {
  const words = raw.split(/[\s_-]+/).filter(Boolean);
  const titled = words
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return DISCIPLINE_LABELS[titled.toLowerCase()] ?? titled;
}

interface DiscoveredFile {
  id: string;
  name: string;
  url: string;
  project: string;
  discipline: string;
}

// /models/index.json is written by `npm run convert`. Files in public/ aren't
// visible to import.meta.glob, so the converter publishes a manifest and we
// fetch it at runtime from the static host. Cached after first call so the
// nav can list projects without re-hitting the network.
let manifestCache: DiscoveredFile[] | null = null;

async function discoverFiles(): Promise<DiscoveredFile[]> {
  if (manifestCache) return manifestCache;
  const res = await fetch("/models/index.json", { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(
      "No /models/index.json found. Run `npm run convert` to produce .frag files and the manifest.",
    );
  }
  const names = (await res.json()) as string[];
  const files: DiscoveredFile[] = [];
  for (const name of names) {
    const base = name.replace(/\.frag$/i, "");
    const m = FILENAME_RE.exec(base);
    if (!m) {
      // Tolerate legacy/unprefixed names by grouping them under "_" so the
      // viewer still surfaces them rather than silently dropping geometry.
      files.push({
        id: base,
        name: prettifyDiscipline(base),
        url: `/models/${encodeURIComponent(name)}`,
        project: "_",
        discipline: base,
      });
      continue;
    }
    const [, project, discipline] = m;
    files.push({
      id: base,
      name: prettifyDiscipline(discipline),
      url: `/models/${encodeURIComponent(name)}`,
      project,
      discipline,
    });
  }
  manifestCache = files;
  return files;
}

export interface ProjectFragments {
  project: string;
  files: DiscoveredFile[];
}

// Group manifest entries by project number. Order within a project is
// alphabetical-by-display-name so the sidebar reads predictably.
export async function listProjects(): Promise<ProjectFragments[]> {
  const files = await discoverFiles();
  const byProject = new Map<string, DiscoveredFile[]>();
  for (const f of files) {
    const arr = byProject.get(f.project) ?? [];
    arr.push(f);
    byProject.set(f.project, arr);
  }
  for (const arr of byProject.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...byProject.entries()].map(([project, files]) => ({ project, files }));
}

async function loadFrag(viewer: Viewer, file: DiscoveredFile): Promise<FRAGS.FragmentsModel> {
  const buffer = await fetch(file.url).then((r) => r.arrayBuffer());
  const model = await viewer.fragments.core.load(buffer, { modelId: file.id });
  return model;
}

// Dispose every currently-loaded model. Used between project switches so the
// next project doesn't pile on top of the previous one's geometry / memory.
export async function unloadAll(viewer: Viewer): Promise<void> {
  const ids = [...viewer.fragments.list.keys()];
  for (const id of ids) {
    try {
      viewer.fragments.core.abort(id);
    } catch {
      // abort is a no-op if the load already finished; safe to ignore.
    }
    try {
      await viewer.fragments.core.disposeModel(id);
    } catch (e) {
      console.warn(`disposeModel(${id}) failed`, e);
    }
  }
  viewer.fragments.core.update(true);
}

export async function loadProject(viewer: Viewer, projectNumber: string): Promise<DisciplineModel[]> {
  const groups = await listProjects();
  const group = groups.find((g) => g.project === projectNumber);
  if (!group) {
    throw new Error(`No fragments found for project "${projectNumber}". Did the manifest publish?`);
  }
  // Sequential, not parallel: peak memory is one model's geometry at a time
  // instead of all of them. Mobile browsers OOM under the parallel pattern.
  const results: DisciplineModel[] = [];
  for (const file of group.files) {
    const model = await loadFrag(viewer, file);
    results.push({ id: file.id, name: file.name, model });
  }
  return results;
}
