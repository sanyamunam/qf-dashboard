/**
 * The filter row — one line, above the results.
 *
 * It replaces a left rail that listed every value of every facet at once:
 * five statuses, sixteen entities, twenty-plus categories, seven thematic
 * areas, four frameworks — over fifty controls on screen before the reader had
 * done anything, in a column taller than the viewport and separate from the
 * results it governed.
 *
 * Nothing about WHICH facets exist changes, or what they contain. Each one is
 * a dropdown that opens to its options with live counts and closes again;
 * anything longer than eight options carries a search field inside it, because
 * reading sixteen entity names to find one is the same defect at a smaller
 * scale. What is applied stays visible as removable chips below the row, so
 * the closed state never hides state.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search as SearchIcon, X } from 'lucide-react'

/** Longer than this and the list gets its own search field. */
const SEARCHABLE_AT = 8

export interface FacetItem {
  value: string
  label: string
  n: number
  /** a child in the two-level category tree */
  indent?: boolean
  /** dot colour, where the facet has one (status) */
  dot?: string
}

export function FacetDropdown({
  label,
  items,
  selected,
  onToggle,
  onClear,
  single,
}: {
  label: string
  items: FacetItem[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
  /** year picks one period — the two are never mixed on screen */
  single?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  /* the panel opens right-aligned when a left-aligned one would run off the
     page — the last dropdowns in the row sit near the right gutter */
  const [flip, setFlip] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !ref.current) return
    setFlip(ref.current.getBoundingClientRect().left + 288 > window.innerWidth - 24)
    if (items.length > SEARCHABLE_AT) setTimeout(() => searchRef.current?.focus(), 20)
  }, [open, items.length])

  const searchable = items.length > SEARCHABLE_AT
  const term = q.trim().toLowerCase()
  const shown = term ? items.filter((i) => i.label.toLowerCase().includes(term)) : items
  const on = selected.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o)
          setQ('')
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] transition-all duration-200 hover:-translate-y-[1px]"
        style={{
          background: on ? 'var(--color-sidra)' : 'var(--color-card)',
          color: on ? '#fff' : 'var(--color-ink-soft)',
          boxShadow: 'var(--shadow-card)',
          fontWeight: on ? 600 : 500,
        }}
      >
        {label}
        {on && !single && (
          <span
            className="num flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={{ background: 'rgba(255,255,255,0.24)' }}
          >
            {selected.length}
          </span>
        )}
        <ChevronDown
          size={13}
          strokeWidth={2}
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none', opacity: on ? 0.8 : 0.55 }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            role="listbox"
            aria-label={label}
            className={`absolute top-[calc(100%+6px)] z-50 w-[272px] overflow-hidden rounded-card bg-card shadow-(--shadow-card-hover) ${
              flip ? 'end-0' : 'start-0'
            }`}
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-cream px-3 py-2">
                <SearchIcon size={13} strokeWidth={1.8} className="shrink-0 text-ink-mute" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Find a ${label.toLowerCase()}`}
                  className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-ink-mute"
                  aria-label={`Find a ${label.toLowerCase()}`}
                />
              </div>
            )}
            <div className="max-h-[300px] overflow-y-auto p-1.5">
              {shown.length === 0 && <p className="px-2 py-3 text-[12px] text-ink-mute">Nothing matches “{q}”.</p>}
              {shown.map((i) => {
                const picked = selected.includes(i.value)
                return (
                  <button
                    key={i.value}
                    role="option"
                    aria-selected={picked}
                    onClick={() => {
                      onToggle(i.value)
                      if (single) setOpen(false)
                    }}
                    /* a zero-count option is a dead end, but an ACTIVE one must
                       stay clickable or its own filter cannot be removed here */
                    disabled={i.n === 0 && !picked}
                    className={`flex w-full items-center gap-2 rounded-chip px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-cream disabled:opacity-40 ${
                      i.indent ? 'ps-6' : ''
                    }`}
                    style={{ color: picked ? 'var(--color-sidra)' : 'var(--color-ink-soft)', fontWeight: picked ? 600 : 400 }}
                  >
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      {picked ? (
                        <Check size={13} strokeWidth={2.6} />
                      ) : i.dot ? (
                        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: i.dot }} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{i.label}</span>
                    <span className="num shrink-0 text-[11.5px] text-ink-mute">{i.n}</span>
                  </button>
                )
              })}
            </div>
            {on && !single && (
              <button
                onClick={onClear}
                className="w-full border-t border-cream px-3 py-2 text-start text-[12px] font-medium text-ink-mute transition-colors hover:bg-cream"
              >
                Clear {label.toLowerCase()}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The applied filters, spelled out — the closed row must never hide state. */
export function FilterChips({
  chips,
  onRemove,
  onClearAll,
  residue,
  onClearResidue,
}: {
  chips: { key: string; label: string }[]
  onRemove: (key: string) => void
  onClearAll: () => void
  residue?: string
  onClearResidue?: () => void
}) {
  const total = chips.length + (residue ? 1 : 0)
  if (total === 0) return null
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => onRemove(c.key)}
          className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-[12px] font-medium text-sidra transition-colors hover:bg-cream/70"
        >
          {c.label} <X size={12} strokeWidth={2.2} />
        </button>
      ))}
      {residue && (
        <button
          onClick={onClearResidue}
          className="flex items-center gap-1.5 rounded-full bg-cream/60 px-3 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:bg-cream"
        >
          “{residue}” <X size={12} strokeWidth={2.2} />
        </button>
      )}
      {/* one chip clears itself; two or more earn a single control */}
      {total >= 2 && (
        <button onClick={onClearAll} className="text-[12px] text-ink-mute underline underline-offset-2 hover:text-sidra">
          Clear all
        </button>
      )}
    </div>
  )
}
