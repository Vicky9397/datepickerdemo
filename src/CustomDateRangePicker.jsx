import {
    useEffect, useRef, useState, useCallback,
    forwardRef, useImperativeHandle,
} from "react";
 
/* ============================================================
 * SBDateRangePickerCustom - dependency-free segmented date range picker
 *
 * Public contract (unchanged):
 *   value:    { start: Date | null, end: Date | null }
 *   onChange: (e) => void          where e.value = { start, end }
 *   componentName: string          key used for sessionStorage persistence
 *
 * Input model: a true segmented field. MM, DD and YYYY are independent
 * sections. Click a section to select it, type to replace, Enter (or arrow
 * keys) to move between sections, Backspace to clear a section and step back.
 * Separators are fixed. Empty sections show their MM/DD/YYYY label.
 * ============================================================ */
 
const YEAR_PREFIX = 2000; // 2-digit year entry maps 0..99 -> 2000..2099
 
const pad2 = (n) => String(n).padStart(2, "0");
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const expandYearNum = (y) => (y >= 0 && y < 100 ? YEAR_PREFIX + y : y);
 
const isSameDay = (a, b) =>
    !!a && !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
 
const formatDate = (date) =>
    date ? `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}` : "";
 
const isoKey = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
 
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
 
/* ---------- segment model ---------- */
 
const ORDER = ["mm", "dd", "yyyy"];
const PLACEHOLDER = { mm: "MM", dd: "DD", yyyy: "YYYY" };
const MAXLEN = { mm: 2, dd: 2, yyyy: 4 };
const EMPTY = { mm: "", dd: "", yyyy: "" };
 
const secFromDate = (date) =>
    date
        ? { mm: pad2(date.getMonth() + 1), dd: pad2(date.getDate()), yyyy: String(date.getFullYear()) }
        : { ...EMPTY };
 
const buildDate = (sec) => {
    if (!sec.mm || !sec.dd || !sec.yyyy) return null;
    const month = clamp(parseInt(sec.mm, 10), 1, 12);
    const year = expandYearNum(parseInt(sec.yyyy, 10));
    const day = clamp(parseInt(sec.dd, 10), 1, daysInMonth(year, month - 1));
    return startOfDay(new Date(year, month - 1, day));
};
 
// Pad / expand / clamp a single section once the user leaves it.
const normalizeSec = (key, sec) => {
    const raw = sec[key];
    if (!raw) return "";
    if (key === "mm") return pad2(clamp(parseInt(raw, 10) || 1, 1, 12));
    if (key === "yyyy") {
        const y = parseInt(raw, 10);
        return String(raw.length < 4 ? expandYearNum(y) : y).padStart(4, "0");
    }
    // dd: clamp to the real month length when month/year are known
    let dim = 31;
    if (sec.mm) {
        const m = clamp(parseInt(sec.mm, 10), 1, 12);
        const y = sec.yyyy ? expandYearNum(parseInt(sec.yyyy, 10)) : 2024; // leap-safe fallback
        dim = daysInMonth(y, m - 1);
    }
    return pad2(clamp(parseInt(raw, 10) || 1, 1, dim));
};
 
const normalizeAll = (sec) =>
    ORDER.reduce((acc, key) => ({ ...acc, [key]: normalizeSec(key, sec) }), {});
 
/* ---------- persistence ---------- */
 
const storage = {
    get(key) {
        try {
            if (typeof sessionStorage === "undefined") return null;
            return sessionStorage.getItem(key);
        } catch { return null; }
    },
    set(key, val) {
        try {
            if (typeof sessionStorage === "undefined") return;
            sessionStorage.setItem(key, val);
        } catch { /* storage unavailable - persistence is best-effort */ }
    },
};
 
export const getSavedDateRange = (componentName) => {
    const stored = storage.get(`${componentName}_dateRange`);
    if (!stored) return null;
    try {
        const parsed = JSON.parse(stored);
        const toDate = (v) => (v ? startOfDay(new Date(v)) : null);
        return { start: toDate(parsed.start), end: toDate(parsed.end) };
    } catch {
        return null;
    }
};
 
