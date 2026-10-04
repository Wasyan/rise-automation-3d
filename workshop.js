/* Procedural workshop details; no external models or textures are required. */
(function () {
  'use strict';
  let fenceResources;

  function labelTexture(THREE, title, subtitle, background = '#142b40') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#ff8c32';
    ctx.fillRect(0, 0, 18, 256);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = '900 78px Arial, sans-serif';
    ctx.fillText(title, 520, 113, 950);
    ctx.fillStyle = '#b9cedd';
    ctx.font = 'bold 35px Arial, sans-serif';
    ctx.fillText(subtitle, 520, 185, 940);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
  }

  function createFence(THREE) {
    if (!fenceResources) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#95b7c8';
      ctx.lineWidth = 4;
      for (let p = 0; p <= 256; p += 32) {
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      fenceResources = {
        steel: new THREE.MeshStandardMaterial({color: 0x285b78, metalness: 0.65, roughness: 0.4}),
        orange: new THREE.MeshStandardMaterial({color: 0xfa8a25, roughness: 0.6}),
        bolts: new THREE.MeshStandardMaterial({color: 0xb0c0cc, metalness: 0.8, roughness: 0.35}),
        mesh: new THREE.MeshStandardMaterial({map: texture, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.65}),
        panel: new THREE.PlaneGeometry(5.4, 2),
        post: new THREE.BoxGeometry(0.22, 2.8, 0.24),
        rail: new THREE.BoxGeometry(5.6, 0.17, 0.2),
        foot: new THREE.BoxGeometry(0.8, 0.09, 0.65),
        bolt: new THREE.CylinderGeometry(0.075, 0.075, 0.1, 6)
      };
    }
    const r = fenceResources;
    const group = new THREE.Group();
    const add = (geo, material, x, y, z) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh); return mesh;
    };
    for (const x of [-2.8, 2.8]) {
      add(r.post, r.steel, x, 1.4, 0);
      add(r.foot, r.steel, x, 0.06, 0);
      for (const z of [-0.2, 0.2]) add(r.bolt, r.bolts, x, 0.13, z);
    }
    add(r.rail, r.orange, 0, 2.65, 0);
    add(r.rail, r.steel, 0, 0.25, 0);
    const panel = add(r.panel, r.mesh, 0, 1.4, 0);
    panel.castShadow = false;
    return group;
  }

  function build(THREE, scene, {robotGroup, turntable, arm1, arm2, progStationGroup, warehouseGroup, floor}) {
    const steel = new THREE.MeshStandardMaterial({color: 0x91a6b7, roughness: 0.36, metalness: 0.7});
    const navy = new THREE.MeshStandardMaterial({color: 0x24384a, roughness: 0.68});
    const rubber = new THREE.MeshStandardMaterial({color: 0x15212b, roughness: 0.9});
    const orange = new THREE.MeshStandardMaterial({color: 0xf78827, roughness: 0.46, metalness: 0.25});
    const light = new THREE.MeshBasicMaterial({color: 0x6ae2d0, toneMapped: false});
    function mesh(parent, geo, material, x, y, z) {
      const part = new THREE.Mesh(geo, material);
      part.position.set(x, y, z); part.castShadow = true; part.receiveShadow = true;
      parent.add(part); return part;
    }
    function box(parent, size, material, position) {
      return mesh(parent, new THREE.BoxGeometry(...size), material, ...position);
    }
    function sign(parent, title, subtitle, size, position) {
      const material = new THREE.MeshBasicMaterial({map: labelTexture(THREE, title, subtitle), toneMapped: false});
      return mesh(parent, new THREE.PlaneGeometry(...size), material, ...position);
    }

    // Fine concrete grain and slab seams replace the uniform black plane.
    const concrete = document.createElement('canvas');
    concrete.width = concrete.height = 512;
    const ctx = concrete.getContext('2d');
    ctx.fillStyle = '#637582'; ctx.fillRect(0, 0, 512, 512);
    let seed = 421;
    for (let i = 0; i < 12000; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = seed % 512;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const y = seed % 512;
      ctx.fillStyle = i % 2 ? '#71828d' : '#586c79';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.strokeStyle = '#435863'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 510, 510);
    const concreteMap = new THREE.CanvasTexture(concrete);
    concreteMap.encoding = THREE.sRGBEncoding;
    concreteMap.wrapS = concreteMap.wrapT = THREE.RepeatWrapping;
    concreteMap.repeat.set(12, 10);
    floor.material.map = concreteMap;
    floor.material.color.setHex(0xa4b3c1);
    floor.material.metalness = 0.1;
    floor.material.needsUpdate = true;

    const workshop = new THREE.Group(); scene.add(workshop);
    // Low framing walls keep spawn lanes and the arena visible.
    box(workshop, [108, 1.8, 0.6], navy, [0, 0.9, -47]);
    box(workshop, [0.6, 1.8, 88], navy, [-54, 0.9, -3]);
    box(workshop, [0.6, 1.8, 88], navy, [54, 0.9, -3]);
    const wallSign = sign(workshop, 'RISE AUTOMATION', 'ИНЖЕНЕРНЫЙ ЦЕХ / УЧАСТОК 01', [21, 5.25], [0, 5.5, -46.6]);
    wallSign.castShadow = false;
    for (const x of [-43, -23, 23, 43]) {
      box(workshop, [0.8, 8, 0.8], navy, [x, 4, -46]);
      box(workshop, [0.82, 1.3, 0.82], orange, [x, 1.6, -46]);
    }
    for (const x of [-40, 40]) {
      box(workshop, [5, 3.8, 2.3], navy, [x, 1.9, -29]);
      sign(workshop, 'POWER', '400 V', [3.5, 0.9], [x, 2.8, -27.83]);
      box(workshop, [0.25, 0.4, 0.1], light, [x + 1.65, 2.15, -27.79]);
    }
    // A painted walkway and safety chevrons create a recognizable factory floor.
    const paint = new THREE.MeshBasicMaterial({color: 0xe8c45c});
    for (let i = -5; i <= 5; i++) {
      box(workshop, [3, 0.02, 0.13], paint, [i * 8, 0.1, 32]);
    }
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16;
      const stripe = box(workshop, [1.1, 0.02, 0.5], i % 2 ? orange : rubber,
        [Math.cos(angle) * 19.8, 0.105, Math.sin(angle) * 19.8]);
      stripe.rotation.y = -angle;
    }

    // Servo housings, bearing covers, bolts and cable routes follow existing joints.
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      mesh(robotGroup, new THREE.CylinderGeometry(0.13, 0.13, 0.16, 6), steel,
        Math.cos(a) * 4.1, 1.88, Math.sin(a) * 4.1);
    }
    sign(robotGroup, 'RISE', 'AUTOMATION', [3.3, 0.82], [0, 0.95, 5.03]);
    for (const [joint, y, radius] of [[turntable, 0.4, 1], [arm1, 0, 0.95], [arm2, -1.5, 0.76]]) {
      for (const x of [-1, 1]) {
        const cover = mesh(joint, new THREE.CylinderGeometry(radius, radius, 0.55, 20), steel, x, y, 0);
        cover.rotation.z = Math.PI / 2;
        const cap = mesh(joint, new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, 0.59, 16), navy, x * 1.04, y, 0);
        cap.rotation.z = Math.PI / 2;
      }
    }
    box(arm1, [0.24, 4, 0.28], rubber, [0.88, 0, -0.25]);
    box(arm2, [0.18, 3.2, 0.2], rubber, [0.68, 0, -0.2]);
    sign(arm1, 'RISE', 'R-06', [1.1, 0.65], [0, 0.6, 0.711]);
    for (const x of [-0.7, 0.7]) box(arm2, [0.22, 1.4, 0.36], steel, [x, 3.3, 0.4]);

    // Detailed programmer station with keyboard rows, monitor stands and chairs.
    for (const x of [-2.5, 2.5]) {
      box(progStationGroup, [0.24, 0.7, 0.24], steel, [x, 1.75, -0.6]);
      box(progStationGroup, [1.1, 0.12, 0.55], navy, [x, 1.65, -0.6]);
      sign(progStationGroup, 'RISE / CONTROL', '● ONLINE   > robot.ready()', [2.35, 1.15], [x, 2.22, -0.44]);
      box(progStationGroup, [1.55, 0.1, 0.52], rubber, [x, 1.69, 0.9]);
      for (let row = 0; row < 3; row++) box(progStationGroup, [1.35, 0.025, 0.055], steel, [x, 1.755, 0.74 + row * 0.14]);
      box(progStationGroup, [0.35, 0.13, 0.5], navy, [x + 1.15, 1.7, 0.9]);
      const chair = new THREE.Group(); chair.position.set(x, 0, 2.3); progStationGroup.add(chair);
      box(chair, [1.8, 0.25, 1.4], rubber, [0, 1.08, 0]);
      box(chair, [1.8, 1.55, 0.22], navy, [0, 2, 0.75]);
      mesh(chair, new THREE.CylinderGeometry(0.16, 0.25, 0.9, 10), steel, 0, 0.5, 0);
      box(chair, [2, 0.12, 0.2], navy, [0, 0.15, 0]);
      box(chair, [0.2, 0.12, 1.7], navy, [0, 0.15, 0]);
    }

    const wood = new THREE.MeshStandardMaterial({color: 0xad8054, roughness: 0.9});
    for (let i = 0; i < 5; i++) box(warehouseGroup, [7, 0.18, 0.65], wood, [0, 0.55, -2 + i * 0.85]);
    sign(warehouseGroup, 'СКЛАД ОГРАЖДЕНИЙ', 'СЕКЦИИ / АНКЕРЫ / КРЕПЁЖ', [10, 2.5], [0, 5, -3.9]);
    for (const x of [-4.7, 4.7]) box(warehouseGroup, [0.18, 4.8, 0.18], steel, [x, 2.4, -4]);
    for (let i = 0; i < 3; i++) box(warehouseGroup, [1.3, 0.8, 1.1], orange, [3, 0.8 + i * 0.8, 1.5]);
  }

  window.RiseWorkshop = {build, createFence};
}());
