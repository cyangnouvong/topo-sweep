import { createNoise2D } from 'simplex-noise';

export interface NoiseConfig {
  gridSize: number;
  scale: number; // controls the "zoom" of the noise - higher = wider range of noise = more busy, varied terrain
  octaves: number;
  persistence: number;
  lacunarity: number;
}

// Terrain shaping weights — control the blend between noise and island falloff
const NOISE_WEIGHT = 0.6;
const FALLOFF_WEIGHT = 0.7;

// How quickly terrain drops off toward the edges (higher = smaller island)
const FALLOFF_RADIUS = 1.2; // fallof starts at ~83% of the distance to the corner, reaches zero at the corner

/**
 * Generates a heightmap using fractal noise
 *
 * Each cell is a sum of noise octaves at increasing frequencies and decreasing
 * amplitudes, then shaped by a radial falloff to produce an island.
 * The result is normalised to [0, 1].
 */
export function generateHeightMap(config: NoiseConfig): Float32Array {
  const noise2D = createNoise2D();
  const { gridSize, scale, octaves, persistence, lacunarity } = config;

  const map = new Float32Array(gridSize * gridSize); // flat array even though data is 2D - access with [y * gridSize + x]
  let globalMin = Infinity;
  let globalMax = -Infinity;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const nx = (x / gridSize) * scale; // normalised x coordinate for noise sampling
      const ny = (y / gridSize) * scale; // normalised y coordinate for noise sampling

      // Accumulate octaves (fBm)
      let value = 0;
      let amplitude = 1; // controls how much each octave contributes to the final value. If it halves each iteration, then each octave contributes half as much as the last.
      let frequency = 1; // controls how quickly the noise changes. If it doubles each iteration, then each octave has twice as much detail as the last.
      let maxValue = 0; // accumulates the sum of amplitudes for normalisation later

      // Fractional brownian motion loop where each iteration is one octave
      //
      for (let o = 0; o < octaves; o++) {
        value += noise2D(nx * frequency, ny * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }

      value = value / maxValue; // normalise octave sum to [-1, 1]

      // Radial island falloff: high in the centre, zero at the edges
      // remaps [0, 1] to [-1, 1] with [0, 0] at the center and corners are [-1, -1], [1, -1], [1, 1], [-1, 1]
      const dx = (x / gridSize) * 2 - 1;
      const dy = (y / gridSize) * 2 - 1;
      const dist = Math.sqrt(dx * dx + dy * dy); // euclidean distance from the center, range [0, ~1.41]
      const falloff = 1 - Math.pow(Math.min(dist * FALLOFF_RADIUS, 1), 3); // clamps distance then applies a cubic curve to create a smooth falloff. Cubic curve means falloff starts more gradual and then drops more steeply near the edges.

      value = value * NOISE_WEIGHT + falloff * FALLOFF_WEIGHT; // blend noise and falloff together

      map[y * gridSize + x] = value;
      if (value < globalMin) globalMin = value;
      if (value > globalMax) globalMax = value;
    }
  }

  // Remap to [0, 1] for marching squares
  const range = globalMax - globalMin;
  for (let i = 0; i < map.length; i++) {
    map[i] = (map[i] - globalMin) / range;
  }

  return map;
}
