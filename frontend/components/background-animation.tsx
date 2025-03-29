'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

export const BackgroundAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentRef = containerRef.current; // Store ref value inside effect
    if (!currentRef) return;

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.FogExp2(0x000000, 0.001)

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 50

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    currentRef.appendChild(renderer.domElement)

    const stars: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>[] = []
    const numStars = 600

    // Create stars
    for (let i = 0; i < numStars; i++) {
      const geometry = new THREE.SphereGeometry(0.2, 8, 8)
      const material = new THREE.MeshPhongMaterial({
        color: 0x40E0D0,
        emissive: 0x40E0D0,
        emissiveIntensity: Math.random() * 1.5 + 1.0,
        shininess: 150,
        transparent: true,
        opacity: Math.random() * 0.1 + 0.9
      })

      const star = new THREE.Mesh(geometry, material)
      
      // Random position in sphere
      const radius = 100
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)
      
      star.position.x = radius * Math.sin(phi) * Math.cos(theta)
      star.position.y = radius * Math.sin(phi) * Math.sin(theta)
      star.position.z = radius * Math.cos(phi)
      
      star.scale.setScalar(Math.random() * 1.0 + 1.0)
      scene.add(star)
      stars.push(star)
    }

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)

    // Add point lights
    const pointLight1 = new THREE.PointLight(0x60a5fa, 3, 100)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x60a5fa, 3, 100)
    pointLight2.position.set(-10, -10, -10)
    scene.add(pointLight2)

    let time = 0
    function animate() {
      requestAnimationFrame(animate)
      time += 0.01

      // Rotate the entire scene
      scene.rotation.y += 0.00018 // Reduced to 30% of previous speed
      
      // Animate stars
      stars.forEach((star, i) => {
        const phase = time + i * 0.1
        star.material.emissiveIntensity = 1.0 + Math.sin(phase) * 0.8
        star.material.opacity = 0.95 + Math.sin(phase) * 0.05
      })

      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!currentRef) return; // Use stored value
      camera.aspect = currentRef.clientWidth / currentRef.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(currentRef.clientWidth, currentRef.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (currentRef && renderer.domElement) { // Use stored value
        currentRef.removeChild(renderer.domElement)
      }
      // Dispose Three.js objects
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      renderer.dispose()
    }
  }, []) // Keep dependency array empty as the effect should run only once on mount

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: -1, 
        overflow: 'hidden' 
      }}
    />
  )
}