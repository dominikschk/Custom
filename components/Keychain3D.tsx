
import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Center, ContactShadows, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { LogoConfig } from '../types';

interface Keychain3DProps {
  logoConfig: LogoConfig;
  detectedColors?: string[];
}

export interface Viewer3DHandle {
  downloadSTL: () => void;
  setCameraView: (view: 'top' | 'front' | 'side' | 'back') => void;
}

const ExtrudedLogo: React.FC<{ logoConfig: LogoConfig }> = ({ logoConfig }) => {
  const texture = useLoader(THREE.TextureLoader, logoConfig.url || '');
  
  // 5mm Extrusion mit hoher Layer-Dichte für absolut gerade Linien
  const layers = 80; 
  const extrusionHeight = 5.0; 
  
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const layerOffsets = useMemo(() => {
    return Array.from({ length: layers }, (_, i) => (i * extrusionHeight) / layers);
  }, [layers, extrusionHeight]);

  return (
    <group position={[logoConfig.x, logoConfig.y, 3.01]} rotation={[0, 0, logoConfig.rotation]}>
      {layerOffsets.map((zOffset, index) => (
        <mesh key={index} position={[0, 0, zOffset]} castShadow={index === layers - 1}>
          <planeGeometry args={[logoConfig.scale, logoConfig.scale]} />
          <meshPhysicalMaterial 
            map={texture}
            transparent={true}
            alphaTest={0.6} // Schärfster Alpha-Cut für "Straight Lines"
            side={THREE.DoubleSide}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      ))}
      {/* 3D Text Support */}
      {logoConfig.text && (
        <Text
          position={[logoConfig.textX || 0, logoConfig.textY || -20, extrusionHeight + 0.1]}
          fontSize={logoConfig.textScale || 4}
          color={logoConfig.customPalette?.[0] || "#ffffff"}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKbxmcZpY.woff"
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
    const size = 50; 
    const half = size / 2;
    const cornerRadius = 8;
    const eyeletRadius = 6;
    const eyeX = -half + 2;
    const eyeY = half - 2;

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
    hole.absarc(eyeX, eyeY, 4, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return s;
  }, []);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={ref} castShadow receiveShadow>
          <extrudeGeometry args={[shape, { depth: 3, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5 }]} />
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.2} metalness={0.7} />
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
            link.download = 'nudim3d_config.stl';
            link.click();
        },
        setCameraView: (view) => {
            if (!controlsRef.current) return;
            const cam = controlsRef.current.object;
            switch(view) {
                case 'top': cam.position.set(0, 80, 0); break;
                case 'front': cam.position.set(0, 0, 80); break;
                case 'side': cam.position.set(80, 0, 0); break;
                case 'back': cam.position.set(0, 0, -80); break;
            }
            controlsRef.current.update();
        }
    }));

  return (
    <div className="w-full h-full relative bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-shop">
      <Canvas shadows camera={{ position: [0, 40, 70], fov: 35 }}>
        <OrbitControls 
            ref={controlsRef} 
            makeDefault 
            minDistance={30} 
            maxDistance={120} 
            maxPolarAngle={Math.PI / 1.8} 
            enablePan={false} 
        />
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <spotLight position={[50, 50, 50]} angle={0.15} intensity={2000} castShadow color="#ffffff" />
        <Center top>
             <KeychainGeometry ref={meshRef} logoConfig={logoConfig} />
        </Center>
        <ContactShadows position={[0, -0.01, 0]} opacity={0.3} scale={80} blur={2.5} far={10} />
      </Canvas>
    </div>
  );
});
