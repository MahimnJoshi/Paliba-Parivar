import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, starGroup, raycaster, mouse, controls;
let stars = [];

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Dynamic Camera Distance for Mobile
    const isMobile = window.innerWidth < 768;
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 15000);
    camera.position.set(0, isMobile ? 800 : 600, isMobile ? 1500 : 1100); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance cap for mobile
    document.getElementById('tree').appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'; 
    document.getElementById('tree').appendChild(labelRenderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 5000; // Prevent getting lost in space

    starGroup = new THREE.Group();
    scene.add(starGroup);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    // Background Stars
    const starGeo = new THREE.BufferGeometry();
    const starCoords = [];
    for(let i=0; i<6000; i++) {
        starCoords.push((Math.random()-0.5)*8000, (Math.random()-0.5)*8000, (Math.random()-0.5)*8000);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x888888, size: 1.5 })));

    // Handle touch and click
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', (e) => {
        // Simple touch handling for mobile
        mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        checkIntersection();
    });
    window.addEventListener('resize', onWindowResize);

    loadData();
    animate();
}

function handleInteraction(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkIntersection();
}

function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stars);
    if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        document.getElementById("p-name").textContent = data.name;
        document.getElementById("p-age").textContent = data.age || "N/A";
        document.getElementById("p-born").textContent = data.born || "N/A";
        document.getElementById("p-occupation").textContent = data.occupation || "N/A";
        document.getElementById("popup").style.display = "flex";
    }
}

function loadData() {
    fetch("data.json").then(res => res.json()).then(data => {
        while(starGroup.children.length > 0) { starGroup.remove(starGroup.children[0]); }
        stars = [];
        const root = d3.hierarchy(data);
        root.each(node => {
            if (!node.parent) {
                node.angle = 0; node.angleRange = Math.PI * 2;
            } else {
                const siblingIdx = node.parent.children.indexOf(node);
                node.angleRange = node.parent.angleRange / node.parent.children.length;
                node.angle = (node.parent.angle - node.parent.angleRange/2) + (siblingIdx + 0.5) * node.angleRange;
            }
        });
        createGalaxyNode(root);
    });
}

function createGalaxyNode(node) {
    const radius = node.depth * 250; 
    const targetX = radius * Math.cos(node.angle);
    const targetZ = radius * Math.sin(node.angle);
    const targetY = (node.depth * -130); 

    const starGeo = new THREE.SphereGeometry(node.data.children ? 6 : 3, 24, 24);
    const starMat = new THREE.MeshPhongMaterial({ color: node.depth === 0 ? 0xffcc00 : 0x00ffcc });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(0, 0, 0); 
    star.userData = node.data;
    starGroup.add(star);
    stars.push(star);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'label';
    nameDiv.textContent = node.data.name.split(' ')[0]; 
    const label = new CSS2DObject(nameDiv);
    label.position.set(0, 18, 0); 
    star.add(label);

    if (node.parent) {
        const points = [new THREE.Vector3(node.parent.x_pos || 0, node.parent.y_pos || 0, node.parent.z_pos || 0), new THREE.Vector3(0, 0, 0)];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.2 }));
        starGroup.add(line);
        gsap.to(points[1], { x: targetX, y: targetY, z: targetZ, duration: 2.5, onUpdate: () => lineGeo.setFromPoints([points[0], points[1]]) });
    }
    node.x_pos = targetX; node.y_pos = targetY; node.z_pos = targetZ;
    gsap.to(star.position, { x: targetX, y: targetY, z: targetZ, duration: 2.5, ease: "expo.out" });
    if (node.children) node.children.forEach(child => createGalaxyNode(child));
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    starGroup.rotation.y += 0.00015; 
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function onWindowResize() {
    const isMobile = window.innerWidth < 768;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, isMobile ? 800 : 600, isMobile ? 1500 : 1100); 
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

document.getElementById("closeBtn").onclick = () => document.getElementById("popup").style.display = "none";