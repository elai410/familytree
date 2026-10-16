import { useEffect, useMemo, useState } from 'react'
import { SUBTITLE, TITLE } from '../data/family'
import {
  coreSet,
  people,
  personById,
  traitLinks,
  TRAIT_STYLE,
  unitById,
  units,
  unitsOf,
  unitTitle,
  yearColor,
  type TraitKind,
} from '../data/graph'
import { useTree } from '../state'

export function Overlay() {
  const selected = useTree((s) => s.selected)
  const select = useTree((s) => s.select)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && select(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])

  return (
    <div className="overlay">
      <header className="brand">
        <div className="seal" aria-hidden="true">家</div>
        <div>
          <h1>{TITLE}</h1>
          <p>
            {SUBTITLE} · {people.filter((p) => !p.placeholder).length} members · {units.length} households
          </p>
        </div>
      </header>

      <button className="menu-toggle glass" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
        {menuOpen ? '✕  Close' : '☰  Households'}
      </button>
      <Directory open={menuOpen} onPick={() => window.matchMedia('(max-width: 760px)').matches && setMenuOpen(false)} />

      {selected && <Details key={selected.id} />}

      <Legend />

      <div className="footer">
        {selected ? (
          <button className="back glass" onClick={() => select(null)}>
            ← See the whole family
          </button>
        ) : (
          <p className="hint">Drag to orbit · scroll to zoom · click a glowing ring to visit a household</p>
        )}
      </div>
    </div>
  )
}

