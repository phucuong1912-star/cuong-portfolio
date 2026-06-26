const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cursorGlow = document.querySelector('.cursor-glow');
const progress = document.querySelector('.scroll-progress');
const canvas = document.querySelector('#system-scene');

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

async function initThreeScene() {
  if (!canvas) return;

  try {
    const THREE = await import('./vendor/three.module.js');
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 8.4);

    const group = new THREE.Group();
    const nodes = new THREE.Group();
    const links = new THREE.Group();
    scene.add(group);
    group.add(nodes, links);

    const mainMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b3d,
      roughness: 0.42,
      metalness: 0.74,
      emissive: 0x261008,
      emissiveIntensity: 0.45
    });
    const limeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb7ff5a,
      roughness: 0.36,
      metalness: 0.54,
      emissive: 0x17240a,
      emissiveIntensity: 0.36
    });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8f2e8,
      roughness: 0.22,
      metalness: 0.2,
      transparent: true,
      opacity: 0.2
    });
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffb28f, transparent: true, opacity: 0.42 });

    const positions = [
      [-2.6, 1.42, 0],
      [0, 2.05, -.45],
      [2.55, 1.18, .2],
      [-2.05, -.7, .35],
      [0.25, -.1, 1.15],
      [2.2, -.95, -.1],
      [-.3, -2.05, .18]
    ];

    positions.forEach((position, index) => {
      const geometry = index === 4
        ? new THREE.IcosahedronGeometry(0.58, 1)
        : new THREE.BoxGeometry(0.68, 0.68, 0.68, 2, 2, 2);
      const material = index % 3 === 0 ? mainMaterial : index % 3 === 1 ? limeMaterial : glassMaterial;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(index * 0.4, index * 0.25, index * 0.12);
      mesh.userData.float = Math.random() * Math.PI * 2;
      nodes.add(mesh);
    });

    const connect = (a, b) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...positions[a]),
        new THREE.Vector3(...positions[b])
      ]);
      links.add(new THREE.Line(geometry, lineMaterial));
    };
    [[0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [3, 4], [4, 5], [3, 6], [5, 6], [4, 6]].forEach(([a, b]) => connect(a, b));

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf8f2e8, wireframe: true, transparent: true, opacity: 0.14 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.01, 12, 160), ringMaterial);
    ring.rotation.x = Math.PI / 2.7;
    group.add(ring);

    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 160;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 5.6;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({ color: 0xf8d3bd, size: 0.018, transparent: true, opacity: 0.58 })
    );
    group.add(particles);

    scene.add(new THREE.AmbientLight(0xf8f2e8, 0.85));
    const keyLight = new THREE.PointLight(0xff7a45, 46, 16);
    keyLight.position.set(3.4, 3.2, 4.8);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xb7ff5a, 12, 12);
    fillLight.position.set(-3.5, -1.8, 3.5);
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
    };
    window.addEventListener('resize', resize);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y = elapsed * 0.12 + pointer.x * 0.16;
      group.rotation.x = -0.1 + pointer.y * 0.08;
      ring.rotation.z = elapsed * 0.18;
      particles.rotation.y = elapsed * 0.035;

      nodes.children.forEach((node, index) => {
        node.rotation.x += 0.006 + index * 0.0007;
        node.rotation.y += 0.008 + index * 0.0005;
        node.position.y = positions[index][1] + Math.sin(elapsed * 1.2 + node.userData.float) * 0.07;
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

  const render = (time) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(time * 0.00018);

    const points = [
      [-160, -80], [0, -135], [160, -70], [-120, 75], [20, 10], [145, 90], [-5, 150]
    ];

    context.strokeStyle = 'rgba(255,178,143,.46)';
    context.lineWidth = 1;
    [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[5,6],[4,6]].forEach(([a,b]) => {
      context.beginPath();
      context.moveTo(points[a][0], points[a][1]);
      context.lineTo(points[b][0], points[b][1]);
      context.stroke();
    });

    points.forEach(([x, y], index) => {
      const size = 18 + Math.sin(time * 0.002 + index) * 3;
      context.fillStyle = index % 2 ? 'rgba(183,255,90,.82)' : 'rgba(255,107,61,.86)';
      context.shadowBlur = 28;
      context.shadowColor = context.fillStyle;
      context.beginPath();
      context.roundRect(x - size, y - size, size * 2, size * 2, 8);
      context.fill();
    });

    context.restore();
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}

initThreeScene();


