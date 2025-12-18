
import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, ContactShadows, Environment, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { LogoConfig } from '../types';

interface Keychain3DProps {
  logoConfig: LogoConfig;
}

export interface Viewer3DHandle {
  downloadSTL: () => void;
  setCameraView: (view: 'top' | 'front' | 'side' | 'back') => void;
}

const ExtrudedLogo: React.FC<{ logoConfig: LogoConfig }> = ({ logoConfig }) => {
  const texture = useLoader(THREE.TextureLoader, logoConfig.url || '');
  
  const layers = 100; 
  const extrusionHeight = logoConfig.shape === 'circle' ? 3.0 : 5.0; // Dynamische Höhe als Demo
  
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const layerOffsets = useMemo(() => {
    return Array.from({ length: layers }, (_, i) => (i * extrusionHeight) / layers);
  }, [layers, extrusionHeight]);

  return (
    <group position={[logoConfig.x, logoConfig.y, 3.01]} rotation={[0, 0, (logoConfig.rotation * Math.PI) / 180]}>
      {layerOffsets.map((zOffset, index) => (
        <mesh key={index} position={[0, 0, zOffset]} castShadow={index === layers - 1}>
          <planeGeometry args={[logoConfig.scale, logoConfig.scale]} />
          <meshPhysicalMaterial 
            map={texture}
            transparent={true}
            alphaTest={0.6}
            side={THREE.DoubleSide}
            roughness={0.4}
            metalness={0.2}
            clearcoat={1}
          />
        </mesh>
      ))}
      {logoConfig.text && (
        <Text
          position={[logoConfig.textX || 0, logoConfig.textY || -20, extrusionHeight + 0.5]}
          fontSize={logoConfig.textScale || 4}
          color={logoConfig.customPalette?.[0] || "#ffffff"}
          anchorX="center"
          anchorY="middle"
          font={logoConfig.shape === 'rounded' ? "https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyLdR9mbne3hwajaaY.woff" : "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKbxmcZpY.woff"}
        >
          {logoConfig.text}
        </Text>
      )}
    </group>
  );
};

const KeychainGeometry = forwardRef<THREE.Mesh, { logoConfig: LogoConfig }>(({ logoConfig }, ref) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const size = 52; 
    const half = size / 2;
    const cornerRadius = 10;
    const eyeX = -half + 3;
    const eyeY = half - 3;

    s.moveTo(-half + cornerRadius, eyeY);
    s.lineTo(half - cornerRadius, eyeY);
    s.quadraticCurveTo(half, eyeY, half, eyeY - cornerRadius);
    s.lineTo(half, -half + cornerRadius);
    s.quadraticCurveTo(half, -half, half - cornerRadius, -half);
    s.lineTo(-half + cornerRadius, -half);
    s.quadraticCurveTo(-half, -half, -half, -half + cornerRadius);
    s.lineTo(-half, eyeY - cornerRadius);
    s.quadraticCurveTo(-half, eyeY, -half + cornerRadius, eyeY);

    const hole = new THREE.Path();
    hole.absarc(eyeX, eyeY, 5, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return s;
  }, []);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={ref} castShadow receiveShadow>
          <extrudeGeometry args={[shape, { depth: 3, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8 }]} />
          <meshPhysicalMaterial 
            color={logoConfig.customPalette?.[1] || "#111111"} 
            roughness={0.2} 
            metalness={0.8} 
            clearcoat={1} 
            clearcoatRoughness={0.1}
          />
        </mesh>
        {logoConfig.url && <ExtrudedLogo logoConfig={logoConfig} />}
    </group>
  );
});

export const Viewer3D = forwardRef<Viewer3DHandle, Keychain3DProps>(({ logoConfig }, ref) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const controlsRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        downloadSTL: () => {
            if (!meshRef.current) return;
            const exporter = new STLExporter();
            const stlString = exporter.parse(meshRef.current, { binary: true });
            const blob = new Blob([stlString], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'nudim3d_design.stl';
            link.click();
        },
        setCameraView: (view) => {
            if (!controlsRef.current) return;
            const cam = controlsRef.current.object;
            const controls = controlsRef.current;
            switch(view) {
                case 'top': cam.position.set(0, 100, 0); break;
                case 'front': cam.position.set(0, 0, 100); break;
                case 'side': cam.position.set(100, 0, 0); break;
                case 'back': cam.position.set(0, 0, -100); break;
            }
            controls.target.set(0, 0, 0);
            controls.update();
        }
    }));

  return (
    <div className="w-full h-full relative bg-[#FDFDFD] border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-shop">
      <Canvas shadows camera={{ position: [0, 50, 80], fov: 35 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <OrbitControls 
            ref={controlsRef} 
            makeDefault 
            minDistance={40} 
            maxDistance={140} 
            maxPolarAngle={Math.PI / 1.7} 
            enablePan={false}
            dampingFactor={0.05}
        />
        <Environment preset="apartment" />
        <ambientLight intensity={0.8} />
        <spotLight position={[50, 100, 50]} angle={0.2} intensity={4000} castShadow color="#ffffff" />
        <Center top>
          <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
             <KeychainGeometry ref={meshRef} logoConfig={logoConfig} />
          </Float>
        </Center>
        <ContactShadows position={[0, -0.01, 0]} opacity={0.3} scale={100} blur={2.5} far={20} />
      </Canvas>
    </div>
  );
});
