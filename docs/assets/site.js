const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    year: p.get("year") ?? "",
    subject: p.get("subject") ?? "",
    className: p.get("class") ?? "",
  };
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function initLastUpdated() {
  const el = $("#last-updated");
  if (!el) return;
  el.textContent = formatDate(new Date(document.lastModified));
}

function initCourseSelector() {
  const form = $("#course-selector");
  if (!form) return;

  const year = $("#sel-year");
  const subject = $("#sel-subject");
  const classEl = $("#sel-class");

  // Default to current year if present as an option
  const currentYear = String(new Date().getFullYear());
  if (year && Array.from(year.options).some((o) => o.value === currentYear)) year.value = currentYear;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const y = year?.value ?? "";
    const s = subject?.value ?? "";
    const c = classEl?.value ?? "";
    const url = new URL("./course.html", window.location.href);
    if (y) url.searchParams.set("year", y);
    if (s) url.searchParams.set("subject", s);
    if (c) url.searchParams.set("class", c);
    window.location.assign(url.toString());
  });
}

function initCourseHeaderFromParams() {
  const title = $("#course-title");
  const subtitle = $("#course-subtitle");
  if (!title || !subtitle) return;

  const { year, subject, className } = getParams();

  const subjLevel = title.querySelector('[data-part="subject-level"]');
  const yearEl = subtitle.querySelector('[data-part="year"]');
  const classEl = subtitle.querySelector('[data-part="class"]');

  if (subjLevel) subjLevel.textContent = subject ? subject : "";
  if (yearEl) yearEl.textContent = year ? `${year}年度` : "-";
  if (classEl) classEl.textContent = className ? className : "-";

  // Document title also reflect selection
  if (year || subject || className) {
    const s = subject ? `情報${subject}` : "情報";
    const y = year ? `${year}年度` : "";
    const c = className ? className : "";
    const parts = [s, y, c].filter(Boolean);
    document.title = parts.join("｜");
  }
}

function initMobileNav() {
  const btn = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!btn || !nav) return;

  const close = () => {
    btn.setAttribute("aria-expanded", "false");
    nav.classList.remove("nav-open");
  };

  btn.addEventListener("click", () => {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("nav-open", !expanded);
  });

  // Close on navigation (useful on small screens)
  nav.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest("a") : null;
    if (a) close();
  });

  // Close when leaving mobile breakpoint via resize
  window.addEventListener("resize", () => {
    if (window.matchMedia("(max-width: 520px)").matches) return;
    close();
  });
}

function initAnnouncementsToggle() {
  const btn = $("#toggle-announcements");
  const list = $("#announcements-list");
  if (!btn || !list) return;

  btn.addEventListener("click", () => {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    btn.textContent = expanded ? "展開する" : "折りたたむ";
    list.classList.toggle("hidden", expanded);
  });
}

function initScheduleFilter() {
  const input = $("#filter");
  const cards = $$("#schedule-cards .card");
  if (!input || cards.length === 0) return;

  const normalize = (s) => s.trim().toLowerCase();

  input.addEventListener("input", () => {
    const q = normalize(input.value);
    for (const card of cards) {
      const tags = normalize(card.getAttribute("data-tags") ?? "");
      const text = normalize(card.textContent ?? "");
      const hit = q === "" || tags.includes(q) || text.includes(q);
      card.classList.toggle("hidden", !hit);
    }
  });
}

function initHideDoneAssignments() {
  const btn = $("#toggle-done");
  const cards = $$("#assignment-cards .card");
  if (!btn || cards.length === 0) return;

  btn.addEventListener("click", () => {
    const pressed = btn.getAttribute("aria-pressed") === "true";
    btn.setAttribute("aria-pressed", String(!pressed));
    btn.textContent = pressed ? "提出済みを隠す" : "提出済みを表示";
    for (const card of cards) {
      const done = (card.getAttribute("data-status") ?? "") === "done" || card.classList.contains("done");
      if (done) card.classList.toggle("hidden", !pressed);
    }
  });
}

initLastUpdated();
initCourseSelector();
initCourseHeaderFromParams();
initMobileNav();
initAnnouncementsToggle();
initScheduleFilter();
initHideDoneAssignments();

