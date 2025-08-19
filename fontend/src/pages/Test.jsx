import React, { useRef, useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

// Floating Product Component
function FloatingProduct({ position, rotation, scale = 1 }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.02;
      meshRef.current.scale.setScalar(hovered ? scale * 1.1 : scale);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={hovered ? "#333333" : "#ffffff"}
        metalness={0.7}
        roughness={0.2}
      />
    </mesh>
  );
}

// Sphere Component
function FloatingSphere({ position, scale = 1 }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.008;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.03;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[scale, 32, 32]} />
      <meshStandardMaterial 
        color="#ffffff"
        metalness={0.8}
        roughness={0.1}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// Animated Background Geometry
function BackgroundGeometry() {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 20 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 0.5) * 15,
            Math.cos(i * 0.3) * 10,
            -20 + Math.sin(i) * 5
          ]}
        >
          <ringGeometry args={[0.5, 1, 8]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.1}
            wireframe
          />
        </mesh>
      ))}
    </group>
  );
}

// 3D Scene Component
function Scene() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 0, 10);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight
        position={[-10, 10, 10]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        castShadow
      />
      
      <BackgroundGeometry />
      
      <FloatingProduct position={[3, 2, 2]} rotation={[0.5, 0, 0.3]} scale={0.8} />
      <FloatingProduct position={[-4, 1, 1]} rotation={[0.2, 0.8, 0]} scale={1.2} />
      <FloatingProduct position={[2, -2, 3]} rotation={[0, 0.5, 0.2]} scale={0.9} />
      <FloatingProduct position={[-3, -1, 4]} rotation={[0.3, 0, 0.6]} scale={1.1} />
      
      <FloatingSphere position={[6, 3, 0]} scale={0.5} />
      <FloatingSphere position={[-6, -2, 2]} scale={0.7} />
      <FloatingSphere position={[0, 4, 1]} scale={0.4} />
    </>
  );
}

// Particle System
function ParticleField() {
  const particlesRef = useRef();
  const particleCount = 100;
  
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = (Math.random() - 0.5) * 20;
    
    velocities[i] = (Math.random() - 0.5) * 0.02;
    velocities[i + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i + 2] = (Math.random() - 0.5) * 0.02;
  }
  
  useFrame(() => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        if (positions[i] > 10) positions[i] = -10;
        if (positions[i] < -10) positions[i] = 10;
        if (positions[i + 1] > 10) positions[i + 1] = -10;
        if (positions[i + 1] < -10) positions[i + 1] = 10;
        if (positions[i + 2] > 10) positions[i + 2] = -10;
        if (positions[i + 2] < -10) positions[i + 2] = 10;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        color="#ffffff" 
        size={0.05} 
        transparent 
        opacity={0.6}
      />
    </points>
  );
}

export default function Premium3DEcommerceHero() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 75 }}
          gl={{ antialias: true, alpha: true }}
          shadows
        >
          <Suspense fallback={null}>
            <Scene />
            <ParticleField />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 z-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-20 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-30 h-full flex items-center justify-center">
        <div className="text-center px-6 max-w-6xl mx-auto">
          {/* Main Headline */}
          <div className={`transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <h1 className="text-7xl md:text-9xl font-black text-white mb-6 leading-none tracking-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                FUTURE
              </span>
              <br />
              <span className="text-white/90 text-6xl md:text-8xl font-light">
                COMMERCE
              </span>
            </h1>
          </div>
          
          {/* Subtitle */}
          <div className={`transform transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <p className="text-xl md:text-2xl text-white/80 mb-12 font-light leading-relaxed max-w-3xl mx-auto">
              Experience shopping in three dimensions. Where innovation meets elegance, 
              and every product tells a story in space.
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-6 justify-center items-center transform transition-all duration-1000 delay-600 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <button 
              className="group relative bg-white text-black px-12 py-4 text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              style={{
                clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
              }}
            >
              <span className="relative z-10">EXPLORE COLLECTION</span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            
            <button 
              className="group relative border-2 border-white text-white px-12 py-4 text-lg font-semibold hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
              style={{
                clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
              }}
            >
              <span className="relative z-10">WATCH DEMO</span>
            </button>
          </div>
          
          {/* Stats */}
          <div className={`grid grid-cols-3 gap-8 mt-20 transform transition-all duration-1000 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">10K+</div>
              <div className="text-white/60 text-sm uppercase tracking-wider">Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-white/60 text-sm uppercase tracking-wider">Brands</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">1M+</div>
              <div className="text-white/60 text-sm uppercase tracking-wider">Customers</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animated cursor follower */}
      <div 
        className="fixed w-8 h-8 border border-white/30 rounded-full pointer-events-none z-50 transition-all duration-100"
        style={{
          left: `${(mousePosition.x + 1) * 50}%`,
          top: `${(-mousePosition.y + 1) * 50}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className="animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
        <p className="text-white/50 text-xs mt-2 uppercase tracking-wider">Scroll</p>
      </div>
    </div>
  );
}