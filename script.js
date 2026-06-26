const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cursorGlow = document.querySelector('.cursor-glow');
const progress = document.querySelector('.scroll-progress');
const canvas = document.querySelector('#global-scene');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

if (cursorGlow && !prefersReducedMotion) {
  window.addEventListener('pointermove', (event) => {
    cursorGlow.animate(
      { left: `${event.clientX}px`, top: `${event.clientY}px` },
      { duration: 650, fill: 'forwards', easing: 'cubic-bezier(.2,.7,.2,1)' }
    );
  }, { passive: true });
}

const updateScrollProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const amount = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (progress) progress.style.width = `${clamp(amount, 0, 100)}%`;
  document.documentElement.style.setProperty('--scroll-progress', amount.toFixed(2));
};
window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.primary-nav a')];
const setActiveNav = () => {
  const current = sections.findLast((section) => section.getBoundingClientRect().top <= 160);
  navLinks.forEach((link) => {
    link.toggleAttribute('aria-current', current && link.getAttribute('href') === `#${current.id}`);
  });
};
window.addEventListener('scroll', setActiveNav, { passive: true });
setActiveNav();

document.querySelectorAll('[data-tilt]').forEach((card) => {
  if (prefersReducedMotion) return;

  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 10;
    const rotateY = (x - 0.5) * 12;

    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
  });

  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
  });
});

document.querySelectorAll('.stats-grid article, .strength-list article, .system-map').forEach((element) => {
  element.addEventListener('pointermove', (event) => {
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    element.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }, { passive: true });
});

const animateCounter = (element) => {
  if (element.dataset.counted || element.dataset.static) return;
  const target = Number(element.dataset.count || 0);
  const suffix = element.dataset.suffix || '';
  const start = performance.now();
  const duration = 1200;
  element.dataset.counted = 'true';

  const tick = (now) => {
    const progressAmount = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progressAmount, 3);
    element.textContent = `${Math.round(target * eased)}${suffix}`;
    if (progressAmount < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('[data-count]').forEach(animateCounter);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.35 });

document.querySelectorAll('.stats-grid').forEach((grid) => statObserver.observe(grid));

