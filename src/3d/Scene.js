// ─────────────────────────────────────────────────────────────────────────────
// Three.js Scene, Camera, WebGL Renderer & Adaptive Lifecycle Controller
// With strict DPR clamping (<= 2) and automatic background render pause
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export class ThreeSceneManager {
  constructor(canvasId = 'webgl-canvas') {
    this.canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.isTabVisible = true;
    this.isRunning = false;
    this.animationCallbacks = new Set();
    this.resizeCallbacks = new Set();

    if (this.canvas) {
      this.init();
    }
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera (Field of view 45 degrees, matching perspective)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 9.5);

    // 3. Renderer with DPR Clamping (Prevents 4K/Retina GPU overload)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Basic Lighting Setup
    this.setupLighting();

    // 5. Lifecycle & Visibility Listeners
    this.setupEventListeners();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 2.0);
    dirLight1.position.set(5, 8, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffd59e, 1.0);
    dirLight2.position.set(-5, -4, 4);
    this.scene.add(dirLight2);
  }

  setupEventListeners() {
    // Visibility state tracking (pause when tab hidden)
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;
    });

    // WebGL Context Loss & Auto-Recovery (Mobile & GPU pressure protection)
    if (this.canvas) {
      this.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('⚠️ WebGL Context Lost. Pausing render loop...');
        this.stop();
      }, false);

      this.canvas.addEventListener('webglcontextrestored', () => {
        console.log('✨ WebGL Context Restored! Reinitializing shaders and starting scene...');
        this.init();
        this.start();
      }, false);
    }

    // Debounced Resize Observer
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.handleResize(), 100);
    });
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.resizeCallbacks.forEach(cb => cb(width, height));
  }

  onRender(callback) {
    this.animationCallbacks.add(callback);
    return () => this.animationCallbacks.delete(callback);
  }

  onResize(callback) {
    this.resizeCallbacks.add(callback);
    return () => this.resizeCallbacks.delete(callback);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = (time) => {
      if (!this.isRunning) return;
      requestAnimationFrame(loop);

      // Throttling: Skip rendering when tab is in background or mobile
      if (!this.isTabVisible || window.innerWidth <= 768) {
        return;
      }

      this.animationCallbacks.forEach(cb => {
        try {
          cb(time);
        } catch (err) {
          console.warn('Animation frame callback error:', err);
        }
      });

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
  }

  dispose() {
    this.stop();
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
