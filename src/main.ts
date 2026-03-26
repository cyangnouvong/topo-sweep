import './style.css';
import * as THREE from 'three';
import { Box } from './components/Box';

// SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfdfbd4);

const aspect = window.innerWidth / window.innerHeight;
const frustum = 10;

const camera = new THREE.OrthographicCamera(
  (frustum * aspect) / -2, // left boundary
  (frustum * aspect) / 2, // right boundary
  frustum / 2, // top boundary
  frustum / -2, // bottom boundary
  0.1, // near clip
  1000 // far clip
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OBJECTS
const box = new Box(scene, 0x545333, { x: 0, y: 0, z: 0 });
const box2 = new Box(scene, 0x878672, { x: 2, y: 0, z: 5 });

// ANIMATION
function animate(): void {
  requestAnimationFrame(animate); // Schedule the next frame - infinite loop
  box.update(); // Update the box's state
  box2.update(); // Update the second box's state
  // Render the scene from the perspective of the camera
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
