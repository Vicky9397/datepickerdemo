import { useEffect, useState } from 'react'
import '@syncfusion/ej2-icons/styles/material3.css'
import '@syncfusion/ej2-react-calendars/styles/material3.css'
import './App.css'
import { SBDateRangePicker } from './MuiDateRangePicker'
import { SBDateRangePickerCustom } from './CustomDateRangePicker'
import { SBDateRangePickerPaid } from './PaidDateRangePicker'

const EMPTY = { start: null, end: null }

const fmtMonthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const fmtFull = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const pad2 = (n) => String(n).padStart(2, '0')
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// Turn a { start, end } payload into the pieces the readout renders.
function summarize(range) {
  const start = range?.start ?? null
  const end = range?.end ?? null

  if (!start && !end) {
    return { state: 'empty', text: 'No range selected yet', aside: null, payload: null }
  }
  if (start && !end) {
    return {
      state: 'partial',
      text: `From ${fmtFull.format(start)}`,
      aside: 'waiting for an end date',
      payload: `start: ${isoDate(start)}  ·  end: —`,
    }
  }

  const [lo, hi] = start <= end ? [start, end] : [end, start]
  const nights = Math.round((atMidnight(hi) - atMidnight(lo)) / 86_400_000)
  const text =
    lo.getFullYear() === hi.getFullYear()
      ? `${fmtMonthDay.format(lo)} – ${fmtFull.format(hi)}`
      : `${fmtFull.format(lo)} – ${fmtFull.format(hi)}`

  return {
    state: 'complete',
    text,
    aside: nights === 0 ? 'same day' : `${nights} ${nights === 1 ? 'night' : 'nights'}`,
    payload: `start: ${isoDate(lo)}  ·  end: ${isoDate(hi)}`,
  }
}

const Kbd = ({ children }) => <kbd className="kbd">{children}</kbd>

const FIELD_KEYS = [
  { keys: ['0–9'], desc: 'Type any digit to fill MM, then DD, then YYYY' },
  { keys: ['←', '→'], desc: 'Move between the month, day and year sections' },
  { keys: ['Enter'], desc: 'Commit the section and advance to the next one' },
  { keys: ['⌫'], desc: 'Clear the current section and step back' },
  { keys: ['Tab'], desc: 'Jump from the start field to the end field' },
]

const CALENDAR_KEYS = [
  { keys: ['←', '→', '↑', '↓'], desc: 'Move the focus by a day or a whole week' },
  { keys: ['PgUp', 'PgDn'], desc: 'Flip to the previous or next month' },
  { keys: ['Home', 'End'], desc: 'Jump to the start or end of the week' },
  { keys: ['Enter'], desc: 'Select the focused day as start, then end' },
  { keys: ['Esc'], desc: 'Close the calendar and keep typing' },
]

function PickerPanel({ index, eyebrow, title, tag, children, range, note }) {
  const s = summarize(range)
  return (
    <article className="panel">
      <header className="panel-head">
        <span className="panel-index">{index}</span>
        <div className="panel-heading">
          <p className="panel-eyebrow">{eyebrow}</p>
          <h2 className="panel-title">{title}</h2>
        </div>
        <span className="panel-tag">{tag}</span>
      </header>

      <div className="panel-stage">{children}</div>

      <div className={`panel-readout is-${s.state}`}>
        <span className="readout-dot" aria-hidden />
        <span className="readout-text">{s.text}</span>
        {s.aside && <span className="readout-aside">{s.aside}</span>}
      </div>
      {s.payload && <p className="panel-code">{s.payload}</p>}
      {note && (
        <p className="panel-note">
          <span className="note-label">License</span>
          <span>{note}</span>
        </p>
      )}
    </article>
  )
}

