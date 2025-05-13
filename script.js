
// Main Application
class SolarSystem {
    constructor() {
        this.init();
        this.createStars();
        this.createSolarSystem();
        this.setupUI();
        this.setupEventListeners();
        this.animate();

        // Hide loading screen after everything is loaded
        setTimeout(() => {
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                this.showNotification('Press H for help', 3000);
            }, 1000);
        }, 2000);
    }

    init() {
        // Three.js setup
        this.container = document.getElementById('canvas-container');
        this.canvas = document.getElementById('spaceCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b0e17);
        this.scene.fog = new THREE.FogExp2(0x0b0e17, 0.0005);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100000
        );
        this.camera.position.set(0, 50, 200);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 1000;
        this.controls.maxPolarAngle = Math.PI * 0.9;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(this.ambientLight);

        // Point light for sun
        this.sunLight = new THREE.PointLight(0xffeb3b, 2, 500);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 1000;

        // Raycaster for interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.intersected = null;

        // Animation variables
        this.clock = new THREE.Clock();
        this.simulationSpeed = 1;
        this.planetScale = 1;
        this.distanceScale = 1;
        this.showOrbits = true;
        this.showAtmosphere = true;
        this.autoRotate = true;

        // Solar system objects
        this.sun = null;
        this.planets = [];
        this.planetData = [];
        this.orbits = [];

        // UI elements
        this.tooltip = document.getElementById('tooltip');
        this.planetInfo = document.getElementById('planetInfo');
        this.planetName = document.getElementById('planetName');
        this.planetIcon = document.getElementById('planetIcon');
        this.planetType = document.getElementById('planetType');
        this.planetDiameter = document.getElementById('planetDiameter');
        this.planetMass = document.getElementById('planetMass');
        this.planetTemp = document.getElementById('planetTemp');
        this.planetOrbit = document.getElementById('planetOrbit');

        // Resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    createStars() {
        // Create background stars
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.8
        });

        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);

        // Create some larger twinkling stars
        for (let i = 0; i < 200; i++) {
            const star = new THREE.Mesh(
                new THREE.SphereGeometry(0.2 + Math.random() * 0.5, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8
                })
            );
            star.position.set(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000
            );
            this.scene.add(star);

            // Animation for twinkling
            this.animateStarTwinkle(star);
        }
    }

    animateStarTwinkle(star) {
        const duration = 2 + Math.random() * 3;
        const delay = Math.random() * 5;

        const animate = () => {
            const scale = 0.5 + Math.sin(Date.now() * 0.001) * 0.5;
            star.scale.set(scale, scale, scale);

            const opacity = 0.5 + Math.sin(Date.now() * 0.001) * 0.5;
            star.material.opacity = opacity;

            requestAnimationFrame(animate);
        };

        setTimeout(animate, delay * 1000);
    }

    createSolarSystem() {
        // Sun
        const sunGeometry = new THREE.SphereGeometry(10, 64, 64);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffeb3b,
            emissive: 0xff9800,
            emissiveIntensity: 1
        });

        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.set(0, 0, 0);
        this.sun.name = "Sun";
        this.scene.add(this.sun);
        this.sun.add(this.sunLight);

        // Sun glow effect
        const sunGlowGeometry = new THREE.SphereGeometry(15, 32, 32);
        const sunGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff9800,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
        this.sun.add(sunGlow);

        // Planet data
        this.planetData = [
            {
                name: "Mercury",
                color: 0x8a8a8a,
                radius: 2.44,
                distance: 57.9,
                orbitSpeed: 4.1,
                rotationSpeed: 0.017,
                tilt: 0.034,
                type: "Terrestrial planet",
                diameter: "4,880 km",
                mass: "3.301 × 10²³ kg",
                temp: "167 °C",
                orbitPeriod: "88 days"
            },
            {
                name: "Venus",
                color: 0xe6c229,
                radius: 6.05,
                distance: 108.2,
                orbitSpeed: 1.6,
                rotationSpeed: -0.004,
                tilt: 2.64,
                type: "Terrestrial planet",
                diameter: "12,104 km",
                mass: "4.867 × 10²⁴ kg",
                temp: "464 °C",
                orbitPeriod: "225 days"
            },
            {
                name: "Earth",
                color: 0x3498db,
                radius: 6.37,
                distance: 149.6,
                orbitSpeed: 1,
                rotationSpeed: 0.01,
                tilt: 0.41,
                type: "Terrestrial planet",
                diameter: "12,742 km",
                mass: "5.972 × 10²⁴ kg",
                temp: "15 °C",
                orbitPeriod: "365.25 days",
                hasAtmosphere: true,
                atmosphereColor: 0x3498db
            },
            {
                name: "Mars",
                color: 0xe67e22,
                radius: 3.39,
                distance: 227.9,
                orbitSpeed: 0.5,
                rotationSpeed: 0.009,
                tilt: 0.44,
                type: "Terrestrial planet",
                diameter: "6,779 km",
                mass: "6.417 × 10²³ kg",
                temp: "-65 °C",
                orbitPeriod: "687 days",
                hasAtmosphere: true,
                atmosphereColor: 0xe67e22
            },
            {
                name: "Jupiter",
                color: 0xf1c40f,
                radius: 69.9,
                distance: 778.5,
                orbitSpeed: 0.08,
                rotationSpeed: 0.02,
                tilt: 0.03,
                type: "Gas giant",
                diameter: "139,820 km",
                mass: "1.899 × 10²⁷ kg",
                temp: "-110 °C",
                orbitPeriod: "12 years"
            },
            {
                name: "Saturn",
                color: 0xf39c12,
                radius: 58.2,
                distance: 1434,
                orbitSpeed: 0.03,
                rotationSpeed: 0.018,
                tilt: 0.47,
                type: "Gas giant",
                diameter: "116,460 km",
                mass: "5.685 × 10²⁶ kg",
                temp: "-140 °C",
                orbitPeriod: "29.5 years",
                hasRings: true
            },
            {
                name: "Uranus",
                color: 0x1abc9c,
                radius: 25.4,
                distance: 2871,
                orbitSpeed: 0.01,
                rotationSpeed: 0.012,
                tilt: 1.71,
                type: "Ice giant",
                diameter: "50,724 km",
                mass: "8.682 × 10²⁵ kg",
                temp: "-195 °C",
                orbitPeriod: "84 years"
            },
            {
                name: "Neptune",
                color: 0x2980b9,
                radius: 24.6,
                distance: 4495,
                orbitSpeed: 0.006,
                rotationSpeed: 0.013,
                tilt: 0.72,
                type: "Ice giant",
                diameter: "49,244 km",
                mass: "1.024 × 10²⁶ kg",
                temp: "-200 °C",
                orbitPeriod: "165 years"
            }
        ];

        // Create planets
        this.planetData.forEach((planetData, index) => {
            // Adjust sizes and distances for better visualization
            const radius = planetData.radius * 0.5;
            const distance = planetData.distance * 0.1;

            // Planet
            const geometry = new THREE.SphereGeometry(radius, 64, 64);
            const material = new THREE.MeshPhongMaterial({
                color: planetData.color,
                shininess: 30,
                specular: 0x111111
            });

            const planet = new THREE.Mesh(geometry, material);
            planet.name = planetData.name;
            planet.position.x = distance;
            planet.castShadow = true;
            planet.receiveShadow = true;

            // Add tilt
            planet.rotation.z = planetData.tilt;

            // Add to scene and planets array
            this.scene.add(planet);
            this.planets.push(planet);

            // Atmosphere if applicable
            if (planetData.hasAtmosphere) {
                const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.05, 64, 64);
                const atmosphereMaterial = new THREE.MeshPhongMaterial({
                    color: planetData.atmosphereColor,
                    transparent: true,
                    opacity: 0.3,
                    shininess: 10,
                    specular: 0x111111
                });

                const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
                atmosphere.name = `${planetData.name} Atmosphere`;
                planet.add(atmosphere);
            }

            // Rings for Saturn
            if (planetData.hasRings) {
                const ringGeometry = new THREE.RingGeometry(radius * 1.5, radius * 2.5, 64);
                const ringMaterial = new THREE.MeshPhongMaterial({
                    color: 0xd2b48c,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });

                const rings = new THREE.Mesh(ringGeometry, ringMaterial);
                rings.name = `${planetData.name} Rings`;
                rings.rotation.x = Math.PI / 2;
                planet.add(rings);
            }

            // Orbit path
            const orbitGeometry = new THREE.RingGeometry(distance - 0.1, distance + 0.1, 64);
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1
            });

            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.name = `${planetData.name} Orbit`;
            orbit.rotation.x = Math.PI / 2;
            this.scene.add(orbit);
            this.orbits.push(orbit);

            // Add planet data to the planet object for easy access
            planet.userData = planetData;
        });
    }

    setupUI() {
        // Control panel toggle
        const panelHeader = document.getElementById('panelHeader');
        const panelContent = document.getElementById('panelContent');
        const toggleBtn = document.getElementById('toggleBtn');

        panelHeader.addEventListener('click', () => {
            document.getElementById('controlPanel').classList.toggle('collapsed');
            toggleBtn.textContent = document.getElementById('controlPanel').classList.contains('collapsed') ? '+' : '−';
        });

        // Sliders
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');

        speedSlider.addEventListener('input', () => {
            const value = speedSlider.value;
            this.simulationSpeed = value / 50;
            speedValue.textContent = `${this.simulationSpeed.toFixed(1)}x`;
        });

        const scaleSlider = document.getElementById('scaleSlider');
        const scaleValue = document.getElementById('scaleValue');

        scaleSlider.addEventListener('input', () => {
            this.planetScale = scaleSlider.value / 100;
            scaleValue.textContent = `${scaleSlider.value}%`;
        });

        const distanceSlider = document.getElementById('distanceSlider');
        const distanceValue = document.getElementById('distanceValue');

        distanceSlider.addEventListener('input', () => {
            this.distanceScale = distanceSlider.value / 100;
            distanceValue.textContent = `${distanceSlider.value}%`;
        });

        // Toggles
        const orbitsToggle = document.getElementById('orbitsToggle');
        orbitsToggle.addEventListener('change', (e) => {
            this.showOrbits = e.target.checked;
            this.orbits.forEach(orbit => {
                orbit.visible = this.showOrbits;
            });
        });

        const atmosphereToggle = document.getElementById('atmosphereToggle');
        atmosphereToggle.addEventListener('change', (e) => {
            this.showAtmosphere = e.target.checked;
            this.planets.forEach(planet => {
                planet.children.forEach(child => {
                    if (child.name.includes('Atmosphere')) {
                        child.visible = this.showAtmosphere;
                    }
                });
            });
        });

        const autoRotateToggle = document.getElementById('autoRotateToggle');
        autoRotateToggle.addEventListener('change', (e) => {
            this.autoRotate = e.target.checked;
            this.controls.autoRotate = this.autoRotate;
        });
    }

    setupEventListeners() {
        // Mouse move for tooltip and planet selection
        this.canvas.addEventListener('mousemove', (event) => {
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Update the raycaster
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Calculate objects intersecting the picking ray
            const intersects = this.raycaster.intersectObjects([this.sun, ...this.planets]);

            if (intersects.length > 0) {
                const object = intersects[0].object;

                // Show tooltip
                this.tooltip.style.left = `${event.clientX + 15}px`;
                this.tooltip.style.top = `${event.clientY + 15}px`;
                this.tooltip.textContent = object.name;
                this.tooltip.style.opacity = '1';

                // Highlight planet
                if (this.intersected !== object) {
                    if (this.intersected) {
                        this.intersected.material.emissive.setHex(this.intersected.currentHex);
                    }

                    this.intersected = object;
                    this.intersected.currentHex = this.intersected.material.emissive.getHex();
                    this.intersected.material.emissive.setHex(0xffffff);
                }
            } else {
                // Hide tooltip
                this.tooltip.style.opacity = '0';

                // Remove highlight
                if (this.intersected) {
                    this.intersected.material.emissive.setHex(this.intersected.currentHex);
                    this.intersected = null;
                }
            }
        });

        // Click to select planet and show info
        this.canvas.addEventListener('click', () => {
            if (this.intersected) {
                this.showPlanetInfo(this.intersected);
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case 'h':
                    this.showNotification('Controls: Mouse to look around, Scroll to zoom, Click to select planet', 3000);
                    break;
                case 'r':
                    this.resetCamera();
                    break;
                case ' ':
                    this.controls.autoRotate = !this.controls.autoRotate;
                    document.getElementById('autoRotateToggle').checked = this.controls.autoRotate;
                    break;
            }
        });
    }

    showPlanetInfo(planet) {
        const data = planet.userData;

        // Update planet info panel
        this.planetName.textContent = data.name;
        this.planetIcon.style.backgroundColor = `rgb(${data.color >> 16}, ${(data.color >> 8) & 255}, ${data.color & 255})`;
        this.planetIcon.style.boxShadow = `0 0 15px rgb(${data.color >> 16}, ${(data.color >> 8) & 255}, ${data.color & 255})`;
        this.planetType.textContent = data.type;
        this.planetDiameter.textContent = data.diameter;
        this.planetMass.textContent = data.mass;
        this.planetTemp.textContent = data.temp;
        this.planetOrbit.textContent = data.orbitPeriod;

        // Show panel with animation
        this.planetInfo.classList.remove('hidden');

        // Center camera on planet
        this.controls.target.copy(planet.position);

        // Set CSS custom properties for planet color
        this.planetInfo.style.setProperty('--planet-color', `rgb(${data.color >> 16}, ${(data.color >> 8) & 255}, ${data.color & 255})`);
        this.planetInfo.style.setProperty('--planet-glow', `rgba(${data.color >> 16}, ${(data.color >> 8) & 255}, ${data.color & 255}, 0.5)`);
    }

    showNotification(message, duration = 2000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    resetCamera() {
        this.controls.reset();
        this.camera.position.set(0, 50, 200);
        this.controls.target.set(0, 0, 0);
        this.planetInfo.classList.add('hidden');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        // Rotate sun
        this.sun.rotation.y += 0.002 * this.simulationSpeed;

        // Animate planets
        this.planets.forEach((planet, index) => {
            const data = this.planetData[index];

            // Update position based on orbit
            const angle = Date.now() * 0.0001 * data.orbitSpeed * this.simulationSpeed;
            const distance = data.distance * 0.1 * this.distanceScale;

            planet.position.x = Math.cos(angle) * distance;
            planet.position.z = Math.sin(angle) * distance;

            // Rotate planet
            planet.rotation.y += data.rotationSpeed * this.simulationSpeed;

            // Scale planet
            const scale = data.radius * 0.5 * this.planetScale;
            planet.scale.set(scale, scale, scale);

            // Scale atmosphere if exists
            planet.children.forEach(child => {
                if (child.name.includes('Atmosphere')) {
                    child.scale.set(1.05, 1.05, 1.05);
                }
            });
        });

        // Update controls
        this.controls.update();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the solar system when the window loads
window.addEventListener('load', () => {
    new SolarSystem();
});