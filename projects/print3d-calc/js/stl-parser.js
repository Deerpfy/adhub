/**
 * STL Parser and 3D Viewer Module
 * Parses STL files (ASCII and Binary) and calculates volume/dimensions
 * Uses Three.js for 3D visualization
 */

const STLParser = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    mesh: null,
    geometry: null,

    // Current model data
    modelData: {
        volume: 0,        // cm³
        weight: 0,        // g (calculated with material density)
        dimensions: { x: 0, y: 0, z: 0 }, // mm
        triangles: 0,
        boundingBox: null
    },

    /**
     * Initialize 3D viewer
     */
    initViewer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Store container reference for later resize
        this.container = container;
        this.containerId = containerId;

        // Use sensible defaults if container is hidden (display: none)
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 300;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121218);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        this.camera.position.set(200, 200, 200);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.rotateSpeed = 0.8;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-100, -100, -100);
        this.scene.add(directionalLight2);

        // Grid helper
        const gridHelper = new THREE.GridHelper(200, 20, 0x3a3a4a, 0x2a2a3a);
        this.scene.add(gridHelper);

        // Handle resize
        window.addEventListener('resize', () => this.handleResize(container));

        // Animate
        this.animate();
    },

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) {
            this.controls.update();
        }
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    /**
     * Handle window resize
     */
    handleResize(container) {
        if (!this.camera || !this.renderer) return;

        // Use stored container if not provided
        container = container || this.container;
        if (!container) return;

        const width = container.clientWidth || 400;
        const height = container.clientHeight || 300;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    },

    /**
     * Force refresh when container becomes visible
     */
    refreshViewer() {
        if (!this.container || !this.renderer) return;

        // Small delay to ensure container has dimensions
        setTimeout(() => {
            this.handleResize(this.container);
            if (this.mesh) {
                this.fitCameraToModel();
            }
        }, 50);
    },

    /**
     * Load STL file
     */
    async loadSTL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const arrayBuffer = event.target.result;

                    // Use Three.js STLLoader
                    const loader = new THREE.STLLoader();
                    const geometry = loader.parse(arrayBuffer);

                    // Store geometry
                    this.geometry = geometry;

                    // Calculate model data
                    this.calculateModelData(geometry);

                    // Display in viewer
                    this.displayModel(geometry);

                    resolve(this.modelData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Calculate volume, dimensions, and other model data
     */
    calculateModelData(geometry) {
        // Ensure geometry has computed attributes
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const boundingBox = geometry.boundingBox;

        // Dimensions in mm (assuming STL is in mm)
        this.modelData.dimensions = {
            x: Math.abs(boundingBox.max.x - boundingBox.min.x),
            y: Math.abs(boundingBox.max.y - boundingBox.min.y),
            z: Math.abs(boundingBox.max.z - boundingBox.min.z)
        };

        this.modelData.boundingBox = boundingBox;

        // Calculate volume using signed tetrahedron method
        this.modelData.volume = this.calculateVolume(geometry);

        // Triangle count
        const positionAttribute = geometry.getAttribute('position');
        this.modelData.triangles = positionAttribute.count / 3;

        return this.modelData;
    },

    /**
     * Calculate volume using signed tetrahedron method
     * Returns volume in cm³ (assuming STL units are mm)
     */
    calculateVolume(geometry) {
        const positions = geometry.getAttribute('position').array;
        let volume = 0;

        // Process each triangle
        for (let i = 0; i < positions.length; i += 9) {
            const p1 = [positions[i], positions[i + 1], positions[i + 2]];
            const p2 = [positions[i + 3], positions[i + 4], positions[i + 5]];
            const p3 = [positions[i + 6], positions[i + 7], positions[i + 8]];

            volume += this.signedVolumeOfTriangle(p1, p2, p3);
        }

        // Convert mm³ to cm³
        return Math.abs(volume) / 1000;
    },

    /**
     * Calculate signed volume of tetrahedron formed by triangle and origin
     * Based on the formula from stl-calc analysis
     */
    signedVolumeOfTriangle(p1, p2, p3) {
        const v321 = p3[0] * p2[1] * p1[2];
        const v231 = p2[0] * p3[1] * p1[2];
        const v312 = p3[0] * p1[1] * p2[2];
        const v132 = p1[0] * p3[1] * p2[2];
        const v213 = p2[0] * p1[1] * p3[2];
        const v123 = p1[0] * p2[1] * p3[2];

        return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
    },

    /**
     * Calculate weight based on volume and material density
     */
    calculateWeight(density, infillPercent = 100) {
        // Approximate: assume 2 wall layers of ~0.4mm each
        // Outer shell is solid, inner is infill
        const shellThickness = 0.8; // mm

        // Get bounding dimensions
        const dims = this.modelData.dimensions;

        // Very rough approximation of shell volume
        // For complex models, this is an estimate
        const shellVolume = this.modelData.volume * 0.3; // ~30% is typically shell
        const infillVolume = this.modelData.volume * 0.7 * (infillPercent / 100);

        const effectiveVolume = shellVolume + infillVolume;

        // Weight in grams
        this.modelData.weight = effectiveVolume * density;

        return this.modelData.weight;
    },

    /**
     * Display model in 3D viewer
     */
    displayModel(geometry) {
        // Remove existing mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        // Create material
        const material = new THREE.MeshPhongMaterial({
            color: 0x8b5cf6,
            specular: 0x444444,
            shininess: 30,
            flatShading: false
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);

        // Center the model
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        // Position on grid
        const minY = geometry.boundingBox.min.y;
        this.mesh.position.y = -minY;

        this.scene.add(this.mesh);

        // Fit camera to model
        this.fitCameraToModel();
    },

    /**
     * Fit camera to show entire model
     */
    fitCameraToModel() {
        if (!this.mesh || !this.geometry) return;

        const box = new THREE.Box3().setFromObject(this.mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.5; // Zoom out a bit

        this.camera.position.set(cameraZ, cameraZ, cameraZ);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    },

    /**
     * Reset camera view
     */
    resetView() {
        this.fitCameraToModel();
    },

    /**
     * Estimate print time based on volume
     * Very rough estimation - actual time depends on many factors
     */
    estimatePrintTime(infillPercent = 20, layerHeight = 0.2) {
        if (!this.modelData.volume) return 0;

        // Rough estimation factors
        const volumeCm3 = this.modelData.volume;
        const height = this.modelData.dimensions.z;

        // Layers count
        const layers = height / layerHeight;

        // Approximate time per layer based on volume and infill
        // This is a very rough estimate - real slicers are much more accurate
        const avgLayerVolume = volumeCm3 / layers;

        // Assume ~15 cm³/hour for solid infill on typical printer
        const printSpeedFactor = 15; // cm³/hour at 100% infill

        // Adjust for infill percentage
        const effectiveVolume = volumeCm3 * (0.3 + 0.7 * (infillPercent / 100));

        // Time in hours
        const printTime = effectiveVolume / printSpeedFactor;

        // Add overhead for travel, retraction, etc. (~20%)
        return printTime * 1.2;
    },

    /**
     * Clear the viewer
     */
    clear() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }

        this.geometry = null;
        this.modelData = {
            volume: 0,
            weight: 0,
            dimensions: { x: 0, y: 0, z: 0 },
            triangles: 0,
            boundingBox: null
        };
    },

    /**
     * Get formatted model data
     */
    getFormattedData(density = 1.24, infill = 20) {
        this.calculateWeight(density, infill);

        return {
            volume: this.modelData.volume.toFixed(2) + ' cm³',
            weight: this.modelData.weight.toFixed(1) + ' g',
            dimensions: `${this.modelData.dimensions.x.toFixed(1)} x ${this.modelData.dimensions.y.toFixed(1)} x ${this.modelData.dimensions.z.toFixed(1)} mm`,
            triangles: this.modelData.triangles.toLocaleString(),
            raw: { ...this.modelData }
        };
    }
};

// Export for use in other modules
window.STLParser = STLParser;
