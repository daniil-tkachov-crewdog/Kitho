import { useEffect, useRef } from 'react'

const ITEM = 40 // px, must match .wheel-item height
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export type Dob = { day: number; month: number; year: number } // month 1–12

const daysIn = (month: number, year: number) => new Date(year, month, 0).getDate()
const pad = (n: number) => String(n).padStart(2, '0')

export const dobToIso = (d: Dob) => `${d.year}-${pad(d.month)}-${pad(d.day)}`

/** Full years between the date of birth and today. */
export function ageFrom(d: Dob, today = new Date()): number {
  let age = today.getFullYear() - d.year
  if (today.getMonth() + 1 < d.month || (today.getMonth() + 1 === d.month && today.getDate() < d.day)) age--
  return age
}

export function defaultDob(): Dob {
  return { day: 1, month: 1, year: new Date().getFullYear() - 25 }
}

/** Three snapping scroll wheels: Day / Month / Year. */
export default function DobWheel({ value, onChange }: { value: Dob; onChange: (d: Dob) => void }) {
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 83 }, (_, i) => thisYear - 18 - i) // 18 … 100 years ago
  const days = Array.from({ length: daysIn(value.month, value.year) }, (_, i) => i + 1)

  const set = (patch: Partial<Dob>) => {
    const next = { ...value, ...patch }
    next.day = Math.min(next.day, daysIn(next.month, next.year))
    if (next.day !== value.day || next.month !== value.month || next.year !== value.year) onChange(next)
  }

  return (
    <div className="wheel" role="group" aria-label="Date of birth">
      <Column label="Day" items={days.map(String)} index={value.day - 1} onPick={(i) => set({ day: i + 1 })} />
      <Column label="Month" items={MONTHS} index={value.month - 1} onPick={(i) => set({ month: i + 1 })} wide />
      <Column label="Year" items={years.map(String)} index={Math.max(0, years.indexOf(value.year))} onPick={(i) => set({ year: years[i] })} />
    </div>
  )
}

function Column({ label, items, index, onPick, wide }: {
  label: string
  items: string[]
  index: number
  onPick: (i: number) => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  // Keep the scroll position in sync with the value (initial render + external changes, e.g. day clamping).
  useEffect(() => {
    const el = ref.current
    if (el && Math.round(el.scrollTop / ITEM) !== index) el.scrollTo({ top: index * ITEM })
  }, [index, items.length])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function onScroll() {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = ref.current
      if (!el) return
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)))
      if (i !== index) onPick(i)
    }, 90)
  }

  function step(delta: number) {
    const i = Math.min(items.length - 1, Math.max(0, index + delta))
    ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' })
  }

  return (
    <div
      ref={ref}
      className={`wheel-col${wide ? ' wide' : ''}`}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={onScroll}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
        if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
      }}
    >
      {items.map((it, i) => (
        <div
          key={it}
          className={`wheel-item${i === index ? ' on' : ''}`}
          role="option"
          aria-selected={i === index}
          onClick={() => ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' })}
        >
          {it}
        </div>
      ))}
    </div>
  )
}
