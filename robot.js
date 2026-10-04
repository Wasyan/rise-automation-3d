/* Reference-inspired industrial robot for Three.js r128. Classic browser script. */
(function () {
  'use strict';

  const caches = new WeakMap();

  function resources(THREE) {
    if (caches.has(THREE)) return caches.get(THREE);
    const boxes = new Map();
    const cylinders = new Map();
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
    return {
      box(parent, w, h, d, color, x, y, z, metal, shadow) {
        return add(parent, r.box(w, h, d), r.mat(color, metal), x, y, z, shadow);
      },
      cyl(parent, top, bottom, height, color, x, y, z, metal, segments, shadow) {
        return add(parent, r.cylinder(top, bottom, height, segments), r.mat(color, metal), x, y, z, shadow);
      },
      shape(parent, points, depth, color, x, y, z, metal) {
        const path = new THREE.Shape();
        path.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
        path.closePath();
        const geo = new THREE.ExtrudeGeometry(path, {
          depth: depth, steps: 1, bevelEnabled: true,
          bevelThickness: .10, bevelSize: .10, bevelSegments: 2,
          curveSegments: 4
        });
        geo.translate(0, 0, -depth / 2);
        return add(parent, geo, r.mat(color, metal), x, y, z);
      },
      label(parent, lines, color, w, h, x, y, z, back) {
        const plane = add(parent, new THREE.PlaneGeometry(w, h), r.decal(lines, color), x, y, z, false);
        if (back) plane.rotation.y = Math.PI;
        return plane;
      },
      tube(parent, coords, radius, color, metal) {
        const points = coords.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, 18, radius, 6, false);
        return add(parent, geometry, r.mat(color, metal), 0, 0, 0);
      }
    };
  }

  function sideBearing(THREE, b, parent, radius, x, y, z, orange, dark, steel) {
    const collar = b.cyl(parent, radius * 1.03, radius * 1.03, .24, orange, x, y, z, .15, 28);
    collar.rotation.x = Math.PI / 2;
    const seal = b.cyl(parent, radius * .83, radius * .83, .29, dark, x, y, z + .18, .12, 28);
    seal.rotation.x = Math.PI / 2;
    const hub = b.cyl(parent, radius * .47, radius * .47, .32, steel, x, y, z + .37, .8, 24);
    hub.rotation.x = Math.PI / 2;
    const cap = b.cyl(parent, radius * .29, radius * .29, .34, dark, x, y, z + .56, .2, 22);
    cap.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const bolt = b.cyl(parent, .075, .075, .07, steel,
        x + Math.cos(angle) * radius * .67,
        y + Math.sin(angle) * radius * .67, z + .34, .7, 6, false);
      bolt.rotation.x = Math.PI / 2;
    }
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

    // A1: fixed foot, machined flange and substantial black rotating column.
    b.cyl(group, 3.04, 3.18, .36, C.shadowOrange, 0, .20, 0, .25, 32);
    b.cyl(group, 2.90, 3.05, .28, C.orange, 0, .49, 0, .25, 32);
    b.cyl(group, 2.56, 2.77, 2.06, C.dark, 0, 1.63, 0, .25, 32);
    b.cyl(group, 2.62, 2.67, .19, C.steel, 0, 2.72, 0, .72, 32);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const x = Math.cos(a) * 2.86;
      const z = Math.sin(a) * 2.86;
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
    b.cyl(turntable, 2.56, 2.55, .28, C.orange, 0, .06, 0, .25, 30);
    b.cyl(turntable, 2.04, 2.32, .48, C.orange, 0, .40, 0, .25, 30);
    b.shape(turntable, [
      [-1.76, .38], [1.68, .38], [1.92, .89], [1.25, 1.98],
      [-.22, 2.05], [-1.55, 1.44]
    ], 3.15, C.orange, 0, 0, 0, .12);
    b.shape(turntable, [
      [-1.44, .36], [-.88, .55], [-.67, 1.86], [-1.31, 1.52]
    ], 3.2, C.shadowOrange, 0, 0, 0, .08);
    b.box(turntable, .62, .20, 3.13, C.dark, -1.1, 1.22, 0, .2);
    b.label(turntable, ['KUKA'], '#17191b', 1.14, .48, -.24, 1.15, 1.72, false);
    b.box(turntable, .64, .37, .035, C.warning, 1.32, .68, 1.70, 0, false);
    b.label(turntable, ['!'], '#1b1b1b', .27, .28, 1.32, .68, 1.73, false);

    // A2: the angled, cast lower arm and its prominent side bearing.
    const arm1 = new THREE.Group();
    arm1.position.set(.05, 1.75, 0);
    turntable.add(arm1);
    b.shape(arm1, [
      [-1.07, -.77], [.45, -1.00], [1.35, -.42], [4.34, 5.68],
      [4.45, 6.38], [3.58, 6.95], [2.72, 6.58], [2.32, 5.72],
      [.27, 2.00], [-1.25, .79]
    ], 1.96, C.orange, 0, 0, 0, .15);
    b.shape(arm1, [
      [-1.02, -.12], [-.18, -.49], [2.91, 5.43], [2.64, 5.76],
      [.18, 1.41], [-.88, .51]
    ], .065, C.lightOrange, 0, 0, 1.01, .05);
    b.shape(arm1, [
      [1.42, 3.09], [1.79, 3.78], [2.13, 3.55], [1.82, 2.96]
    ], .09, C.shadowOrange, 0, 0, 1.07);
    sideBearing(THREE, b, arm1, 1.23, 0, .05, 1.39, C.orange, C.dark, C.steel);
    b.label(arm1, ['KUKA'], '#181818', 1.02, .48, .77, 1.82, 1.105, false);
    b.box(arm1, .27, 1.06, .08, C.dark, 1.67, 3.76, 1.14, .05);
    b.box(arm1, .27, .13, .10, C.steel, 1.67, 3.22, 1.16, .7);
    b.tube(arm1, [[-1.32,.35,-1.01],[-1.63,1.64,-1.20],[.84,4.48,-1.18],[2.98,6.52,-1.15]], .14, C.rubber);
    b.tube(arm1, [[-1.18,.52,-1.22],[-1.42,1.94,-1.38],[1.13,4.63,-1.38],[3.13,6.62,-1.34]], .065, C.dark);
    b.cyl(arm1, .28, .28, 3.24, C.dark, 1.38, 3.21, -1.23, .25, 16).rotation.z = -.40;
    b.cyl(arm1, .35, .35, .45, C.steel, 1.93, 4.48, -1.24, .78, 16).rotation.z = -.40;

    // A3: elbow drive and long, largely horizontal tapered forearm.
    const arm2 = new THREE.Group();
    arm2.position.set(3.65, 6.35, 0);
    arm1.add(arm2);
    b.cyl(arm2, 1.09, 1.09, 2.34, C.dark, 0, 0, 0, .3, 26).rotation.x = Math.PI / 2;
    b.cyl(arm2, 1.25, 1.25, .30, C.orange, 0, 0, 1.26, .2, 26).rotation.x = Math.PI / 2;
    sideBearing(THREE, b, arm2, 1.05, 0, 0, 1.43, C.orange, C.dark, C.steel);
    b.shape(arm2, [
      [.79, 1.00], [-.48, 1.09], [-1.19, .84], [-6.45, .12],
      [-7.33, -.28], [-7.08, -.89], [-6.10, -1.03], [-.71, -.99],
      [.91, -.54]
    ], 1.46, C.orange, 0, 0, 0, .13);
    b.shape(arm2, [
      [-.61, .86], [-2.00, .59], [-6.41, -.02], [-6.63, -.36],
      [-2.02, -.15], [-.65, .18]
    ], .07, C.lightOrange, 0, 0, .77, .04);
    b.shape(arm2, [
      [-.93, -.54], [-5.74, -.88], [-6.44, -.78], [-1.01, -.80]
    ], .07, C.shadowOrange, 0, 0, .79);
    b.label(arm2, ['KUKA'], '#191919', 2.45, .76, -3.43, .10, .91, false);
    b.box(arm2, .58, .28, .035, C.warning, -5.64, -.49, .85, 0, false);
    b.label(arm2, ['!'], '#1b1b1b', .20, .20, -5.64, -.49, .885, false);
    for (let i = 0; i < 5; i++) {
      b.box(arm2, .08, .37, .07, C.dark, -.37 - i * .16, -.49, .85, .1);
    }
    b.tube(arm2, [[.51,.83,-.83],[-.95,1.40,-.89],[-2.55,1.17,-.86],[-4.68,.65,-.86],[-6.71,.13,-.78]], .15, C.rubber);
    b.tube(arm2, [[.34,.76,-1.05],[-.88,1.21,-1.10],[-3.45,1.12,-1.10],[-5.17,.56,-1.02],[-6.64,.08,-1.00]], .065, C.dark);
    for (let i = 0; i < 4; i++) {
      const x = -1.20 - i * 1.31;
      b.box(arm2, .18, .22, .24, C.dark, x, .76 - i * .16, -.89, .15);
    }
    b.cyl(arm2, .55, .55, .95, C.dark, .34, .83, -1.24, .28, 18).rotation.x = Math.PI / 2;
    b.cyl(arm2, .34, .34, .22, C.steel, .34, .83, -1.82, .75, 18).rotation.x = Math.PI / 2;

    // A4-A6: nested wrist axes and an industrial two-finger end effector.
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
    const gripper = new THREE.Group();
    gripper.position.x = -.69;
    axis5.add(gripper);
    b.cyl(gripper, .43, .43, .25, C.silver, -.12, 0, 0, .9, 22).rotation.z = Math.PI / 2;
    b.cyl(gripper, .32, .32, .19, C.dark, -.28, 0, 0, .55, 22).rotation.z = Math.PI / 2;
    b.box(gripper, .78, .82, .80, C.dark, -.73, 0, 0, .35);
    b.box(gripper, .13, .95, .89, C.steel, -1.17, 0, 0, .8);
    b.box(gripper, .72, .22, .56, C.dark, -1.30, .42, 0, .4);
    b.box(gripper, .72, .22, .56, C.dark, -1.30, -.42, 0, .4);
    for (const y of [-.42, .42]) {
      b.box(gripper, 1.18, .15, .33, C.steel, -1.84, y, 0, .8);
      b.box(gripper, .22, .24, .34, C.dark, -2.39, y > 0 ? y - .09 : y + .09, 0, .3);
    }
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const bolt = b.cyl(gripper, .055, .055, .07, C.dark,
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
      gripper.rotation.x = Math.sin(t * .37) * .065;
    }
    update(0);
    return { group: group, turntable: turntable, arm1: arm1, arm2: arm2, gripper: gripper, update: update };
  }

  window.RiseRobot = { create: create };
}());
