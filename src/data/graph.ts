import { CORE, people as rawPeople, units, type Person, type Unit } from './family'

export type Vec3 = [number, number, number]
export type TraitKind = 'clubs' | 'hometowns'

export interface TraitLink {
  a: string
  b: string
  kind: TraitKind
  value: string
}

export const TRAIT_STYLE: Record<TraitKind, { label: string; color: string }> = {
  clubs: { label: 'Clubs', color: '#52e0c4' },
  hometowns: { label: 'Hometowns', color: '#7cc4ff' },
}

const YEAR_COLORS: Record<number, string> = {
  2024: '#f6bd4c',
  2025: '#4fd68f',
  2026: '#b08cff',
}
const EXTRA_YEAR_COLORS = ['#ff9a6b', '#5fc9ff', '#ff7aa8', '#c6e86b']

export function yearColor(year: number) {
  return YEAR_COLORS[year] ?? EXTRA_YEAR_COLORS[Math.abs(year) % EXTRA_YEAR_COLORS.length]
}

export function unitTitle(u: Unit) {
  return u.name ?? u.parents.map((id) => rawPeople.find((p) => p.id === id)?.name ?? id).join(' + ')
}

// ── People ───────────────────────────────────────────────────────────────────
export const people: Person[] = rawPeople
export const personById = new Map(people.map((p) => [p.id, p]))
export const unitById = new Map(units.map((u) => [u.id, u]))
export { units }
export const coreSet = new Set(CORE)

/** How big each lantern is drawn: the central coparents are larger, future kids smaller. */
export function lanternScale(id: string) {
  return coreSet.has(id) ? 1.55 : personById.get(id)?.placeholder ? 1 : 1.25
}

/** Evenly spaced samples along a flat line. */
function flatLine(a: [number, number], b: [number, number], step = 1.2): [number, number][] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step))
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n])
}

/**
 * The line joining a household's coparents, running through the gaps between
 * their nodes. If the ring had to hang below, `stem` joins them.
 */
export function connectorOf(u: Unit): { line: Vec3[]; stem: Vec3[] | null } | null {
  const hub = flat.get(u.id)
  const pts = u.parents.map((id) => flat.get(id)).filter((p): p is [number, number] => !!p)
  if (!hub || !pts.length) return null
  if (pts.length === 1) {
    const [px, py] = pts[0]
    return { line: [], stem: wrapPath(flatLine([px, py - 1.2 * lanternScale(u.parents[0])], hub)) }
  }
  const xs = pts.map((p) => p[0])
  const y = pts[0][1] + lineDrop(nestedRank.get(u.id) ?? 0)
  return { line: wrapPath(flatLine([Math.min(...xs), y], [Math.max(...xs), y])), stem: null }
}

/** A kid's thread: leaves the ring heading straight down, then curves to the top of their node. */
export function kidThreadOf(u: Unit, kid: string): Vec3[] | null {
  const hub = flat.get(u.id)
  const k = flat.get(kid)
  if (!hub || !k) return null
  const end: [number, number] = [k[0], k[1] + 1.05 * lanternScale(kid)]
  const mid: [number, number] = [hub[0], end[1] + 3]
  const pts: [number, number][] = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const s = 1 - t
    pts.push([s * s * hub[0] + 2 * s * t * mid[0] + t * t * end[0], s * s * hub[1] + 2 * s * t * mid[1] + t * t * end[1]])
  }
  return wrapPath(pts)
}

for (const u of units) {
  for (const id of [...u.parents, ...u.children]) {
    if (!personById.has(id)) console.warn(`[family] unit "${u.id}" mentions unknown person "${id}"`)
  }
}

/** Every unit a person belongs to, with their role in it. */
export const unitsOf = new Map<string, { unit: Unit; role: 'parent' | 'child' }[]>()
for (const p of people) unitsOf.set(p.id, [])
for (const u of units) {
  u.parents.forEach((id) => unitsOf.get(id)?.push({ unit: u, role: 'parent' }))
  u.children.forEach((id) => unitsOf.get(id)?.push({ unit: u, role: 'child' }))
}

// ── Shared-trait links ──────────────────────────────────────────────────────
function traitValues(p: Person, kind: TraitKind): string[] {
  if (kind === 'hometowns') return [p.hometown, p.area].filter((v): v is string => !!v)
  return p[kind] ?? []
}