/* ---------- segmented input ---------- */
 
const SegmentedDateInput = forwardRef(function SegmentedDateInput(
    { value, onChange, onForward, onBackward, label },
    ref
) {
    const [sections, setSections] = useState(() => secFromDate(value));
    const [active, setActive] = useState("mm");
    const [focusWithin, setFocusWithin] = useState(false);
    const secRefs = useRef({});
    const fresh = useRef(true); // next digit replaces rather than appends
 
    // Re-sync from the outside only when the user is not editing.
    useEffect(() => {
        if (!focusWithin) setSections(value ? secFromDate(value) : { ...EMPTY });
    }, [value, focusWithin]);
 
    useImperativeHandle(ref, () => ({
        focusFirst: () => focusSection("mm"),
        focusLast: () => focusSection("yyyy"),
    }));
 
    const focusSection = (key) => {
        commitNormalized(sections);
        setActive(key);
        fresh.current = true;
        requestAnimationFrame(() => secRefs.current[key]?.focus());
    };
 
    const emitTyping = (next) => {
        const complete = next.mm && next.dd && next.yyyy && next.yyyy.length === MAXLEN.yyyy;
        onChange?.(complete ? buildDate(next) : null);
    };
 
    const commitNormalized = (next) => {
        const norm = normalizeAll(next);
        setSections(norm);
        onChange?.(buildDate(norm));
        return norm;
    };
 
    const moveTo = (key, dir) => {
        commitNormalized(sections); // finalize what we are leaving
        const idx = ORDER.indexOf(key) + dir;
        if (idx < 0) { onBackward?.(); return; }
        if (idx > ORDER.length - 1) { onForward?.(); return; }
        focusSection(ORDER[idx]);
    };
 
    const clearAndBack = (key) => {
        const next = { ...sections, [key]: "" };
        setSections(next);
        emitTyping(next);
        const idx = ORDER.indexOf(key) - 1;
        if (idx < 0) { focusSection(key); return; } // first section: clear, stay
        focusSection(ORDER[idx]);
    };
 
    const handleKeyDown = (e, key) => {
        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const prev = fresh.current ? "" : sections[key];
            fresh.current = false;
            const nextVal = (prev + e.key).slice(-MAXLEN[key]);
            const next = { ...sections, [key]: nextVal };
            setSections(next);
            emitTyping(next);
            return;
        }
        switch (e.key) {
            case "Enter":
            case "ArrowRight": e.preventDefault(); moveTo(key, +1); break;
            case "ArrowLeft": e.preventDefault(); moveTo(key, -1); break;
            case "Backspace": e.preventDefault(); clearAndBack(key); break;
            default: break;
        }
    };
 
    const handleBlur = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return; // moving between sections
        setFocusWithin(false);
        commitNormalized(sections);
    };
 
    return (
        <span
            className="sb-seg"
            role="group"
            aria-label={label}
            onFocus={() => setFocusWithin(true)}
            onBlur={handleBlur}
        >
            {ORDER.map((key, i) => (
                <span key={key} className="sb-seg-cell">
                    {i > 0 && <span className="sb-seg-slash" aria-hidden>/</span>}
                    <span
                        ref={(el) => { secRefs.current[key] = el; }}
                        className={[
                            "sb-seg-sec",
                            `sb-seg-${key}`,
                            !sections[key] && "sb-seg-ph",
                            focusWithin && active === key && "sb-seg-active",
                        ].filter(Boolean).join(" ")}
                        role="spinbutton"
                        tabIndex={active === key ? 0 : -1}
                        aria-label={`${label} ${key.toUpperCase()}`}
                        aria-valuetext={sections[key] || PLACEHOLDER[key]}
                        onFocus={() => { setActive(key); fresh.current = true; }}
                        onMouseDown={(e) => { e.preventDefault(); focusSection(key); }}
                        onKeyDown={(e) => handleKeyDown(e, key)}
                    >
                        {sections[key] || PLACEHOLDER[key]}
                    </span>
                </span>
            ))}
        </span>
    );
});
 
