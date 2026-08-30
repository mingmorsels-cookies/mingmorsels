// ─────────────────────────────────────────────────────────────────────────────
// ThreeController.js - WebGL Scene, Procedural Meshes, Textures & Render Engine
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTimelineController } from './ScrollTimeline.js';

// Prevent pitch-black textures while loading over slow networks
const _originalTexLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
    const texture = new THREE.Texture();
    
    // Start with a 1x1 canvas to prevent the terrifying black void
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#deb887'; // Base cookie dough color
    ctx.fillRect(0, 0, 1, 1);
    texture.image = canvas;
    texture.needsUpdate = true;

    // Load the real image manually
    const loader = new THREE.ImageLoader(this.manager);
    loader.setCrossOrigin(this.crossOrigin);
    loader.setPath(this.path);
    
    loader.load(url, function (image) {
        // Discard the old 1x1 WebGL texture buffer completely!
        texture.dispose(); 
        
        // Swap to the new high-res image
        texture.image = image;
        texture.needsUpdate = true;
        
        if (onLoad) onLoad(texture);
    }, onProgress, onError);

    return texture;
};

export class ThreeController {
  constructor() {
    this.COOKIES = ['almond', 'rose', 'oatsnuts', 'orange', 'walnut', 'walnut_sf'];
    this.MUFFINS = ['strawberry', 'pinacolada', 'butterscotch', 'chocochip', 'blackcurrant'];
    this.ALL_PRODUCTS = [...this.COOKIES, ...this.MUFFINS];

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cookieGroups = {};
    this.particleGroup = null;
    this.bumpTexture = null;

    this.activeDetailSection = null;
    this.currentMouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.cachedScrollY = 0;
    this.cachedViewportHeight = 800;
    this.heroAlmondPos = { x: 2.8, y: 0.0 };
    this.placeholder3DCoords = {};

    this.isTabVisible = true;
    this.animationFrameId = null;
    this.scrollTimeline = null;
  }

