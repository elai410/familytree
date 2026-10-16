import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { positions, traitLinks, TRAIT_STYLE, type TraitKind, type TraitLink } from '../data/graph'
import { useTree } from '../state'

/** Small sideways offset per kind so overlapping threads stay distinguishable. */
const OFFSET: Record<TraitKind, number> = { clubs: -0.35, hometowns: 0, hobbies: 0.35 }

function endpoints(l: TraitLink): [THREE.Vector3, THREE.Vector3] | null {
  const a = positions.get(l.a)
  const b = positions.get(l.b)
  if (!a || !b) return null
  const o = OFFSET[l.kind]
  return [new THREE.Vector3(a[0], a[1] + o, a[2]), new THREE.Vector3(b[0], b[1] + o, b[2])]
}

/** Faint, always-on threads between people who share a club, hometown, or hobby. */
export function TraitThreads({ activeSet }: { activeSet: Set<string> | null }) {
  const traits = useTree((s) => s.traits)
  const hovered = useTree((s) => (s.hovered?.kind === 'person' ? s.hovered.id : null))
  const selected = useTree((s) => (s.selected?.kind === 'person' ? s.selected.id : null))

  const focus = hovered ?? selected
  const bright = traitLinks.filter(
    (l) => traits[l.kind] && ((focus && (l.a === focus || l.b === focus)) || (!focus && activeSet && activeSet.has(l.a) && activeSet.has(l.b))),
  )

  return (
    <group>
      {(Object.keys(TRAIT_STYLE) as TraitKind[]).map((kind) => (
        <FaintLayer key={kind} kind={kind} visible={traits[kind]} dimmed={!!activeSet || !!focus} />
      ))}
      {bright.map((l) => {
        const pts = endpoints(l)
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
  )
}

function FaintLayer({ kind, visible, dimmed }: { kind: TraitKind; visible: boolean; dimmed: boolean }) {
  const lines = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (const l of traitLinks) {
      if (l.kind !== kind) continue
      const e = endpoints(l)
      if (e) pts.push(...e)
    }
    const material = new THREE.LineDashedMaterial({
      color: TRAIT_STYLE[kind].color,
      dashSize: 0.7,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
    const seg = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), material)
    seg.computeLineDistances()
    return seg
  }, [kind])

  useFrame((_, dt) => {
    const m = lines.material as THREE.LineDashedMaterial
    const target = visible ? (dimmed ? 0.06 : 0.3) : 0
    m.opacity += (target - m.opacity) * (1 - Math.exp(-dt * 6))
  })

  return <primitive object={lines} />
}
