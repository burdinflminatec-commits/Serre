import * as THREE from 'three';

/**
 * Génère une CanvasTexture de bois réaliste (veinage + nœuds + nuance Pin autoclave)
 */
function createWoodTexture({
  baseColor = '#b78d5c',
  grainColor = '#8d6338',
  greenTint = 'rgba(88, 124, 78, 0.14)',
  width = 512,
  height = 256
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fond bois
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Veines longitudinales
  for (let i = 0; i < 140; i++) {
    const y = (i / 140) * height;
    const waveAmp = 1.5 + (i % 5) * 0.8;
    const freq = 0.012 + (i % 7) * 0.002;
    ctx.strokeStyle = grainColor;
    ctx.globalAlpha = 0.08 + ((i * 17) % 18) / 100;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const dy = Math.sin(x * freq + i * 0.7) * waveAmp;
      if (x === 0) ctx.moveTo(x, y + dy);
      else ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }

  // Quelques nœuds du bois
  const knots = [
    { x: width * 0.24, y: height * 0.36, rx: 18, ry: 7 },
    { x: width * 0.72, y: height * 0.68, rx: 22, ry: 8 }
  ];
  knots.forEach((k) => {
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath();
      ctx.ellipse(k.x, k.y, k.rx * (r * 0.45), k.ry * (r * 0.45), 0.08, 0, Math.PI * 2);
      ctx.strokeStyle = '#5c3d1e';
      ctx.globalAlpha = 0.22 / r;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // Légère patine Pin Vert Autoclave Classe 4
  ctx.globalAlpha = 1;
  ctx.fillStyle = greenTint;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.0025, 0.006);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Génère une texture de polycarbonate alvéolaire 10mm (canaux parallèles)
 */
function createPolycarbonateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e0f4ff';
  ctx.fillRect(0, 0, 256, 256);

  // Alvéoles tous les 10px
  for (let y = 0; y < 256; y += 8) {
    ctx.fillStyle = y % 16 === 0 ? '#93c5fd' : '#bae6fd';
    ctx.fillRect(0, y, 256, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.01, 0.02);
  return tex;
}

export function createMaterialsRegistry(clippingPlanes = [], isLite = false) {
  if (isLite) {
    // ============================================================================
    // PROFIL D'OPTIMISATION MATÉRIELLE — SAMSUNG GALAXY TAB A (SM-T580 / Mali-T830)
    // Zéro shader PBR (MeshStandard/Physical bannis), zéro texture bitmap,
    // Gouraud shading (MeshLambertMaterial flatShading) & MeshBasicMaterial FrontSide
    // ============================================================================
    return {
      wood_deck: new THREE.MeshLambertMaterial({
        color: 0xc89666,
        flatShading: true,
        clippingPlanes
      }),

      wood_post: new THREE.MeshLambertMaterial({
        color: 0xb07d4f,
        flatShading: true,
        clippingPlanes
      }),

      wood_to_buy: new THREE.MeshLambertMaterial({
        color: 0xeab308,
        flatShading: true,
        clippingPlanes
      }),

      polycarbonate: new THREE.MeshBasicMaterial({
        color: 0xd8f0ff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false, // CRITIQUE : Empêche le blocage du pipeline de tuiles sur la transparence
        side: THREE.FrontSide, // Évite de calculer 2x chaque plaque (pas de DoubleSide)
        clippingPlanes
      }),

      metal_galva: new THREE.MeshLambertMaterial({
        color: 0xcbd5e1,
        flatShading: true,
        clippingPlanes
      }),

      metal_dark: new THREE.MeshLambertMaterial({
        color: 0x334155,
        flatShading: true,
        clippingPlanes
      }),

      trolley_wood: new THREE.MeshLambertMaterial({
        color: 0x855e3c,
        flatShading: true,
        clippingPlanes
      }),

      plant_foliage: new THREE.MeshLambertMaterial({
        color: 0x2d8a4e,
        flatShading: true,
        clippingPlanes
      }),

      terracotta: new THREE.MeshLambertMaterial({
        color: 0xb4532a,
        flatShading: true,
        clippingPlanes
      }),

      edge_line: new THREE.LineBasicMaterial({
        color: 0x557799,
        clippingPlanes
      }),

      edge_poly: new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        clippingPlanes
      })
    };
  }

  const deckTex = createWoodTexture({
    baseColor: '#bf9460',
    grainColor: '#85582a',
    greenTint: 'rgba(92, 128, 76, 0.14)'
  });

  const postTex = createWoodTexture({
    baseColor: '#a97e4d',
    grainColor: '#6e4720',
    greenTint: 'rgba(74, 114, 66, 0.20)'
  });

  const polyTex = createPolycarbonateTexture();

  const materials = {
    wood_deck: new THREE.MeshStandardMaterial({
      map: deckTex,
      roughness: 0.72,
      metalness: 0.04,
      clippingPlanes,
      clipShadows: true
    }),

    wood_post: new THREE.MeshStandardMaterial({
      map: postTex,
      roughness: 0.78,
      metalness: 0.04,
      clippingPlanes,
      clipShadows: true
    }),

    wood_to_buy: new THREE.MeshStandardMaterial({
      map: postTex,
      color: new THREE.Color('#eab308'),
      roughness: 0.68,
      metalness: 0.06,
      clippingPlanes,
      clipShadows: true
    }),

    polycarbonate: new THREE.MeshPhysicalMaterial({
      map: polyTex,
      color: new THREE.Color('#dff4ff'),
      transparent: true,
      opacity: 0.44,
      roughness: 0.18,
      metalness: 0.05,
      transmission: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      clippingPlanes,
      clipShadows: true
    }),

    metal_galva: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cbd5e1'),
      roughness: 0.32,
      metalness: 0.82,
      clippingPlanes,
      clipShadows: true
    }),

    metal_dark: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      roughness: 0.4,
      metalness: 0.7,
      clippingPlanes,
      clipShadows: true
    }),

    trolley_wood: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#785536'),
      roughness: 0.85,
      metalness: 0.05,
      clippingPlanes
    }),

    plant_foliage: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2d8a4e'),
      roughness: 0.75,
      metalness: 0.02,
      clippingPlanes
    }),

    terracotta: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b4532a'),
      roughness: 0.8,
      metalness: 0.02,
      clippingPlanes
    }),

    edge_line: new THREE.LineBasicMaterial({
      color: new THREE.Color('#1e293b'),
      transparent: true,
      opacity: 0.65,
      clippingPlanes
    }),

    edge_poly: new THREE.LineBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      transparent: true,
      opacity: 0.8,
      clippingPlanes
    })
  };

  return materials;
}
