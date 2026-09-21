import * as THREE from "three";

const PORTAL_IMAGE_LOADERS = import.meta.glob("../../portal-images/*.webp", {
  import: "default",
  query: "?url",
});

export function pickPortalImageLoaders(limit = 10) {
  const entries = Object.entries(PORTAL_IMAGE_LOADERS).sort(([a], [b]) => a.localeCompare(b));
  const count = Math.min(limit, entries.length);
  return Array.from({ length: count }, (_, index) => entries[(index * 5 + 3) % entries.length]);
}

export async function loadPortalImageUrls(limit = 10) {
  const entries = pickPortalImageLoaders(limit);
  return Promise.all(entries.map(([, load]) => load()));
}

export function createMediaRenderer(mediaCanvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas: mediaCanvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

export function createNoiseTexture(seededRandom) {
  const noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const noiseCtx = noiseCanvas.getContext("2d");
  const noiseData = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
  for (let i = 0; i < noiseData.data.length; i += 4) {
    const value = Math.floor(seededRandom(i, 42) * 255);
    noiseData.data[i] = value;
    noiseData.data[i + 1] = Math.floor(seededRandom(i, 84) * 255);
    noiseData.data[i + 2] = value;
    noiseData.data[i + 3] = 255;
  }
  noiseCtx.putImageData(noiseData, 0, 0);
  const noiseTexture = new THREE.CanvasTexture(noiseCanvas);
  noiseTexture.wrapS = THREE.RepeatWrapping;
  noiseTexture.wrapT = THREE.RepeatWrapping;
  return noiseTexture;
}

export function createImageCanvasTexture(image, maxTextureSize = 4096) {
  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const limit = Math.max(256, Math.min(4096, maxTextureSize || 4096));
  const scale = Math.min(1, limit / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.drawImage(image, 0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createPortalMaterial(texture, noiseTexture, shaderState) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTexture: { value: texture },
      uNoiseTexture: { value: noiseTexture },
      uProgress: { value: 0 },
      uIntensity: { value: 0.075 },
      uTime: { value: 0 },
      uNoiseScale: { value: shaderState.portalShaderNoiseScale },
      uNoiseX: { value: shaderState.portalShaderNoiseX },
      uNoiseY: { value: shaderState.portalShaderNoiseY },
      uNoiseSpeed: { value: shaderState.portalShaderNoiseSpeed },
      uSoftness: { value: shaderState.portalShaderSoftness },
      uNoiseAmount: { value: shaderState.portalShaderNoiseAmount },
      uFlowX: { value: shaderState.portalShaderFlowX },
      uFlowY: { value: shaderState.portalShaderFlowY },
      uFlowNoiseY: { value: shaderState.portalShaderFlowNoiseY },
      uZoom: { value: shaderState.portalShaderZoom },
      uCanvasResolution: { value: new THREE.Vector2(1, 1) },
      uImageResolution: {
        value: new THREE.Vector2(texture.image?.width || 1, texture.image?.height || 1),
      },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform sampler2D uNoiseTexture;
      uniform vec2 uCanvasResolution;
      uniform vec2 uImageResolution;
      uniform float uProgress;
      uniform float uIntensity;
      uniform float uTime;
      uniform float uNoiseScale;
      uniform float uNoiseX;
      uniform float uNoiseY;
      uniform float uNoiseSpeed;
      uniform float uSoftness;
      uniform float uNoiseAmount;
      uniform float uFlowX;
      uniform float uFlowY;
      uniform float uFlowNoiseY;
      uniform float uZoom;

      vec2 containUv(vec2 uv, vec2 canvasRes, vec2 imageRes) {
        float canvasAspect = canvasRes.x / max(canvasRes.y, 0.0001);
        float imageAspect = imageRes.x / max(imageRes.y, 0.0001);
        vec2 outUv = uv;
        if (canvasAspect > imageAspect) {
          float scaleX = imageAspect / canvasAspect;
          outUv.x = (uv.x - 0.5) / max(scaleX, 0.0001) + 0.5;
        } else {
          float scaleY = canvasAspect / imageAspect;
          outUv.y = (uv.y - 0.5) / max(scaleY, 0.0001) + 0.5;
        }
        return outUv;
      }

      void main() {
        float progress = clamp(uProgress, 0.0, 1.0);
        float envelope = sin(progress * 3.14159265);
        vec2 noise = texture2D(
          uNoiseTexture,
          vUv * uNoiseScale + vec2(uNoiseX * progress + uTime * 0.015 * uNoiseSpeed, uNoiseY * progress - uTime * 0.012 * uNoiseSpeed)
        ).rg - 0.5;
        float front = mix(-0.30, 1.30, progress);
        float reveal = 1.0 - smoothstep(front - uSoftness, front + uSoftness, vUv.y + noise.r * uNoiseAmount);
        vec2 flow = vec2(noise.r * uFlowX, uFlowY + noise.g * uFlowNoiseY) * uIntensity * envelope;
        float zoom = 1.0 + uZoom * envelope;
        vec2 baseUv = (vUv - 0.5) / zoom + 0.5;
        vec2 imageUv = containUv(baseUv - flow * (1.0 - progress), uCanvasResolution, uImageResolution);
        vec2 inBounds = step(vec2(0.0), imageUv) * step(imageUv, vec2(1.0));
        float imageMask = inBounds.x * inBounds.y;
        vec4 color = texture2D(uTexture, clamp(imageUv, vec2(0.0), vec2(1.0)));
        gl_FragColor = vec4(color.rgb, color.a * reveal * imageMask);
      }
    `,
  });
}

export function createPortalMesh(material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}

export { THREE };
