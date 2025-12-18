import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useLoader, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Center, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore - Import path is correct for Vite but TS sometimes struggles with Three.js examples
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { LogoConfig } from '../types';

// Fix: Correctly extending the global JSX namespace to recognize React Three Fiber's intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface Keychain3DProps {
  logoConfig: LogoConfig;
  detectedColors?: string[];
}

export interface Viewer3DHandle {
  downloadSTL: () => void;
}

const ExtrudedLogo: React.FC<{ logoConfig: LogoConfig }> = ({ logoConfig }) => {
  const texture = useLoader(THREE.TextureLoader, logoConfig.url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  const layers = 20;
  const extrusionHeight = 1.0; 
  
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace; 

  const layerOffsets = useMemo(() => {
    return Array.from({ length: layers }, (_, i) => (i * extrusionHeight) / layers);
  }, [layers, extrusionHeight]);

  return (
    // Fix: JSX tags like group and mesh are now recognized through the extended IntrinsicElements
    <group 
      position={[logoConfig.x, logoConfig.y, 3.01]} 
      rotation={[0, 0, logoConfig.rotation]}
    >
      {layerOffsets.map((zOffset, index) => (
        <mesh 
          key={index} 
          position={[0, 0, zOffset]}
          castShadow={index > layers - 5}
          receiveShadow
        >
          <planeGeometry args={[logoConfig.scale, logoConfig.scale]} />
          <meshPhysicalMaterial 
            map={texture}
            transparent={true}
            alphaTest={0.15}
            side={THREE.DoubleSide}
            roughness={0.8}
            metalness={0.0}
            color={index < layers - 1 ? "#e2e8f0" : "#ffffff"} 
          />
        </mesh>
      ))}
    </group>
  );
};

const KeychainGeometry = forwardRef<THREE.Mesh, { logoConfig: LogoConfig }>(({ logoConfig }, ref) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const size = 40;
    const half = size / 2;
    const cornerRadius = 4;
    const eyeletOuterRadius = 9;
    const eyeletInnerRadius = 5;
    const eyeX = -half;
    const eyeY = half;

    s.moveTo(-half, eyeY - eyeletOuterRadius); 
    s.lineTo(-half, -half + cornerRadius);
    s.quadraticCurveTo(-half, -half, -half + cornerRadius, -half);
    s.lineTo(half - cornerRadius, -half);
    s.quadraticCurveTo(half, -half, half, -half + cornerRadius);
    s.lineTo(half, half - cornerRadius);
    s.quadraticCurveTo(half, half, half - cornerRadius, half);
    s.lineTo(eyeX + eyeletOuterRadius, half);
    s.absarc(eyeX, eyeY, eyeletOuterRadius, 0, Math.PI * 1.5, false);

    const holePath = new THREE.Path();
    holePath.absarc(eyeX, eyeY, eyeletInnerRadius, 0, Math.PI * 2, false);
    s.holes.push(holePath);

    return s;
  }, []);

  const extrudeSettings = {
    depth: 3, 
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 2,
    bevelSize: 0.8,
    bevelThickness: 0.8,
  };

  return (
    // Fix: Geometry-specific tags like extrudeGeometry are handled via the extended JSX namespace
    <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={ref} castShadow receiveShadow>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshPhysicalMaterial 
            color="#f8fafc" 
            roughness={0.25} 
            metalness={0.1}
            clearcoat={0.3}
            clearcoatRoughness={0.2}
          />
        </mesh>
        {logoConfig.url && <ExtrudedLogo logoConfig={logoConfig} />}
    </group>
  );
});

export const Viewer3D = forwardRef<Viewer3DHandle, Keychain3DProps>(({ logoConfig, detectedColors }, ref) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useImperativeHandle(ref, () => ({
        downloadSTL: () => {
            if (!meshRef.current) return;
            const exporter = new STLExporter();
            const stlString = exporter.parse(meshRef.current, { binary: true });
            const blob = new Blob([stlString], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'printforge_keychain_base.stl';
            link.click();
        }
    }));

  return (
    <div className="w-full h-[350px] md:h-[400px] relative rounded-2xl overflow-hidden shadow-float border border-slate-200">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
            <span className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 border border-slate-200 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Live Preview
            </span>
            <span className="bg-blue-600/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-white border border-blue-500 shadow-sm flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                Solid Body Extrusion
            </span>
        </div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-200 to-slate-300 -z-10" />
      <Canvas shadows camera={{ position: [0, 25, 45], fov: 35 }}>
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} enablePan={false} enableZoom={false} dampingFactor={0.05} />
        <Environment preset="city">
             <Lightformer intensity={0.5} position={[10, 5, 0]} scale={[10, 50, 1]} onUpdate={(self) => self.lookAt(0, 0, 0)} />
        </Environment>
        {/* Fix: Ambient, spot, and point lights are standard R3F components */}
        <ambientLight intensity={0.6} />
        <spotLight position={[10, 30, 20]} angle={0.25} penumbra={1} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-10, 0, -10]} intensity={0.5} color="#3b82f6" />
        <Center top>
             <KeychainGeometry ref={meshRef} logoConfig={logoConfig} />
        </Center>
        <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={40} blur={2.5} far={4} color="#334155" />
      </Canvas>
    </div>
  );
});