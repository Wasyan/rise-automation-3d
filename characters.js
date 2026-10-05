/* Procedural Rise Automation people. Classic script for Three.js r128. */
(function () {
  'use strict';

  const worlds = new WeakMap();
  const CREW_ROLES = new Set(['crew', 'programmer']);

  function resources(THREE) {
    if (worlds.has(THREE)) return worlds.get(THREE);
    const boxes = new Map();
    const tapers = new Map();
    const materials = new Map();
    const labels = new Map();
    const value = {
      sphere: new THREE.SphereGeometry(1, 16, 12),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      glassesRing: new THREE.TorusGeometry(.064, .007, 5, 14),
      head: new THREE.LatheGeometry([
        [0, -.36], [.11, -.34], [.17, -.30], [.205, -.23],
        [.25, -.10], [.275, .02], [.285, .14], [.27, .24],
        [.22, .32], [.08, .36], [0, .37]
      ].map(p => new THREE.Vector2(p[0], p[1])), 20),
      plane: new THREE.PlaneGeometry(1, 1),
      box(w, h, d) {
        const key = [w, h, d].join('/');
        if (!boxes.has(key)) boxes.set(key, new THREE.BoxGeometry(w, h, d));
        return boxes.get(key);
      },
      taper(top, bottom) {
        const key = top + '/' + bottom;
        if (!tapers.has(key)) tapers.set(key, new THREE.CylinderGeometry(top, bottom, 1, 16));
        return tapers.get(key);
      },
      material(color, metalness, roughness) {
        const key = [color, metalness || 0, roughness === undefined ? .72 : roughness].join('/');
        if (!materials.has(key)) {
          const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: metalness || 0,
            roughness: roughness === undefined ? .72 : roughness
          });
          // Hex palette values are authored in sRGB; r128 material colors are linear.
          material.color.convertSRGBToLinear();
          materials.set(key, material);
        }
        return materials.get(key);
      },
      label(text, size, background) {
        const key = [text, size, background || 'clear'].join('/');
        if (labels.has(key)) return labels.get(key);
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, 1024, 512);
        }
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (text === 'RISE\nAUTOMATION') {
          ctx.font = '900 310px Arial, Helvetica, sans-serif';
          ctx.fillText('RISE', 512, 155, 940);
          ctx.font = '900 190px Arial, Helvetica, sans-serif';
          ctx.fillText('AUTOMATION', 512, 365, 940);
        } else {
          ctx.font = '900 ' + size + 'px Arial, Helvetica, sans-serif';
          ctx.fillText(text, 512, 256, 940);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = 4;
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
        labels.set(key, material);
        return material;
      }
    };
    worlds.set(THREE, value);
    return value;
  }

  function makeBuilder(THREE, r) {
    function mesh(parent, geometry, material, x, y, z, sx, sy, sz, shadow) {
      const item = new THREE.Mesh(geometry, material);
      item.position.set(x || 0, y || 0, z || 0);
      if (sx !== undefined) item.scale.set(sx, sy, sz);
      item.castShadow = !!shadow;
      parent.add(item);
      return item;
    }
    return {
      box(parent, w, h, d, color, x, y, z, shadow, metalness) {
        return mesh(parent, r.box(w, h, d), r.material(color, metalness), x, y, z, undefined, undefined, undefined, shadow);
      },
      ball(parent, sx, sy, sz, color, x, y, z, shadow) {
        return mesh(parent, r.sphere, r.material(color), x, y, z, sx, sy, sz, shadow);
      },
      cylinder(parent, sx, sy, sz, color, x, y, z, shadow, metalness) {
        return mesh(parent, r.cylinder, r.material(color, metalness), x, y, z, sx, sy, sz, shadow);
      },
      taper(parent, top, bottom, sx, sy, sz, color, x, y, z, shadow) {
        return mesh(parent, r.taper(top, bottom), r.material(color), x, y, z, sx, sy, sz, shadow);
      },
      decal(parent, text, font, background, w, h, x, y, z, back) {
        const item = mesh(parent, r.plane, r.label(text, font, background), x, y, z, w, h, 1, false);
        if (back) item.rotation.y = Math.PI;
        return item;
      }
    };
  }

  function faceVariant(name, role) {
    const value = String(name || role || 'crew');
    let seed = 0;
    for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) | 0;
    return Math.abs(seed);
  }

  function makeFace(THREE, b, parent, skin, role, variant, helmetColor, r) {
    const hair = [0x2a211c, 0x51382a, 0x211c20, 0x76533a][variant % 4];
    const beard = variant % 3 === 0 || role === 'foreman' || role === 'director';
    const shade = [0xbd7959, 0xa97052, 0xc68d69][variant % 3];
    b.taper(parent, .78, 1, .15, .25, .15, skin, 0, 3.39, .01);
    const head = new THREE.Mesh(r.head, r.material(skin));
    head.position.y = 3.75;
    head.scale.z = .92;
    head.castShadow = true;
    parent.add(head);
    for (const side of [-1, 1]) {
      b.ball(parent, .039, .086, .045, skin, side * .279, 3.75, -.005); // ears close to skull
      b.ball(parent, .012, .041, .008, shade, side * .311, 3.748, .024);
      b.ball(parent, .055, .018, .011, 0xd7c9b7, side * .108, 3.805, .238); // narrow sclera
      b.ball(parent, .018, .019, .009, 0x34414b, side * .108, 3.805, .250);
      b.ball(parent, .066, .013, .018, skin, side * .108, 3.827, .239); // upper eyelid
      const brow = b.ball(parent, .068, .011, .014, hair, side * .108, 3.873, .234);
      brow.rotation.z = -side * .10;
    }
    b.ball(parent, .033, .10, .040, skin, 0, 3.733, .255); // nose bridge
    b.ball(parent, .044, .032, .038, skin, 0, 3.675, .277); // nose tip
    b.ball(parent, .067, .010, .010, 0x965f55, 0, 3.565, .207); // lips
    if (beard) {
      b.ball(parent, .10, .024, .007, hair, 0, 3.615, .212); // close-cut moustache
      b.ball(parent, .105, .035, .008, hair, 0, 3.484, .181); // small chin patch
    }
    b.ball(parent, .273, .045, .247, hair, 0, 4.055, -.012);
    if (role === 'programmer' || role === 'director' || variant % 5 === 0) {
      const glasses = r.material(0x202938, .15, .28);
      for (const x of [-.16, .16]) {
        const rim = new THREE.Mesh(r.glassesRing, glasses);
        rim.position.set(x * .68, 3.805, .26);
        parent.add(rim);
      }
      b.box(parent, .070, .012, .012, 0x202938, 0, 3.815, .270);
    }
    // Curved hardhat shell and rounded projecting visor.
    b.ball(parent, .37, .20, .32, helmetColor, 0, 4.15, -.025, true);
    b.ball(parent, .36, .046, .32, helmetColor, 0, 4.057, -.015);
    b.ball(parent, .32, .025, .17, helmetColor, 0, 4.037, .25);
    b.ball(parent, .024, .014, .25, 0xe2e8e6, 0, 4.344, -.025);
    b.ball(parent, .11, .033, .015, 0xeaf3f6, 0, 4.16, .285);
  }

  function makeArm(THREE, b, parent, side, jacket, cuff, skin, glove) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * .62, 3.15, 0);
    parent.add(shoulder);
    b.ball(shoulder, .215, .23, .235, jacket, 0, -.105, 0, true);
    b.taper(shoulder, 1, .82, .195, .62, .21, jacket, 0, -.405, 0, true);
    b.ball(shoulder, .195, .045, .21, cuff, 0, -.67, 0);
    b.ball(shoulder, .14, .023, .205, 0x6b8290, 0, -.40, .185); // sleeve fold
    const elbow = new THREE.Group();
    elbow.position.y = -.715;
    shoulder.add(elbow);
    b.ball(elbow, .17, .17, .185, jacket, 0, -.02, 0);
    b.taper(elbow, .91, .72, .19, .52, .205, jacket, 0, -.305, 0, true);
    b.ball(elbow, .16, .048, .175, cuff, 0, -.55, 0);
    const wrist = new THREE.Group();
    wrist.position.y = -.59;
    elbow.add(wrist);
    const handColor = glove || skin;
    b.ball(wrist, .13, .145, .105, handColor, 0, -.11, .015);
    for (let i = 0; i < 3; i++) b.ball(wrist, .028, .10, .035, handColor, (i - 1) * .065, -.235, .055);
    b.ball(wrist, .050, .095, .055, handColor, -side * .115, -.115, .095); // thumb
    return { shoulder: shoulder, elbow: elbow, wrist: wrist };
  }

  function makeLeg(THREE, b, parent, side, trouser, boot, accent) {
    const hip = new THREE.Group();
    hip.position.set(side * .31, 2.02, 0);
    parent.add(hip);
    b.ball(hip, .27, .24, .27, trouser, 0, -.12, 0);
    b.taper(hip, 1, .83, .275, .85, .275, trouser, 0, -.485, 0, true);
    b.ball(hip, .22, .024, .24, 0x53606a, 0, -.63, .225); // trouser fold
    const knee = new THREE.Group();
    knee.position.y = -.91;
    hip.add(knee);
    b.ball(knee, .235, .18, .245, trouser, 0, -.04, .02);
    b.ball(knee, .20, .14, .065, accent, 0, -.06, .23);
    b.taper(knee, .95, .72, .245, .75, .24, trouser, 0, -.44, 0, true);
    b.ball(knee, .20, .023, .21, 0x53606a, 0, -.48, .205);
    b.taper(knee, .78, 1, .245, .30, .25, boot, 0, -.86, .015, true);
    b.ball(knee, .26, .105, .40, boot, 0, -1.01, .15, true);
    b.ball(knee, .27, .025, .41, 0x111a21, 0, -1.085, .16);
    return { hip: hip, knee: knee };
  }

  function makeFence(THREE, b, parent) {
    const fence = new THREE.Group();
    fence.position.set(0, 2.18, .82);
    parent.add(fence);
    const steel = 0x8399a5;
    b.box(fence, 2.6, .075, .08, steel, 0, .61, 0, true, .55);
    b.box(fence, 2.6, .075, .08, steel, 0, -.61, 0, true, .55);
    b.box(fence, .08, 1.28, .08, steel, -1.28, 0, 0, true, .55);
    b.box(fence, .08, 1.28, .08, steel, 1.28, 0, 0, true, .55);
    const points = [];
    for (let x = -1.12; x <= 1.13; x += .20) points.push(x, -.53, 0, x, .53, 0);
    for (let y = -.48; y <= .49; y += .18) points.push(-1.20, y, 0, 1.20, y, 0);
    const wires = new THREE.BufferGeometry();
    wires.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    fence.add(new THREE.LineSegments(wires, new THREE.LineBasicMaterial({ color: 0xb7c9ce, transparent: true, opacity: .75 })));
    b.box(fence, .37, .15, .025, 0xf97316, 0, .59, .06);
    return fence;
  }

  function makeTool(THREE, b, root, hands, type, role, r) {
    if (type === 'FENCE') return makeFence(THREE, b, root);
    const hand = hands.right.wrist;
    if (type === 'PERFORATOR') {
      const drill = new THREE.Group();
      drill.position.set(0, -.10, .14);
      hand.add(drill);
      b.box(drill, .34, .31, .68, 0xf97316, 0, .03, .27, true);
      b.box(drill, .40, .17, .25, 0x263849, 0, .09, .63);
      b.cylinder(drill, .105, .26, .105, 0x435363, 0, .04, .82, true, .65).rotation.x = Math.PI / 2;
      b.cylinder(drill, .035, .48, .035, 0xd0dce4, 0, .04, 1.14, true, .75).rotation.x = Math.PI / 2;
      b.box(drill, .12, .34, .14, 0x273743, 0, -.28, .10);
      b.box(drill, .31, .07, .08, 0x273743, 0, -.20, .42);
    } else if (type === 'WRENCH' || role === 'electrician') {
      const wrench = new THREE.Group();
      wrench.position.set(0, -.12, .12);
      wrench.rotation.z = -.25;
      hand.add(wrench);
      b.box(wrench, .085, .67, .08, 0xb7c2c9, 0, -.21, .12, true, .8);
      b.box(wrench, .38, .09, .09, 0xb7c2c9, 0, .13, .12, false, .8);
      b.box(wrench, .11, .21, .09, 0xb7c2c9, -.16, .19, .12, false, .8);
      b.box(wrench, .11, .21, .09, 0xb7c2c9, .16, .19, .12, false, .8);
    } else if (type === 'PIZZA') {
      const box = new THREE.Group();
      box.position.set(.22, -.28, .62);
      hand.add(box);
      b.box(box, 1.30, .19, 1.04, 0xdca865, 0, 0, 0, true);
      b.box(box, 1.35, .07, 1.09, 0xf3cc8d, 0, .11, 0);
      b.decal(box, 'PIZZA', 150, null, .88, .24, 0, .149, .04, false).rotation.x = -Math.PI / 2;
    } else if (type === 'LAPTOP') {
      const laptop = new THREE.Group();
      laptop.position.set(.05, -.22, .41);
      hand.add(laptop);
      b.box(laptop, 1.0, .055, .70, 0x5c6977, 0, 0, .05, true);
      const screen = b.box(laptop, 1.0, .65, .045, 0x283744, 0, .34, -.28, true);
      screen.rotation.x = -.12;
      b.box(laptop, .78, .47, .025, 0x1d8caa, 0, .34, -.246);
    } else if (type === 'CLIPBOARD' || role === 'foreman' || role === 'director') {
      const clipboard = new THREE.Group();
      clipboard.position.set(.05, -.20, .28);
      clipboard.rotation.x = -.35;
      hand.add(clipboard);
      b.box(clipboard, .67, .89, .055, 0x8b6441, 0, -.16, .15, true);
      b.box(clipboard, .56, .73, .025, 0xe5e7e5, 0, -.16, .191);
      b.box(clipboard, .24, .08, .045, 0x737f8b, 0, .31, .205);
      for (let i = 0; i < 3; i++) b.box(clipboard, .36, .025, .012, 0x667687, 0, .08 - i * .15, .21);
    }
    return null;
  }

  // Combine fixed details that share a material within each moving joint.
  // Joint groups remain separate so animation never needs to touch geometry.
  function compactGroup(THREE, group) {
    const children = group.children.slice();
    for (const child of children) if (child.isGroup) compactGroup(THREE, child);
    const buckets = new Map();
    for (const child of children) {
      if (!child.isMesh || child.children.length || child.material.transparent) continue;
      const list = buckets.get(child.material) || [];
      list.push(child);
      buckets.set(child.material, list);
    }
    for (const [material, parts] of buckets) {
      if (parts.length < 2) continue;
      const prepared = [];
      let count = 0;
      let castsShadow = false;
      for (const part of parts) {
        part.updateMatrix();
        const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
        geometry.applyMatrix4(part.matrix);
        prepared.push(geometry);
        count += geometry.attributes.position.count;
        castsShadow = castsShadow || part.castShadow;
      }
      const positions = new Float32Array(count * 3);
      const normals = new Float32Array(count * 3);
      const uvs = new Float32Array(count * 2);
      let vertex = 0;
      for (const geometry of prepared) {
        const n = geometry.attributes.position.count;
        positions.set(geometry.attributes.position.array, vertex * 3);
        normals.set(geometry.attributes.normal.array, vertex * 3);
        if (geometry.attributes.uv) uvs.set(geometry.attributes.uv.array, vertex * 2);
        vertex += n;
        geometry.dispose();
      }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castsShadow;
      for (const part of parts) group.remove(part);
      group.add(mesh);
    }
  }

  function create(THREE, options) {
    options = options || {};
    const r = resources(THREE);
    const b = makeBuilder(THREE, r);
    const role = options.role || 'crew';
    const branded = CREW_ROLES.has(role);
    const jacket = options.jacketColor === undefined ? (branded ? 0x124b77 : 0x56616a) : options.jacketColor;
    const helmet = options.helmetColor === undefined ? (branded ? 0xf47721 : 0xe2c850) : options.helmetColor;
    const skin = options.skinTone === undefined ? 0xd9a078 : options.skinTone;
    const trim = branded ? 0xf97316 : 0xadb4b7;
    const trouser = branded ? 0x1c344c : 0x414851;
    const root = new THREE.Group();
    root.name = options.name || role;
    const body = new THREE.Group();
    root.add(body);
    b.ball(body, .56, .26, .30, trouser, 0, 2.05, 0, true); // pelvis
    b.taper(body, 1, .80, .68, 1.20, .34, jacket, 0, 2.64, 0, true);
    b.ball(body, .70, .23, .35, jacket, 0, 3.13, 0, true); // upper chest
    b.ball(body, .34, .09, .16, jacket, -.25, 3.31, .09);
    b.ball(body, .34, .09, .16, jacket, .25, 3.31, .09);
    b.ball(body, .48, .10, .30, trim, 0, 2.13, 0); // waist belt
    b.ball(body, .063, .10, .022, 0xabb9bd, 0, 2.15, .303);
    b.box(body, .025, .91, .015, 0xb8c7cd, 0, 2.70, .347); // zipper
    b.box(body, 1.15, .065, .026, trim, 0, 2.35, .354);
    b.box(body, 1.15, .065, .026, trim, 0, 2.35, -.354);
    for (const side of [-1, 1]) {
      b.ball(body, .20, .15, .044, jacket, side * .39, 2.42, .334); // pockets
      b.box(body, .34, .018, .020, 0x8da1ab, side * .39, 2.49, .379);
      b.ball(body, .16, .065, .13, jacket, side * .26, 3.27, .16); // soft lapels
    }
    if (branded) {
      // Each plane faces outwards; the rear plane is rotated, so its writing is never mirrored.
      b.box(body, 1.06, .49, .018, 0x102b49, 0, 2.91, .367);
      b.decal(body, 'RISE\nAUTOMATION', 310, null, 1.02, .43, 0, 2.91, .380, false);
      b.box(body, 1.19, .63, .018, 0x102b49, 0, 2.80, -.367);
      b.decal(body, 'RISE', 380, null, 1.14, .35, 0, 2.94, -.380, true);
      b.decal(body, 'AUTOMATION', 265, null, 1.14, .25, 0, 2.66, -.380, true);
      b.box(body, .15, .14, .029, 0xf97316, -.53, 3.14, .359);
      b.decal(body, 'R', 205, null, .12, .10, -.53, 3.14, .379, false);
      if (options.name) {
        b.box(body, .43, .15, .022, 0x152c45, .39, 2.56, .353);
        b.decal(body, String(options.name), 185, null, .40, .12, .39, 2.56, .369, false);
      }
    } else {
      b.box(body, 1.20, .10, .022, 0x919a9c, 0, 2.91, .367);
      b.box(body, 1.20, .10, .022, 0x919a9c, 0, 2.91, -.367);
      if (role === 'electrician') b.box(body, .12, .29, .02, 0xebc84a, -.47, 2.84, .37);
      if (role === 'director') b.box(body, .26, .27, .03, 0xe4e6e5, -.43, 2.86, .38);
    }
    const variant = faceVariant(options.name, role);
    makeFace(THREE, b, body, skin, role, variant, helmet, r);
    const glove = role === 'director' || role === 'programmer' ? null : (branded ? 0x283642 : 0x33383c);
    const left = makeArm(THREE, b, body, -1, jacket, trim, skin, glove);
    const right = makeArm(THREE, b, body, 1, jacket, trim, skin, glove);
    const leftLeg = makeLeg(THREE, b, body, -1, trouser, 0x202a33, trim);
    const rightLeg = makeLeg(THREE, b, body, 1, trouser, 0x202a33, trim);
    const carriedFence = makeTool(THREE, b, root, { left: left, right: right }, options.tool, role, r);
    root.userData.carriedFence = carriedFence || null;
    root.userData.rig = { body: body, left: left, right: right, leftLeg: leftLeg, rightLeg: rightLeg, tool: options.tool || null };
    animate(root, { walking: false, working: false, carrying: options.tool === 'FENCE', time: 0 });
    compactGroup(THREE, root);
    return root;
  }

  function animate(group, state) {
    const rig = group && group.userData && group.userData.rig;
    if (!rig) return;
    state = state || {};
    const t = Number(state.time) || 0;
    const walk = state.walking ? 1 : 0;
    const work = state.working ? 1 : 0;
    const carry = state.carrying ? 1 : 0;
    const phase = t * 7;
    const stride = Math.sin(phase) * .44 * walk;
    rig.leftLeg.hip.rotation.x = stride;
    rig.rightLeg.hip.rotation.x = -stride;
    rig.leftLeg.knee.rotation.x = Math.max(0, -stride) * .55;
    rig.rightLeg.knee.rotation.x = Math.max(0, stride) * .55;
    rig.body.position.y = Math.abs(Math.sin(phase)) * .035 * walk;
    rig.body.rotation.z = Math.sin(phase) * .025 * walk;
    rig.left.shoulder.rotation.x = .20 + stride * -.8 - work * .45 - carry * .35;
    rig.right.shoulder.rotation.x = .20 + stride * .8 - work * .70 - carry * .35;
    rig.left.shoulder.rotation.z = -.08 - carry * .13;
    rig.right.shoulder.rotation.z = .08 + carry * .13;
    rig.left.elbow.rotation.x = -.22 - work * .36 - carry * .22;
    rig.right.elbow.rotation.x = -.22 - work * .42 - carry * .22;
    if (work) rig.right.shoulder.rotation.x += Math.sin(t * 13) * .075;
    if (group.userData.carriedFence) group.userData.carriedFence.visible = !!carry;
  }

  window.RiseCharacters = { create: create, animate: animate };
}());