function Directory({ open, onPick }: { open: boolean; onPick: () => void }) {
  const select = useTree((s) => s.select)
  const selected = useTree((s) => s.selected)
  const [query, setQuery] = useState('')

  const years = useMemo(() => [...new Set(units.map((u) => u.year))].sort(), [])
  const matches = query.trim()
    ? people.filter((p) => !p.placeholder && p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : []

  const pick = (kind: 'unit' | 'person', id: string) => {
    select({ kind, id })
    onPick()
  }

  return (
    <aside className={`directory glass ${open ? 'open' : ''}`}>
      <input className="search" placeholder="Find someone" value={query} onChange={(e) => setQuery(e.target.value)} />
      {query.trim() ? (
        <ul className="list">
          {matches.length === 0 && <li className="empty">No one by that name yet</li>}
          {matches.map((p) => (
            <li key={p.id}>
              <button onClick={() => pick('person', p.id)}>
                {p.name}
                <small>{describePerson(p.id)}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        years.map((y) => (
          <section key={y}>
            <h3>
              <span className="dot" style={{ background: yearColor(y) }} />
              {y}
            </h3>
            <ul className="list">
              {units
                .filter((u) => u.year === y)
                .map((u) => (
                  <li key={u.id}>
                    <button
                      className={selected?.kind === 'unit' && selected.id === u.id ? 'on' : ''}
                      onClick={() => pick('unit', u.id)}
                    >
                      {u.parents.map((id) => personById.get(id)?.name).join(' + ')}
                      <small>
                        {u.name ? `${u.name} · ` : ''}
                        {u.children.length} {u.children.length === 1 ? 'kid' : 'kids'}
                      </small>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </aside>
  )
}

function describePerson(id: string) {
  const roles = unitsOf.get(id) ?? []
  const parentOf = roles.filter((r) => r.role === 'parent').map((r) => r.unit.year)
  const childOf = roles.find((r) => r.role === 'child')
  const bits: string[] = []
  if (childOf) bits.push(`kid of ${childOf.unit.parents.map((p) => personById.get(p)?.name).join(' + ')}`)
  if (parentOf.length) bits.push(`parent ${parentOf.join(', ')}`)
  return bits.join(' · ')
}

function PersonChip({ id }: { id: string }) {
  const select = useTree((s) => s.select)
  const p = personById.get(id)
  if (!p) return null
  return (
    <button className={`chip ${p.placeholder ? 'ghost' : ''}`} onClick={() => !p.placeholder && select({ kind: 'person', id })}>
      {coreSet.has(id) && <span className="star">✦</span>}
      {p.name}
    </button>
  )
}

function Details() {
  const selected = useTree((s) => s.selected)!
  const select = useTree((s) => s.select)

  if (selected.kind === 'unit') {
    const u = unitById.get(selected.id)!
    const color = yearColor(u.year)
    return (
      <aside className="details glass" style={{ ['--c' as string]: color }}>
        <p className="eyebrow">
          <span className="dot" style={{ background: color }} />
          {u.year} parent unit
        </p>
        <h2>{unitTitle(u)}</h2>
        <h4>Parents</h4>
        <div className="chips">
          {u.parents.map((id) => (
            <PersonChip key={id} id={id} />
          ))}
        </div>
        <h4>Kids</h4>
        <div className="chips">
          {u.children.length ? u.children.map((id) => <PersonChip key={id} id={id} />) : <span className="muted">None yet</span>}
        </div>
      </aside>
    )
  }

  const p = personById.get(selected.id)!
  const roles = unitsOf.get(p.id) ?? []
  const links = traitLinks.filter((l) => l.a === p.id || l.b === p.id)
  const byKind = (Object.keys(TRAIT_STYLE) as TraitKind[])
    .map((kind) => ({
      kind,
      groups: Object.entries(
        links
          .filter((l) => l.kind === kind)
          .reduce<Record<string, string[]>>((acc, l) => {
            ;(acc[l.value] ??= []).push(l.a === p.id ? l.b : l.a)
            return acc
          }, {}),
      ),
    }))
    .filter((k) => k.groups.length)

  const facts: [string, string | undefined][] = [
    ['Hometown', p.hometown],
    ['Clubs', p.clubs?.join(', ')],
    ['Hobbies', p.hobbies?.join(', ')],
  ]

  return (
    <aside className="details glass">
      <p className="eyebrow">{coreSet.has(p.id) ? '✦ One of the core four' : 'Family member'}</p>
      <h2>{p.name}</h2>
      {p.note && <p className="note">{p.note}</p>}

      {facts.some(([, v]) => v) && (
        <dl className="facts">
          {facts.map(([k, v]) =>
            v ? (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}

      <h4>Households</h4>
      <ul className="roles">
        {roles.map(({ unit, role }) => (
          <li key={unit.id + role}>
            <button onClick={() => select({ kind: 'unit', id: unit.id })}>
              <span className="dot" style={{ background: yearColor(unit.year) }} />
              {role === 'parent' ? `Parent in ${unitTitle(unit)} (${unit.year})` : `Kid of ${unit.parents.map((id) => personById.get(id)?.name).join(' + ')}`}
            </button>
          </li>
        ))}
      </ul>

      {byKind.map(({ kind, groups }) => (
        <div key={kind}>
          <h4 style={{ color: TRAIT_STYLE[kind].color }}>Shared {TRAIT_STYLE[kind].label.toLowerCase()}</h4>
          {groups.map(([value, ids]) => (
            <div key={value} className="shared">
              <span className="muted">{value}</span>
              <div className="chips">
                {ids.map((id) => (
                  <PersonChip key={id} id={id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </aside>
  )
}

function Legend() {
  const traits = useTree((s) => s.traits)
  const toggle = useTree((s) => s.toggleTrait)
  const years = [...new Set(units.map((u) => u.year))].sort()
  return (
    <div className="legend glass">
      <div className="row">
        {years.map((y) => (
          <span key={y} className="key">
            <span className="ring" style={{ borderColor: yearColor(y) }} />
            {y}
          </span>
        ))}
        <span className="key">
          <span className="thread" />
          Family
        </span>
      </div>
      <div className="row">
        {(Object.keys(TRAIT_STYLE) as TraitKind[]).map((k) => (
          <button key={k} className={`toggle ${traits[k] ? 'on' : ''}`} style={{ ['--c' as string]: TRAIT_STYLE[k].color }} onClick={() => toggle(k)}>
            <span className="dash" />
            {TRAIT_STYLE[k].label}
          </button>
        ))}
      </div>
    </div>
  )
}