export const traitLinks: TraitLink[] = []
for (const kind of Object.keys(TRAIT_STYLE) as TraitKind[]) {
  const groups = new Map<string, string[]>()
  for (const p of people) {
    for (const v of traitValues(p, kind)) {
      const key = v.trim().toLowerCase()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p.id)
    }
  }
  // One thread per pair, even if they share both a hometown and an area.
  const seen = new Set<string>()
  for (const [, ids] of groups) {
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const pair = [ids[i], ids[j]].sort().join('|')
        if (seen.has(pair)) continue
        seen.add(pair)
        const value = traitValues(personById.get(ids[i])!, kind).find(
          (v) => traitValues(personById.get(ids[j])!, kind).some((w) => w.trim().toLowerCase() === v.trim().toLowerCase()),
        )!
        traitLinks.push({ a: ids[i], b: ids[j], kind, value })
      }
  }
}

// ── Generations (used to gently lift elders to the top of the ball) ──────────
const generation = new Map<string, number>()
{
  const childOf = new Set(units.flatMap((u) => u.children))
  for (let pass = 0; pass < 12; pass++) {
    for (const u of units) {
      const known = u.parents.map((id) => generation.get(id)).filter((g): g is number => g !== undefined)
      let g = known.length ? Math.min(...known) : undefined
      if (g === undefined) {
        const kid = u.children.map((id) => generation.get(id)).find((x) => x !== undefined)
        if (kid !== undefined) g = kid - 1
        else if (u.parents.every((id) => !childOf.has(id))) g = 0
      }
      if (g === undefined) continue
      u.parents.forEach((id) => !generation.has(id) && generation.set(id, g!))
      u.children.forEach((id) => !generation.has(id) && generation.set(id, g! + 1))
    }
  }
}
const genOf = (id: string) => generation.get(id) ?? 0
/** Which generation row someone sits in (0 = top of the tree). */
export const generationOf = genOf

// ── Layered tree layout ─────────────────────────────────────────────────────
//  Each generation is a row. Coparents sit side by side, their household ring
//  hangs just below them, and their kids form a row underneath.
const LAYER = 16 // vertical distance between generations
const GAP = 6.2 // minimum distance between neighbors in a row
const GROUP_GAP = 3 // extra space between different households' kids

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)

/** Weighted least-squares fit of `y` that never decreases (pool-adjacent-violators). */
function isotonic(y: number[], w: number[]) {
  const blocks: { sum: number; w: number; n: number }[] = []
  y.forEach((v, i) => {
    blocks.push({ sum: v * w[i], w: w[i], n: 1 })
    while (blocks.length > 1) {
      const a = blocks[blocks.length - 2]
      const b = blocks[blocks.length - 1]
      if (a.sum / a.w <= b.sum / b.w) break
      a.sum += b.sum
      a.w += b.w
      a.n += b.n
      blocks.pop()
    }
  })
  return blocks.flatMap((b) => Array(b.n).fill(b.sum / b.w) as number[])
}

/** How many smaller households sit inside this one (its line runs a little lower). */
export const nestedRank = new Map<string, number>()
const lineDrop = (nested: number) => -0.9 * nested

