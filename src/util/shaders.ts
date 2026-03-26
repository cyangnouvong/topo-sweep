// Shared sweep uniforms — one object, referenced by every contour material.
// Update sweepUniforms.uSweepX.value each frame to animate the stripe.
// Three.js reads .value directly and passes it to the GPU. Can't store it as a plain number - updating it wouldn't work because you'd be replacing the reference rather than mutating the object.
export const sweepUniforms = {
  uSweepX: { value: -999 }, // current stripe center along the diagonal axis
  uStripeHalf: { value: 8.0 }, // half-width of the visible stripe (world units)
};

// vertex shader - runs once per vertex on the GPU
// computes gl_Position (where the vertex appears on screen) and passes vDiag to the fragment shader
// position is a built-in attribute containing the vertex's local position
// multiply position by modelMatrix to get world position then multiply by viewMatrix and projectionMatrix to get screen space
// vDiag projects the world position onto the diagonal axis (bottom-left to top-right) which we use to determine the sweep effect in the fragment shader
// varying means the value is computed per-vertex but then interpolated across the surface and passed to the fragment shader (don't need to compute it per-pixel ourselves)
export const SWEEP_VERT = /* glsl */ `
  varying float vDiag;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    // Project onto the bottom-left → top-right diagonal axis.
    // Multiply by 1/√2 to normalize: bottom-left is most negative, top-right most positive.
    vDiag = (worldPos.x + worldPos.y) * 0.7071067;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// fraggment shader - runs once per pixel and it outputs a color via gl_FragColor
// uniform means the value is the same for every vertex and pixel in a draw call, set from JavaScript (read-only on the GPU)
// dist is the distance from the current pixel to the center of the sweep stripe along the diagonal axis
// t the dist normalized to [0, 1] (0 at the center, 1 at the edge of the stripe)
// alpha line is the cosine falloff based on t, multiplied by the base opacity for the contour level
// when t = 0 (center of the stripe), cos(0) = 1 so alpha is at max (uBaseOpacity). When t = 1 (edge of the stripe), cos(pi) = -1 so alpha is 0. In between it creates a smooth fade.
// discard means this pixel won't be drawn at all
export const SWEEP_FRAG = /* glsl */ `
  uniform float uSweepX;      // diagonal position of the sweep stripe center
  uniform float uStripeHalf;  // half-width of the stripe in world units
  uniform float uBaseOpacity; // per-level max opacity
  uniform vec3  uColor;       // per-level color
  varying float vDiag;

  void main() {
    float dist  = abs(vDiag - uSweepX);
    float t     = clamp(dist / uStripeHalf, 0.0, 1.0);
    // Cosine falloff: full opacity at stripe center, smoothly fades to 0 at edges
    float alpha = uBaseOpacity * 0.5 * (1.0 + cos(t * 3.14159265));
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;
