import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, starGroup, raycaster, mouse, controls;
let stars = [];

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const isMobile = window.innerWidth < 768;
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(0, isMobile ? 1200 : 800, isMobile ? 2000 : 1500); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('tree').appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'; 
    document.getElementById('tree').appendChild(labelRenderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 10000;

    starGroup = new THREE.Group();
    scene.add(starGroup);

    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 10; 
    mouse = new THREE.Vector2();

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    const starGeo = new THREE.BufferGeometry();
    const starCoords = [];
    for(let i=0; i<6000; i++) {
        starCoords.push((Math.random()-0.5)*12000, (Math.random()-0.5)*12000, (Math.random()-0.5)*12000);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x444444, size: 1.2 })));

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', (e) => {
        mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        checkIntersection();
    }, { passive: false });
    
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
        const clickedObj = intersects[0].object;
        const data = clickedObj.userData;
        const isPartnerStar = clickedObj.isPartner;
        
        const popupContent = document.querySelector(".popup-content");
        const partnerSec = document.getElementById("partner-section");
        const deathRow = document.getElementById("death-row");
        const deathSpan = document.getElementById("p-death");

        if (isPartnerStar) {
            popupContent.style.borderColor = "#ffcc00"; 
            document.getElementById("p-name").textContent = data.partner.name;
            document.getElementById("p-age").textContent = data.partner.age || "N/A";
            document.getElementById("p-born").textContent = data.partner.born || "N/A";
            document.getElementById("p-occupation").textContent = data.partner.occupation || "N/A";
            
            if (data.partner.death && data.partner.death.trim() !== "") {
                deathRow.style.display = "block";
                deathSpan.textContent = data.partner.death;
            } else {
                deathRow.style.display = "none";
            }
            partnerSec.style.display = "none"; 
        } else {
            popupContent.style.borderColor = "#00ffcc";
            document.getElementById("p-name").textContent = data.name;
            document.getElementById("p-age").textContent = data.age || "N/A";
            document.getElementById("p-born").textContent = data.born || "N/A";
            document.getElementById("p-occupation").textContent = data.occupation || "N/A";
            
            if (data.death && data.death.trim() !== "") {
                deathRow.style.display = "block";
                deathSpan.textContent = data.death;
            } else {
                deathRow.style.display = "none";
            }

            if(data.partner) {
                partnerSec.style.display = "block";
                document.getElementById("p-partner").textContent = data.partner.name;
            } else {
                partnerSec.style.display = "none";
            }
        }
        document.getElementById("popup").style.display = "flex";
    }
}

function loadData() {
    fetch("data.json").then(res => res.json()).then(data => {
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
    const radius = node.depth * 350; 
    const targetX = radius * Math.cos(node.angle);
    const targetZ = radius * Math.sin(node.angle);
    const targetY = (node.depth * -180); 

    const systemGroup = new THREE.Group();
    systemGroup.position.set(0, 0, 0);
    starGroup.add(systemGroup);

    const hitboxGeo = new THREE.SphereGeometry(30, 8, 8); // Slightly larger hitbox
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    // Main Member Star
    const starGeo = new THREE.SphereGeometry(node.data.children ? 10 : 6, 24, 24);
    const starMat = new THREE.MeshPhongMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.5 });
    const star = new THREE.Mesh(starGeo, starMat);
    
    const starHitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    starHitbox.userData = node.data;
    starHitbox.isPartner = false;
    
    systemGroup.add(star);
    systemGroup.add(starHitbox);
    stars.push(starHitbox);

    // Partner Star
    if (node.data.partner) {
        const pGeo = new THREE.SphereGeometry(8, 24, 24);
        const pMat = new THREE.MeshPhongMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.5 });
        const pStar = new THREE.Mesh(pGeo, pMat);
        pStar.position.set(35, 0, 0); 
        
        const partnerHitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        partnerHitbox.position.set(35, 0, 0);
        partnerHitbox.userData = node.data; 
        partnerHitbox.isPartner = true;
        
        systemGroup.add(pStar);
        systemGroup.add(partnerHitbox);
        stars.push(partnerHitbox);
        
        const pDiv = document.createElement('div');
        pDiv.className = 'label partner-label';
        pDiv.textContent = node.data.partner.name.split(' ')[0];
        const pLabel = new CSS2DObject(pDiv);
        pLabel.position.set(35, -25, 0);
        systemGroup.add(pLabel);
    }

    const nameDiv = document.createElement('div');
    nameDiv.className = 'label';
    nameDiv.textContent = node.data.name.split(' ')[0]; 
    const label = new CSS2DObject(nameDiv);
    label.position.set(0, 30, 0); 
    systemGroup.add(label);

    if (node.parent) {
        const points = [new THREE.Vector3(node.parent.x_pos || 0, node.parent.y_pos || 0, node.parent.z_pos || 0), new THREE.Vector3(0, 0, 0)];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        // FIX: Increased opacity and set to solid Cyan for better visibility
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ 
            color: 0x00ffee, 
            transparent: true, 
            opacity: 0.6 
        }));
        starGroup.add(line);
        gsap.to(points[1], { x: targetX, y: targetY, z: targetZ, duration: 2.5, onUpdate: () => lineGeo.setFromPoints([points[0], points[1]]) });
    }
    node.x_pos = targetX; node.y_pos = targetY; node.z_pos = targetZ;
    gsap.to(systemGroup.position, { x: targetX, y: targetY, z: targetZ, duration: 2.5, ease: "expo.out" });
    if (node.children) node.children.forEach(child => createGalaxyNode(child));
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    starGroup.rotation.y += 0.0001; 
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

document.getElementById("closeBtn").onclick = () => document.getElementById("popup").style.display = "none";