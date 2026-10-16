import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Person } from '../data/family'
import type { Vec3 } from '../data/graph'
import { useTree } from '../state'

// ── Shared resources (built once for every lantern) ─────────────────────────
const bodyGeometry = (() => {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 24; i++) {
    const y = -1 + (2 * i) / 24
    pts.push(new THREE.Vector2(0.42 + 0.66 * Math.cos((y * Math.PI) / 2), y * 1.05))
  }
  return new THREE.LatheGeometry(pts, 28)
})()

const capGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.18, 20)
const tasselGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6)
const beadGeometry = new THREE.SphereGeometry(0.1, 10, 10)
const haloGeometry = new THREE.TorusGeometry(1.75, 0.035, 8, 64)
const hitGeometry = new THREE.SphereGeometry(1.5, 8, 8)

const paperTexture = (() => {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#5a1d12')
  grad.addColorStop(0.5, '#ffffff')
  grad.addColorStop(1, '#5a1d12')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 128)
  g.fillStyle = 'rgba(40,6,4,0.55)'
  for (let i = 0; i < 12; i++) g.fillRect((i * 256) / 12, 0, 3, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()

const goldMaterial = new THREE.MeshStandardMaterial({
  color: '#f2b544',
  emissive: '#b8741a',
  emissiveIntensity: 0.6,
  metalness: 0.7,
  roughness: 0.35,
  transparent: true,
})

const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

export const FONT = '/fonts/label.woff'

interface Props {
  person: Person
  position: Vec3
  core: boolean
  /** null = nothing selected, so everyone is lit. */
  active: boolean | null
}

export function Lantern({ person, position, core, active }: Props) {
  const group = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const label = useRef<any>(null)
  const hovered = useTree((s) => s.hovered?.kind === 'person' && s.hovered.id === person.id)
  const selected = useTree((s) => s.selected?.kind === 'person' && s.selected.id === person.id)
  const hover = useTree((s) => s.hover)
  const select = useTree((s) => s.select)

  const ph = !!person.placeholder
  const phase = useMemo(() => (position[0] * 13.7 + position[2] * 7.1) % (Math.PI * 2), [position])

  const paper = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: paperTexture,
        emissiveMap: paperTexture,
        color: ph ? '#4a4150' : '#d3301f',
        emissive: ph ? '#7a5a4a' : core ? '#ff7a2e' : '#ff4f24',
        emissiveIntensity: ph ? 0.25 : 1.6,
        roughness: 0.85,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [ph, core],
  )
  const gold = useMemo(() => goldMaterial.clone(), [])

  const baseScale = core ? 1.55 : ph ? 1 : 1.25

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const k = 1 - Math.exp(-dt * 6)
    body.current.position.y = Math.sin(t * 0.8 + phase) * 0.25
    body.current.rotation.z = Math.sin(t * 0.6 + phase) * 0.05

    const lit = active !== false
    const boost = hovered || selected ? 1.6 : 1
    const targetGlow = (ph ? 0.25 : 1.6) * (lit ? boost : 0.12) * (0.92 + 0.08 * Math.sin(t * 3 + phase))
    const targetOpacity = lit ? (ph ? 0.6 : 1) : 0.14
    paper.emissiveIntensity += (targetGlow - paper.emissiveIntensity) * k
    paper.opacity += (targetOpacity - paper.opacity) * k
    gold.opacity = paper.opacity
    const s = baseScale * (hovered || selected ? 1.18 : 1)
    group.current.scale.setScalar(group.current.scale.x + (s - group.current.scale.x) * k)
    if (label.current) {
      const lo = lit ? (ph ? 0.5 : 1) : 0.05
      label.current.fillOpacity += (lo - label.current.fillOpacity) * k
      label.current.outlineOpacity = label.current.fillOpacity
    }
  })

  return (
    <group ref={group} position={position}>
      <group
        ref={body}
        onPointerOver={(e) => {
          e.stopPropagation()
          hover({ kind: 'person', id: person.id })
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hover(null)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          select({ kind: 'person', id: person.id })
        }}
      >
        <mesh geometry={bodyGeometry} material={paper} />
        <mesh geometry={capGeometry} material={gold} position={[0, 1.12, 0]} />
        <mesh geometry={capGeometry} material={gold} position={[0, -1.12, 0]} />
        <mesh geometry={tasselGeometry} material={gold} position={[0, -1.65, 0]} />
        <mesh geometry={beadGeometry} material={gold} position={[0, -2.12, 0]} />
        {core && <CoreHalo active={active !== false} />}
        <mesh geometry={hitGeometry} material={hitMaterial} />
      </group>
      <Suspense fallback={null}>
        <Billboard position={[0, -2.6, 0]}>
          <Text
            ref={label}
            font={FONT}
            fontSize={1.2}
            anchorY="top"
            color={ph ? '#c9b8a6' : '#ffe8c4'}
            outlineWidth={0.07}
            outlineColor="#140507"
            fillOpacity={1}
          >
            {person.name}
          </Text>
        </Billboard>
      </Suspense>
    </group>
  )
}

function CoreHalo({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null!)
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc65a').multiplyScalar(2.2), transparent: true, toneMapped: false }),
    [],
  )
  useFrame(({ clock }, dt) => {
    ref.current.rotation.x = Math.PI / 2 + Math.sin(clock.elapsedTime * 0.5) * 0.25
    ref.current.rotation.z += dt * 0.4
    mat.opacity += ((active ? 0.85 : 0.08) - mat.opacity) * (1 - Math.exp(-dt * 6))
  })
  return <mesh ref={ref} geometry={haloGeometry} material={mat} />
}
