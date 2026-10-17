import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Person } from '../data/family'
import { lanternScale, type Vec3 } from '../data/graph'
import { useTree } from '../state'
import { personPosition } from './morph'

// ── Shared resources (built once for every node) ────────────────────────────
// A glowing orb that only hints at a lantern: faint ribs and two thin gold rings.
const POLE = 0.88
const STRETCH = 1.08
const bodyGeometry = (() => {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 32; i++) {
    const y = -POLE + (2 * POLE * i) / 32
    pts.push(new THREE.Vector2(Math.sqrt(1 - y * y), y * STRETCH))
  }
  return new THREE.LatheGeometry(pts, 40)
})()

const RING_R = Math.sqrt(1 - POLE * POLE)
const ringGeometry = new THREE.TorusGeometry(RING_R, 0.06, 8, 32)
const haloGeometry = new THREE.TorusGeometry(1.45, 0.03, 8, 64)
const hitGeometry = new THREE.SphereGeometry(1.3, 8, 8)

const paperTexture = (() => {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#b0604a')
  grad.addColorStop(0.5, '#ffffff')
  grad.addColorStop(1, '#b0604a')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 128)
  g.fillStyle = 'rgba(60,10,6,0.18)'
  for (let i = 0; i < 8; i++) g.fillRect((i * 256) / 8, 0, 2, 128)
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
  /** Family-tree position (the front face). */
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
        color: ph ? '#4a4150' : '#e0452c',
        emissive: ph ? '#7a5a4a' : core ? '#ff7a2e' : '#ff4f24',
        emissiveIntensity: ph ? 0.25 : 1.6,
        roughness: 0.85,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [ph, core],
  )
  const gold = useMemo(() => goldMaterial.clone(), [])

  const baseScale = lanternScale(person.id)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const k = 1 - Math.exp(-dt * 6)
    personPosition(person.id, group.current.position)
    body.current.position.y = Math.sin(t * 0.8 + phase) * 0.08
    body.current.rotation.y = t * 0.15 + phase

    const lit = active !== false
    const boost = hovered || selected ? 1.6 : 1
    const targetGlow = (ph ? 0.25 : 1.6) * (lit ? boost : 0.12) * (0.92 + 0.08 * Math.sin(t * 3 + phase))
    const targetOpacity = (lit ? (ph ? 0.6 : 1) : 0.14)
    paper.emissiveIntensity += (targetGlow - paper.emissiveIntensity) * k
    paper.opacity += (targetOpacity - paper.opacity) * k
    gold.opacity = paper.opacity
    const s = baseScale * (hovered || selected ? 1.18 : 1)
    group.current.scale.setScalar(group.current.scale.x + (s - group.current.scale.x) * k)
    if (label.current) {
      const lo = (lit ? (ph ? 0.5 : 1) : 0.05)
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
        <mesh geometry={ringGeometry} material={gold} position={[0, POLE * STRETCH, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={ringGeometry} material={gold} position={[0, -POLE * STRETCH, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {core && <CoreHalo active={active !== false} />}
        <mesh geometry={hitGeometry} material={hitMaterial} />
      </group>
      <Suspense fallback={null}>
        <Billboard position={[0, -1.6, 0]}>
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
