import { forceSimulation, forceLink, forceManyBody, forceCenter, forceX, forceY, forceZ, forceCollide } from 'd3-force-3d'
import { CORE, SHOW_EXAMPLE_TRAITS, exampleTraits, people as rawPeople, units, type Person, type Unit } from './family'

export type Vec3 = [number, number, number]
export type TraitKind = 'clubs' | 'hometowns' | 'hobbies'

export interface TraitLink {
  a: string
  b: string
  kind: TraitKind
  value: string
}

export const TRAIT_STYLE: Record<TraitKind, { label: string; color: string }> = {
  clubs: { label: 'Clubs', color: '#52e0c4' },
  hometowns: { label: 'Hometowns', color: '#7cc4ff' },
  hobbies: { label: 'Hobbies', color: '#ff8fcf' },
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

// ── People, merged with example traits ──────────────────────────────────────
export const people: Person[] = rawPeople.map((p) =>
  SHOW_EXAMPLE_TRAITS && exampleTraits[p.id] ? { ...exampleTraits[p.id], ...p } : p,
)
export const personById = new Map(people.map((p) => [p.id, p]))
export const unitById = new Map(units.map((u) => [u.id, u]))
export { units }
export const coreSet = new Set(CORE)

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
  if (kind === 'hometowns') return p.hometown ? [p.hometown] : []
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
  for (const [, ids] of groups) {
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
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
const maxGen = Math.max(0, ...generation.values())

// ── 3D layout ───────────────────────────────────────────────────────────────
interface SimNode {
  id: string
  kind: 'person' | 'unit'
  gen: number
  x?: number
  y?: number
  z?: number
}

const LAYER = 15

function computeLayout() {
  const nodes: SimNode[] = [
    ...people.map((p) => ({ id: p.id, kind: 'person' as const, gen: generation.get(p.id) ?? maxGen / 2 })),
    ...units.map((u) => ({
      id: u.id,
      kind: 'unit' as const,
      gen: (generation.get(u.parents[0]) ?? maxGen / 2) + 0.45,
    })),
  ]
  const links = units.flatMap((u) => [
    ...u.parents.map((p) => ({ source: u.id, target: p, kind: 'parent' })),
    ...u.children.map((c) => ({ source: u.id, target: c, kind: 'child' })),
  ])

  let seed = 7
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

  const sim = forceSimulation(nodes, 3)
    .randomSource(random)
    .force(
      'link',
      forceLink(links)
        .id((d: SimNode) => d.id)
        .distance((l: { kind: string }) => (l.kind === 'parent' ? 7 : 14))
        .strength((l: { kind: string }) => (l.kind === 'parent' ? 1 : 0.8)),
    )
    .force('charge', forceManyBody()
        .strength((d: SimNode) => (d.kind === 'unit' ? -45 : -22))
        .distanceMax(45))
    .force('collide', forceCollide(4.2))
    .force('center', forceCenter(0, 0, 0))
    .force('pullX', forceX(0).strength(0.03))
    .force('pullZ', forceZ(0).strength(0.03))
    .force('gen', forceY((d: SimNode) => (maxGen / 2 - d.gen) * LAYER).strength(0.12))
    .stop()

  for (let i = 0; i < 500; i++) sim.tick()

  const pos = new Map<string, Vec3>()
  for (const n of nodes) pos.set(n.id, [n.x ?? 0, n.y ?? 0, n.z ?? 0])
  return pos
}

export const positions = computeLayout()

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
