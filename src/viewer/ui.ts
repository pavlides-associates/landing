import type { Viewer } from "./viewer";
import type { DisciplineModel } from "./loader";
import { setDisciplineOpacity } from "./disciplines";

export function buildSidebar(viewer: Viewer, disciplines: DisciplineModel[]) {
  const list = document.getElementById("discipline-list");
  if (!list) return;
  list.innerHTML = "";

  if (disciplines.length === 0) {
    const empty = document.createElement("p");
    empty.style.color = "var(--muted)";
    empty.style.fontSize = "12px";
    empty.textContent = "Δεν βρέθηκαν μοντέλα. Τοποθετήστε αρχεία .frag στο /public/models/ (ή εκτελέστε npm run convert).";
    list.appendChild(empty);
    return;
  }

  for (const discipline of disciplines) {
    list.appendChild(renderRow(viewer, discipline));
  }
}

function renderRow(viewer: Viewer, discipline: DisciplineModel): HTMLElement {
  const row = document.createElement("div");
  row.className = "discipline";

  const header = document.createElement("div");
  header.className = "discipline-header";

  const name = document.createElement("span");
  name.className = "discipline-name";
  name.textContent = discipline.name;

  const value = document.createElement("span");
  value.className = "discipline-value";
  value.textContent = "100%";

  header.append(name, value);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.value = "100";

  slider.addEventListener("input", () => {
    const v = Number(slider.value);
    value.textContent = `${v}%`;
    setDisciplineOpacity(viewer, discipline, v / 100);
  });

  row.append(header, slider);
  return row;
}

export function hideLoading() {
  document.getElementById("loading")?.classList.add("hidden");
}

// Repurpose the loading overlay as a status surface. Used when init or load
// fails (mobile OOM, missing manifest) and when the WebGL context drops.
export function showOverlayMessage(
  message: string,
  actionLabel?: string,
  onAction?: () => void,
  detail?: string,
) {
  const overlay = document.getElementById("loading");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  overlay.replaceChildren();

  const text = document.createElement("p");
  text.className = "overlay-message";
  text.textContent = message;
  overlay.appendChild(text);

  if (detail) {
    const code = document.createElement("p");
    code.className = "overlay-detail";
    // Truncate so a stack trace doesn't blow out the panel on a phone.
    code.textContent = detail.length > 220 ? detail.slice(0, 220) + "…" : detail;
    overlay.appendChild(code);
  }

  if (actionLabel && onAction) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "overlay-action";
    btn.textContent = actionLabel;
    btn.addEventListener("click", onAction);
    overlay.appendChild(btn);
  }
}

// Toggleable sidebar. Default open on desktop (>= 768px), closed on mobile so
// the model gets the whole viewport on first load.
export function setupSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  if (!toggle || !sidebar) return;

  const setOpen = (open: boolean) => {
    sidebar.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    sidebar.setAttribute("aria-hidden", String(!open));
  };

  setOpen(window.matchMedia("(min-width: 768px)").matches);

  toggle.addEventListener("click", () => {
    setOpen(!sidebar.classList.contains("open"));
  });

  // Close on click/tap outside the sidebar, but only within the viewer host —
  // we don't want to consume clicks elsewhere on the page. Using `click`
  // rather than `pointerdown` so drag-to-orbit on the canvas doesn't trigger
  // a close (browsers suppress click after a drag).
  const host = document.querySelector<HTMLElement>(".viewer-host");
  host?.addEventListener("click", (e) => {
    if (!sidebar.classList.contains("open")) return;
    const target = e.target as Node | null;
    if (!target) return;
    if (sidebar.contains(target) || toggle.contains(target)) return;
    setOpen(false);
  });
}
