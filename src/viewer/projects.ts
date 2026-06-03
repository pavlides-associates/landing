// Static project metadata. Project numbers (e.g. "406.1") are parsed from
// fragment filenames in /public/models/; this file maps them to display
// titles and declares load order. Order here is the order the nav renders;
// the first entry is loaded on page entry.

export interface ProjectMeta {
  number: string;
  title: string;
}

export const PROJECTS: ProjectMeta[] = [
  { number: "406.1", title: "ΤΕΠ Ερυθρού Σταυρού" },
  { number: "413", title: "Έδρα Τ.Ε. Πάνω Σούδας" },
  { number: "425", title: "Νηπιαγωγείο Μεταμόρφωσης" },
];

export const DEFAULT_PROJECT = "425";
