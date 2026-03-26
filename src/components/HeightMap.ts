import * as THREE from 'three';
import { sweepUniforms, SWEEP_VERT, SWEEP_FRAG } from '../util/shaders';
import { generateHeightMap, type NoiseConfig } from '../util/noise';
import { marchingSquares, type Segment } from '../util/marchingSquares';

interface HeightMapConfig extends NoiseConfig {
  worldSize: number;
  contourLevels: number;
  aspect: number;
}

// Per-level style: every 4th line is "major", every other even is "mid", rest are "fine"
function getLevelStyle(i: number): {
  opacity: number;
  color: [number, number, number];
} {
  if (i % 4 === 0) return { opacity: 0.78, color: [0.329, 0.325, 0.2] }; // major
  if (i % 2 === 0) return { opacity: 0.42, color: [0.36, 0.355, 0.225] }; // mid
  return { opacity: 0.22, color: [0.39, 0.385, 0.245] }; // fine
}

export class HeightMap {
  private map: Float32Array = new Float32Array(0);
  private contourGroup: THREE.Group = new THREE.Group();
  private contourLines: THREE.LineSegments[] = [];

  private static readonly CONFIG: HeightMapConfig = {
    gridSize: 256,
    worldSize: 100,
    contourLevels: 30,
    octaves: 6,
    persistence: 0.5,
    lacunarity: 2.0,
    scale: 3.5,
    aspect: window.innerWidth / window.innerHeight,
  };

  constructor() {
    this.map = generateHeightMap(HeightMap.CONFIG);
    this.buildContours();
  }

  // --- Public API ------------------------------------------------------

  public getMesh(): THREE.Group {
    return this.contourGroup;
  }

  public regenerate(): void {
    this.map = generateHeightMap(HeightMap.CONFIG);
    const transform = this.getWorldTransform();

    let lineIdx = 0;
    for (let i = 0; i < HeightMap.CONFIG.contourLevels; i++) {
      const isoLevel = (i + 1) / (HeightMap.CONFIG.contourLevels + 1);
      const segments = marchingSquares(
        this.map,
        HeightMap.CONFIG.gridSize,
        isoLevel
      );
      if (segments.length === 0) continue;

      const line = this.contourLines[lineIdx++];
      if (!line) continue;

      line.geometry.dispose();
      line.geometry = this.buildGeometry(segments, transform);
    }
  }

  // --- Private helpers ------------------------------------------------------

  /**
   * Builds the contour line meshes for all levels, adds them to a group, and stores references for later updates.
   */
  private buildContours(): void {
    const transform = this.getWorldTransform();

    for (let i = 0; i < HeightMap.CONFIG.contourLevels; i++) {
      const isoLevel = (i + 1) / (HeightMap.CONFIG.contourLevels + 1);
      const segments = marchingSquares(
        this.map,
        HeightMap.CONFIG.gridSize,
        isoLevel
      );
      if (segments.length === 0) continue;

      const { opacity, color } = getLevelStyle(i);
      const geo = this.buildGeometry(segments, transform);
      const mat = this.buildMaterial(opacity, color);

      const line = new THREE.LineSegments(geo, mat);
      this.contourGroup.add(line);
      this.contourLines.push(line);
    }
  }

  /** Converts grid-space segments to a world-space BufferGeometry. */
  private buildGeometry(
    segments: Segment[],
    { cellW, cellH, halfX, halfY }: ReturnType<typeof this.getWorldTransform>
  ): THREE.BufferGeometry {
    const positions: number[] = [];

    for (const { x1, y1, x2, y2 } of segments) {
      positions.push(
        x1 * cellW - halfX,
        -(y1 * cellH - halfY),
        0.01,
        x2 * cellW - halfX,
        -(y2 * cellH - halfY),
        0.01
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return geo;
  }

  /** Creates a ShaderMaterial for one contour level, sharing the sweep uniforms. */
  private buildMaterial(
    opacity: number,
    color: [number, number, number]
  ): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSweepX: sweepUniforms.uSweepX, // shared reference — updated each frame
        uStripeHalf: sweepUniforms.uStripeHalf, // shared reference
        uBaseOpacity: { value: opacity },
        uColor: { value: new THREE.Vector3(...color) },
      },
      vertexShader: SWEEP_VERT,
      fragmentShader: SWEEP_FRAG,
      transparent: true,
      depthWrite: false,
    });
  }

  /** Pre-computes the cell size and origin offset for grid → world conversion. */
  private getWorldTransform() {
    const { gridSize, worldSize, aspect } = HeightMap.CONFIG;
    return {
      cellW: (worldSize * aspect) / gridSize,
      cellH: worldSize / gridSize,
      halfX: (worldSize * aspect) / 2,
      halfY: worldSize / 2,
    };
  }
}

export { sweepUniforms };
