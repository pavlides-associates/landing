// Static project metadata. Project numbers (e.g. "406.1") are parsed from
// fragment filenames in /public/models/; this file maps them to display
// titles and declares load order. Order here is the order the nav renders;
// DEFAULT_PROJECT (below) chooses which one loads first.

import type { ViewAngle } from "./viewer";

export interface ProjectMeta {
  number: string;
  title: string;
  // Optional camera angle override. Omit to use the default oblique view.
  // 425 sits higher than the others because its kindergarten footprint is
  // wide and shallow — from the default 35° elevation, the dark exterior
  // hides the more interesting roof + plan above it.
  view?: ViewAngle;
}

export const PROJECTS: ProjectMeta[] = [
  {
    number: "406.1",
    title: "ΤΕΠ Ερυθρού Σταυρού",
    view: { azimuth: -178.57, elevation: -5.54, zoom: 0.413, target: { x: 31.45, y: 10.15, z: 14.67 } },
  },
  {
    number: "413",
    title: "Έδρα Τ.Ε. Πάνω Σούδας",
    view: { azimuth: -179.47, elevation: 3.37, zoom: 0.099, target: { x: -5.97, y: 0.55, z: 0.09 } },
  },
  {
    number: "425",
    title: "Νηπιαγωγείο Μεταμόρφωσης",
    view: { azimuth: -26.38, elevation: 38.55, zoom: 0.135, target: { x: -37.34, y: -2.79, z: 8.44 } },
  },
];

export const DEFAULT_PROJECT = "425";
