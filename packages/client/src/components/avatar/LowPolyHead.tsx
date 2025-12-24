import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LowPolyHeadProps } from './types';

/**
 * Low-poly head component with placeholder geometry.
 * Will be replaced with GLB model once created in Blender.
 *
 * The placeholder uses an icosahedron to simulate the low-poly aesthetic
 * and includes mouth animation via scale.y as a temporary substitute
 * for morph targets.
 */
export function LowPolyHead({ amplitudeRef }: LowPolyHeadProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const t = state.clock.elapsedTime;

    // Idle animations
    mesh.scale.y = 1 + Math.sin(t * 0.8) * 0.01; // Breathing
    mesh.rotation.y = Math.sin(t * 0.2) * 0.02; // Subtle sway
    mesh.rotation.x = Math.sin(t * 0.15) * 0.01; // Subtle nod

    // Mouth animation from amplitude (placeholder: scale the mouth mesh)
    if (mouthRef.current) {
      const mouthOpenAmount = amplitudeRef.current;
      mouthRef.current.scale.y = 0.1 + mouthOpenAmount * 0.3;
    }
  });

  return (
    <group ref={meshRef} scale={0.8}>
      {/* Head - low-poly icosahedron */}
      <mesh>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#5a5a5a"
          flatShading={true}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Mouth - placeholder ellipse */}
      <mesh ref={mouthRef} position={[0, -0.3, 0.85]} scale={[1.8, 1, 1]}>
        <sphereGeometry args={[0.15, 8, 4]} />
        <meshStandardMaterial
          color="#2a2a2a"
          flatShading={true}
          metalness={0}
          roughness={1}
        />
      </mesh>

      {/* Eyes - simple spheres */}
      <mesh position={[-0.3, 0.2, 0.75]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial
          color="#e0e0e0"
          flatShading={true}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.3, 0.2, 0.75]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial
          color="#e0e0e0"
          flatShading={true}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
