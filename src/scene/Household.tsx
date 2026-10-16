import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Html, Line, QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import type { Unit } from '../data/family'
import { personById, positions, unitTitle, yearColor, type Vec3 } from '../data/graph'
import { useTree } from '../state'

const ringGeometry = new THREE.TorusGeometry(1.3, 0.09, 12, 72)
const innerRingGeometry = new THREE.TorusGeometry(0.85, 0.04, 8, 48)
const coreGeometry = new THREE.SphereGeometry(0.42, 20, 20)
const hitGeometry = new THREE.SphereGeometry(1.8, 10, 10)
const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

const THREAD = '#ff4136'

interface Props {
  unit: Unit
  /** Set of lit ids, or null when nothing is selected. */
  activeSet: Set<string> | null
}

export function Household({ unit, activeSet }: Props) {
  const pos = positions.get(unit.id)!
  const color = yearColor(unit.year)
  const ring = useRef<THREE.Group>(null!)
  const hovered = useTree((s) => s.hovered?.kind === 'unit' && s.hovered.id === unit.id)
  const selected = useTree((s) => s.selected?.kind === 'unit' && s.selected.id === unit.id)
  const hover = useTree((s) => s.hover)
  const select = useTree((s) => s.select)

  const lit = !activeSet || activeSet.has(unit.id)
  const glow = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4), transparent: true, toneMapped: false }),
    [color],
  )
  const phase = useMemo(() => pos[0] * 0.37 + pos[1] * 0.11, [pos])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const k = 1 - Math.exp(-dt * 6)
    ring.current.rotation.y = t * 0.5 + phase
    ring.current.rotation.x = Math.sin(t * 0.4 + phase) * 0.4
    const s = hovered || selected ? 1.35 : 1
    ring.current.scale.setScalar(ring.current.scale.x + (s - ring.current.scale.x) * k)
    glow.opacity += ((lit ? 0.95 : 0.1) - glow.opacity) * k
  })

  return (
    <group>
      <group
        position={pos}
        onPointerOver={(e) => {
          e.stopPropagation()
          hover({ kind: 'unit', id: unit.id })
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hover(null)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          select({ kind: 'unit', id: unit.id })
        }}
      >
        <group ref={ring}>
          <mesh geometry={ringGeometry} material={glow} />
          <mesh geometry={innerRingGeometry} material={glow} rotation={[Math.PI / 2, 0, 0]} />
        </group>
        <mesh geometry={coreGeometry} material={glow} />
        <mesh geometry={hitGeometry} material={hitMaterial} />
        {hovered && !selected && (
          <Billboard>
            <Html center position={[0, 2.6, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
              <div className="hub-tip" style={{ ['--c' as string]: color }}>
                <strong>{unitTitle(unit)}</strong>
                <span>
                  {unit.parents.map((id) => personById.get(id)?.name).join(' · ')}
                </span>
                <em>Click to visit</em>
              </div>
            </Html>
          </Billboard>
        )}
      </group>

      {unit.parents.map((id) => (
        <Thread key={`p-${id}`} from={pos} to={positions.get(id)} color={color} lit={lit && (!activeSet || activeSet.has(id))} width={1.6} />
      ))}
      {unit.children.map((id) => (
        <Thread key={`c-${id}`} from={pos} to={positions.get(id)} color={THREAD} lit={lit && (!activeSet || activeSet.has(id))} width={1.3} sag />
      ))}
    </group>
  )
}

function Thread({ from, to, color, lit, width, sag }: { from: Vec3; to?: Vec3; color: string; lit: boolean; width: number; sag?: boolean }) {
  const ref = useRef<any>(null)
  const mid = useMemo<Vec3 | null>(() => {
    if (!to) return null
    return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 2.2, (from[2] + to[2]) / 2]
  }, [from, to])

  useFrame((_, dt) => {
    const m = ref.current?.material
    if (!m) return
    m.opacity += ((lit ? 0.85 : 0.06) - m.opacity) * (1 - Math.exp(-dt * 6))
  })

  if (!to) return null
  const c = new THREE.Color(color).multiplyScalar(1.6)
  return sag ? (
    <QuadraticBezierLine ref={ref} start={from} end={to} mid={mid!} color={c} lineWidth={width} transparent opacity={0.85} toneMapped={false} />
  ) : (
    <Line ref={ref} points={[from, to]} color={c} lineWidth={width} transparent opacity={0.85} toneMapped={false} />
  )
}
