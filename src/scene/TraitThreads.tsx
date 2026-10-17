import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { positions, traitLinks, TRAIT_STYLE, type TraitKind, type TraitLink } from '../data/graph'
import { useTree } from '../state'
import { familyVisibility } from './morph'

/** Stagger each kind so overlapping arcs stay distinguishable. */
const LIFT: Record<TraitKind, number> = { clubs: 0, hometowns: 3 }

/** An arc that swings out behind the tree, so it never crosses the family threads. */
function arc(l: TraitLink): THREE.Vector3[] | null {
  const a = positions.get(l.a)
  const b = positions.get(l.b)
  if (!a || !b) return null
  const span = Math.hypot(a[0] - b[0], a[1] - b[1])
  const mid = new THREE.Vector3(
    (a[0] + b[0]) / 2,
    Math.max(a[1], b[1]) + 2 + LIFT[l.kind] + span * 0.12,
    Math.min(a[2], b[2]) - 6 - LIFT[l.kind] - span * 0.35,
  )
  return new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), mid, new THREE.Vector3(...b)).getPoints(24)
}

/** On the family side: faint threads between people who share a club or hometown. */
export function TraitThreads({ activeSet }: { activeSet: Set<string> | null }) {
  const traits = useTree((s) => s.traits)
  const hovered = useTree((s) => (s.hovered?.kind === 'person' ? s.hovered.id : null))
  const selected = useTree((s) => (s.selected?.kind === 'person' ? s.selected.id : null))

  const focus = hovered ?? selected
  const bright = traitLinks.filter(
    (l) => traits[l.kind] && ((focus && (l.a === focus || l.b === focus)) || (!focus && activeSet && activeSet.has(l.a) && activeSet.has(l.b))),
  )

  const bright_ = useRef<THREE.Group>(null!)
  useFrame(() => {
    bright_.current.visible = familyVisibility() > 0.5
  })

  return (
    <group>
      {(Object.keys(TRAIT_STYLE) as TraitKind[]).map((kind) => (
        <FaintLayer key={kind} kind={kind} visible={traits[kind]} dimmed={!!activeSet || !!focus} />
      ))}
      <group ref={bright_}>
        {bright.map((l) => {
          const pts = arc(l)
          return pts ? (
            <Line
              key={`${l.kind}-${l.a}-${l.b}`}
              points={pts}
              color={new THREE.Color(TRAIT_STYLE[l.kind].color).multiplyScalar(1.5)}
              lineWidth={1.4}
              dashed
              dashSize={0.8}
              gapSize={0.5}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          ) : null
        })}
      </group>
    </group>
  )
}

function FaintLayer({ kind, visible, dimmed }: { kind: TraitKind; visible: boolean; dimmed: boolean }) {
  const lines = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (const l of traitLinks) {
      if (l.kind !== kind) continue
      const e = arc(l)
      if (e) for (let i = 1; i < e.length; i++) pts.push(e[i - 1], e[i])
    }
    const material = new THREE.LineDashedMaterial({
      color: TRAIT_STYLE[kind].color,
      dashSize: 0.7,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    const seg = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), material)
    seg.computeLineDistances()
    return seg
  }, [kind])

  useFrame((_, dt) => {
    const m = lines.material as THREE.LineDashedMaterial
    const target = (visible ? (dimmed ? 0.05 : 0.2) : 0) * familyVisibility()
    m.opacity += (target - m.opacity) * (1 - Math.exp(-dt * 6))
  })

  return <primitive object={lines} />
}
