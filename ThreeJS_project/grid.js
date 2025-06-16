import * as THREE from 'three';

export class Grid {
    cellSize = 1;
    cellHeight = 1;
    cellGap = 2;

    /**
     * Creates a grid of given size, with cell size, height and gap defined by
     * corresponding properties of this object.
     * @param {THREE.Scene} scene - The scene to add the grid to.
     * @param {number} size - The size of the grid.
     */
    constructor(scene, size) {
        this.size = size;
        this.cells = [];
        this.helpers = [];
        for (let i = 0; i < size; i++) {
            this.cells[i] = [];
            this.helpers[i] = [];
            for (let j = 0; j < size; j++) {
                const x = (this.cellSize + this.cellGap) * (i - ((size - 1) / 2));
                const z = (this.cellSize + this.cellGap) * (j - ((size - 1) / 2));
                const box = new THREE.Box3();
                box.setFromCenterAndSize(
                    new THREE.Vector3(x, 0, z),
                    new THREE.Vector3(this.cellSize, this.cellHeight, this.cellSize)
                );
                this.cells[i][j] = { cell: box, indicator: false };

                const helper = new THREE.Box3Helper(box, 0xffff00);
                scene.add(helper);

                this.helpers[i][j] = helper;
            }
        }
    }

    updateCellHelper() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.cells[i][j].indicator) {
                    this.helpers[i][j].material.color.set(0xff0000);
                }
                else {
                    this.helpers[i][j].material.color.set(0xffff00);
                }
            }
        }
    }

    checkIntersection(level) {
        // update checkSpere location
        level.globals.spheres.forEach(obj => {
            obj.checkSphere.center.set(obj.mesh.position.x, obj.mesh.position.y, obj.mesh.position.z);
        });

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const box = this.cells[i][j].cell;
                this.cells[i][j].indicator = level.globals.spheres.map(sphere => sphere.checkSphere).some(element => {
                    return box.intersectsSphere(element);
                })
            }
        }
    }
}