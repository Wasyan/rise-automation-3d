/* Reference-inspired industrial robot for Three.js r128. Classic browser script. */
(function () {
  'use strict';

  const caches = new WeakMap();

  function resources(THREE) {
    if (caches.has(THREE)) return caches.get(THREE);
    const boxes = new Map();
    const cylinders = new Map();
    const sphere = new THREE.SphereGeometry(1, 20, 12);
    const materials = new Map();
    const decals = new Map();
    const r = {
      mat(hex, metal, rough) {
        const key = [hex, metal || 0, rough === undefined ? .5 : rough].join('/');
        if (!materials.has(key)) {
          const material = new THREE.MeshStandardMaterial({
            color: hex,
            metalness: metal || 0,
            roughness: rough === undefined ? .5 : rough
          });
          material.color.convertSRGBToLinear();
          materials.set(key, material);
        }
        return materials.get(key);
      },
      box(w, h, d) {
        const key = [w, h, d].join('/');
        if (!boxes.has(key)) boxes.set(key, new THREE.BoxGeometry(w, h, d));
        return boxes.get(key);
      },
      cylinder(top, bottom, height, segments) {
        const key = [top, bottom, height, segments || 20].join('/');
        if (!cylinders.has(key)) cylinders.set(key, new THREE.CylinderGeometry(top, bottom, height, segments || 20));
        return cylinders.get(key);
      },
      sphere() { return sphere; },
      decal(lines, color) {
        const key = lines.join('|') + '/' + color;
        if (decals.has(key)) return decals.get(key);
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 1024, 512);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        if (lines.length === 1) {
          ctx.font = '900 360px Arial Black, Arial, sans-serif';
          ctx.fillText(lines[0], 512, 256, 950);
        } else {
          ctx.font = '900 260px Arial Black, Arial, sans-serif';
          ctx.fillText(lines[0], 512, 150, 950);
          ctx.font = 'bold 145px Arial, sans-serif';
          ctx.fillText(lines[1], 512, 370, 950);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = 4;
        const material = new THREE.MeshBasicMaterial({
          map: texture, transparent: true, depthWrite: false,
          side: THREE.DoubleSide, toneMapped: false
        });
        decals.set(key, material);
        return material;
      }
    };
    caches.set(THREE, r);
    return r;
  }

  function builder(THREE, r) {
    function add(parent, geometry, material, x, y, z, shadow) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x || 0, y || 0, z || 0);
      mesh.castShadow = shadow !== false;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    // Lay paint and small safety plates against the actual curved casting.
    // A flat decal would cut into the face near the wide end of each arm.
    function projected(parent, targets, w, h, x, y, material, lift) {
      parent.updateWorldMatrix(true, true);
      const geo = new THREE.PlaneGeometry(w, h, 12, 4);
      const pos = geo.attributes.position;
      const q = parent.getWorldQuaternion(new THREE.Quaternion());
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      const ray = new THREE.Raycaster();
      for (let i = 0; i < pos.count; i++) {
        const origin = parent.localToWorld(new THREE.Vector3(x + pos.getX(i), y + pos.getY(i), 10));
        ray.set(origin, direction);
        const hits = ray.intersectObjects(targets, false);
        if (hits.length) pos.setZ(i, parent.worldToLocal(hits[0].point.clone()).z + lift);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return add(parent, geo, material, x, y, 0, false);
    }
    return {
      box(parent, w, h, d, color, x, y, z, metal, shadow) {
        return add(parent, r.box(w, h, d), r.mat(color, metal), x, y, z, shadow);
      },
      cyl(parent, top, bottom, height, color, x, y, z, metal, segments, shadow) {
        return add(parent, r.cylinder(top, bottom, height, segments), r.mat(color, metal), x, y, z, shadow);
      },
      ellipsoid(parent, sx, sy, sz, color, x, y, z, metal) {
        const mesh = add(parent, r.sphere(), r.mat(color, metal), x, y, z);
        mesh.scale.set(sx, sy, sz);
        return mesh;
      },
      // Elliptical cast section swept through the joint centres. Each section is
      // [x, y, half-width in the arm plane, half-depth]. The arm stays one solid
      // piece as its shoulders, waist and joint ends change thickness.
      casting(parent, sections, color, metal) {
        const path = new THREE.CatmullRomCurve3(sections.map(s => new THREE.Vector3(s[0], s[1], 0)), false, 'centripetal');
        const rows = 32, sides = 16;
        const vertices = [], indices = [];
        for (let i = 0; i <= rows; i++) {
          const t = i / rows;
          const p = path.getPoint(t);
          const d = path.getTangent(t).normalize();
          const sample = t * (sections.length - 1);
          const k = Math.min(sections.length - 2, Math.floor(sample));
          const u = sample - k;
          const width = sections[k][2] * (1 - u) + sections[k + 1][2] * u;
          const depth = sections[k][3] * (1 - u) + sections[k + 1][3] * u;
          for (let j = 0; j < sides; j++) {
            const a = j * Math.PI * 2 / sides;
            vertices.push(p.x + d.y * width * Math.cos(a), p.y - d.x * width * Math.cos(a), depth * Math.sin(a));
          }
        }
        for (let i = 0; i < rows; i++) for (let j = 0; j < sides; j++) {
          const a = i * sides + j, b = (i + 1) * sides + j;
          const c = (i + 1) * sides + (j + 1) % sides, d = i * sides + (j + 1) % sides;
          indices.push(a, b, c, a, c, d);
        }
        const firstCap = vertices.length / 3;
        vertices.push(sections[0][0], sections[0][1], 0);
        const lastCap = vertices.length / 3;
        const end = sections[sections.length - 1];
        vertices.push(end[0], end[1], 0);
        for (let j = 0; j < sides; j++) {
          indices.push(firstCap, (j + 1) % sides, j);
          indices.push(lastCap, rows * sides + j, rows * sides + (j + 1) % sides);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return add(parent, geometry, r.mat(color, metal), 0, 0, 0);
      },
      link(parent, from, to, radius, color, metal) {
        const a = new THREE.Vector3(from[0], from[1], from[2]);
        const end = new THREE.Vector3(to[0], to[1], to[2]);
        const delta = end.clone().sub(a);
        const mesh = add(parent, r.cylinder(radius, radius, delta.length(), 16), r.mat(color, metal), 0, 0, 0);
        mesh.position.copy(a.add(end).multiplyScalar(.5));
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
        return mesh;
      },
      label(parent, lines, color, w, h, x, y, z, back) {
        const plane = add(parent, new THREE.PlaneGeometry(w, h), r.decal(lines, color), x, y, z, false);
        if (back) plane.rotation.y = Math.PI;
        return plane;
      },
      paintedLabel(parent, targets, lines, color, w, h, x, y, lift) {
        return projected(parent, targets, w, h, x, y, r.decal(lines, color), lift || .035);
      },
      paintedPlate(parent, targets, w, h, x, y, color) {
        return projected(parent, targets, w, h, x, y, r.mat(color, 0), .025);
      },
      tube(parent, coords, radius, color, metal) {
        const points = coords.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, 18, radius, 6, false);
        return add(parent, geometry, r.mat(color, metal), 0, 0, 0);
      }
    };
  }

  function create(THREE) {
    const r = resources(THREE);
    const b = builder(THREE, r);
    const C = {
      orange: 0xef6815, lightOrange: 0xf77b24, shadowOrange: 0xb6480b,
      dark: 0x151b20, rubber: 0x222a2e, steel: 0xa5b0b5,
      silver: 0xd0d8d9, warning: 0xf3d138
    };
    const group = new THREE.Group();
    group.name = 'KUKA KR500HA r2300';

    // A1: heavy pedestal and broad, smoothly rounded shoulder.
    b.cyl(group, 3.04, 3.18, .36, C.shadowOrange, 0, .20, 0, .25, 32);
    b.cyl(group, 2.90, 3.05, .28, C.orange, 0, .49, 0, .25, 32);
    b.cyl(group, 2.56, 2.77, 2.06, C.dark, 0, 1.63, 0, .25, 32);
    b.cyl(group, 2.62, 2.67, .19, C.steel, 0, 2.72, 0, .72, 32);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const x = Math.cos(a) * 2.86, z = Math.sin(a) * 2.86;
      b.cyl(group, .18, .18, .12, C.dark, x, .54, z, .5, 6, false);
      b.cyl(group, .075, .075, .13, C.steel, x, .62, z, .8, 6, false);
    }
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      const rib = b.box(group, .11, 1.25, .10, C.rubber,
        Math.sin(a) * 2.53, 1.59, Math.cos(a) * 2.53, .08);
      rib.rotation.y = a;
    }
    const turntable = new THREE.Group();
    turntable.position.y = 2.78;
    group.add(turntable);
    b.cyl(turntable, 2.55, 2.58, .28, C.orange, 0, .06, 0, .24, 32);
    b.cyl(turntable, 2.20, 2.47, .42, C.orange, 0, .39, 0, .22, 32);
    const shoulderShell = b.ellipsoid(turntable, 2.20, 1.24, 1.63, C.orange, -.08, 1.00, 0, .16);
    b.ellipsoid(turntable, 1.33, .77, 1.49, C.lightOrange, -.65, 1.58, 0, .13);
    b.ellipsoid(turntable, 1.03, .62, 1.10, C.shadowOrange, 1.16, 1.00, -.30, .13);
    b.paintedLabel(turntable, [shoulderShell], ['KUKA'], '#15191b', .72, .31, 1.40, 1.02);
    b.paintedPlate(turntable, [shoulderShell], .42, .16, 1.62, .72, C.warning);
    b.paintedLabel(turntable, [shoulderShell], ['!'], '#1b1b1b', .15, .13, 1.62, .72, .05);

    // A2: one cast column, flared at the shoulder and narrower near the elbow.
    const arm1 = new THREE.Group();
    arm1.position.set(.05, 1.75, 0);
    turntable.add(arm1);
    const lowerCast = b.casting(arm1, [
      [0, -.10, 1.47, 1.13], [.54, 1.24, 1.44, 1.13],
      [1.43, 2.93, 1.14, 1.00], [2.35, 4.69, .91, .84],
      [3.58, 6.26, 1.01, .88], [3.75, 6.43, .91, .84]
    ], C.orange, .16);
    b.ellipsoid(arm1, 1.60, 1.43, 1.25, C.orange, .05, .15, 0, .17);
    b.ellipsoid(arm1, 1.28, .94, 1.15, C.lightOrange, 1.02, 1.18, -.15, .13);
    b.ellipsoid(arm1, .68, .72, 1.08, C.orange, 3.43, 6.04, 0, .16);
    // The oversized dark A2 disc dominates the reference silhouette.
    b.cyl(arm1, 1.31, 1.31, .20, C.shadowOrange, -.18, .16, 1.19, .13, 32).rotation.x = Math.PI / 2;
    b.cyl(arm1, 1.16, 1.16, .23, C.dark, -.18, .16, 1.35, .20, 32).rotation.x = Math.PI / 2;
    b.cyl(arm1, .93, .93, .09, C.rubber, -.18, .16, 1.51, .12, 32).rotation.x = Math.PI / 2;
    b.cyl(arm1, .38, .38, .12, C.dark, -.18, .16, 1.58, .25, 26).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      b.cyl(arm1, .050, .050, .045, C.steel,
        -.18 + Math.cos(a) * 1.05, .16 + Math.sin(a) * 1.05, 1.51, .72, 6, false).rotation.x = Math.PI / 2;
    }
    b.paintedLabel(arm1, [lowerCast], ['KUKA'], '#17191b', .87, .36, 1.06, 1.79);
    b.tube(arm1, [[.45,1.49,1.10],[1.32,2.88,1.00],[2.26,4.63,.80],[3.29,5.88,.77]], .026, C.shadowOrange, .08);
    b.tube(arm1, [[-1.01,.66,-.95],[-1.15,1.73,-1.11],[.69,4.28,-.94],[2.81,6.20,-.87]], .13, C.rubber);
    b.tube(arm1, [[-1.19,.52,-1.12],[-1.35,1.87,-1.28],[.43,4.46,-1.13],[2.69,6.32,-1.03]], .06, C.dark);
    b.link(arm1, [-.62, 1.03, -1.26], [1.68, 4.17, -1.20], .27, C.dark, .25);
    b.link(arm1, [1.18, 3.48, -1.20], [2.17, 4.84, -1.20], .18, C.steel, .78);
    b.ellipsoid(arm1, .31, .31, .31, C.rubber, -.62, 1.03, -1.26, .3);
    b.ellipsoid(arm1, .31, .31, .31, C.rubber, 2.17, 4.84, -1.20, .3);

    // A3: broad elbow drive and the long gently tapered horizontal arm.
    const arm2 = new THREE.Group();
    arm2.position.set(3.65, 6.35, 0);
    arm1.add(arm2);
    b.cyl(arm2, 1.12, 1.12, 2.20, C.dark, 0, 0, 0, .28, 28).rotation.x = Math.PI / 2;
    b.ellipsoid(arm2, 1.38, 1.03, 1.08, C.orange, .24, -.03, 0, .17);
    b.ellipsoid(arm2, 1.02, .76, .91, C.orange, 1.13, -.10, -.08, .16);
    const upperCast = b.casting(arm2, [
      [.14, .02, 1.03, 1.03], [-1.22, .04, .99, .88],
      [-2.71, -.09, .83, .75], [-4.62, -.22, .70, .65],
      [-6.11, -.29, .62, .57], [-7.02, -.38, .67, .57]
    ], C.orange, .16);
    b.ellipsoid(arm2, .78, .62, .59, C.orange, -6.96, -.38, 0, .16);
    b.cyl(arm2, 1.03, 1.03, .21, C.orange, 0, 0, 1.13, .17, 28).rotation.x = Math.PI / 2;
    b.cyl(arm2, .83, .83, .17, C.dark, 0, 0, 1.30, .3, 28).rotation.x = Math.PI / 2;
    b.cyl(arm2, .37, .37, .24, C.steel, 0, 0, 1.41, .78, 24).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      b.cyl(arm2, .05, .05, .055, C.steel,
        Math.cos(a) * .70, Math.sin(a) * .70, 1.39, .75, 6, false).rotation.x = Math.PI / 2;
    }
    b.ellipsoid(arm2, .60, .60, .80, C.dark, 1.30, .72, -.43, .28);
    b.cyl(arm2, .48, .48, .48, C.dark, 1.37, .80, -.92, .28, 24).rotation.x = Math.PI / 2;
    b.cyl(arm2, .36, .36, .20, C.steel, 1.37, .80, -1.19, .72, 24).rotation.x = Math.PI / 2;
    b.paintedLabel(arm2, [upperCast], ['KUKA'], '#17191b', 2.08, .55, -3.48, -.18);
    b.paintedPlate(arm2, [upperCast], .47, .19, -5.56, -.50, C.warning);
    b.paintedLabel(arm2, [upperCast], ['!'], '#1b1b1b', .16, .15, -5.56, -.50, .05);
    b.tube(arm2, [[.37,.88,-.83],[-.98,1.22,-.92],[-2.55,.89,-.78],[-4.57,.49,-.70],[-6.44,.24,-.59]], .12, C.rubber);
    b.tube(arm2, [[.31,.98,-1.00],[-1.00,1.36,-1.10],[-2.56,1.04,-.96],[-4.56,.64,-.85],[-6.43,.37,-.75]], .052, C.dark);
    for (let i = 0; i < 4; i++) {
      const x = -1.27 - i * 1.31;
      b.box(arm2, .15, .20, .20, C.dark, x, 1.04 - i * .15, -.88 + i * .08, .16);
    }

    // A4-A6: nested wrist axes and a compact milling spindle.
    const axis4 = new THREE.Group();
    axis4.position.set(-7.13, -.40, 0);
    arm2.add(axis4);
    b.cyl(axis4, .66, .66, .75, C.dark, -.25, 0, 0, .35, 22).rotation.z = Math.PI / 2;
    b.cyl(axis4, .69, .69, .16, C.silver, -.66, 0, 0, .8, 22).rotation.z = Math.PI / 2;
    const axis5 = new THREE.Group();
    axis5.position.x = -.72;
    axis4.add(axis5);
    b.cyl(axis5, .53, .53, .62, C.orange, -.25, 0, 0, .18, 20).rotation.z = Math.PI / 2;
    b.cyl(axis5, .48, .48, .13, C.dark, -.63, 0, 0, .4, 20).rotation.z = Math.PI / 2;
    const spindle = new THREE.Group();
    spindle.position.x = -.69;
    axis5.add(spindle);
    // The adapter overlaps the A6 flange; every subsequent sleeve overlaps it.
    b.cyl(spindle, .43, .43, .27, C.silver, -.12, 0, 0, .9, 24).rotation.z = Math.PI / 2;
    b.cyl(spindle, .37, .37, .19, C.dark, -.31, 0, 0, .5, 24).rotation.z = Math.PI / 2;
    b.cyl(spindle, .50, .50, 1.23, C.dark, -.96, 0, 0, .32, 26).rotation.z = Math.PI / 2;
    b.cyl(spindle, .52, .52, .16, C.steel, -.43, 0, 0, .72, 24).rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      b.cyl(spindle, .535, .535, .055, C.rubber,
        -.62 - i * .16, 0, 0, .22, 24).rotation.z = Math.PI / 2;
    }
    b.cyl(spindle, .43, .30, .42, C.steel, -1.75, 0, 0, .75, 24).rotation.z = Math.PI / 2;
    b.cyl(spindle, .22, .22, .30, C.silver, -2.08, 0, 0, .85, 24).rotation.z = Math.PI / 2;
    b.cyl(spindle, .14, .14, .21, C.dark, -2.27, 0, 0, .45, 18).rotation.z = Math.PI / 2;
    b.cyl(spindle, .085, .085, .69, C.silver, -2.70, 0, 0, .9, 14).rotation.z = Math.PI / 2;
    b.cyl(spindle, .014, .085, .16, C.silver, -3.12, 0, 0, .9, 14).rotation.z = Math.PI / 2;
    // Three dark spiral flute grooves keep the cutter readable in close view.
    for (let flute = 0; flute < 3; flute++) {
      const points = [];
      for (let i = 0; i <= 12; i++) {
        const x = -2.38 - i * .053;
        const a = flute * Math.PI * 2 / 3 + i * .42;
        points.push([x, Math.cos(a) * .086, Math.sin(a) * .086]);
      }
      b.tube(spindle, points, .012, C.dark, .2);
    }
    // Both raised push buttons face +z, the inspection camera side.
    b.box(spindle, 1.11, .47, .12, C.steel, -.99, .13, .51, .7);
    const buttonColors = [0xffdd16, 0x0875f5];
    const buttons = [];
    for (let i = 0; i < 2; i++) {
      const x = -.76 - i * .48;
      b.cyl(spindle, .235, .235, .105, C.dark, x, .14, .62, .35, 24).rotation.x = Math.PI / 2;
      b.cyl(spindle, .207, .207, .045, C.silver, x, .14, .688, .8, 24).rotation.x = Math.PI / 2;
      const capMaterial = new THREE.MeshBasicMaterial({ color: buttonColors[i], toneMapped: false });
      capMaterial.color.convertSRGBToLinear();
      const cap = new THREE.Mesh(r.cylinder(.185, .185, .125, 24), capMaterial);
      cap.position.set(x, .14, .765);
      cap.rotation.x = Math.PI / 2;
      cap.castShadow = true;
      spindle.add(cap);
      buttons.push(cap);
    }
    spindle.userData.buttons = { yellow: buttons[0], blue: buttons[1] };
    b.tube(spindle, [[.04,.29,-.32],[-.24,.55,-.38],[-.59,.57,-.42],[-1.15,.50,-.39]], .075, C.rubber);
    b.box(spindle, .20, .18, .21, C.dark, -.55, .50, -.38, .3);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const bolt = b.cyl(spindle, .055, .055, .07, C.dark,
        -.10, Math.cos(angle) * .35, Math.sin(angle) * .35, .35, 6, false);
      bolt.rotation.z = Math.PI / 2;
    }

    function update(time) {
      const t = Number(time) || 0;
      turntable.rotation.y = Math.sin(t * .17) * .16;
      arm1.rotation.z = Math.sin(t * .29) * .045;
      arm2.rotation.z = Math.sin(t * .33 + .6) * .055;
      axis4.rotation.x = Math.sin(t * .27) * .10;
      axis5.rotation.z = Math.sin(t * .25 + .4) * .055;
      spindle.rotation.x = Math.sin(t * .37) * .065;
    }
    update(0);
    return { group: group, turntable: turntable, arm1: arm1, arm2: arm2, spindle: spindle, update: update };
  }

  window.RiseRobot = { create: create };
}());