async function initThreeScene() {
  if (!canvas) return;

  try {
    const THREE = await import('./vendor/three.module.js');
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    camera.position.set(0, 0.12, 11.4);

    const root = new THREE.Group();
    const ambientLayer = new THREE.Group();
    const nodeLayer = new THREE.Group();
    const lineLayer = new THREE.Group();
    const packetLayer = new THREE.Group();
    scene.add(root);
    root.add(ambientLayer, lineLayer, nodeLayer, packetLayer);

    const materials = {
      core: new THREE.MeshStandardMaterial({
        color: 0xf4e9dc,
        roughness: 0.52,
        metalness: 0.22,
        emissive: 0x4a2418,
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.44
      }),
      api: new THREE.MeshStandardMaterial({
        color: 0xe96d48,
        roughness: 0.54,
        metalness: 0.28,
        emissive: 0x2a0f09,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.5
      }),
      queue: new THREE.MeshStandardMaterial({
        color: 0xa8d879,
        roughness: 0.5,
        metalness: 0.2,
        emissive: 0x14220d,
        emissiveIntensity: 0.26,
        transparent: true,
        opacity: 0.5
      }),
      ai: new THREE.MeshStandardMaterial({
        color: 0xb9a4d6,
        roughness: 0.48,
        metalness: 0.18,
        emissive: 0x1d1428,
        emissiveIntensity: 0.24,
        transparent: true,
        opacity: 0.46
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0xf6eee3,
        roughness: 0.18,
        metalness: 0.16,
        transparent: true,
        opacity: 0.16
      })
    };

    const nodeSpecs = [
      { label: 'Circle K Core', position: [0.15, 0, 0.4], type: 'core', size: 0.42 },
      { label: 'ShopeeFood', position: [-2.85, 1.18, -0.2], type: 'api', size: 0.3 },
      { label: 'GrabMart', position: [2.85, 1.05, -0.12], type: 'queue', size: 0.32 },
      { label: 'POS', position: [-2.35, -1.38, 0], type: 'glass', size: 0.28 },
      { label: 'CMS', position: [2.2, -1.52, 0], type: 'glass', size: 0.28 },
      { label: 'Redis', position: [0, 2.15, -0.55], type: 'api', size: 0.24 },
      { label: 'RAG', position: [0.16, -2.16, -0.5], type: 'ai', size: 0.26 }
    ];

    const nodeMeshes = nodeSpecs.map((spec, index) => {
      const geometry = index === 0
        ? new THREE.IcosahedronGeometry(spec.size, 2)
        : new THREE.SphereGeometry(spec.size, 20, 20);
      const mesh = new THREE.Mesh(geometry, materials[spec.type]);
      mesh.position.set(...spec.position);
      mesh.rotation.set(index * 0.32, index * 0.23, index * 0.17);
      mesh.userData.base = new THREE.Vector3(...spec.position);
      mesh.userData.float = Math.random() * Math.PI * 2;
      nodeLayer.add(mesh);
      return mesh;
    });

    const curves = [
      [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
      [1, 5], [2, 5], [3, 6], [4, 6], [1, 3], [2, 4]
    ].map(([from, to], index) => {
      const start = new THREE.Vector3(...nodeSpecs[from].position);
      const end = new THREE.Vector3(...nodeSpecs[to].position);
      const midpoint = start.clone().lerp(end, 0.5);
      midpoint.z += 0.65 + (index % 3) * 0.18;
      midpoint.y += Math.sin(index) * 0.24;
      const curve = new THREE.CatmullRomCurve3([start, midpoint, end]);
      const tube = new THREE.TubeGeometry(curve, 32, 0.008, 8, false);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xe96d48 : index % 3 === 1 ? 0xa8d879 : 0xf6eee3,
        transparent: true,
        opacity: 0.18
      });
      const mesh = new THREE.Mesh(tube, lineMaterial);
      lineLayer.add(mesh);
      return curve;
    });

    const packetGeometry = new THREE.SphereGeometry(0.038, 14, 14);
    const packetMaterials = [
      new THREE.MeshBasicMaterial({ color: 0xffa07d }),
      new THREE.MeshBasicMaterial({ color: 0xc8f29a }),
      new THREE.MeshBasicMaterial({ color: 0xd3c0ec })
    ];
    const packets = curves.map((curve, index) => {
      const packet = new THREE.Mesh(packetGeometry, packetMaterials[index % packetMaterials.length]);
      packet.userData.curve = curve;
      packet.userData.speed = 0.05 + (index % 5) * 0.012;
      packet.userData.offset = index / curves.length;
      packetLayer.add(packet);
      return packet;
    });

    const rings = new THREE.Group();
    [
      [3.4, 0.008, 0xf6eee3, 0.07, Math.PI / 2.65],
      [2.35, 0.007, 0xa8d879, 0.1, Math.PI / 2.05],
      [4.3, 0.006, 0xe96d48, 0.07, Math.PI / 2.95]
    ].forEach(([radius, tube, color, opacity, rotation], index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 12, 180),
        new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity })
      );
      ring.rotation.x = rotation;
      ring.rotation.y = index * 0.28;
      rings.add(ring);
    });
    root.add(rings);

    const ribbonMaterials = [
      new THREE.LineBasicMaterial({ color: 0xf6eee3, transparent: true, opacity: 0.12 }),
      new THREE.LineBasicMaterial({ color: 0xa8d879, transparent: true, opacity: 0.1 }),
      new THREE.LineBasicMaterial({ color: 0xe96d48, transparent: true, opacity: 0.09 })
    ];
    const ribbons = Array.from({ length: 6 }, (_, index) => {
      const y = -2.6 + index * 1.05;
      const points = [];
      for (let i = 0; i <= 90; i += 1) {
        const t = i / 90;
        points.push(new THREE.Vector3(
          -5.6 + t * 11.2,
          y + Math.sin(t * Math.PI * 2 + index) * 0.32,
          -1.4 + Math.cos(t * Math.PI * 3 + index * 0.7) * 0.8
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, ribbonMaterials[index % ribbonMaterials.length].clone());
      line.rotation.z = (index - 2.5) * 0.08;
      line.userData.baseOpacity = line.material.opacity;
      ambientLayer.add(line);
      return line;
    });

    const satelliteGeometry = new THREE.SphereGeometry(0.035, 12, 12);
    const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xf6eee3, transparent: true, opacity: 0.52 });
    const satellites = Array.from({ length: 18 }, (_, index) => {
      const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial.clone());
      satellite.userData.radius = 1.8 + (index % 6) * 0.55;
      satellite.userData.speed = 0.12 + (index % 5) * 0.025;
      satellite.userData.phase = index * 0.74;
      satellite.userData.y = -2.4 + (index % 7) * 0.8;
      satellite.material.opacity = 0.2 + (index % 4) * 0.08;
      ambientLayer.add(satellite);
      return satellite;
    });

    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 220;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.8 + Math.random() * 4.2;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 5.8;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius * 0.42 + (Math.random() - 0.5) * 2.2;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({ color: 0xf4d7c6, size: 0.012, transparent: true, opacity: 0.42 })
    );
    root.add(particles);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.24, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xe96d48, transparent: true, opacity: 0.035, wireframe: true })
    );
    nodeLayer.add(halo);

    scene.add(new THREE.AmbientLight(0xf6eee3, 0.84));
    const keyLight = new THREE.PointLight(0xe96d48, 52, 18);
    keyLight.position.set(3.5, 3.1, 5.2);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xa8d879, 18, 14);
    fillLight.position.set(-3.7, -1.9, 3.6);
    scene.add(fillLight);

    const pointer = { x: 0, y: 0 };
    window.addEventListener('pointermove', (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      root.scale.setScalar(width < 760 ? 0.72 : width > 1280 ? 0.92 : 0.84);
      root.userData.baseX = width < 760 ? 0.35 : 2.25;
      root.userData.baseY = width < 760 ? -0.35 : 0.08;
    };
    window.addEventListener('resize', resize);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const scrollInfluence = window.scrollY * 0.00035;

      root.rotation.y = elapsed * 0.045 + pointer.x * 0.08 + scrollInfluence * 0.5;
      root.rotation.x = -0.05 + pointer.y * 0.04;
      root.position.x = (root.userData.baseX || 0) + Math.sin(elapsed * 0.16) * 0.12 + pointer.x * 0.08;
      root.position.y = (root.userData.baseY || 0) + Math.sin(elapsed * 0.4) * 0.05 - Math.sin(scrollInfluence * 1.2) * 0.16;
      rings.rotation.z = elapsed * 0.05;
      ambientLayer.rotation.z = Math.sin(elapsed * 0.09) * 0.08;
      particles.rotation.y = elapsed * 0.018;
      particles.rotation.x = Math.sin(elapsed * 0.14) * 0.035;
      halo.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.035);

      nodeMeshes.forEach((node, index) => {
        node.rotation.x += 0.003 + index * 0.00035;
        node.rotation.y += 0.004 + index * 0.0003;
        node.position.y = node.userData.base.y + Math.sin(elapsed * 0.9 + node.userData.float) * 0.055;
      });

      packets.forEach((packet, index) => {
        const t = (elapsed * packet.userData.speed + packet.userData.offset) % 1;
        packet.position.copy(packet.userData.curve.getPointAt(t));
        packet.scale.setScalar(1 + Math.sin(elapsed * 3 + index) * 0.16);
      });

      ribbons.forEach((ribbon, index) => {
        ribbon.position.y = Math.sin(elapsed * 0.28 + index) * 0.06;
        ribbon.material.opacity = ribbon.userData.baseOpacity + Math.sin(elapsed * 0.7 + index) * 0.025;
      });

      satellites.forEach((satellite, index) => {
        const angle = elapsed * satellite.userData.speed + satellite.userData.phase;
        satellite.position.set(
          Math.cos(angle) * satellite.userData.radius,
          satellite.userData.y + Math.sin(elapsed * 0.45 + index) * 0.08,
          Math.sin(angle) * satellite.userData.radius * 0.42
        );
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
  } catch (error) {
    drawFallbackScene();
  }
}

