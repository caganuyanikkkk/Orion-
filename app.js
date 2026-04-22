/* ═══════════════════════════════════════════════════════════════
   ORION — APPLICATION LOGIC
   State → Persistence → Recommendation engine → Render → Events
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── CONSTANTS ────────────────────────────────────────────────
  const STORAGE_KEY = "gym_tracker_v1";        // preserved from v1 (no data loss)
  const DRAFT_KEY   = "gym_tracker_draft_v1";

  // ─── STATE ────────────────────────────────────────────────────
  const state = {
    workouts: [],
    draft: null,
    currentTab: "home",
    historyFilter: "all",          // all | week | month | <exerciseName>
    historyExpanded: new Set(),
    exerciseExpanded: new Set(),   // exerciseIdx of expanded cards in log view
  };

  // ─── PERSISTENCE ──────────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.workouts = raw ? JSON.parse(raw) : [];
    } catch { state.workouts = []; }
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      state.draft = d ? JSON.parse(d) : null;
    } catch { state.draft = null; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.workouts)); }
  function saveDraft() {
    if (state.draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
    else localStorage.removeItem(DRAFT_KEY);
  }

  // ─── UTILITIES ────────────────────────────────────────────────
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function todayISO() { return new Date().toISOString(); }
  function dayKey(iso) { return new Date(iso).toISOString().slice(0, 10); }
  function fmt(iso, opts) { return new Date(iso).toLocaleDateString(undefined, opts || { month: "short", day: "numeric" }); }
  function fmtShort(iso) { return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
  function fmtWeekday(iso) { return new Date(iso).toLocaleDateString(undefined, { weekday: "long" }); }
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function roundTo(x, step) { return Math.round(x / step) * step; }

  // ─── ICONS ────────────────────────────────────────────────────
  // Inline Lucide-style SVGs (keeps offline, zero dependency)
  const I = {
    home:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    plus:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    minus:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    x:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    trendingUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    calendar:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    flame:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    star:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    chevronDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronRight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    copy:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    play:       '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    trash:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
    download:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    check:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    arrowDown:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
    equal:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/></svg>',
    settings:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };

  // ─── RECOMMENDATION ENGINE ────────────────────────────────────
  function historyFor(name) {
    const norm = name.toLowerCase().trim();
    return state.workouts
      .filter(w => w.exercises.some(e => e.name.toLowerCase().trim() === norm))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(w => ({ date: w.date, sets: w.exercises.find(e => e.name.toLowerCase().trim() === norm).sets }));
  }

  function recommendFor(name) {
    const hist = historyFor(name);
    if (hist.length === 0) return null;
    const last = hist[0], prev = hist[1], prev2 = hist[2];
    if (!last.sets || last.sets.length === 0) return null;

    const avgReps    = last.sets.reduce((a, s) => a + (s.reps || 0), 0) / last.sets.length;
    const maxWeight  = Math.max.apply(null, last.sets.map(s => s.weight || 0));
    const targetReps = Math.max.apply(null, last.sets.map(s => s.reps || 0));
    const baseSets   = last.sets.length;
    const hitAll     = last.sets.every(s => (s.reps || 0) >= targetReps);

    const stalled = prev && (
      Math.max.apply(null, prev.sets.map(s => s.weight || 0)) >= maxWeight &&
      (prev.sets.reduce((a, s) => a + (s.reps || 0), 0) / prev.sets.length) >= avgReps
    );
    const doubleStalled = stalled && prev2 && (
      Math.max.apply(null, prev2.sets.map(s => s.weight || 0)) >= maxWeight &&
      (prev2.sets.reduce((a, s) => a + (s.reps || 0), 0) / prev2.sets.length) >= avgReps
    );

    let weight = maxWeight, reps = targetReps, note = "", tag = "hold";

    if (doubleStalled) {
      weight = roundTo(maxWeight * 0.9, 0.5);
      reps = Math.max(6, targetReps);
      note = "Deload. 2+ stalled sessions — drop 10% and rebuild with clean reps.";
      tag = "deload";
    } else if (hitAll) {
      const step = maxWeight < 10 ? 1 : maxWeight < 25 ? 2 : 2.5;
      weight = roundTo(maxWeight + step, 0.5);
      reps = targetReps;
      note = "Every rep hit. Add " + step + "kg next session.";
      tag = "progress";
    } else if (avgReps < targetReps - 1) {
      weight = maxWeight;
      reps = Math.max(5, targetReps - 1);
      note = "Reps dropped. Hold weight, lower target by 1 to dial it in.";
      tag = "hold";
    } else {
      weight = maxWeight;
      reps = targetReps;
      note = "Close. Same weight, same target — finish all sets.";
      tag = "hold";
    }

    return { weight, reps, sets: baseSets, lastWeight: maxWeight, lastReps: targetReps, lastSets: baseSets, note, tag };
  }

  // ─── STATS ────────────────────────────────────────────────────
  function totalVolume(workouts) {
    let v = 0;
    (workouts || state.workouts).forEach(w => w.exercises.forEach(e => e.sets.forEach(s => { v += (s.reps || 0) * (s.weight || 0); })));
    return v;
  }
  function computeStreak() {
    if (state.workouts.length === 0) return 0;
    const dateSet = new Set(state.workouts.map(w => dayKey(w.date)));
    let streak = 0;
    const d = new Date();
    if (!dateSet.has(dayKey(d.toISOString()))) d.setDate(d.getDate() - 1);
    while (dateSet.has(dayKey(d.toISOString()))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }
  function knownExerciseNames() {
    const set = new Set();
    state.workouts.forEach(w => w.exercises.forEach(e => { if (e.name) set.add(e.name.trim()); }));
    return [...set].sort((a, b) => a.localeCompare(b));
  }
  function greetingHi() {
    const h = new Date().getHours();
    if (h < 5)  return "Late night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  // ─── STARFIELD BACKGROUND (empty states) ──────────────────────
  function starfieldSVG() {
    // Deterministic pseudo-random scatter
    const rnd = (function () { let s = 42; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    let stars = "";
    for (let i = 0; i < 30; i++) {
      const x = rnd() * 100, y = rnd() * 100, r = 0.3 + rnd() * 0.9;
      stars += '<circle cx="' + x.toFixed(1) + '%" cy="' + y.toFixed(1) + '%" r="' + r.toFixed(2) + '" fill="#F5A524" opacity="0.15"/>';
    }
    // Orion's Belt — subtle signature
    stars += '<circle cx="28%" cy="60%" r="1.3" fill="#F5A524" opacity="0.35"/>';
    stars += '<circle cx="50%" cy="55%" r="1.6" fill="#F5A524" opacity="0.45"/>';
    stars += '<circle cx="72%" cy="62%" r="1.2" fill="#F5A524" opacity="0.30"/>';
    return '<svg class="empty__starfield" preserveAspectRatio="none">' + stars + '</svg>';
  }

  // ─── TOAST ────────────────────────────────────────────────────
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("toast--show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("toast--show"), 1700);
  }

  // ─── FORCE REPAINT (preview quirk workaround) ────────────────
  function forceRepaint() {
    const active = document.querySelector(".view--active");
    if (!active) return;
    void active.offsetHeight;
    active.style.transform = "translateZ(0)";
    requestAnimationFrame(() => { active.style.transform = ""; });
  }

  // ─── NUMBER COUNT-UP ─────────────────────────────────────────
  function countUp(el, target, durationMs) {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    const dur = durationMs || 600;
    function tick(t) {
      const p = Math.min(1, (t - startTime) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(start + (target - start) * eased);
      el.textContent = val.toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ─── NAV ──────────────────────────────────────────────────────
  function goTo(tab) {
    state.currentTab = tab;
    document.querySelectorAll(".view").forEach(v => v.classList.remove("view--active"));
    const v = document.getElementById("view-" + tab);
    if (v) v.classList.add("view--active");
    document.querySelectorAll(".nav__tab").forEach(t => {
      t.classList.toggle("nav__tab--active", t.dataset.tab === tab);
    });
    if (tab === "home")    renderHome();
    if (tab === "log")     renderLog();
    if (tab === "plan")    renderPlan();
    if (tab === "history") renderHistory();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // ═══════════════════════════════════════════════════════════════
  //  HOME
  // ═══════════════════════════════════════════════════════════════
  function renderHome() {
    const v = document.getElementById("view-home");
    const streak = computeStreak();
    const sessions = state.workouts.length;
    const volume = totalVolume();
    const recent = state.workouts.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    const hasData = sessions > 0;
    const nextWorkoutHTML = hasData ? renderNextWorkoutCard() : renderNextWorkoutEmpty();

    v.innerHTML = `
      <div class="greeting">
        <div class="greeting__hi">${greetingHi()}</div>
        <div class="greeting__date">${esc(fmtShort(todayISO()))}</div>
      </div>

      <div class="hero-streak mb-3">
        <div class="hero-streak__inner">
          <div>
            <div class="hero-streak__label">Day Streak</div>
            <div>
              <span class="hero-streak__value" id="streakVal">0</span><span class="hero-streak__suffix">${streak === 1 ? "day" : "days"}</span>
            </div>
          </div>
          <div class="hero-streak__icon">${I.flame}</div>
        </div>
      </div>

      <div class="grid-2 mb-4">
        <div class="stat">
          <div class="stat__label">Sessions</div>
          <div class="stat__value"><span id="sessionsVal">0</span></div>
        </div>
        <div class="stat">
          <div class="stat__label">Total Volume</div>
          <div><span class="stat__value"><span id="volumeVal">0</span></span><span class="stat__unit">kg</span></div>
        </div>
      </div>

      <div class="section-head">
        <div class="section-head__title">Next Session</div>
      </div>
      ${nextWorkoutHTML}

      ${recent.length > 0 ? `
        <div class="section-head">
          <div class="section-head__title">Recent</div>
          <a href="#" class="section-head__link" data-goto="history">View all ${I.chevronRight}</a>
        </div>
        <div class="recent-row">
          ${recent.map(w => {
            const vol = w.exercises.reduce((a, ex) => a + ex.sets.reduce((b, s) => b + s.reps * s.weight, 0), 0);
            const setCount = w.exercises.reduce((a, ex) => a + ex.sets.length, 0);
            return `
              <div class="recent-card" data-session="${w.id}">
                <div class="recent-card__date">${esc(fmt(w.date))}</div>
                <div class="recent-card__vol">${vol.toLocaleString()}<span style="font-size:12px;color:var(--text-tertiary);margin-left:4px;font-family:var(--font-sans);font-weight:500">kg</span></div>
                <div class="recent-card__meta">${w.exercises.length} ex · ${setCount} sets</div>
              </div>
            `;
          }).join("")}
        </div>
      ` : ""}
    `;

    // Animate numbers
    countUp(document.getElementById("streakVal"), streak, 500);
    countUp(document.getElementById("sessionsVal"), sessions, 500);
    countUp(document.getElementById("volumeVal"), Math.round(volume), 700);

    // Wire events
    const seeAll = v.querySelector('[data-goto="history"]');
    if (seeAll) seeAll.addEventListener("click", (e) => { e.preventDefault(); goTo("history"); });

    const startBtn = v.querySelector("[data-start-next]");
    if (startBtn) startBtn.addEventListener("click", () => startNextSession());

    const beginBtn = v.querySelector("[data-begin-first]");
    if (beginBtn) beginBtn.addEventListener("click", () => goTo("log"));

    v.querySelectorAll("[data-session]").forEach(c => {
      c.addEventListener("click", () => {
        state.historyExpanded.add(c.dataset.session);
        goTo("history");
      });
    });
  }

  function renderNextWorkoutCard() {
    // Base "next session" on the most recent workout's exercise list
    const last = state.workouts.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last) return "";
    const exCount = last.exercises.length;
    const setCount = last.exercises.reduce((a, e) => a + e.sets.length, 0);
    // Estimate ~3 min per set (barbell-style)
    const mins = Math.round(setCount * 3);

    // Show up to 3 exercise names with recommendation pills
    const preview = last.exercises.slice(0, 3).map(ex => {
      const rec = recommendFor(ex.name);
      const pill = rec
        ? (rec.tag === "progress"
            ? `<span class="pill pill--success">+${rec.weight - rec.lastWeight}kg</span>`
            : rec.tag === "deload"
              ? `<span class="pill pill--warn">Deload</span>`
              : `<span class="pill">Hold</span>`)
        : "";
      return `
        <div class="row row--between" style="padding:6px 0">
          <span style="font-size:14px;font-weight:500">${esc(ex.name)}</span>
          ${pill}
        </div>
      `;
    }).join("");

    return `
      <div class="next-workout">
        <div class="next-workout__top">
          <div style="min-width:0">
            <div class="next-workout__title">Today's Session</div>
            <div class="next-workout__meta">${exCount} exercise${exCount === 1 ? "" : "s"} · ~${mins} min</div>
          </div>
          <button type="button" class="next-workout__start" data-start-next>
            ${I.play}<span>Start</span>
          </button>
        </div>
        <div style="margin-top:12px;border-top:1px solid var(--border-subtle);padding-top:8px">
          ${preview}
          ${last.exercises.length > 3 ? `<div class="t-caption mt-2">+${last.exercises.length - 3} more</div>` : ""}
        </div>
      </div>
    `;
  }

  function renderNextWorkoutEmpty() {
    return `
      <div class="empty">
        ${starfieldSVG()}
        <div class="empty__content">
          <div class="empty__icon">${I.plus}</div>
          <div class="empty__title">Start your first session</div>
          <div class="empty__desc">Orion learns from your data. Log one workout and the next session's targets appear here — automatically.</div>
          <div class="empty__steps">
            <div class="empty__step"><i>1</i><span>Log your first workout</span></div>
            <div class="empty__step"><i>2</i><span>See progressive overload targets</span></div>
            <div class="empty__step"><i>3</i><span>Build your streak</span></div>
          </div>
          <button type="button" class="btn btn--primary" data-begin-first>
            ${I.plus}<span>Log First Workout</span>
          </button>
        </div>
      </div>
    `;
  }

  function startNextSession() {
    const last = state.workouts.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last) { goTo("log"); return; }
    // Create draft from last session with algorithm-recommended targets
    state.draft = {
      date: todayISO(),
      exercises: last.exercises.map(ex => {
        const rec = recommendFor(ex.name);
        const sets = rec
          ? Array.from({ length: rec.sets }, () => ({ reps: rec.reps, weight: rec.weight }))
          : ex.sets.map(s => ({ reps: s.reps, weight: s.weight }));
        return { name: ex.name, sets };
      }),
    };
    saveDraft();
    state.exerciseExpanded.clear();
    state.exerciseExpanded.add(0);
    goTo("log");
    toast("Targets loaded from plan");
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOG
  // ═══════════════════════════════════════════════════════════════
  function ensureDraft() {
    if (!state.draft) { state.draft = { date: todayISO(), exercises: [] }; saveDraft(); }
  }

  function renderLog() {
    ensureDraft();
    const v = document.getElementById("view-log");
    const d = state.draft;

    v.innerHTML = `
      <div class="row row--between mb-4" style="padding:0 var(--s-1)">
        <div>
          <div class="t-h2">New Session</div>
          <div class="t-caption">${esc(fmtWeekday(d.date))}, ${esc(fmt(d.date))}</div>
        </div>
        <button type="button" class="btn btn--sm btn--ghost" id="btnCopyLast" title="Copy last session">
          ${I.copy}<span>Copy last</span>
        </button>
      </div>

      <div id="exerciseList"></div>

      <button type="button" class="btn btn--block mt-2" id="btnAddExercise">
        ${I.plus}<span>Add Exercise</span>
      </button>

      <div class="sticky-bar">
        <button type="button" class="btn btn--icon btn--danger" id="btnDiscard" title="Discard">
          ${I.trash}
        </button>
        <button type="button" class="btn btn--primary" id="btnSave">
          ${I.check}<span>Save Workout</span>
        </button>
      </div>
    `;

    renderExerciseList();

    document.getElementById("btnAddExercise").addEventListener("click", addExerciseBlock);
    document.getElementById("btnSave").addEventListener("click", saveWorkout);
    document.getElementById("btnDiscard").addEventListener("click", cancelWorkout);
    document.getElementById("btnCopyLast").addEventListener("click", loadLastTemplate);
  }

  function renderExerciseList() {
    const list = document.getElementById("exerciseList");
    if (!list) return;
    list.innerHTML = "";
    if (state.draft.exercises.length === 0) {
      list.innerHTML = `
        <div class="empty" style="margin-bottom:var(--s-3)">
          ${starfieldSVG()}
          <div class="empty__content">
            <div class="empty__icon">${I.plus}</div>
            <div class="empty__title">No exercises yet</div>
            <div class="empty__desc">Add your first exercise below. We'll remember it for autocomplete next session.</div>
          </div>
        </div>
      `;
      return;
    }
    state.draft.exercises.forEach((ex, i) => list.appendChild(renderExerciseCard(ex, i)));
  }

  function renderExerciseCard(ex, exIdx) {
    const expanded = state.exerciseExpanded.has(exIdx);
    const card = document.createElement("div");
    card.className = "exercise" + (expanded ? " exercise--editing" : "");

    const summary = (ex.sets && ex.sets.length > 0 && ex.name)
      ? `${ex.sets.length}×${Math.max(...ex.sets.map(s => s.reps || 0)) || "—"} @ ${Math.max(...ex.sets.map(s => s.weight || 0)) || 0}kg`
      : "Tap to edit";

    card.innerHTML = `
      <div class="exercise__head">
        <div class="exercise__name-wrap">
          ${expanded
            ? `<input type="text" class="exercise__name" placeholder="Exercise name" value="${esc(ex.name)}" autocomplete="off" />
               <div class="sug"></div>`
            : `<div class="exercise__name">${ex.name ? esc(ex.name) : '<span style="color:var(--text-tertiary);font-weight:500">Untitled exercise</span>'}</div>
               <div class="exercise__summary">${esc(summary)}</div>`
          }
        </div>
        <button type="button" class="exercise__toggle${expanded ? " exercise__toggle--open" : ""}" data-toggle>${I.chevronDown}</button>
        ${expanded ? `<button type="button" class="btn btn--icon btn--ghost btn--danger" data-remove-ex style="min-height:36px;min-width:36px">${I.x}</button>` : ""}
      </div>
      ${expanded ? `
        <div class="exercise__body">
          <div class="exercise__hint"><span></span><span>Reps</span><span>Kg</span><span></span></div>
          <div class="sets-container"></div>
          <div class="grid-2 mt-3">
            <button type="button" class="btn btn--sm" data-add-set>${I.plus}<span>Set</span></button>
            <button type="button" class="btn btn--sm btn--ghost" data-suggest>${I.trendingUp}<span>Suggest</span></button>
          </div>
        </div>
      ` : ""}
    `;

    // Toggle collapse
    card.querySelector("[data-toggle]").addEventListener("click", (e) => {
      e.stopPropagation();
      if (expanded) state.exerciseExpanded.delete(exIdx);
      else state.exerciseExpanded.add(exIdx);
      renderExerciseList();
      forceRepaint();
    });

    // Tap collapsed header to expand
    if (!expanded) {
      card.querySelector(".exercise__head").addEventListener("click", () => {
        state.exerciseExpanded.add(exIdx);
        renderExerciseList();
        forceRepaint();
      });
    }

    if (expanded) {
      // Name input + autocomplete
      const nameInput = card.querySelector(".exercise__name");
      const sugBox = card.querySelector(".sug");
      nameInput.addEventListener("input", (e) => {
        state.draft.exercises[exIdx].name = e.target.value;
        saveDraft();
        renderSuggestions(sugBox, e.target.value, exIdx);
      });
      nameInput.addEventListener("focus", () => renderSuggestions(sugBox, nameInput.value, exIdx));
      nameInput.addEventListener("blur", () => setTimeout(() => sugBox.classList.remove("sug--open"), 150));

      // Remove exercise
      card.querySelector("[data-remove-ex]").addEventListener("click", (e) => {
        e.stopPropagation();
        state.draft.exercises.splice(exIdx, 1);
        state.exerciseExpanded.delete(exIdx);
        // re-index expanded set
        const newSet = new Set();
        state.exerciseExpanded.forEach(i => { if (i < exIdx) newSet.add(i); else if (i > exIdx) newSet.add(i - 1); });
        state.exerciseExpanded = newSet;
        saveDraft();
        renderExerciseList();
        forceRepaint();
      });

      // Sets
      const setsContainer = card.querySelector(".sets-container");
      ex.sets.forEach((s, si) => setsContainer.appendChild(buildSetRow(exIdx, si, s)));

      // Add set
      card.querySelector("[data-add-set]").addEventListener("click", () => {
        const last = ex.sets[ex.sets.length - 1] || { reps: 8, weight: 0 };
        ex.sets.push({ reps: last.reps, weight: last.weight });
        saveDraft();
        renderExerciseList();
        forceRepaint();
      });

      // Suggest
      card.querySelector("[data-suggest]").addEventListener("click", () => {
        const name = (ex.name || "").trim();
        if (!name) { toast("Name the exercise first"); return; }
        const rec = recommendFor(name);
        if (!rec) { toast("No history for this exercise"); return; }
        ex.sets = Array.from({ length: rec.sets }, () => ({ reps: rec.reps, weight: rec.weight }));
        saveDraft();
        renderExerciseList();
        forceRepaint();
        toast("Targets filled from plan");
      });
    }

    return card;
  }

  function buildSetRow(exIdx, setIdx, s) {
    const row = document.createElement("div");
    row.className = "set";
    row.innerHTML = `
      <div class="set__num">${setIdx + 1}</div>
      <div class="stepper" data-stepper>
        <button type="button" class="stepper__btn" data-dec="reps">${I.minus}</button>
        <input type="number" inputmode="numeric" class="stepper__input" data-field="reps" value="${s.reps === 0 ? "" : s.reps}" placeholder="0" />
        <button type="button" class="stepper__btn" data-inc="reps">${I.plus}</button>
      </div>
      <div class="stepper" data-stepper>
        <button type="button" class="stepper__btn" data-dec="weight">${I.minus}</button>
        <input type="number" inputmode="decimal" class="stepper__input" data-field="weight" step="0.5" value="${s.weight === 0 ? "" : s.weight}" placeholder="0" />
        <button type="button" class="stepper__btn" data-inc="weight">${I.plus}</button>
      </div>
      <button type="button" class="set__del" data-del>${I.trash}</button>
    `;

    const setObj = state.draft.exercises[exIdx].sets[setIdx];

    row.querySelectorAll(".stepper").forEach(stepper => {
      const input = stepper.querySelector(".stepper__input");
      const field = input.dataset.field;
      const step = field === "weight" ? 2.5 : 1;

      input.addEventListener("focus", () => stepper.classList.add("stepper--focused"));
      input.addEventListener("blur",  () => stepper.classList.remove("stepper--focused"));
      input.addEventListener("input", (e) => {
        const v = e.target.value === "" ? 0 : Number(e.target.value);
        setObj[field] = isNaN(v) ? 0 : v;
        saveDraft();
      });

      stepper.querySelector("[data-dec]").addEventListener("click", () => {
        const cur = Number(input.value) || 0;
        const next = Math.max(0, cur - step);
        input.value = next === 0 ? "" : (Number.isInteger(next) ? next : next.toFixed(1));
        setObj[field] = next;
        saveDraft();
      });
      stepper.querySelector("[data-inc]").addEventListener("click", () => {
        const cur = Number(input.value) || 0;
        const next = cur + step;
        input.value = Number.isInteger(next) ? next : next.toFixed(1);
        setObj[field] = next;
        saveDraft();
      });
    });

    row.querySelector("[data-del]").addEventListener("click", () => {
      state.draft.exercises[exIdx].sets.splice(setIdx, 1);
      if (state.draft.exercises[exIdx].sets.length === 0) {
        state.draft.exercises[exIdx].sets.push({ reps: 0, weight: 0 });
      }
      saveDraft();
      renderExerciseList();
      forceRepaint();
    });

    return row;
  }

  function renderSuggestions(box, query, exIdx) {
    const names = knownExerciseNames();
    const q = (query || "").toLowerCase().trim();
    const matches = names.filter(n => q === "" || n.toLowerCase().includes(q)).slice(0, 6);
    if (matches.length === 0) { box.classList.remove("sug--open"); return; }
    box.innerHTML = matches.map(n => `<div class="sug__item" data-name="${esc(n)}">${esc(n)}</div>`).join("");
    box.classList.add("sug--open");
    box.querySelectorAll(".sug__item").forEach(item => {
      item.addEventListener("mousedown", (e) => e.preventDefault());
      item.addEventListener("click", () => {
        state.draft.exercises[exIdx].name = item.dataset.name;
        saveDraft();
        renderExerciseList();
        forceRepaint();
      });
    });
  }

  function addExerciseBlock() {
    ensureDraft();
    state.draft.exercises.push({ name: "", sets: [{ reps: 8, weight: 0 }] });
    const newIdx = state.draft.exercises.length - 1;
    state.exerciseExpanded.add(newIdx);
    saveDraft();
    renderExerciseList();
    forceRepaint();
    setTimeout(() => {
      const inputs = document.querySelectorAll(".exercise__name");
      const lastInput = inputs[inputs.length - 1];
      if (lastInput && lastInput.tagName === "INPUT") lastInput.focus();
    }, 50);
  }

  function loadLastTemplate() {
    if (state.workouts.length === 0) { toast("No history to copy"); return; }
    const last = state.workouts.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    ensureDraft();
    state.draft.exercises = last.exercises.map(ex => {
      const rec = recommendFor(ex.name);
      const sets = rec
        ? Array.from({ length: rec.sets }, () => ({ reps: rec.reps, weight: rec.weight }))
        : ex.sets.map(s => ({ reps: s.reps, weight: s.weight }));
      return { name: ex.name, sets };
    });
    state.exerciseExpanded.clear();
    state.exerciseExpanded.add(0);
    saveDraft();
    renderExerciseList();
    forceRepaint();
    toast("Copied with plan targets");
  }

  function saveWorkout() {
    if (!state.draft || state.draft.exercises.length === 0) { toast("Add at least one exercise"); return; }
    const cleaned = {
      id: uid(),
      date: state.draft.date,
      exercises: state.draft.exercises
        .map(e => ({
          name: (e.name || "").trim(),
          sets: e.sets.filter(s => (s.reps || 0) > 0).map(s => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })),
        }))
        .filter(e => e.name && e.sets.length > 0),
    };
    if (cleaned.exercises.length === 0) { toast("Add reps to at least one set"); return; }
    state.workouts.push(cleaned);
    state.draft = null;
    state.exerciseExpanded.clear();
    save();
    saveDraft();
    toast("Workout saved");
    goTo("home");
  }

  function cancelWorkout() {
    if (!state.draft || state.draft.exercises.length === 0) { goTo("home"); return; }
    if (!confirm("Discard this session?")) return;
    state.draft = null;
    state.exerciseExpanded.clear();
    saveDraft();
    goTo("home");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PLAN
  // ═══════════════════════════════════════════════════════════════
  function renderPlan() {
    const v = document.getElementById("view-plan");
    const names = knownExerciseNames();

    v.innerHTML = `
      <div class="row row--between mb-4" style="padding:0 var(--s-1)">
        <div>
          <div class="t-h2">Next Workout Plan</div>
          <div class="t-caption">Progressive overload — per exercise.</div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="rule">
          <div class="rule__icon">${I.check}</div>
          <div class="rule__text">All reps hit → <b>add weight</b> next session</div>
        </div>
        <div class="rule">
          <div class="rule__icon rule__icon--info">${I.equal}</div>
          <div class="rule__text">Missed reps → <b>hold weight</b>, finish all sets</div>
        </div>
        <div class="rule">
          <div class="rule__icon rule__icon--warn">${I.arrowDown}</div>
          <div class="rule__text">Stalled 2+ sessions → <b>deload 10%</b> and rebuild</div>
        </div>
      </div>

      <div id="planList"></div>
    `;

    const list = document.getElementById("planList");
    if (names.length === 0) {
      list.innerHTML = `
        <div class="empty">
          ${starfieldSVG()}
          <div class="empty__content">
            <div class="empty__icon">${I.trendingUp}</div>
            <div class="empty__title">No plan yet</div>
            <div class="empty__desc">Orion builds targets from your history. Log a session and your next plan appears here.</div>
            <div class="empty__steps">
              <div class="empty__step"><i>1</i><span>Log a workout</span></div>
              <div class="empty__step"><i>2</i><span>See recommendations</span></div>
              <div class="empty__step"><i>3</i><span>Hit next targets, repeat</span></div>
            </div>
            <button type="button" class="btn btn--primary" data-goto-log>${I.plus}<span>Log Workout</span></button>
          </div>
        </div>
      `;
      list.querySelector("[data-goto-log]").addEventListener("click", () => goTo("log"));
      return;
    }

    list.innerHTML = names.map(name => {
      const rec = recommendFor(name);
      if (!rec) return "";
      const pill = rec.tag === "progress" ? `<span class="pill pill--success">${I.check} Progress</span>`
                : rec.tag === "deload"   ? `<span class="pill pill--warn">${I.arrowDown} Deload</span>`
                : `<span class="pill">${I.equal} Hold</span>`;
      return `
        <div class="plan-card">
          <div class="plan-card__head">
            <div class="plan-card__name">${esc(name)}</div>
            ${pill}
          </div>
          <div class="plan-card__row">
            <span class="label">Weight</span>
            <span class="vals">
              <span class="from">${rec.lastWeight}kg</span>
              <span class="arrow">${I.arrowRight}</span>
              <span class="to">${rec.weight}kg</span>
            </span>
          </div>
          <div class="plan-card__row">
            <span class="label">Reps</span>
            <span class="vals">
              <span class="from">${rec.lastReps}</span>
              <span class="arrow">${I.arrowRight}</span>
              <span class="to">${rec.reps}</span>
            </span>
          </div>
          <div class="plan-card__row">
            <span class="label">Sets</span>
            <span class="vals"><span class="to">${rec.sets}</span></span>
          </div>
          <div class="plan-card__note">${esc(rec.note)}</div>
        </div>
      `;
    }).join("");
  }

  // ═══════════════════════════════════════════════════════════════
  //  HISTORY
  // ═══════════════════════════════════════════════════════════════
  function weeklyVolumeData(weeks) {
    weeks = weeks || 8;
    const buckets = [];
    const now = new Date();
    // Start from Monday of current week
    const start = new Date(now);
    const day = start.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    start.setDate(start.getDate() + diffToMon);
    start.setHours(0, 0, 0, 0);

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      let vol = 0;
      state.workouts.forEach(w => {
        const d = new Date(w.date);
        if (d >= weekStart && d < weekEnd) {
          vol += w.exercises.reduce((a, ex) => a + ex.sets.reduce((b, s) => b + s.reps * s.weight, 0), 0);
        }
      });
      buckets.push({ weekStart, volume: vol });
    }
    return buckets;
  }

  function chartSVG(data) {
    if (!data || data.length === 0) return "";
    const max = Math.max.apply(null, data.map(d => d.volume), 1);
    const w = 100 / data.length;
    let bars = "";
    data.forEach((d, i) => {
      const h = max > 0 ? (d.volume / max) * 100 : 0;
      const x = i * w + w * 0.18;
      const bw = w * 0.64;
      const y = 100 - h;
      const color = d.volume > 0 ? "var(--accent)" : "var(--border-default)";
      bars += `<rect x="${x.toFixed(2)}%" y="${y.toFixed(2)}%" width="${bw.toFixed(2)}%" height="${h.toFixed(2)}%" rx="2" fill="${color}" opacity="${d.volume > 0 ? 0.9 : 0.5}"/>`;
    });
    // Week labels (show only first, middle, last)
    let labels = "";
    [0, Math.floor(data.length / 2), data.length - 1].forEach(idx => {
      if (idx >= data.length) return;
      const x = idx * w + w * 0.5;
      const label = fmt(data[idx].weekStart.toISOString(), { month: "short", day: "numeric" });
      labels += `<text x="${x.toFixed(2)}%" y="100%" dy="12" text-anchor="middle" fill="var(--text-tertiary)" font-size="10" font-family="JetBrains Mono, monospace">${label}</text>`;
    });
    return `<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style="overflow:visible">${bars}${labels}</svg>`;
  }

  function filteredWorkouts() {
    const f = state.historyFilter;
    const now = new Date();
    if (f === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      return state.workouts.filter(w => new Date(w.date) >= weekAgo);
    }
    if (f === "month") {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
      return state.workouts.filter(w => new Date(w.date) >= monthAgo);
    }
    if (f !== "all") {
      return state.workouts.filter(w => w.exercises.some(e => e.name === f));
    }
    return state.workouts.slice();
  }

  function personalRecords() {
    // Max weight per exercise over all time; flag the ones set in last 2 workouts
    const prMap = new Map();
    const sorted = state.workouts.slice().sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach(w => {
      w.exercises.forEach(ex => {
        const maxW = Math.max.apply(null, ex.sets.map(s => s.weight || 0));
        if (maxW > 0 && (!prMap.has(ex.name) || maxW > prMap.get(ex.name).weight)) {
          prMap.set(ex.name, { weight: maxW, date: w.date });
        }
      });
    });
    const recent = Array.from(prMap.entries())
      .map(([name, v]) => ({ name, weight: v.weight, date: v.date }))
      .filter(pr => {
        const ageDays = (Date.now() - new Date(pr.date)) / 86400000;
        return ageDays <= 14;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
    return recent;
  }

  function renderHistory() {
    const v = document.getElementById("view-history");
    const weeks = weeklyVolumeData(8);
    const totalLast8 = weeks.reduce((a, b) => a + b.volume, 0);
    const hasData = state.workouts.length > 0;
    const list = filteredWorkouts().sort((a, b) => b.date.localeCompare(a.date));
    const prs = personalRecords();
    const exercises = knownExerciseNames();

    v.innerHTML = `
      <div class="row row--between mb-4" style="padding:0 var(--s-1)">
        <div class="t-h2">History</div>
        <button type="button" class="btn btn--icon btn--ghost" id="btnSettings" title="Settings" style="min-width:40px;min-height:40px">
          ${I.settings}
        </button>
      </div>

      ${hasData ? `
        <div class="card chart-card mb-4">
          <div class="chart-head">
            <div class="chart-title">Weekly Volume · 8w</div>
            <div class="chart-total">${Math.round(totalLast8).toLocaleString()} kg</div>
          </div>
          <div class="chart-svg-wrap">${chartSVG(weeks)}</div>
        </div>
      ` : ""}

      ${prs.length > 0 ? `
        <div class="section-head"><div class="section-head__title">Recent PRs</div></div>
        <div class="card mb-4" style="padding:var(--s-3) var(--s-4)">
          ${prs.map(pr => `
            <div class="row row--between" style="padding:10px 0;border-bottom:1px solid var(--border-subtle)">
              <div class="row row--gap-3">
                <span style="color:var(--accent);display:inline-flex">${I.star}</span>
                <span style="font-size:14px;font-weight:500">${esc(pr.name)}</span>
              </div>
              <div class="t-mono" style="font-size:14px;font-weight:600;color:var(--accent)">${pr.weight}kg</div>
            </div>
          `).join("").replace(/border-bottom[^"]*"/, '"')}
        </div>
      ` : ""}

      ${hasData ? `
        <div class="filter-row">
          <button type="button" class="chip${state.historyFilter === "all" ? " chip--active" : ""}" data-filter="all">All</button>
          <button type="button" class="chip${state.historyFilter === "week" ? " chip--active" : ""}" data-filter="week">This week</button>
          <button type="button" class="chip${state.historyFilter === "month" ? " chip--active" : ""}" data-filter="month">This month</button>
          ${exercises.slice(0, 6).map(e => `<button type="button" class="chip${state.historyFilter === e ? " chip--active" : ""}" data-filter="${esc(e)}">${esc(e)}</button>`).join("")}
        </div>
      ` : ""}

      <div id="sessionList"></div>

      <div id="settingsPanel" class="hidden">
        <div class="section-head"><div class="section-head__title">Data</div></div>
        <div class="card mb-3">
          <div class="grid-2 mb-3">
            <button type="button" class="btn btn--sm" id="btnExport">${I.download}<span>Export JSON</span></button>
            <button type="button" class="btn btn--sm" id="btnImport">${I.upload}<span>Import JSON</span></button>
          </div>
          <button type="button" class="btn btn--sm btn--danger btn--block" id="btnClearAll">${I.trash}<span>Delete All Data</span></button>
        </div>
      </div>
    `;

    // Session list
    const sessionList = document.getElementById("sessionList");
    if (list.length === 0) {
      sessionList.innerHTML = `
        <div class="empty">
          ${starfieldSVG()}
          <div class="empty__content">
            <div class="empty__icon">${I.calendar}</div>
            <div class="empty__title">${hasData ? "No matches" : "Your history lives here"}</div>
            <div class="empty__desc">${hasData ? "No sessions match this filter yet." : "Every workout you save shows up below with a tap-to-expand detail view."}</div>
            ${!hasData ? `
              <div class="empty__steps">
                <div class="empty__step"><i>1</i><span>Log a workout</span></div>
                <div class="empty__step"><i>2</i><span>See your volume chart</span></div>
                <div class="empty__step"><i>3</i><span>Track PRs automatically</span></div>
              </div>
              <button type="button" class="btn btn--primary" data-goto-log>${I.plus}<span>Log First Workout</span></button>
            ` : ""}
          </div>
        </div>
      `;
      const b = sessionList.querySelector("[data-goto-log]");
      if (b) b.addEventListener("click", () => goTo("log"));
    } else {
      sessionList.innerHTML = list.map(w => renderSessionCard(w)).join("");
      sessionList.querySelectorAll(".session").forEach(el => {
        const id = el.dataset.id;
        el.querySelector(".session__head").addEventListener("click", () => {
          if (state.historyExpanded.has(id)) state.historyExpanded.delete(id);
          else state.historyExpanded.add(id);
          renderHistory();
          forceRepaint();
        });
        const delBtn = el.querySelector("[data-del]");
        if (delBtn) delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteWorkout(id); });
      });
    }

    // Filters
    v.querySelectorAll("[data-filter]").forEach(c => {
      c.addEventListener("click", () => {
        state.historyFilter = c.dataset.filter;
        renderHistory();
        forceRepaint();
      });
    });

    // Settings toggle
    const settingsBtn = document.getElementById("btnSettings");
    const settingsPanel = document.getElementById("settingsPanel");
    settingsBtn.addEventListener("click", () => {
      settingsPanel.classList.toggle("hidden");
      if (!settingsPanel.classList.contains("hidden")) {
        settingsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    document.getElementById("btnExport").addEventListener("click", exportData);
    document.getElementById("btnImport").addEventListener("click", importData);
    document.getElementById("btnClearAll").addEventListener("click", clearAll);
  }

  function renderSessionCard(w) {
    const expanded = state.historyExpanded.has(w.id);
    const setCount = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    const vol = w.exercises.reduce((a, ex) => a + ex.sets.reduce((b, s) => b + s.reps * s.weight, 0), 0);
    const mins = Math.round(setCount * 3);
    return `
      <div class="session" data-id="${w.id}">
        <div class="session__head">
          <div class="session__left">
            <div class="session__date">${esc(fmtShort(w.date))}</div>
            <div class="session__meta">${w.exercises.length} ex · ${setCount} sets · ${vol.toLocaleString()}kg · ~${mins}m</div>
          </div>
          <div class="session__chev${expanded ? " session__chev--open" : ""}">${I.chevronDown}</div>
        </div>
        <div class="session__body${expanded ? " session__body--open" : ""}">
          ${w.exercises.map(ex => `
            <div class="session__ex">
              <div class="session__ex-name">${esc(ex.name)}</div>
              <div class="session__ex-sets">${ex.sets.map(s => `${s.reps}×${s.weight}kg`).join("  ·  ")}</div>
            </div>
          `).join("")}
          <button type="button" class="btn btn--sm btn--danger mt-3" data-del>${I.trash}<span>Delete session</span></button>
        </div>
      </div>
    `;
  }

  function deleteWorkout(id) {
    if (!confirm("Delete this session?")) return;
    state.workouts = state.workouts.filter(w => w.id !== id);
    state.historyExpanded.delete(id);
    save();
    renderHistory();
    forceRepaint();
    toast("Session deleted");
  }

  // ─── DATA ─────────────────────────────────────────────────────
  function exportData() {
    const blob = new Blob([JSON.stringify(state.workouts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orion-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(r.result);
          if (!Array.isArray(parsed)) throw new Error();
          if (!confirm(`Import ${parsed.length} sessions? This replaces current data.`)) return;
          state.workouts = parsed; save(); toast("Imported"); goTo("home");
        } catch { alert("Invalid file."); }
      };
      r.readAsText(f);
    });
    input.click();
  }
  function clearAll() {
    if (!confirm("Delete ALL sessions? This cannot be undone.")) return;
    if (!confirm("Really delete everything?")) return;
    state.workouts = []; save(); toast("All data cleared"); goTo("home");
  }

  // ─── DATE IN TOPBAR ──────────────────────────────────────────
  function renderTopbarDate() {
    document.getElementById("topbarDate").textContent = fmt(todayISO(), { weekday: "short", month: "short", day: "numeric" });
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init() {
    load();
    renderTopbarDate();

    // Bottom nav
    document.querySelectorAll(".nav__tab").forEach(t => t.addEventListener("click", () => goTo(t.dataset.tab)));
    document.getElementById("navLog").addEventListener("click", () => goTo("log"));

    goTo("home");

    // Unregister stale service workers (from v1)
    if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
    }
    if (window.caches && caches.keys) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
