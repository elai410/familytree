import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'

/** Night-sky gradient dome. */
function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color('#03030f') },
          mid: { value: new THREE.Color('#0d0a2a') },
          bottom: { value: new THREE.Color('#2a0d24') },
        },
        vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vPos;
          void main(){ float h = vPos.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, bottom, smoothstep(0.0, -0.6, h));
          gl_FragColor = vec4(c, 1.0); }`,
      }),
    [],
  )
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[900, 32, 16]} />
    </mesh>
  )
}

const SKY_COUNT = 160

/** Distant paper lanterns drifting upward. */
function SkyLanterns({ radius }: { radius: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const seeds = useMemo(
    () =>
      Array.from({ length: SKY_COUNT }, (_, i) => {
        const r = radius * (3.4 + ((i * 97) % 120) / 40)
        const theta = i * 2.39996
        return {
          x: Math.cos(theta) * r,
          z: Math.sin(theta) * r,
          y: radius * (-3 + ((i * 53) % 240) / 40),
          speed: 1 + ((i * 31) % 10) / 6,
          scale: 0.9 + ((i * 17) % 10) / 7,
          phase: i,
        }
      }),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const geometry = useMemo(() => new THREE.CapsuleGeometry(0.7, 0.9, 4, 10), [])
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a3d').multiplyScalar(1.8), toneMapped: false, transparent: true, opacity: 0.85 }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      s.y += s.speed * dt
      if (s.y > radius * 3.2) s.y = -radius * 3.2
      dummy.position.set(s.x + Math.sin(t * 0.2 + s.phase) * 3, s.y, s.z + Math.cos(t * 0.15 + s.phase) * 3)
      dummy.scale.setScalar(s.scale)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geometry, material, SKY_COUNT]} frustumCulled={false} />
}

export function Ambient({ radius }: { radius: number }) {
  return (
    <>
      <Sky />
      <Stars radius={400} depth={80} count={4000} factor={5} saturation={0.4} fade speed={0.6} />
      <SkyLanterns radius={radius} />
      <Sparkles count={160} scale={radius * 2.6} size={3} speed={0.35} opacity={0.7} color="#ffb871" />
      <ambientLight intensity={0.35} color="#8a7cff" />
      <pointLight position={[0, 0, 0]} intensity={400} distance={radius * 3} color="#ff9a52" />
    </>
  )
}