function computeLayout() {
  const parentUnit = new Map<string, { unit: Unit; idx: number }>()
  units.forEach((u) => u.children.forEach((c, idx) => !parentUnit.has(c) && parentUnit.set(c, { unit: u, idx })))
  const parentIn = (id: string) => units.filter((u) => u.parents.includes(id))

  const x = new Map<string, number>()
  // A household's ring sits on its coparents' line, in the gap nearest the middle.
  const hubX = (u: Unit) => {
    const xs = u.parents.map((id) => x.get(id) ?? 0).sort((a, b) => a - b)
    if (xs.length === 1) return xs[0]
    const mid = (xs[0] + xs[xs.length - 1]) / 2
    for (let i = 0; i < xs.length - 1; i++) if (mid <= xs[i + 1]) return (xs[i] + xs[i + 1]) / 2
    return mid
  }
  const gens = [...new Set(people.map((p) => genOf(p.id)))].sort((a, b) => a - b)

  // 1. Order each row: kids grouped under their household, partners beside their coparent.
  const rows = new Map<number, string[]>()
  const groupOf = new Map<string, string>()
  for (const g of gens) {
    const ids = people.filter((p) => genOf(p.id) === g).map((p) => p.id)
    const key = new Map<string, number[]>()
    ids.forEach((id) => {
      const pu = parentUnit.get(id)
      if (pu && x.size) {
        key.set(id, [hubX(pu.unit), pu.idx, 0])
        groupOf.set(id, pu.unit.id)
      }
    })
    ids.forEach((id, i) => {
      if (key.has(id)) return
      for (const u of parentIn(id)) {
        const mate = u.parents.find((q) => q !== id && key.has(q))
        if (mate) {
          key.set(id, [...key.get(mate)!.slice(0, 2), 1 + u.parents.indexOf(id)])
          groupOf.set(id, groupOf.get(mate)!)
          return
        }
      }
      // Founders: keep coparents together in data order.
      const first = units.findIndex((u) => u.parents.includes(id))
      key.set(id, [Infinity, first < 0 ? 999 : first, i])
      groupOf.set(id, `root-${first}`)
    })
    const row = [...ids].sort((a, b) => {
      const ka = key.get(a)!
      const kb = key.get(b)!
      for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]
      return 0
    })
    rows.set(g, row)
    let cx = 0
    row.forEach((id, i) => {
      if (i) cx += GAP + (groupOf.get(id) !== groupOf.get(row[i - 1]) ? GROUP_GAP : 0)
      x.set(id, cx)
    })
  }

  // Kids of a household nested inside a bigger one (Eddy + Steven inside the 2025 unit)
  // hold their spot under their ring; the bigger household's kids make room around them.
  const priority = new Map<string, number>()
  for (const u of units) {
    const inner = units.some((o) => o !== u && o.parents.length > u.parents.length && u.parents.every((q) => o.parents.includes(q)))
    if (inner) u.children.forEach((c) => priority.set(c, 6))
  }

  // 2. Nudge rows so kids center under their parents and parents over their kids.
  for (let iter = 0; iter < 300; iter++) {
    for (const g of gens) {
      const row = rows.get(g)!
      const desired = row.map((id) => {
        const ds: number[] = []
        const pu = parentUnit.get(id)
        if (pu) ds.push(hubX(pu.unit) + (pu.idx - (pu.unit.children.length - 1) / 2) * GAP)
        for (const u of parentIn(id)) {
          const offset = (u.parents.indexOf(id) - (u.parents.length - 1) / 2) * GAP
          const anchor = u.children.length ? mean(u.children.map((c) => x.get(c) ?? 0)) : hubX(u)
          ds.push(anchor + offset)
        }
        const sum = ds.reduce((a, b) => a + b, 0)
        const weight = ds.length
        return weight ? sum / weight : x.get(id)!
      })
      const offsets: number[] = []
      row.forEach((id, i) => {
        offsets.push(i ? offsets[i - 1] + GAP + (groupOf.get(id) !== groupOf.get(row[i - 1]) ? GROUP_GAP : 0) : 0)
      })
      const fit = isotonic(
        desired.map((d, i) => d - offsets[i]),
        row.map((id) => priority.get(id) ?? 1),
      )
      row.forEach((id, i) => x.set(id, fit[i] + offsets[i]))
    }
  }

  // 3. Center horizontally.
  const all = [...x.values()]
  const shift = (Math.min(...all) + Math.max(...all)) / 2
  for (const [id, v] of x) x.set(id, v - shift)
  const top = gens[0] ?? 0
  const rowY = (g: number) => -(g - top) * LAYER

  const flat = new Map<string, [number, number]>()
  for (const p of people) flat.set(p.id, [x.get(p.id)!, rowY(genOf(p.id))])
  for (const u of units) {
    const g = genOf(u.parents[0])
    // A bigger household that contains a smaller one (the 2025 unit contains Eddy + Steven)
    // runs its line a little lower so both lines stay visible.
    const nested = units.filter(
      (o) => o !== u && genOf(o.parents[0]) === g && o.parents.length < u.parents.length && o.parents.some((q) => u.parents.includes(q)),
    ).length
    nestedRank.set(u.id, nested)
    // With a single parent there's no line, so the ring hangs just below them.
    const blocked = u.parents.length === 1
    flat.set(u.id, [hubX(u), rowY(g) + lineDrop(nested) - (blocked ? 4.5 : 0)])
  }
  return flat
}

/** Every node's position in the flat tree layout (x along the row, y up). */
export const flat = computeLayout()

