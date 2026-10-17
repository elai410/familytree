import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Unit } from '../data/family'
import { connectorOf, kidThreadOf, personById, positions, unitTitle, yearColor, type Vec3 } from '../data/graph'
import { homeVisibility } from './morph'
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
  const members = useMemo(() => [...unit.parents, ...unit.children], [unit])
  const connector = useMemo(() => connectorOf(unit), [unit])
  const glow = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4), transparent: true, toneMapped: false }),
    [color],
  )
  const phase = useMemo(() => pos[0] * 0.37 + pos[1] * 0.11, [pos])

  const root = useRef<THREE.Group>(null!)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const k = 1 - Math.exp(-dt * 6)
    ring.current.rotation.y = t * 0.5 + phase
    ring.current.rotation.x = Math.sin(t * 0.4 + phase) * 0.4
    const s = hovered || selected ? 1.35 : 1
    ring.current.scale.setScalar(ring.current.scale.x + (s - ring.current.scale.x) * k)
    const vis = homeVisibility(members)
    // Hidden entirely once you've turned away, so it can't catch clicks meant for the back face.
    root.current.visible = vis > 0.02
    glow.opacity += ((lit ? 0.95 : 0.1) * vis - glow.opacity) * k
  })

  return (
    <group ref={root}>
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

      {connector && connector.line.length > 1 && <Thread points={connector.line} ids={unit.parents} color={color} lit={lit} width={2.2} />}
      {connector?.stem && <Thread points={connector.stem} ids={unit.parents} color={color} lit={lit} width={1.8} />}
      {unit.children.map((id) => (
        <KidThread key={`c-${id}`} unit={unit} kid={id} lit={lit && (!activeSet || activeSet.has(id))} />
      ))}
    </group>
  )
}

function KidThread({ unit, kid, lit }: { unit: Unit; kid: string; lit: boolean }) {
  const points = useMemo(() => kidThreadOf(unit, kid), [unit, kid])
  const ids = useMemo(() => [...unit.parents, kid], [unit, kid])
  return points ? <Thread points={points} ids={ids} color={THREAD} lit={lit} width={1.3} /> : null
}

function Thread({ points, ids, color, lit, width }: { points: Vec3[]; ids: string[]; color: string; lit: boolean; width: number }) {
  const ref = useRef<any>(null)
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(1.6), [color])

  useFrame((_, dt) => {
    const m = ref.current?.material
    if (!m) return
    const target = (lit ? 0.85 : 0.06) * homeVisibility(ids)
    m.opacity += (target - m.opacity) * (1 - Math.exp(-dt * 6))
  })

  return <Line ref={ref} points={points} color={c} lineWidth={width} transparent opacity={0.85} toneMapped={false} />
}