function KeyGuide({ icon, title, subtitle, rows }) {
  return (
    <div className="guide-card">
      <h3 className="guide-title">
        <span className="guide-icon" aria-hidden>{icon}</span>
        {title}
      </h3>
      <p className="guide-sub">{subtitle}</p>
      <ul className="guide-list">
        {rows.map((row) => (
          <li key={row.desc}>
            <span className="guide-keys">
              {row.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
            <span className="guide-desc">{row.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  const [customRange, setCustomRange] = useState(EMPTY)
  const [muiRange, setMuiRange] = useState(EMPTY)
  const [paidRange, setPaidRange] = useState(EMPTY)

  function applyStyleToBannerContainer(propertyName, propertyValue, priority) {
    const button = document.querySelector("button.license-banner-close");
    if (!button) {
        return null;
    }

    const container = button.closest("div");
    if (!container) {
        return null;
    }

    container.style.setProperty(propertyName, propertyValue, priority || "");
    return container;
}


  // Syncfusion injects a fixed, full-width trial banner as a bare <body> child
  // (no id/class) until a license key is added. Measure it and expose the height
  // as --banner-h so the hero can clear it by exactly that much — and by nothing
  // once the component is licensed and the banner is gone. The full-width + top
  // test keeps calendar popups (also portalled into <body>) from matching.
  useEffect(() => {
    const root = document.getElementById('root')
    const syncBannerHeight = () => {
      // Match the banner by its text so calendar popups (also fixed, also
      // portalled into <body>, sometimes full-screen on mobile) never count.
      const banner = [...document.body.children].find((el) => {
        if (el === root || el.tagName !== 'DIV') return false
        const rect = el.getBoundingClientRect()
        if (getComputedStyle(el).position !== 'fixed' || rect.height === 0) return false
        return /syncfusion|essential studio|license/i.test(el.textContent || '')
      })
      document.documentElement.style.setProperty(
        '--banner-h',
        banner ? `${banner.offsetHeight}px` : '0px'
      )
    }
    syncBannerHeight()
    const settle = setTimeout(syncBannerHeight, 300) // banner may mount after paint
    const observer = new MutationObserver(syncBannerHeight)
    observer.observe(document.body, { childList: true })
    window.addEventListener('resize', syncBannerHeight)
    return () => {
      clearTimeout(settle)
      observer.disconnect()
      window.removeEventListener('resize', syncBannerHeight)
    }
  }, [])

  useEffect(()=>{
    // usage
applyStyleToBannerContainer("display", "none");
  },[])

  return (
    <main className="demo">
      <header className="demo-hero">
        <span className="hero-badge">
          <span className="hero-badge-key" aria-hidden>⌨</span>
          Keyboard-first demo
        </span>
        <h1 className="hero-title">
          Pick a date range <em>without the mouse</em>
        </h1>
        <ul className="hero-keys">
          <li><Kbd>0–9</Kbd><span>type the date</span></li>
          <li><Kbd>←</Kbd><Kbd>→</Kbd><span>move sections</span></li>
          <li><Kbd>Enter</Kbd><span>next section</span></li>
          <li><Kbd>⌫</Kbd><span>clear</span></li>
          <li><Kbd>Tab</Kbd><span>switch field</span></li>
        </ul>
      </header>

      <section className="demo-grid" aria-label="Date range picker comparison">
        <PickerPanel
          index="01"
          eyebrow="Built from scratch"
          title="Custom Date Range Picker"
          tag="Zero dependencies"
          range={customRange}
          note="None."
        >
          <SBDateRangePickerCustom
            componentName="customDemo"
            onChange={(e) => setCustomRange(e.value)}
          />
        </PickerPanel>

        <PickerPanel
          index="02"
          eyebrow="MUI X Pro · dayjs"
          title="MUI Date Range Picker"
          tag="Paid license"
          range={muiRange}
          note="MUI X Pro (commercial) — the range picker is a paid feature."
        >
          <SBDateRangePicker componentName="muiDemo" onChange={(e) => setMuiRange(e.value)} />
        </PickerPanel>

        <PickerPanel
          index="03"
          eyebrow="Commercial · Syncfusion"
          title="Syncfusion Date Range Picker"
          tag="Paid license"
          range={paidRange}
          note="Syncfusion (commercial) — free Community License for small teams."
        >
          <SBDateRangePickerPaid componentName="paidDemo" onChange={(e) => setPaidRange(e.value)} />
        </PickerPanel>
      </section>

      <section className="demo-guide" aria-label="Keyboard reference">
        <KeyGuide
          icon="⌨"
          title="In the field"
          subtitle="Everything you need — no calendar required."
          rows={FIELD_KEYS}
        />
        <KeyGuide
          icon="📅"
          title="In the calendar"
          subtitle="Optional. Fully navigable by keyboard too."
          rows={CALENDAR_KEYS}
        />
      </section>

      <footer className="demo-foot">
        Focus a field above and start typing — your selection updates live in each card.
      </footer>
    </main>
  )
}

export default App