/** The flat bounds of a set of ids (labels hang below, so the bottom gets a little extra). */
export function flatBox(ids: Iterable<string>, pad = 4) {
  const pts = [...ids].map((id) => flat.get(id)).filter((p): p is [number, number] => !!p)
  if (!pts.length) return { cx: 0, cy: 0, w: 40, h: 40 }
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minY = Math.min(...ys) - 3
  const maxY = Math.max(...ys)
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (minY + maxY) / 2,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: maxY - minY + pad * 2,
  }
}



// ── Front face: the family tree, laid flat ──────────────────────────────────
export function wrap(fx: number, fy: number, z = 0): Vec3 {
  return [fx, fy, z]
}

export const positions = new Map<string, Vec3>([...flat].map(([id, [fx, fy]]) => [id, wrap(fx, fy, unitById.has(id) ? 0.3 : 0)]))

function wrapPath(pts: [number, number][]): Vec3[] {
  return pts.map(([fx, fy]) => wrap(fx, fy))
}

// ── Back face: the connections map ──────────────────────────────────────────
//  Seen from behind, the same people regroup around a glowing hub for each
//  club and shared hometown. Anyone without a shared connection yet waits on
//  an outer ring, in their family-tree order.
export interface TraitGroup {
  id: string
  kind: TraitKind
  label: string
  members: string[]
}

export const traitGroups: TraitGroup[] = (() => {
  const out: TraitGroup[] = []
  for (const kind of Object.keys(TRAIT_STYLE) as TraitKind[]) {
    const byKey = new Map<string, { label: string; members: string[] }>()
    for (const p of people)
      for (const v of traitValues(p, kind)) {
        const key = v.trim().toLowerCase()
        if (!byKey.has(key)) byKey.set(key, { label: v.trim(), members: [] })
        byKey.get(key)!.members.push(p.id)
      }
    const groups = [...byKey].filter(([, g]) => g.members.length > 1)
    for (const [key, g] of groups) {
      // A hometown inside a wider area with the same people adds nothing (Queens inside New York City).
      const inside = groups.some(([k2, o]) => k2 !== key && o.members.length > g.members.length && g.members.every((m) => o.members.includes(m)))
      if (kind === 'hometowns' && inside) continue
      out.push({ id: `g:${kind}:${key}`, kind, label: g.label, members: g.members })
    }
  }
  return out
})()
export const groupById = new Map(traitGroups.map((g) => [g.id, g]))

