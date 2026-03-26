import * as THREE from 'three';

export class Box {
  private cube: THREE.Mesh;

  constructor(
    scene: THREE.Scene,
    color: number,
    position: { x: number; y: number; z: number }
  ) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
    });

    this.cube = new THREE.Mesh(geometry, material);
    this.cube.position.set(position.x, position.y, position.z);

    scene.add(this.cube);
  }

  update(): void {
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;
  }

  reset(): void {
    this.cube.rotation.set(0, 0, 0);
  }
}
