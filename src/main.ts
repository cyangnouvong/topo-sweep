import './style.css';
import * as THREE from 'three';
import { HeightMap, sweepUniforms } from './components/HeightMap';

// SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe4e4df);

const aspect = window.innerWidth / window.innerHeight;
const frustum = 100;

const camera = new THREE.OrthographicCamera(
  (frustum * aspect) / -2,
  (frustum * aspect) / 2,
  frustum / 2,
  frustum / -2,
  0.1,
  1000
);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OBJECTS
const map = new HeightMap();
const mapObj = map.getMesh();
scene.add(mapObj);

// SWEEP CONFIG — bottom-left → top-right
//
// The vertex shader projects onto: vDiag = (worldPos.x + worldPos.y) * 0.7071
//
// In Three.js orthographic world space (Y increases upward):
//   Bottom-left corner:  x = −halfX,  y = −halfY  → diag = (−halfX − halfY) * 0.7071  (most negative)
//   Top-right corner:    x = +halfX,  y = +halfY  → diag = ( halfX + halfY) * 0.7071  (most positive)
//
const halfX = (frustum * aspect) / 2;
const halfY = frustum / 2;
const diagMin = -(halfX + halfY) * 0.7071067; // bottom-left
const diagMax = (halfX + halfY) * 0.7071067; // top-right

const sweepSpeed = 40; // world units per second along diagonal
const stripeHalf = 90;
sweepUniforms.uStripeHalf.value = stripeHalf;
sweepUniforms.uSweepX.value = diagMin - stripeHalf; // start just off bottom-left

const clock = new THREE.Clock();

// ANIMATION
function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  sweepUniforms.uSweepX.value += sweepSpeed * delta;

  // Once the stripe has fully passed the top-right corner, regenerate and reset
  if (sweepUniforms.uSweepX.value > diagMax + stripeHalf) {
    map.regenerate();
    sweepUniforms.uSweepX.value = diagMin - stripeHalf;
  }

  renderer.render(scene, camera);
}
animate();

// RESIZE
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;

  camera.left = (frustum * aspect) / -2;
  camera.right = (frustum * aspect) / 2;
  camera.top = frustum / 2;
  camera.bottom = frustum / -2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
