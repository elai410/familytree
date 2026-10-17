import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Line, Text } from '@react-three/drei'
import * as THREE from 'three'
import { backPositions, traitGroups, TRAIT_STYLE, type TraitGroup, type Vec3 } from '../data/graph'
import { useTree } from '../state'
import { FONT } from './Lantern'
import { landedVisibility, morph } from './morph'

const hexGeometry = new THREE.RingGeometry(1.1, 1.45, 6)
const coreGeometry = new THREE.CircleGeometry(0.55, 6)

/** The back face: a glowing hub for each club and shared hometown, with spokes to its members. */
export function Connections({ activeSet }: { activeSet: Set<string> | null }) {
  const root = useRef<THREE.Group>(null!)
  useFrame(() => {
    // Only drawn once lanterns start heading over, so it never catches clicks on the front.
    root.current.visible = morph.overall > 0.05
  })
  return (
    <group ref={root}>
      {traitGroups.map((g) => (
        <Hub key={g.id} group={g} lit={!activeSet || activeSet.has(g.id)} activeSet={activeSet} />
      ))}
    </group>
  )
}

function Hub({ group, lit, activeSet }: { group: TraitGroup; lit: boolean; activeSet: Set<string> | null }) {
  const pos = backPositions.get(group.id)!
  const color = TRAIT_STYLE[group.kind].color
  const traits = useTree((s) => s.traits)
  const shown = traits[group.kind]
  const spin = useRef<THREE.Group>(null!)
  const label = useRef<any>(null)
  const glow = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, toneMapped: false, side: THREE.DoubleSide }),
    [color],
  )
  const phase = pos[0] * 0.3

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 6)
    spin.current.rotation.z = clock.elapsedTime * 0.3 + phase
    const target = shown ? (lit ? 1 : 0.12) * landedVisibility(group.members) : 0
    glow.opacity += (target - glow.opacity) * k
    if (label.current) {
      label.current.fillOpacity = glow.opacity
      label.current.outlineOpacity = glow.opacity
    }
  })

  return (
    <group>
      <Billboard position={pos}>
        <group ref={spin}>
          <mesh geometry={hexGeometry} material={glow} />
        </group>
        <mesh geometry={coreGeometry} material={glow} />
        <Suspense fallback={null}>
          <Text ref={label} font={FONT} fontSize={1.8} position={[0, 2.1, 0]} anchorY="bottom" color={color} outlineWidth={0.08} outlineColor="#0b0618">
            {group.label}
          </Text>
        </Suspense>
      </Billboard>
      {group.members.map((m) => (
        <Spoke key={m} id={m} from={pos} to={backPositions.get(m)} color={color} on={shown} lit={lit && (!activeSet || activeSet.has(m))} />
      ))}
    </group>
  )
}

function Spoke({ id, from, to, color, on, lit }: { id: string; from: Vec3; to?: Vec3; color: string; on: boolean; lit: boolean }) {
  const ref = useRef<any>(null)
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(1.5), [color])
  useFrame((_, dt) => {
    const m = ref.current?.material
    if (!m) return
    const target = on ? (lit ? 0.75 : 0.06) * landedVisibility([id]) : 0
    m.opacity += (target - m.opacity) * (1 - Math.exp(-dt * 6))
  })
  if (!to) return null
  return <Line ref={ref} points={[from, to]} color={c} lineWidth={1.6} dashed dashSize={0.9} gapSize={0.5} transparent opacity={0} toneMapped={false} />
}
