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
  if (year && Array.from(year.options).some((o) => o.value === currentYear))
    year.value = currentYear;

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

function initSectionToggles() {
  const btns = $$(".section-toggle");
  for (const btn of btns) {
    const targetId = btn.getAttribute("aria-controls");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) continue;

    if (btn.getAttribute("aria-expanded") === "false") {
      target.classList.add("hidden");
    }

    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      target.classList.toggle("hidden", expanded);
    });
  }
}

function initCardFilter(inputId, cardSelector) {
  const input = $(inputId);
  const cards = $$(cardSelector);
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

function initScheduleFilter() {
  initCardFilter("#filter", "#schedule-cards .card");
}

function initAssignmentsFilter() {
  initCardFilter("#filter-assignments", "#assignment-cards .card");
}

// These functions depend on elements injected by partials (header)
(window.partialsReady ?? Promise.resolve()).then(() => {
  initCourseHeaderFromParams();
  initMobileNav();
});

function initAttendanceForm() {
  const form = $("#attendance-form");
  if (!form) return;

  const API_URL = "https://8178-1-0-94-155.ngrok-free.app/api/v1/attendances";

  const { year, subject, className } = getParams();
  const lessonCode =
    [year, subject, className].filter(Boolean).join("-") || "unknown";

  const studentCodeInput = $("#att-student-code");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = $("#att-submit");
    const msg = $("#att-msg");
    const studentCode = studentCodeInput.value
      ? `${className}-${studentCodeInput.value}`
      : "";
    const status = $("#att-status").value;
    const comment = $("#att-comment").value.trim();

    if (!studentCode) {
      showMsg(msg, "error", "番号を選択してください。");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "送信中…";
    msg.className = "attendance-msg hidden";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance: {
            student_code: studentCode,
            lesson_code: lessonCode,
            date: formatDate(new Date()),
            status,
            comment: comment || null,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "ok") {
        showMsg(msg, "ok", "出席を記録しました。");
        form.reset();
      } else {
        const errors = Array.isArray(data.message)
          ? data.message.join(" / ")
          : data.message;
        showMsg(msg, "error", `エラー: ${errors}`);
      }
    } catch {
      showMsg(msg, "error", "サーバーに接続できませんでした。");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "送信";
    }
  });

  function showMsg(el, type, text) {
    el.textContent = text;
    el.className = `attendance-msg ${type}`;
  }
}

// These can run immediately (elements are already in the static HTML)
initLastUpdated();
initCourseSelector();
initSectionToggles();
initScheduleFilter();
initAssignmentsFilter();
initAttendanceForm();