/* ---------- calendar ---------- */
 
function MonthGrid({ year, month, range, preview, focusDate, onPick, onHover }) {
    const first = new Date(year, month, 1);
    const lead = first.getDay();
    const total = daysInMonth(year, month);
 
    const cells = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
 
    const today = startOfDay(new Date());
    const lo = preview ? (preview.start < preview.end ? preview.start : preview.end) : null;
    const hi = preview ? (preview.start < preview.end ? preview.end : preview.start) : null;
 
    return (
        <div className="sb-drp-month">
            <div className="sb-drp-month-name">{MONTHS[month]} {year}</div>
            <div className="sb-drp-weekdays">
                {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
            </div>
            <div className="sb-drp-days" role="rowgroup">
                {cells.map((d, idx) => {
                    if (!d) return <span key={`e${idx}`} className="sb-drp-day sb-drp-empty" />;
                    const isStart = isSameDay(d, range.start);
                    const isEnd = isSameDay(d, range.end);
                    const inRange = range.start && range.end && d > range.start && d < range.end;
                    const inPreview = lo && hi && d > lo && d < hi;
                    const cls = [
                        "sb-drp-day",
                        (isStart || isEnd) && "sb-drp-endpoint",
                        (inRange || inPreview) && "sb-drp-inrange",
                        isSameDay(d, today) && "sb-drp-today",
                        isSameDay(d, focusDate) && "sb-drp-focus",
                    ].filter(Boolean).join(" ");
                    return (
                        <button
                            key={isoKey(d)}
                            id={`sb-drp-${isoKey(d)}`}
                            type="button"
                            tabIndex={-1}
                            className={cls}
                            onClick={() => onPick(d)}
                            onMouseEnter={() => onHover(d)}
                            aria-label={formatDate(d)}
                            aria-pressed={isStart || isEnd}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
 
function RangeCalendar({ range, onPick, onClose }) {
    const anchor = range.start || range.end || new Date();
    const [viewDate, setViewDate] = useState(startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1)));
    const [focusDate, setFocusDate] = useState(startOfDay(anchor));
    const [hovered, setHovered] = useState(null);
    const gridRef = useRef(null);
 
    useEffect(() => { gridRef.current?.focus(); }, []);
 
    const ensureVisible = useCallback((d) => {
        const firstVisible = viewDate;
        const lastVisible = new Date(viewDate.getFullYear(), viewDate.getMonth() + 2, 0);
        if (d < firstVisible) setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
        else if (d > lastVisible) setViewDate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }, [viewDate]);
 
    const moveFocus = (next) => { setFocusDate(next); ensureVisible(next); };
 
    const handleKeyDown = (e) => {
        switch (e.key) {
            case "ArrowLeft": e.preventDefault(); moveFocus(addDays(focusDate, -1)); break;
            case "ArrowRight": e.preventDefault(); moveFocus(addDays(focusDate, 1)); break;
            case "ArrowUp": e.preventDefault(); moveFocus(addDays(focusDate, -7)); break;
            case "ArrowDown": e.preventDefault(); moveFocus(addDays(focusDate, 7)); break;
            case "PageUp": e.preventDefault(); moveFocus(addMonths(focusDate, -1)); break;
            case "PageDown": e.preventDefault(); moveFocus(addMonths(focusDate, 1)); break;
            case "Home": e.preventDefault(); moveFocus(addDays(focusDate, -focusDate.getDay())); break;
            case "End": e.preventDefault(); moveFocus(addDays(focusDate, 6 - focusDate.getDay())); break;
            case "Enter":
            case " ": e.preventDefault(); onPick(focusDate); break;
            case "Escape": e.preventDefault(); onClose(); break;
            default: break;
        }
    };
 
    const preview = range.start && !range.end && hovered
        ? { start: range.start, end: hovered }
        : null;
 
    return (
        <div
            ref={gridRef}
            className="sb-drp-cal"
            role="grid"
            tabIndex={0}
            aria-activedescendant={`sb-drp-${isoKey(focusDate)}`}
            onKeyDown={handleKeyDown}
            onMouseLeave={() => setHovered(null)}
        >
            <div className="sb-drp-cal-head">
                <button type="button" className="sb-drp-nav" onClick={() => setViewDate(addMonths(viewDate, -1))} aria-label="Previous month">‹</button>
                <button type="button" className="sb-drp-nav" onClick={() => setViewDate(addMonths(viewDate, 1))} aria-label="Next month">›</button>
            </div>
            <div className="sb-drp-cal-body">
                {[0, 1].map((offset) => {
                    const m = addMonths(viewDate, offset);
                    return (
                        <MonthGrid
                            key={offset}
                            year={m.getFullYear()}
                            month={m.getMonth()}
                            range={range}
                            preview={preview}
                            focusDate={focusDate}
                            onPick={onPick}
                            onHover={setHovered}
                        />
                    );
                })}
            </div>
        </div>
    );
}
 
/* ---------- root ---------- */
 
export const SBDateRangePickerCustom = ({ value, onChange, componentName = "dateRange", className = "" }) => {
    const [range, setRange] = useState(value ?? { start: null, end: null });
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const startRef = useRef(null);
    const endRef = useRef(null);
 
    useEffect(() => { if (value) setRange(value); }, [value]);
 
    const commit = useCallback((next) => {
        setRange(next);
        if (componentName && (next.start || next.end)) {
            storage.set(
                `${componentName}_dateRange`,
                JSON.stringify({
                    start: next.start ? next.start.toISOString() : null,
                    end: next.end ? next.end.toISOString() : null,
                })
            );
        }
        onChange?.({ value: next });
    }, [componentName, onChange]);
 
    const setStart = (d) => commit({ start: d, end: range.end });
    const setEnd = (d) => commit({ start: range.start, end: d });
 
    const handlePick = (d) => {
        if (!range.start || range.end) {
            commit({ start: d, end: null });
        } else {
            if (d < range.start) commit({ start: d, end: range.start });
            else commit({ start: range.start, end: d });
            setOpen(false);
        }
    };
 
    const clearAll = () => {
        commit({ start: null, end: null });
        startRef.current?.focusFirst();
    };
 
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);
 
    const hasValue = range.start || range.end;

    const handleSectionBlur = (key) => {
        const next = {
            ...sections,
            [key]: normalizeSec(key, sections),
        };

        setSections(next);
        onChange?.(buildDate(next));
    };
 
    return (
        <div ref={rootRef} className={`sb-drp-root ${className}`}>
            <StyleOnce />
            <div className="sb-drp-control">
                <SegmentedDateInput
                    ref={startRef}
                    label="Start date"
                    value={range.start}
                    onChange={setStart}
                    onForward={() => endRef.current?.focusFirst()}
                />
                <span className="sb-drp-sep" aria-hidden>–</span>
                <SegmentedDateInput
                    ref={endRef}
                    label="End date"
                    value={range.end}
                    onChange={setEnd}
                    onBackward={() => startRef.current?.focusLast()}
                />
                {hasValue && (
                    <button type="button" className="sb-drp-iconbtn" onClick={clearAll} aria-label="Clear dates">×</button>
                )}
                <button
                    type="button"
                    className="sb-drp-iconbtn"
                    onClick={() => setOpen((o) => !o)}
                    aria-label="Open calendar"
                    aria-expanded={open}
                >
                    {CalendarIcon}
                </button>
            </div>
 
            {open && (
                <div className="sb-drp-popup" role="dialog" aria-label="Choose date range">
                    <RangeCalendar range={range} onPick={handlePick} onClose={() => setOpen(false)} />
                </div>
            )}
        </div>
    );
};
 
const CalendarIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
);
 
/* ---------- scoped styles (injected once) ---------- */
 
const CSS = `
.sb-drp-root { --sb-accent: #2563eb; --sb-border: #d4d7dd; --sb-text: #1f2430;
  position: relative; display: inline-block; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.sb-drp-control { display: inline-flex; align-items: center; gap: 2px; padding: 6px 8px;
  border: 1px solid var(--sb-border); border-radius: 8px; background: #fff; transition: border-color .12s, box-shadow .12s; }
.sb-drp-control:focus-within { border-color: var(--sb-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sb-accent) 18%, transparent); }
.sb-drp-sep { color: #9aa0ac; padding: 0 6px; }
 
.sb-seg { display: inline-flex; align-items: center; font-size: 14px; color: var(--sb-text);
  font-variant-numeric: tabular-nums; }
.sb-seg-cell { display: inline-flex; align-items: center; }
.sb-seg-slash { color: #9aa0ac; padding: 0 1px; user-select: none; }
.sb-seg-sec { display: inline-block; text-align: center; padding: 2px 2px; border-radius: 3px;
  cursor: text; outline: none; caret-color: transparent; }
.sb-seg-mm, .sb-seg-dd { min-width: 2ch; }
.sb-seg-yyyy { min-width: 4ch; }
.sb-seg-ph { color: #9aa0ac; }
.sb-seg-active { background: color-mix(in srgb, var(--sb-accent) 30%, transparent); color: var(--sb-text); }
 
.sb-drp-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;
  border: 0; border-radius: 6px; background: transparent; color: #6b7280; cursor: pointer; font-size: 18px; line-height: 1; }
.sb-drp-iconbtn:hover { background: #f1f3f6; color: var(--sb-text); }
.sb-drp-iconbtn:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: 1px; }
 
.sb-drp-popup { position: absolute; top: calc(100% + 6px); left: 0; z-index: 50;
  background: #fff; border: 1px solid var(--sb-border); border-radius: 12px; box-shadow: 0 12px 32px rgba(20,24,38,.16); padding: 12px; }
.sb-drp-cal { outline: none; }
.sb-drp-cal:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: 4px; border-radius: 8px; }
.sb-drp-cal-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
.sb-drp-nav { width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent; color: var(--sb-text);
  cursor: pointer; font-size: 18px; line-height: 1; }
.sb-drp-nav:hover { background: #f1f3f6; }
.sb-drp-cal-body { display: flex; gap: 20px; }
.sb-drp-month-name { text-align: center; font-weight: 600; font-size: 13px; color: var(--sb-text); margin-bottom: 6px; }
.sb-drp-weekdays, .sb-drp-days { display: grid; grid-template-columns: repeat(7, 32px); }
.sb-drp-weekdays span { text-align: center; font-size: 11px; color: #9aa0ac; padding-bottom: 4px; }
.sb-drp-day { width: 32px; height: 32px; border: 0; background: transparent; color: var(--sb-text);
  cursor: pointer; font: inherit; font-size: 13px; border-radius: 50%; }
.sb-drp-day:hover { background: #eef1f6; }
.sb-drp-empty { background: transparent; cursor: default; }
.sb-drp-today { font-weight: 700; box-shadow: inset 0 0 0 1px var(--sb-accent); }
.sb-drp-inrange { background: color-mix(in srgb, var(--sb-accent) 14%, transparent); border-radius: 0; }
.sb-drp-endpoint { background: var(--sb-accent); color: #fff; }
.sb-drp-endpoint:hover { background: var(--sb-accent); }
.sb-drp-focus { outline: 2px solid var(--sb-accent); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .sb-drp-control { transition: none; } }
`;
 
let injected = false;
function StyleOnce() {
    useEffect(() => {
        if (injected || typeof document === "undefined") return;
        const el = document.createElement("style");
        el.id = "sb-drp-styles";
        el.textContent = CSS;
        document.head.appendChild(el);
        injected = true;
    }, []);
    return null;
}