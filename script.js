import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, starGroup, raycaster, mouse, controls;
let stars = [];
let globalDataList = []; 
let ringsToAnimate = []; 

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
    labelRenderer.domElement.style.left = '0px';
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

    setupSearchInput();
    loadData();
    animate();
}

function handleInteraction(event) {
    if (event.target.closest('#search-container') || event.target.closest('#popup')) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkIntersection();
}

function showPopupWithData(data, isPartnerStar) {
    const popupContent = document.querySelector(".popup-content");
    const partnerSec = document.getElementById("partner-section");
    const memorialHeader = document.getElementById("p-memorial");
    
    const deathRow = document.getElementById("death-row");
    const deathSpan = document.getElementById("p-death");
    const petnameRow = document.getElementById("petname-row");
    const petnameSpan = document.getElementById("p-petname");
    const placeRow = document.getElementById("place-row");
    const placeLabel = document.getElementById("p-place-label");
    const placeSpan = document.getElementById("p-place");
    const hobbiesRow = document.getElementById("hobbies-row");
    const hobbiesSpan = document.getElementById("p-hobbies");

    if (isPartnerStar) {
        document.getElementById("p-name").textContent = data.partner.name;
        document.getElementById("p-age").textContent = data.partner.age || "N/A";
        document.getElementById("p-born").textContent = data.partner.born || "N/A";
        
        const hasPartnerDied = (data.partner.death && data.partner.death.trim() !== "");
        if (hasPartnerDied) {
            popupContent.style.borderColor = "#ffffff"; 
            popupContent.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.4)";
            memorialHeader.style.display = "block";
            
            deathRow.style.display = "block";
            deathSpan.textContent = data.partner.death;
            placeLabel.textContent = "Legacy Place:"; 
        } else {
            popupContent.style.borderColor = "#ffcc00"; 
            popupContent.style.boxShadow = "0 0 30px rgba(255, 204, 0, 0.2)";
            memorialHeader.style.display = "none";
            
            deathRow.style.display = "none";
            placeLabel.textContent = "Current Base:"; 
        }

        if (data.partner.petname && data.partner.petname.trim() !== "") {
            petnameRow.style.display = "block";
            petnameSpan.textContent = data.partner.petname;
        } else {
            petnameRow.style.display = "none";
        }

        if (data.partner.place && data.partner.place.trim() !== "") {
            placeRow.style.display = "block";
            placeSpan.textContent = data.partner.place;
        } else {
            placeRow.style.display = "none";
        }

        if (data.partner.hobbies && data.partner.hobbies.trim() !== "") {
            hobbiesRow.style.display = "block";
            hobbiesSpan.textContent = data.partner.hobbies;
        } else {
            hobbiesRow.style.display = "none";
        }

        partnerSec.style.display = "none"; 
    } else {
        document.getElementById("p-name").textContent = data.name;
        document.getElementById("p-age").textContent = data.age || "N/A";
        document.getElementById("p-born").textContent = data.born || "N/A";
        
        const hasMainDied = (data.death && data.death.trim() !== "");
        if (hasMainDied) {
            popupContent.style.borderColor = "#ffffff";
            popupContent.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.4)";
            memorialHeader.style.display = "block";
            
            deathRow.style.display = "block";
            deathSpan.textContent = data.death;
            placeLabel.textContent = "Legacy Place:"; 
        } else {
            popupContent.style.borderColor = "#00ffcc";
            popupContent.style.boxShadow = "0 0 40px rgba(0, 255, 204, 0.2)";
            memorialHeader.style.display = "none";
            
            deathRow.style.display = "none";
            placeLabel.textContent = "Current Base:"; 
        }

        if (data.petname && data.petname.trim() !== "") {
            petnameRow.style.display = "block";
            petnameSpan.textContent = data.petname;
        } else {
            petnameRow.style.display = "none";
        }

        if (data.place && data.place.trim() !== "") {
            placeRow.style.display = "block";
            placeSpan.textContent = data.place;
        } else {
            placeRow.style.display = "none";
        }

        if (data.hobbies && data.hobbies.trim() !== "") {
            hobbiesRow.style.display = "block";
            hobbiesSpan.textContent = data.hobbies;
        } else {
            hobbiesRow.style.display = "none";
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

function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stars);
    if (intersects.length > 0) {
        const clickedObj = intersects[0].object;
        showPopupWithData(clickedObj.userData, clickedObj.isPartner);
    }
}