  init() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Handle WebGL context loss gracefully
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.warn("WebGL context lost. Falling back to 2D images.");
      document.body.classList.add('no-webgl');
    }, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    mainLight.position.set(5, 5, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.bias = -0.001;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xdbe9ff, 0.8);
    fillLight.position.set(-5, 2, 2);
    this.scene.add(fillLight);

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.bumpTexture = this.createCookieBumpTexture();
    this.update3DCoordinates();
    this.buildCookies();

    this.scrollTimeline = new ScrollTimelineController(this);
    this.scrollTimeline.init();

    this.initMouseTracking();
    this.bindVisibility();
    this.animate();
  }

  createCookieBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 0.9 + Math.random() * 2.2;
      const val = Math.floor(65 + Math.random() * 125);
      ctx.fillStyle = `rgb(${val},${val},${val})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 120; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 10 + Math.random() * 30;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const darkVal = Math.floor(Math.random() * 45);
      grad.addColorStop(0, `rgba(${darkVal},${darkVal},${darkVal},0.3)`);
      grad.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    return texture;
  }

  createCookieTexture(baseColorHex, borderColorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, baseColorHex);
    grad.addColorStop(0.75, baseColorHex);
    grad.addColorStop(0.92, borderColorHex);
    grad.addColorStop(1, '#5c320a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 1 + Math.random() * 3.5;
      const opacity = 0.08 + Math.random() * 0.22;
      ctx.fillStyle = `rgba(52, 26, 2, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 1 + Math.random() * 4;
      const opacity = 0.1 + Math.random() * 0.3;
      ctx.fillStyle = `rgba(30, 15, 0, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add crumbly noise texture
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = Math.random() * 1.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  createBaseCookieMesh(colorTexture) {
    // Use a Sphere instead of a Cylinder to eliminate vertical walls completely
    const geometry = new THREE.SphereGeometry(1, 128, 64);
    
    // Organic craters
    const craters = [
      { cx: 0.35, cz: 0.25, cr: 0.22, cd: 0.08 },
      { cx: -0.42, cz: 0.18, cr: 0.25, cd: 0.09 },
      { cx: -0.15, cz: -0.45, cr: 0.20, cd: 0.07 },
      { cx: 0.48, cz: -0.32, cr: 0.18, cd: 0.06 },
      { cx: 0.05, cz: 0.52, cr: 0.24, cd: 0.08 },
      { cx: -0.55, cz: -0.22, cr: 0.19, cd: 0.07 },
      { cx: 0.22, cz: -0.55, cr: 0.21, cd: 0.08 },
      { cx: -0.28, cz: 0.45, cr: 0.17, cd: 0.06 },
      { cx: 0.58, cz: 0.12, cr: 0.20, cd: 0.07 }
    ];

    const pos = geometry.attributes.position;
    const uvs = geometry.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Planar UV projection (top-down) so the image maps perfectly onto the sphere
      // Radius is 1, so x and z go from -1 to 1. Map this to 0 to 1 for UVs.
      uvs.setXY(i, (x + 1) / 2, 1 - (z + 1) / 2);

      const r = Math.sqrt(x * x + z * z);
      const theta = Math.atan2(z, x);

      // Non-perfect circular shape (organic edges)
      const edgeNoise = Math.sin(theta * 5) * 0.03 + Math.cos(theta * 8) * 0.02 + Math.sin(theta * 13) * 0.015;
      x += x * edgeNoise;
      z += z * edgeNoise;

      if (y > 0) {
        // TOP HALF
        // Flatten the top dome slightly so it's not perfectly spherical
        if (y > 0.4) {
           y = 0.4 + (y - 0.4) * 0.5;
        }

        // Micro-bumps (crumbly texture)
        let bump = Math.sin(x * 15) * Math.cos(z * 15) * 0.04;
        bump += Math.sin(x * 35 + z * 25) * 0.015;
        bump += Math.sin(x * 60 - z * 50) * 0.005;

        // Deep cracks
        let crack = 0;
        const crackPattern = Math.sin(x * 6 + z * 5) * Math.cos(x * 5 - z * 7);
        if (crackPattern > 0.35) {
          crack = -0.18 * Math.pow(crackPattern - 0.35, 1.5);
        }

        // Craters
        let craterDepth = 0;
        for (const c of craters) {
          const dx = x - c.cx;
          const dz = z - c.cz;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < c.cr) {
            const normDist = dist / c.cr;
            const bowl = Math.cos(normDist * Math.PI * 0.5);
            const rim = normDist > 0.7 ? Math.sin((normDist - 0.7) / 0.3 * Math.PI) * 0.03 : 0;
            craterDepth += (-c.cd * bowl * bowl) + rim;
          }
        }
        y += bump + crack + craterDepth;
      } else {
        // BOTTOM HALF
        // Flatten the bottom completely so it sits on the pan
        y = y * 0.2; 
        
        // Flat baking pan texture
        let bottomBump = Math.sin(x * 40) * Math.cos(z * 40) * 0.01;
        y += bottomBump;
      }

      pos.setXYZ(i, x, y, z);
    }
    
    geometry.computeVertexNormals();
    // Squash the sphere into a cookie shape
    geometry.scale(1.2, 0.45, 1.2);

    const material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      bumpMap: this.bumpTexture,
      bumpScale: 0.15, // High bump for realistic crumb
      roughness: 0.85, 
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  createContactShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const shadowGeom = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.16;
    return shadowMesh;
  }

  buildCookies() {
    const cookieTextures = {
      almond: this.createCookieTexture('#e4ba84', '#9e622b'),
      rose: this.createCookieTexture('#f3dcd3', '#b87e6d'),
      oatsnuts: this.createCookieTexture('#c5a375', '#75481b'),
      orange: this.createCookieTexture('#e6ca9c', '#a8753e'),
      walnut: this.createCookieTexture('#dcb285', '#7a451e'),
      walnut_sf: this.createCookieTexture('#cf9d69', '#663613')
    };

    this.ALL_PRODUCTS.forEach(id => {
      const group = new THREE.Group();
      group.add(this.createContactShadow());

      if (this.COOKIES.includes(id)) {
        if (id === 'almond') {
          this.buildAlmondCookieModel(group);
        } else if (id === 'rose') {
          this.buildRoseCookieModel(group);
        } else if (id === 'oatsnuts') {
          this.buildOatsNutsCookieModel(group);
        } else if (id === 'orange') {
          this.buildOrangeCookieModel(group);
        } else if (id === 'walnut' || id === 'walnut_sf') {
          this.buildWalnutCookieModel(id, group);
        } else {
          const baseMesh = this.createBaseCookieMesh(cookieTextures[id]);
          group.add(baseMesh);
        }
      } else {
        this.buildMuffinMesh(id, group);
      }

      if (id === 'almond') {
        group.scale.set(0.95, 0.95, 0.95);
        group.position.set(this.heroAlmondPos.x, this.heroAlmondPos.y, 0.5);
        group.rotation.set(1.1, 0.4, 0.2);
        group.visible = true;
      } else {
        group.scale.set(0.001, 0.001, 0.001);
        group.position.set(0, 0, 0);
      }
      this.scene.add(group);
      this.cookieGroups[id] = group;
    });
  }

  createBakedCrumbTexture(baseColor = '#d9b077', accentColor = '#ad7b3d', poreDarken = 25) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // 1. Natural oven-baked vertical browning gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.0, baseColor);
    grad.addColorStop(0.45, baseColor);
    grad.addColorStop(1.0, accentColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    // 2. High-Frequency Baked Dough Crumb Noise & Micro-Fissures
    const imgData = ctx.getImageData(0, 0, 512, 128);
    const data = imgData.data;

    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 512; x++) {
        const idx = (y * 512 + x) * 4;
        
        // Multi-frequency organic dough grain
        const n1 = Math.sin(x * 0.22) * Math.cos(y * 0.30);
        const n2 = Math.sin(x * 0.07 + y * 0.11) * Math.cos(x * 0.14 - y * 0.05);
        const rand = (Math.random() - 0.5) * 16;
        
        const delta = (n1 * 10 + n2 * 8 + rand);
        data[idx] = Math.max(0, Math.min(255, data[idx] + delta));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + delta * 0.85));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + delta * 0.60));

        // Baked pores & micro-fissures
        if (Math.random() < 0.045) {
          const pDark = poreDarken + Math.random() * 25;
          data[idx] = Math.max(0, data[idx] - pDark);
          data[idx + 1] = Math.max(0, data[idx + 1] - pDark);
          data[idx + 2] = Math.max(0, data[idx + 2] - pDark);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(4, 1);
    tex.needsUpdate = true;
    return tex;
  }

  createArtisanalCookieGeometry({
    radius = 1.04,
    height = 0.32,
    domeHeight = 0.065,
    ovalBulge = 0.09,
    radialSegments = 128,
    heightSegments = 24
  } = {}) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, radialSegments, heightSegments, false);
    const pos = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    const halfH = height / 2;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      const angle = Math.atan2(z, x);

      // Normalized vertical parameter t in [-1, 1]
      const t = Math.max(-1, Math.min(1, y / halfH));

      // 1. Oval Profile Bulge: Parabolic outward expansion at the waist (t=0)
      const sideProfileBulge = 1.0 + ovalBulge * Math.max(0, 1.0 - Math.pow(t, 2));

      // Apply smooth oval curvature and seamless texture mapping to side rim
      if (Math.abs(y) < halfH - 0.005 && r > 0.001) {
        x = Math.cos(angle) * (radius * sideProfileBulge);
        z = Math.sin(angle) * (radius * sideProfileBulge);

        // Seamless cylindrical UV wrap around cookie circumference
        const u = (angle / (Math.PI * 2) + 0.5) * 4.0;
        const v = (t + 1.0) * 0.5;
        uvs.setXY(i, u, v);
      }

      // 2. Continuous Smooth Bevel & Dome on Top Face
      if (y >= halfH - 0.005) {
        // Natural doming curve across the top surface
        const domeNorm = Math.max(0, 1.0 - Math.pow(r / radius, 2.2));
        const dome = domeHeight * domeNorm;

        // Smooth rounding fillet at the outer edge to eliminate sharp corners
        const outerEdgeFactor = Math.max(0, (r - radius * 0.80) / (radius * 0.20));
        const edgeFillet = -0.032 * Math.pow(outerEdgeFactor, 1.8);

        const microNoise = (Math.sin(x * 16 + z * 14) + Math.cos(x * 24 - z * 18)) * 0.005;
        y = halfH + dome + edgeFillet + microNoise;

        // Planar UV projection scaled safely (0.91) to strictly stay within the circular cookie photo area (NO gray/silver background bleeding)
        const u = (x / (radius * 2.0)) * 0.91 + 0.5;
        const v = (-z / (radius * 2.0)) * 0.91 + 0.5;
        uvs.setXY(i, Math.max(0.02, Math.min(0.98, u)), Math.max(0.02, Math.min(0.98, v)));
      } else if (y <= -halfH + 0.005) {
        // 3. Smooth Oven-Rested Base with Soft Rim Transition
        const outerEdgeFactor = Math.max(0, (r - radius * 0.85) / (radius * 0.15));
        const bottomFillet = 0.024 * Math.pow(outerEdgeFactor, 1.8);
        y = -halfH + bottomFillet;

        // Planar UV projection for the bottom face
        const u = (x / (radius * 2.0)) * 0.91 + 0.5;
        const v = (z / (radius * 2.0)) * 0.91 + 0.5;
        uvs.setXY(i, Math.max(0.02, Math.min(0.98, u)), Math.max(0.02, Math.min(0.98, v)));
      }

      pos.setXYZ(i, x, y, z);
    }

    geometry.computeVertexNormals();
    uvs.needsUpdate = true;
    pos.needsUpdate = true;

    return geometry;
  }

  buildAlmondCookieModel(group) {
    const textureLoader = new THREE.TextureLoader();
    const topTex = textureLoader.load('/almond_cookie_top_clean.png');
    const bottomTex = textureLoader.load('/almond_cookie_bottom_clean.png');
    const sideTex = this.createBakedCrumbTexture('#dab47c', '#b08148');

    const geometry = this.createArtisanalCookieGeometry({
      radius: 1.04,
      height: 0.32,
      domeHeight: 0.065,
      ovalBulge: 0.09
    });

    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      bumpMap: sideTex,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.01
    });

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      bumpMap: topTex,
      bumpScale: 0.045,
      roughness: 0.80,
      metalness: 0.02
    });

    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      bumpMap: bottomTex,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.01
    });

    const cookieMesh = new THREE.Mesh(geometry, [sideMat, topMat, bottomMat]);
    cookieMesh.castShadow = true;
    cookieMesh.receiveShadow = true;
    group.add(cookieMesh);
  }

  buildRoseCookieModel(group) {
    const textureLoader = new THREE.TextureLoader();
    const topTex = textureLoader.load('/rose_cookie_top_clean.png');
    const bottomTex = textureLoader.load('/rose_cookie_bottom_clean.png');
    const sideTex = this.createBakedCrumbTexture('#dab47c', '#b08148');

    const geometry = this.createArtisanalCookieGeometry({
      radius: 1.04,
      height: 0.32,
      domeHeight: 0.065,
      ovalBulge: 0.09
    });

    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      bumpMap: sideTex,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.01
    });

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      bumpMap: topTex,
      bumpScale: 0.065,
      roughness: 0.72,
      metalness: 0.02
    });

    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      bumpMap: bottomTex,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.01
    });

    const cookieMesh = new THREE.Mesh(geometry, [sideMat, topMat, bottomMat]);
    cookieMesh.castShadow = true;
    cookieMesh.receiveShadow = true;
    group.add(cookieMesh);

    // Highlighted 3D Rose Petal Relief Folds
    const makePetalGeom = (w, h, curl) => {
      const geom = new THREE.PlaneGeometry(w, h, 6, 6);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, (x * x * 0.4 + y * y * 0.3) * curl + Math.sin(x * 6) * 0.02);
      }
      geom.computeVertexNormals();
      return geom;
    };

    const petalMat1 = new THREE.MeshStandardMaterial({
      color: 0xb5183d,
      roughness: 0.52,
      metalness: 0.04,
      side: THREE.DoubleSide
    });
    const petalMat2 = new THREE.MeshStandardMaterial({
      color: 0x8a0f2c,
      roughness: 0.60,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
    const petalMatLight = new THREE.MeshStandardMaterial({
      color: 0xd42a54,
      roughness: 0.48,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const petalConfigs = [
      { x: -0.22, y: 0.21,  z: 0.20,  w: 0.22, h: 0.26, rx: 0.15, ry: 0.6, rz: 0.2,  curl: 1.2, mat: petalMat1 },
      { x: 0.02,  y: 0.215, z: 0.28,  w: 0.26, h: 0.28, rx: 0.20, ry: 1.4, rz: -0.1, curl: 1.0, mat: petalMatLight },
      { x: 0.28,  y: 0.205, z: 0.12,  w: 0.24, h: 0.30, rx: 0.10, ry: 2.2, rz: 0.25, curl: 1.3, mat: petalMat2 },
      { x: 0.18,  y: 0.20,  z: -0.14, w: 0.22, h: 0.24, rx: -0.1, ry: 0.9, rz: -0.2, curl: 1.1, mat: petalMat1 },
      { x: -0.18, y: 0.205, z: -0.18, w: 0.20, h: 0.22, rx: 0.25, ry: 1.9, rz: 0.15, curl: 1.4, mat: petalMatLight },
      { x: -0.02, y: 0.21,  z: -0.02, w: 0.24, h: 0.28, rx: 0.05, ry: 0.3, rz: -0.15, curl: 0.9, mat: petalMat2 }
    ];

    petalConfigs.forEach(cfg => {
      const pGeom = makePetalGeom(cfg.w, cfg.h, cfg.curl);
      const petalMesh = new THREE.Mesh(pGeom, cfg.mat);
      petalMesh.position.set(cfg.x, cfg.y, cfg.z);
      petalMesh.rotation.set(Math.PI / 2 - 0.1 + cfg.rx, cfg.ry, cfg.rz);
      petalMesh.castShadow = true;
      petalMesh.receiveShadow = true;
      group.add(petalMesh);
    });
  }

  buildOatsNutsCookieModel(group) {
    const textureLoader = new THREE.TextureLoader();
    const topTex = textureLoader.load('/oatsnuts_cookie_top_clean.png');
    const bottomTex = textureLoader.load('/oatsnuts_cookie_bottom_clean.png');
    const sideTex = this.createBakedCrumbTexture('#dab47c', '#b08148');

    const geometry = this.createArtisanalCookieGeometry({
      radius: 1.04,
      height: 0.33,
      domeHeight: 0.070,
      ovalBulge: 0.095
    });

    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      bumpMap: sideTex,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.01
    });

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      bumpMap: topTex,
      bumpScale: 0.075,
      roughness: 0.82,
      metalness: 0.02
    });

    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      bumpMap: bottomTex,
      bumpScale: 0.04,
      roughness: 0.90,
      metalness: 0.01
    });

    const cookieMesh = new THREE.Mesh(geometry, [sideMat, topMat, bottomMat]);
    cookieMesh.castShadow = true;
    cookieMesh.receiveShadow = true;
    group.add(cookieMesh);

    // Hearty 3D Rolled Oat Groats & Roasted Nut Nibs
    const oatGeom = new THREE.BoxGeometry(0.13, 0.02, 0.22);
    const oatPos = oatGeom.attributes.position;
    for (let i = 0; i < oatPos.count; i++) {
      const z = oatPos.getZ(i);
      oatPos.setY(i, oatPos.getY(i) + Math.sin(z * 8) * 0.012);
    }
    oatGeom.computeVertexNormals();

    const oatMat = new THREE.MeshStandardMaterial({
      color: 0xf6ebd4,
      roughness: 0.94,
      metalness: 0.01
    });

    const nutNibGeom = new THREE.DodecahedronGeometry(0.065, 0);
    const roastedNutMat = new THREE.MeshStandardMaterial({
      color: 0x9b5a22,
      roughness: 0.80,
      metalness: 0.03
    });
    const goldenCashewMat = new THREE.MeshStandardMaterial({
      color: 0xe8d098,
      roughness: 0.75,
      metalness: 0.02
    });

    const oatPositions = [
      { x: -0.28, y: 0.215, z: 0.15, rx: 0.1, ry: 0.8, rz: 0.2, s: 1.0 },
      { x: -0.15, y: 0.22,  z: 0.32, rx: 0.2, ry: 2.1, rz: -0.15, s: 1.1 },
      { x: 0.25,  y: 0.215, z: 0.22, rx: -0.1, ry: 1.2, rz: 0.1, s: 0.95 },
      { x: 0.32,  y: 0.21,  z: -0.18, rx: 0.15, ry: 2.8, rz: 0.25, s: 1.05 },
      { x: 0.08,  y: 0.22,  z: -0.30, rx: -0.2, ry: 0.5, rz: -0.1, s: 1.15 },
      { x: -0.30, y: 0.21,  z: -0.20, rx: 0.25, ry: 1.7, rz: 0.3, s: 0.9 }
    ];

    oatPositions.forEach(p => {
      const oat = new THREE.Mesh(oatGeom, oatMat);
      oat.position.set(p.x, p.y, p.z);
      oat.rotation.set(p.rx, p.ry, p.rz);
      oat.scale.setScalar(p.s);
      oat.castShadow = true;
      group.add(oat);
    });

    const nutPositions = [
      { x: -0.12, y: 0.22, z: -0.18, mat: roastedNutMat, s: 0.9 },
      { x: 0.20,  y: 0.215, z: -0.05, mat: goldenCashewMat, s: 1.05 },
      { x: -0.22, y: 0.215, z: 0.02,  mat: roastedNutMat, s: 0.85 },
      { x: 0.15,  y: 0.22, z: 0.30,  mat: goldenCashewMat, s: 1.1 }
    ];

    nutPositions.forEach(p => {
      const nut = new THREE.Mesh(nutNibGeom, p.mat);
      nut.position.set(p.x, p.y, p.z);
      nut.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      nut.scale.setScalar(p.s);
      nut.castShadow = true;
      group.add(nut);
    });
  }

  buildOrangeCookieModel(group) {
    const textureLoader = new THREE.TextureLoader();
    const topTex = textureLoader.load('/orange_cookie_top_clean.png');
    const bottomTex = textureLoader.load('/orange_cookie_bottom_clean.png');
    const sideTex = this.createBakedCrumbTexture('#dab47c', '#b08148');

    const geometry = this.createArtisanalCookieGeometry({
      radius: 1.04,
      height: 0.32,
      domeHeight: 0.065,
      ovalBulge: 0.09
    });

    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      bumpMap: sideTex,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.01
    });

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      bumpMap: topTex,
      bumpScale: 0.060,
      roughness: 0.74,
      metalness: 0.02
    });

    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      bumpMap: bottomTex,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.01
    });

    const cookieMesh = new THREE.Mesh(geometry, [sideMat, topMat, bottomMat]);
    cookieMesh.castShadow = true;
    cookieMesh.receiveShadow = true;
    group.add(cookieMesh);
  }

  buildWalnutCookieModel(id, group) {
    const textureLoader = new THREE.TextureLoader();
    const topPath = id === 'walnut_sf' ? '/walnut_sf_cookie_top_clean.png' : '/walnut_cookie_top_clean.png';
    const topTex = textureLoader.load(topPath);
    const bottomTex = textureLoader.load('/almond_cookie_bottom_clean.png');
    const sideTex = this.createBakedCrumbTexture('#dab47c', '#b08148');

    const geometry = this.createArtisanalCookieGeometry({
      radius: 1.04,
      height: 0.32,
      domeHeight: 0.068,
      ovalBulge: 0.09
    });

    const isSF = (id === 'walnut_sf');
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      bumpMap: sideTex,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.01
    });

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      bumpMap: topTex,
      bumpScale: isSF ? 0.075 : 0.058,
      roughness: isSF ? 0.82 : 0.74,
      metalness: isSF ? 0.01 : 0.02
    });

    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      bumpMap: bottomTex,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.01
    });

    const cookieMesh = new THREE.Mesh(geometry, [sideMat, topMat, bottomMat]);
    cookieMesh.castShadow = true;
    cookieMesh.receiveShadow = true;
    group.add(cookieMesh);

    // For Sugar-Free: Add Extra Roasted Walnut Nibs
    if (isSF) {
      const nibGeom = new THREE.DodecahedronGeometry(0.065, 0);
      const darkNutMat = new THREE.MeshStandardMaterial({
        color: 0x5a2d0c,
        roughness: 0.78,
        metalness: 0.03
      });
      const nibPositions = [
        { x: -0.28, y: 0.215, z: 0.18, s: 1.05 },
        { x: 0.26,  y: 0.21,  z: 0.22, s: 0.95 },
        { x: -0.22, y: 0.215, z: -0.20, s: 1.1 },
        { x: 0.28,  y: 0.21,  z: -0.15, s: 0.9 }
      ];
      nibPositions.forEach(np => {
        const nib = new THREE.Mesh(nibGeom, darkNutMat);
        nib.position.set(np.x, np.y, np.z);
        nib.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        nib.scale.setScalar(np.s);
        nib.castShadow = true;
        group.add(nib);
      });
    }
  }

  buildMuffinMesh(id, group) {
    // Custom Texture-Mapped Model for Choco Muffin
    if (id === 'chocochip') {
      const textureLoader = new THREE.TextureLoader();
      const chocoTex = textureLoader.load('/choco_muffin_texture.png');
      chocoTex.wrapS = THREE.RepeatWrapping;
      chocoTex.wrapT = THREE.RepeatWrapping;
      chocoTex.repeat.set(2, 2);

      // 1. Chocolate Pleated Liner
      const linerGeom = new THREE.CylinderGeometry(0.55, 0.42, 0.48, 32, 1, false);
      const pos = linerGeom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const angle = Math.atan2(x, z);
        const wave = Math.sin(angle * 24) * 0.022;
        pos.setX(i, x + Math.cos(angle) * wave);
        pos.setZ(i, z + Math.sin(angle) * wave);
      }
      linerGeom.computeVertexNormals();

      const linerMat = new THREE.MeshStandardMaterial({
        map: chocoTex,
        bumpMap: chocoTex,
        bumpScale: 0.035,
        roughness: 0.82,
        metalness: 0.06
      });
      const linerMesh = new THREE.Mesh(linerGeom, linerMat);
      linerMesh.position.y = -0.15;
      linerMesh.castShadow = true;
      linerMesh.receiveShadow = true;
      group.add(linerMesh);

      // 2. Chocolate Muffin Dome with Custom Texture Map
      const domeGeom = new THREE.SphereGeometry(0.58, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2);
      domeGeom.scale(1.06, 0.76, 1.06);
      const dpos = domeGeom.attributes.position;
      for (let i = 0; i < dpos.count; i++) {
        if (dpos.getY(i) > 0.04) {
          const noiseX = (Math.random() - 0.5) * 0.030;
          const noiseY = (Math.random() - 0.5) * 0.030;
          const noiseZ = (Math.random() - 0.5) * 0.030;
          dpos.setX(i, dpos.getX(i) + noiseX);
          dpos.setY(i, dpos.getY(i) + noiseY);
          dpos.setZ(i, dpos.getZ(i) + noiseZ);
        }
      }
      domeGeom.computeVertexNormals();

      const domeTex = chocoTex.clone();
      domeTex.needsUpdate = true;
      domeTex.repeat.set(1.5, 1.5);

      const domeMat = new THREE.MeshStandardMaterial({
        map: domeTex,
        bumpMap: domeTex,
        bumpScale: 0.055,
        roughness: 0.88,
        metalness: 0.04
      });
      const domeMesh = new THREE.Mesh(domeGeom, domeMat);
      domeMesh.position.y = 0.06;
      domeMesh.castShadow = true;
      domeMesh.receiveShadow = true;
      group.add(domeMesh);

      return;
    }

    const flavors = {
      strawberry: { linerColor: 0xffaab0, domeColor: 0xf5cfb5, chunkColor: 0xab2c47, chunkCount: 12 },
      pinacolada: { linerColor: 0xffecad, domeColor: 0xeed29f, chunkColor: 0xd9a414, chunkCount: 10 },
      blackcurrant: { linerColor: 0xead5f7, domeColor: 0xc89fed, chunkColor: 0x361f52, chunkCount: 15 },
      butterscotch: { linerColor: 0xe6cbab, domeColor: 0xd4a574, chunkColor: 0x8a541c, chunkCount: 15 }
    };

    const config = flavors[id];
    if (!config) return;

    const linerGeom = new THREE.CylinderGeometry(0.55, 0.42, 0.48, 24, 1, false);
    const pos = linerGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const angle = Math.atan2(x, z);
      const wave = Math.sin(angle * 24) * 0.022;
      pos.setX(i, x + Math.cos(angle) * wave);
      pos.setZ(i, z + Math.sin(angle) * wave);
    }
    linerGeom.computeVertexNormals();

    const linerMat = new THREE.MeshStandardMaterial({
      color: config.linerColor,
      roughness: 0.85,
      bumpMap: this.bumpTexture,
      bumpScale: 0.015
    });
    const linerMesh = new THREE.Mesh(linerGeom, linerMat);
    linerMesh.position.y = -0.15;
    linerMesh.castShadow = true;
    linerMesh.receiveShadow = true;
    group.add(linerMesh);

    const domeGeom = new THREE.SphereGeometry(0.58, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    domeGeom.scale(1.05, 0.72, 1.05);
    const dpos = domeGeom.attributes.position;
    for (let i = 0; i < dpos.count; i++) {
      if (dpos.getY(i) > 0.05) {
        const noiseX = (Math.random() - 0.5) * 0.038;
        const noiseY = (Math.random() - 0.5) * 0.038;
        const noiseZ = (Math.random() - 0.5) * 0.038;
        dpos.setX(i, dpos.getX(i) + noiseX);
        dpos.setY(i, dpos.getY(i) + noiseY);
        dpos.setZ(i, dpos.getZ(i) + noiseZ);
      }
    }
    domeGeom.computeVertexNormals();

    const domeMat = new THREE.MeshStandardMaterial({
      color: config.domeColor,
      roughness: 0.92,
      bumpMap: this.bumpTexture,
      bumpScale: 0.030
    });
    const domeMesh = new THREE.Mesh(domeGeom, domeMat);
    domeMesh.position.y = 0.06;
    domeMesh.castShadow = true;
    domeMesh.receiveShadow = true;
    group.add(domeMesh);

    const chunkGeom = new THREE.DodecahedronGeometry(0.060);
    const chunkMat = new THREE.MeshStandardMaterial({
      color: config.chunkColor,
      roughness: 0.78
    });

    for (let i = 0; i < config.chunkCount; i++) {
      const chunk = new THREE.Mesh(chunkGeom, chunkMat);
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.44 + 0.05;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const cy = Math.sqrt(Math.max(0, 0.58 * 0.58 - radius * radius)) * 0.72 + 0.05;

      chunk.position.set(cx, cy, cz);
      chunk.scale.set(0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6, 0.6 + Math.random() * 0.6);
      chunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      chunk.castShadow = true;
      group.add(chunk);
    }
  }

  ndcTo3DWorld(ndcX, ndcY, targetZ = 0) {
    if (!this.camera || !this.camera.position) return { x: 0, y: 0 };
    this.camera.updateMatrixWorld(true);
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(this.camera);
    const dir = vec.sub(this.camera.position).clone().normalize();
    if (Math.abs(dir.z) < 0.0001) return { x: ndcX * 3, y: ndcY * 3 };
    const distance = (targetZ - this.camera.position.z) / dir.z;
    const pos = this.camera.position.clone().add(dir.clone().multiplyScalar(distance));
    if (!pos || isNaN(pos.x) || isNaN(pos.y)) return { x: ndcX * 3, y: ndcY * 3 };
    return { x: pos.x, y: pos.y };
  }

  update3DCoordinates() {
    if (!this.camera) return;
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    const heroVisual = document.querySelector('.hero-visual-column');
    if (heroVisual) {
      const rect = heroVisual.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const px = rect.left + rect.width / 2;
        const py = rect.top + rect.height / 2;
        this.heroAlmondPos = this.ndcTo3DWorld(
          (px / vpWidth) * 2 - 1,
          -(py / vpHeight) * 2 + 1,
          0.5
        );
      } else {
        this.heroAlmondPos = { x: 2.8, y: 0.0 };
      }
    } else {
      this.heroAlmondPos = { x: 2.8, y: 0.0 };
    }

    this.ALL_PRODUCTS.forEach(id => {
      if (!this.placeholder3DCoords[id]) {
        this.placeholder3DCoords[id] = { x: 0, y: 0, scale: 0.85 };
      }

      const placeholder = document.querySelector(`#card-${id} .card-cookie-placeholder`);
      if (!placeholder) return;

      const phRect = placeholder.getBoundingClientRect();
      if (phRect.width > 0 && phRect.height > 0) {
        const px = phRect.left + phRect.width / 2;
        const py = phRect.top + phRect.height / 2;

        const ndcX = (px / vpWidth) * 2 - 1;
        const ndcY = -(py / vpHeight) * 2 + 1;
        const target3D = this.ndcTo3DWorld(ndcX, ndcY, 0);

        this.placeholder3DCoords[id] = {
          x: target3D.x,
          y: target3D.y,
          scale: this.MUFFINS.includes(id) ? 0.72 : 0.58
        };
      }
    });
  }

  initMouseTracking() {
    window.addEventListener('scroll', () => {
      this.cachedScrollY = window.scrollY || 0;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = totalHeight > 0 ? (this.cachedScrollY / totalHeight) * 100 : 0;
      const progressBar = document.getElementById('scroll-progress-bar');
      if (progressBar) progressBar.style.width = `${scrollPercent}%`;
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.cachedViewportHeight = window.innerHeight || 800;
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });
  }

  bindVisibility() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
      });
    }
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (!this.isTabVisible || !this.renderer || !this.scene || !this.camera || window.innerWidth <= 768) {
      return;
    }

    const scrollY = window.scrollY || 0;
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * 0.08;
    this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * 0.08;

    this.heroSpinAngle = (this.heroSpinAngle || 0) + 0.008;

    const productsSec = document.getElementById('products');
    const muffinsSec = document.getElementById('muffins');
    const bestSellersSec = document.getElementById('best-sellers');
    const heroVisual = document.querySelector('.hero-visual-column');

    const prodTop = productsSec ? productsSec.getBoundingClientRect().top : 9999;
    const muffinsTop = muffinsSec ? muffinsSec.getBoundingClientRect().top : 9999;
    const bsTop = bestSellersSec ? bestSellersSec.getBoundingClientRect().top : 9999;

    // Helper: get 3D world position from DOM element
    const getWorldPos = (el, targetZ = 0) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const px = rect.left + rect.width / 2;
      const py = rect.top + rect.height / 2;
      const ndcX = (px / vpWidth) * 2 - 1;
      const ndcY = -(py / vpHeight) * 2 + 1;
      return this.ndcTo3DWorld(ndcX, ndcY, targetZ);
    };

    const heroThreshold = Math.max(1, vpHeight * 0.75);
    const inHeroTransition = scrollY < heroThreshold;
    const scrollRatio = Math.min(1, Math.max(0, scrollY / heroThreshold));

    this.ALL_PRODUCTS.forEach(id => {
      const group = this.cookieGroups[id];
      if (!group) return;

      const isMuffin = this.MUFFINS.includes(id);
      const targetScale = isMuffin ? 0.72 : 0.58;
      const targetRotX = isMuffin ? 0.35 : 0.4;

      const card = document.querySelector(`#card-${id}`);
      const placeholder = card ? card.querySelector('.card-cookie-placeholder') : null;
      const isCardHidden = card && (card.style.display === 'none' || getComputedStyle(card).display === 'none');

      // Special Hero flight case for Almond Cookie
      if (id === 'almond' && inHeroTransition) {
        const heroPos = getWorldPos(heroVisual, 0.5) || { x: this.heroAlmondPos.x, y: this.heroAlmondPos.y };
        const almondCardPos = (!isCardHidden && placeholder) ? getWorldPos(placeholder, 0) : null;
        const targetCardPos = almondCardPos || { x: 0.8, y: -0.2 };

        group.position.x = THREE.MathUtils.lerp(heroPos.x, targetCardPos.x, scrollRatio);
        group.position.y = THREE.MathUtils.lerp(heroPos.y, targetCardPos.y, scrollRatio);
        group.position.z = THREE.MathUtils.lerp(0.5, 0.0, scrollRatio);

        const currentScale = THREE.MathUtils.lerp(0.95, targetScale, scrollRatio);
        group.scale.set(currentScale, currentScale, currentScale);

        group.rotation.x = THREE.MathUtils.lerp(1.1, targetRotX, scrollRatio);
        group.rotation.z = THREE.MathUtils.lerp(0.2, -0.1, scrollRatio);
        group.rotation.y = this.heroSpinAngle;
        group.visible = true;
        return;
      }

      // Check if card placeholder is on screen
      let isVisible = false;
      if (placeholder && !isCardHidden) {
        const rect = placeholder.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.bottom > -80 && rect.top < vpHeight + 80) {
          isVisible = true;
          const pos = getWorldPos(placeholder, 0);
          if (pos) {
            group.position.x = pos.x;
            group.position.y = pos.y;
            group.position.z = 0;

            // Fade in gracefully during hero scroll if on cookie grid
            let s = targetScale;
            if (inHeroTransition && !isMuffin) {
              const revealProgress = Math.min(1, Math.max(0, (scrollRatio - 0.2) / 0.8));
              s = targetScale * revealProgress;
            }

            group.scale.set(s, s, s);
            group.rotation.x = targetRotX;
            // Smooth continuous 3D rotation for all cookies & muffins in the showcase grid
            group.rotation.y = (group.rotation.y || 0) + 0.008;
            group.visible = s > 0.01;
          }
        }
      }

      if (!isVisible) {
        group.scale.set(0.001, 0.001, 0.001);
        group.visible = false;
      }
    });

    // Interactive mouse parallax tilt on active mesh
    this.ALL_PRODUCTS.forEach(id => {
      const group = this.cookieGroups[id];
      if (group && group.visible) {
        const mainMesh = group.children[1] || group.children[0];
        if (mainMesh) {
          mainMesh.rotation.z = this.currentMouse.x * 0.18;
          mainMesh.rotation.x = -this.currentMouse.y * 0.18;
        }
      }
    });

    if (this.particleGroup && this.particleGroup.children.length > 0) {
      this.particleGroup.children.forEach((p, idx) => {
        p.rotation.y += 0.005 + (idx % 3) * 0.002;
        p.rotation.x += 0.003;
        p.position.y += Math.sin(Date.now() * 0.001 + idx) * 0.001;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  generate3DParticles(cookieId) {
    this.clear3DParticles();
    const particleCount = 16;
    const isLeftSide = (cookieId === 'almond' || cookieId === 'oatsnuts');
    const targetX = isLeftSide ? -2.3 : 2.3;

    let particleGeom;
    let particleMat;

    if (cookieId === 'almond') {
      particleGeom = new THREE.ConeGeometry(0.08, 0.25, 5);
      particleGeom.scale(1, 0.4, 1.4);
      particleMat = new THREE.MeshStandardMaterial({ color: 0x6b3a0f, roughness: 0.9 });
    } else if (cookieId === 'rose') {
      particleGeom = new THREE.BoxGeometry(0.06, 0.005, 0.1);
      particleMat = new THREE.MeshStandardMaterial({ color: 0xc93652, roughness: 0.8, side: THREE.DoubleSide });
    } else if (cookieId === 'oatsnuts') {
      particleGeom = new THREE.BoxGeometry(0.08, 0.015, 0.15);
      particleMat = new THREE.MeshStandardMaterial({ color: 0xdecda9, roughness: 0.95 });
    } else if (cookieId === 'orange') {
      particleGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 5);
      particleMat = new THREE.MeshStandardMaterial({ color: 0xff7c00, roughness: 0.7 });
    }

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(particleGeom, particleMat);
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.5 + Math.random() * 1.5;
      const x = targetX + Math.cos(angle) * distance;
      const y = -1.2 + Math.random() * 2.4;
      const z = -0.5 + Math.random() * 1.5;

      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.scale.set(0.01, 0.01, 0.01);
      this.particleGroup.add(mesh);

      const scaleTarget = { x: 0.01, y: 0.01, z: 0.01 };
      const finalSx = 0.8 + Math.random() * 0.5;
      const finalSy = 0.8 + Math.random() * 0.5;
      const finalSz = 0.8 + Math.random() * 0.5;
      gsap.to(scaleTarget, {
        x: finalSx, y: finalSy, z: finalSz,
        duration: 0.8,
        delay: Math.random() * 0.5,
        ease: 'back.out(1.5)',
        onUpdate: () => { if (mesh.scale) mesh.scale.set(scaleTarget.x, scaleTarget.y, scaleTarget.z); }
      });

      const dx = -0.3 + Math.random() * 0.6;
      const dy = -0.3 + Math.random() * 0.6;
      const dz = -0.2 + Math.random() * 0.4;
      const posTarget = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
      gsap.to(posTarget, {
        x: posTarget.x + dx, y: posTarget.y + dy, z: posTarget.z + dz,
        duration: 4 + Math.random() * 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        onUpdate: () => { if (mesh.position) mesh.position.set(posTarget.x, posTarget.y, posTarget.z); }
      });
    }
  }

  clear3DParticles() {
    if (!this.particleGroup) return;
    const currentChildren = [...this.particleGroup.children];
    currentChildren.forEach(child => {
      const childScaleObj = { s: child.scale.x };
      gsap.to(childScaleObj, {
        s: 0.001,
        duration: 0.4,
        onUpdate: () => { if (child.scale) child.scale.set(childScaleObj.s, childScaleObj.s, childScaleObj.s); },
        onComplete: () => {
          try {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            this.particleGroup.remove(child);
          } catch (e) {}
        }
      });
    });
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch (e) {}
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => { try { m.dispose(); } catch (e) {} });
          } else {
            try { obj.material.dispose(); } catch (e) {}
          }
        }
      });
    }
    if (this.renderer) {
      try {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      } catch (e) {}
    }
  }
}

export function init3DEnvironment() {
  const controller = new ThreeController();
  controller.init();

  // Pause rendering when tab is hidden to prevent GPU / battery exhaustion
  controller.visibilityHandler = () => {
    if (document.hidden) {
      if (controller.animationFrameId) {
        cancelAnimationFrame(controller.animationFrameId);
        controller.animationFrameId = null;
      }
    } else {
      if (!controller.animationFrameId) {
        controller.animate();
      }
    }
  };
  document.addEventListener('visibilitychange', controller.visibilityHandler);

  return controller;
}
