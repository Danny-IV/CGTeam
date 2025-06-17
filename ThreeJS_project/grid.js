import * as THREE from 'three';

export class Grid {
    cellSize = 1;
    cellHeight = 1;
    cellGap = 2;

    /**
     * Creates a grid of cells with the given size.
     * Each cell is a Box3 object and is stored in the cells array.
     * The cells are arranged in a 2D array and each cell is centered at x = (cellSize + cellGap) * (i - ((size - 1) / 2)) and z = (cellSize + cellGap) * (j - ((size - 1) / 2)),
     * where i and j are the indices of the cell in the 2D array, and size is the size of the grid.
     * @param {number} size The size of the grid.
     */
    constructor(size) {
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
            }
        }
    }

    /**
     * Creates a Box3Helper for each cell in the grid and adds it to the given scene.
     * @param {THREE.Scene} scene The scene to add the Box3Helpers to.
     */
    createBox3Helpers(scene) {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const box = this.cells[i][j].cell;
                const helper = new THREE.Box3Helper(box, 0xffff00);
                scene.add(helper);
                this.helpers[i][j] = helper;
            }
        }
    }

    /**
     * Updates the color of each Box3Helper in the grid to indicate whether or not a sphere is intersecting with the corresponding cell.
     * If a sphere is intersecting, the color is set to red (0xff0000); otherwise, it is set to yellow (0xffff00).
     */
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

    /**
     * Updates the indicator property of each cell in the grid to indicate whether or not a sphere is intersecting with the corresponding cell.
     * @param {Object} level The level object which contains the spheres information.
     */
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