function loadData() {
    fetch("data.json").then(res => res.json()).then(data => {
        const root = d3.hierarchy(data);
        
        globalDataList = [];
        root.each(node => {
            globalDataList.push({ name: node.data.name, nodeReference: node, isPartner: false });
            if(node.data.partner) {
                globalDataList.push({ name: node.data.partner.name, nodeReference: node, isPartner: true });
            }
        });

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

    const hitboxGeo = new THREE.SphereGeometry(30, 8, 8); 
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    // Main Star
    const starGeo = new THREE.SphereGeometry(node.data.children ? 10 : 6, 24, 24);
    const starMat = new THREE.MeshPhongMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.5 });
    const star = new THREE.Mesh(starGeo, starMat);
    
    const starHitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    starHitbox.userData = node.data;
    starHitbox.isPartner = false;
    
    systemGroup.add(star);
    systemGroup.add(starHitbox);
    stars.push(starHitbox);
    node.meshRef = starHitbox; 

    if (node.data.death && node.data.death.trim() !== "") {
        const ringGeo = new THREE.RingGeometry(14, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2; 
        systemGroup.add(ring);
        ringsToAnimate.push(ring);
    }

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
        node.partnerMeshRef = partnerHitbox;

        if (node.data.partner.death && node.data.partner.death.trim() !== "") {
            const ringGeo = new THREE.RingGeometry(12, 14, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(35, 0, 0);
            ring.rotation.x = Math.PI / 2;
            systemGroup.add(ring);
            ringsToAnimate.push(ring);
        }
        
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
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00ffee, transparent: true, opacity: 0.6 }));
        starGroup.add(line);
        
        gsap.to(points[1], { x: targetX, y: targetY, z: targetZ, duration: 3.5, ease: "power4.out", onUpdate: () => lineGeo.setFromPoints([points[0], points[1]]) });
    }
    
    node.x_pos = targetX; node.y_pos = targetY; node.z_pos = targetZ;
    
    gsap.to(systemGroup.position, { 
        x: targetX, 
        y: targetY, 
        z: targetZ, 
        duration: 3.5, 
        delay: node.depth * 0.15, 
        ease: "power4.out" 
    });

    if (node.children) node.children.forEach(child => createGalaxyNode(child));
}

function setupSearchInput() {
    const input = document.getElementById("search-input");
    const resultsContainer = document.getElementById("search-results");

    input.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        resultsContainer.innerHTML = "";
        if (query === "") return;

        const matches = globalDataList.filter(item => item.name.toLowerCase().includes(query));
        
        matches.forEach(match => {
            const div = document.createElement("div");
            div.className = "search-item";
            div.textContent = match.name;
            div.addEventListener("click", () => {
                focusCameraOnNode(match.nodeReference, match.isPartner);
                resultsContainer.innerHTML = "";
                input.value = "";
            });
            resultsContainer.appendChild(div);
        });
    });
}

function focusCameraOnNode(node, isPartner) {
    const targetX = node.x_pos + (isPartner ? 35 : 0);
    const targetY = node.y_pos;
    const targetZ = node.z_pos;

    const isMobile = window.innerWidth < 768;

    gsap.to(controls.target, { x: targetX, y: targetY, z: targetZ, duration: 2, ease: "power2.inOut" });
    gsap.to(camera.position, { 
        x: targetX, 
        y: targetY + (isMobile ? 400 : 300), 
        z: targetZ + (isMobile ? 650 : 500), 
        duration: 2, 
        ease: "power2.inOut",
        onComplete: () => {
            showPopupWithData(node.data, isPartner);
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    starGroup.rotation.y += 0.0001; 
    
    ringsToAnimate.forEach(ring => {
        ring.rotation.z += 0.005;
    });

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

// FIX: Close karne par center smoothly Umiyashankar (0,0,0) par reset hoga
document.getElementById("closeBtn").onclick = () => {
    document.getElementById("popup").style.display = "none";
    gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.out" });
};