"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function BlackholePage() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    // Add a subtle fog to blend the edges of the universe
    scene.fog = new THREE.FogExp2(0x050505, 0.04);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Create a circular texture for particles so they aren't squares
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    // Create the Black Hole Accretion Disk (Spiral)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 25000; // Much denser
    
    const posArray = new Float32Array(particlesCount * 3);
    const colorsArray = new Float32Array(particlesCount * 3);
    
    const parameters = {
      radius: 12,
      spin: 3,
      randomness: 0.5,
      randomnessPower: 3,
      insideColor: '#ffaa00',
      outsideColor: '#4400ff'
    };

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for(let i = 0; i < particlesCount; i++) {
      const i3 = i * 3;
      
      // Radius from center (avoiding the event horizon)
      const radius = 2.2 + Math.random() * parameters.radius;
      
      // Spin angle
      const spinAngle = radius * parameters.spin;
      // Branch angle (we will have 3 main spiral arms)
      const branchAngle = ((i % 3) / 3) * Math.PI * 2;
      
      // Randomness spread
      const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
      const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.2; // flatter Y
      const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

      posArray[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      posArray[i3+1] = randomY;
      posArray[i3+2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
      
      // Color blending (Orange/White inside -> Deep Blue/Purple outside)
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, (radius - 2.2) / parameters.radius);
      
      colorsArray[i3] = mixedColor.r;
      colorsArray[i3+1] = mixedColor.g;
      colorsArray[i3+2] = mixedColor.b;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false, // Prevents clipping artifacts
      map: particleTexture
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    
    // Tilt the entire disk for a dramatic angle
    particlesMesh.rotation.x = Math.PI * 0.35;
    scene.add(particlesMesh);

    // Event Horizon (Absolute Black center)
    const sphereGeometry = new THREE.SphereGeometry(2.0, 64, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackhole = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(blackhole);

    // Glowing Aura behind the Event Horizon
    const auraGeometry = new THREE.PlaneGeometry(8, 8);
    const auraMaterial = new THREE.MeshBasicMaterial({
      map: particleTexture,
      color: 0x4400ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.position.z = -0.1; // Just behind the black hole sphere
    scene.add(aura);

    camera.position.z = 10;
    camera.position.y = 3;
    camera.lookAt(0,0,0);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Scroll Interaction
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // Tilt the disk more as we scroll down
      particlesMesh.rotation.x = Math.PI * 0.35 - (scrollY * 0.0005);
      
      // Zoom in slightly
      camera.position.z = 10 - (scrollY * 0.001);
      
      // Shift colors globally on scroll
      const hueShift = (scrollY * 0.05);
      particlesMaterial.color.setHSL(hueShift / 360, 1, 0.5);
      auraMaterial.color.setHSL((260 + hueShift) / 360, 1, 0.5);
    };
    window.addEventListener('scroll', handleScroll);

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Spin the accretion disk
      particlesMesh.rotation.z = -elapsedTime * 0.15;
      
      // Gently pulse the aura
      const scale = 1.0 + Math.sin(elapsedTime * 2) * 0.05;
      aura.scale.set(scale, scale, 1);

      // Mouse parallax (gentle camera movement)
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 2 + 3 - camera.position.y) * 0.02;
      camera.lookAt(0,0,0);
      
      // Make aura always face camera
      aura.quaternion.copy(camera.quaternion);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ backgroundColor: '#050505', color: '#fff', minHeight: '300vh', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      {/* 3D Canvas Background */}
      <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} />

      {/* Navigation */}
      <nav style={{ position: 'fixed', top: 0, width: '100%', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.05em' }}>Reflect</div>
        <div style={{ display: 'flex', gap: '30px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 30px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <a href="#" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>Product</a>
          <a href="#" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>Pricing</a>
          <a href="#" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>Company</a>
        </div>
        <button style={{ backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
      </nav>

      {/* Hero Section */}
      <main style={{ position: 'relative', zIndex: 1, paddingTop: '25vh', paddingLeft: '10vw', maxWidth: '800px', pointerEvents: 'none' }}>
        <h1 style={{ fontSize: '5.5rem', fontWeight: 800, lineHeight: 1.05, marginBottom: '24px', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Think better<br />with Reflect.
        </h1>
        <p style={{ fontSize: '1.4rem', color: '#a0a0a0', marginBottom: '40px', lineHeight: 1.5, maxWidth: '600px', fontWeight: 400 }}>
          Never miss a note, idea or connection. A beautiful, high-performance workspace for your mind.
        </p>
        <button style={{ backgroundColor: '#fff', color: '#000', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', pointerEvents: 'auto', transition: 'all 0.2s', boxShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
          Get Started For Free
        </button>
      </main>

      {/* Glassmorphic Dashboard Mockup */}
      <div style={{ position: 'relative', zIndex: 1, margin: '25vh auto 15vh auto', width: '85%', height: '65vh', background: 'rgba(10, 10, 10, 0.4)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        {/* Mockup Top Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
        </div>
        
        {/* Mockup Content area */}
        <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: '240px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ width: '100%', height: '28px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', marginBottom: '24px' }} />
            <div style={{ width: '70%', height: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginBottom: '16px' }} />
            <div style={{ width: '85%', height: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginBottom: '16px' }} />
            <div style={{ width: '60%', height: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
          </div>
          
          {/* Main Editor */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '40px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ width: '120px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '40px' }} />
            <h2 style={{ fontSize: '2.5rem', marginBottom: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>Daily Notes</h2>
            <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '16px' }} />
            <div style={{ width: '90%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '16px' }} />
            <div style={{ width: '95%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
