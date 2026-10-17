import * as THREE from 'three'
import { backPositions, generationOf, people, positions, type Vec3 } from '../data/graph'

const smooth = THREE.MathUtils.smoothstep

/** A steady pseudo-random number in [0, 1) for each id, so every lantern has its own character. */
function hash(id: string, salt = 0) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

const FLIGHT = 2.6 // seconds each lantern spends in the air
const TIER_DELAY = 0.45 // each generation lets go a little after the one above it

interface Flight {
  from: number
  to: number
  startAt: number
}

/**
 * The two faces: 0 is the family tree (front), 1 is the connections map (back).
 * Turning the camera past the side sets a new target; each lantern then floats
 * there on its own time, so the motion stays smooth however the camera moves.
 */
export const morph = {
  now: 0,
  target: 0,
  /** Average progress of everyone, used to fade the family and connection layers. */
  overall: 0,
  flights: new Map<string, Flight>(people.map((p) => [p.id, { from: 0, to: 0, startAt: 0 }])),
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Release every lantern toward a face, top tier first, each with a little hesitation of its own. */
export function releaseTo(target: 0 | 1) {
  if (morph.target === target) return
  morph.target = target
  for (const p of people) {
    const f = morph.flights.get(p.id)!
    f.from = progressOf(p.id)
    f.to = target
    f.startAt = morph.now + generationOf(p.id) * TIER_DELAY + hash(p.id) * 0.5
  }
}

/** How far a lantern is along its flight, from 0 (family tree) to 1 (connections map). */
export function progressOf(id: string) {
  const f = morph.flights.get(id)
  if (!f) return morph.target
  const t = Math.min(1, Math.max(0, (morph.now - f.startAt) / FLIGHT))
  return f.from + (f.to - f.from) * ease(t)
}

/** Call once per frame, after updating `morph.now`. */
export function updateOverall() {
  let sum = 0
  for (const p of people) sum += progressOf(p.id)
  morph.overall = sum / Math.max(1, people.length)
}

/** The family-side extras fade as soon as the first lanterns take off. */
export const familyVisibility = () => 1 - smooth(morph.overall, 0.0, 0.12)

/** A household's threads stay while all its lanterns are home, and fade as soon as one lifts off. */
export function homeVisibility(ids: string[]) {
  let most = 0
  for (const id of ids) most = Math.max(most, progressOf(id))
  return 1 - smooth(most, 0.02, 0.2)
}

/** A connection appears once everyone in it has landed on the back. */
export function landedVisibility(ids: string[]) {
  let least = 1
  for (const id of ids) least = Math.min(least, progressOf(id))
  return smooth(least, 0.8, 1)
}

const a = new THREE.Vector3()
const b = new THREE.Vector3()
const c1 = new THREE.Vector3()
const c2 = new THREE.Vector3()
const curve = new THREE.CubicBezierCurve3(a, c1, c2, b)

/**
 * Where a lantern is right now: it rises like a released sky lantern, drifts
 * across with a gentle sway, then settles into its spot on the other face.
 */
export function personPosition(id: string, out: THREE.Vector3) {
  const front = positions.get(id) as Vec3
  const back = backPositions.get(id) ?? front
  const p = progressOf(id)
  if (p <= 0.0001) return out.set(...front)
  if (p >= 0.9999) return out.set(...back)

  const lift = 9 + hash(id, 1) * 8
  const depth = (hash(id, 2) - 0.5) * 10
  a.set(...front)
  b.set(...back)
  c1.set(front[0], front[1] + lift, front[2] + depth)
  c2.set(back[0], back[1] + lift * 0.8, back[2] + depth)
  curve.getPoint(p, out)

  // A soft drift while in the air, like a lantern caught by the breeze.
  const air = Math.sin(Math.PI * p)
  const phase = hash(id, 3) * Math.PI * 2
  out.x += Math.sin(morph.now * 0.9 + phase) * 1.2 * air
  out.z += Math.cos(morph.now * 0.7 + phase) * 1.2 * air
  return out
}