/** Where everyone (and every connection hub) sits on the back face, in world space. */
export const backPositions = (() => {
  const connected = [...new Set(traitGroups.flatMap((g) => g.members))]
  const nodes = [...traitGroups.map((g) => g.id), ...connected]
  const p = new Map<string, [number, number]>()
  traitGroups.forEach((g, i) => {
    const a = (i / Math.max(1, traitGroups.length)) * Math.PI * 2
    p.set(g.id, [Math.cos(a) * 24, Math.sin(a) * 16])
  })
  connected.forEach((id, i) => {
    const hubs = traitGroups.filter((g) => g.members.includes(id)).map((g) => p.get(g.id)!)
    p.set(id, [mean(hubs.map((h) => h[0])) + Math.cos(i * 2.4) * 3, mean(hubs.map((h) => h[1])) + Math.sin(i * 2.4) * 3])
  })
  const springs = traitGroups.flatMap((g) => g.members.map((m) => [g.id, m] as const))

  // A small force layout: nearby nodes push apart, members are pulled to their hubs,
  // and everything is drawn gently toward the middle.
  const ITER = 600
  for (let iter = 0; iter < ITER; iter++) {
    const f = new Map(nodes.map((id) => [id, [0, 0]]))
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = p.get(nodes[i])!
        const b = p.get(nodes[j])!
        const dx = a[0] - b[0]
        const dy = a[1] - b[1]
        const d = Math.max(Math.hypot(dx, dy), 0.5)
        if (d > 40) continue
        const k = 120 / (d * d * d)
        f.get(nodes[i])![0] += dx * k
        f.get(nodes[i])![1] += dy * k
        f.get(nodes[j])![0] -= dx * k
        f.get(nodes[j])![1] -= dy * k
      }
    for (const [g, m] of springs) {
      const a = p.get(g)!
      const b = p.get(m)!
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const d = Math.max(Math.hypot(dx, dy), 0.01)
      const k = (d - 10) * 0.15
      f.get(g)![0] += (dx / d) * k
      f.get(g)![1] += (dy / d) * k
      f.get(m)![0] -= (dx / d) * k
      f.get(m)![1] -= (dy / d) * k
    }
    const step = 0.6 * (1 - iter / ITER) + 0.05
    for (const id of nodes) {
      const q = p.get(id)!
      const fq = f.get(id)!
      q[0] += Math.max(-2, Math.min(2, (fq[0] - q[0] * 0.06) * step))
      q[1] += Math.max(-2, Math.min(2, (fq[1] - q[1] * 0.06) * step))
    }
  }

  // Fit the clusters into most of the family tree's footprint.
  const fb = flatBox(flat.keys(), 0)
  const cl = [...p.values()]
  const cMinX = Math.min(...cl.map((q) => q[0]), 0)
  const cMaxX = Math.max(...cl.map((q) => q[0]), 0)
  const cMinY = Math.min(...cl.map((q) => q[1]), 0)
  const cMaxY = Math.max(...cl.map((q) => q[1]), 0)
  // Don't squeeze clusters much tighter than their natural spacing, so hub labels stay clear.
  const s = Math.max(0.9, Math.min((fb.w * 0.8) / Math.max(1, cMaxX - cMinX), (fb.h * 0.62) / Math.max(1, cMaxY - cMinY), 1.4))
  const placed = new Map<string, [number, number]>()
  for (const [id, [x, y]] of p) placed.set(id, [(x - (cMinX + cMaxX) / 2) * s, (y - cMinY) * s])

  // Everyone else waits in rows underneath, in their family-tree order, until they share something.
  const loners = people.filter((q) => !connected.includes(q.id)).sort((a, b) => flat.get(a.id)![0] - flat.get(b.id)![0])
  const perRow = Math.max(6, Math.ceil(loners.length / 2))
  loners.forEach((q, i) => {
    const row = Math.floor(i / perRow)
    const inRow = Math.min(perRow, loners.length - row * perRow)
    const col = i - row * perRow
    placed.set(q.id, [(col - (inRow - 1) / 2) * GAP, -14 - row * 9])
  })

  // Center on the family tree, then mirror so it reads left to right from behind.
  const ys = [...placed.values()].map((q) => q[1])
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2
  const out = new Map<string, Vec3>()
  for (const [id, [x, y]] of placed) out.set(id, [fb.cx - x, fb.cy + (y - midY), 0])
  return out
})()

/** Ids lit up on the back face when a person is selected there. */
export function connectionSetFor(id: string): Set<string> {
  const s = new Set<string>([id])
  for (const g of traitGroups)
    if (g.members.includes(id)) {
      s.add(g.id)
      g.members.forEach((m) => s.add(m))
    }
  return s
}

/** 0 at the far left of the family tree, 1 at the far right; staggers the morph into a wave. */
export const familyOrder = (() => {
  const xs = people.map((p) => flat.get(p.id)![0])
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  return new Map(people.map((p) => [p.id, hi === lo ? 0.5 : (flat.get(p.id)![0] - lo) / (hi - lo)]))
})()

/** Bounding sphere (center + radius) around a set of ids. */
export function boundsOf(ids: Iterable<string>, pad = 6): { center: Vec3; radius: number } {
  const pts = [...ids].map((id) => positions.get(id)).filter((p): p is Vec3 => !!p)
  if (!pts.length) return { center: [0, 0, 0], radius: 30 }
  const c: Vec3 = [0, 0, 0]
  for (const p of pts) for (let i = 0; i < 3; i++) c[i] += p[i] / pts.length
  let r = 0
  for (const p of pts) r = Math.max(r, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]))
  return { center: c, radius: r + pad }
}

export const allBounds = boundsOf(positions.keys(), 4)

/** Ids lit up when something is selected. */
export function activeSetFor(sel: { kind: 'unit' | 'person'; id: string } | null): Set<string> | null {
  if (!sel) return null
  const s = new Set<string>([sel.id])
  if (sel.kind === 'unit') {
    const u = unitById.get(sel.id)
    u?.parents.forEach((id) => s.add(id))
    u?.children.forEach((id) => s.add(id))
    return s
  }
  for (const { unit } of unitsOf.get(sel.id) ?? []) {
    s.add(unit.id)
    unit.parents.forEach((id) => s.add(id))
    unit.children.forEach((id) => s.add(id))
  }
  for (const l of traitLinks) {
    if (l.a === sel.id) s.add(l.b)
    if (l.b === sel.id) s.add(l.a)
  }
  return s
}