function drawFallbackScene() {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(rect.width * ratio, 1);
    canvas.height = Math.max(rect.height * ratio, 1);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();

  const points = [
    { label: 'Core', x: 0, y: 0 },
    { label: 'Shopee', x: -175, y: -90 },
    { label: 'Grab', x: 175, y: -78 },
    { label: 'POS', x: -150, y: 110 },
    { label: 'CMS', x: 152, y: 112 },
    { label: 'Redis', x: 0, y: -158 },
    { label: 'RAG', x: 0, y: 170 }
  ];
  const links = [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[1,5],[2,5],[3,6],[4,6]];

  const render = (time) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(time * 0.00016);

    context.strokeStyle = 'rgba(246,238,227,.16)';
    context.lineWidth = 1;
    for (let radius = 95; radius <= 250; radius += 55) {
      context.beginPath();
      context.ellipse(0, 0, radius, radius * 0.42, time * 0.0002, 0, Math.PI * 2);
      context.stroke();
    }

    links.forEach(([a, b], index) => {
      const from = points[a];
      const to = points[b];
      context.strokeStyle = index % 2 ? 'rgba(168,216,121,.46)' : 'rgba(233,109,72,.46)';
      context.lineWidth = 1.2;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 - 24, to.x, to.y);
      context.stroke();

      const t = (time * 0.00025 + index / links.length) % 1;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      context.fillStyle = index % 2 ? '#a8d879' : '#e96d48';
      context.shadowBlur = 20;
      context.shadowColor = context.fillStyle;
      context.beginPath();
      context.arc(x, y, 4.5, 0, Math.PI * 2);
      context.fill();
    });

    points.forEach((point, index) => {
      const size = index === 0 ? 28 : 18 + Math.sin(time * 0.002 + index) * 2;
      context.fillStyle = index === 0 ? '#f6eee3' : index % 2 ? '#e96d48' : '#a8d879';
      context.shadowBlur = 28;
      context.shadowColor = context.fillStyle;
      context.beginPath();
      context.roundRect(point.x - size, point.y - size, size * 2, size * 2, 9);
      context.fill();
    });

    context.restore();
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}

initThreeScene();
