/* Procedural Rise Automation people. Classic script for Three.js r128. */
(function () {
  'use strict';

  const worlds = new WeakMap();
  const CREW_ROLES = new Set(['crew', 'programmer']);

  function resources(THREE) {
    if (worlds.has(THREE)) return worlds.get(THREE);
    const boxes = new Map();
    const materials = new Map();
    const labels = new Map();
    const value = {
      sphere: new THREE.SphereGeometry(1, 12, 9),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      plane: new THREE.PlaneGeometry(1, 1),
      box(w, h, d) {
        const key = [w, h, d].join('/');
        if (!boxes.has(key)) boxes.set(key, new THREE.BoxGeometry(w, h, d));
        return boxes.get(key);
      },
      material(color, metalness, roughness) {
        const key = [color, metalness || 0, roughness === undefined ? .72 : roughness].join('/');
        if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
          color: color,
          metalness: metalness || 0,
          roughness: roughness === undefined ? .72 : roughness
        }));
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
        ctx.font = '900 ' + size + 'px Arial, Helvetica, sans-serif';
        ctx.fillText(text, 512, 256, 940);
        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = 4;
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
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
    b.cylinder(parent, .16, .22, .16, skin, 0, 3.39, .02);
    b.ball(parent, .39, .46, .34, skin, 0, 3.77, 0, true);
    b.ball(parent, .085, .15, .075, skin, -.39, 3.78, 0);
    b.ball(parent, .085, .15, .075, skin, .39, 3.78, 0);
    b.ball(parent, .095, .13, .12, skin, 0, 3.72, .34);
    b.box(parent, .12, .055, .025, 0xffffff, -.15, 3.83, .321);
    b.box(parent, .12, .055, .025, 0xffffff, .15, 3.83, .321);
    b.ball(parent, .032, .04, .02, 0x1c2835, -.15, 3.83, .342);
    b.ball(parent, .032, .04, .02, 0x1c2835, .15, 3.83, .342);
    b.box(parent, .35, .045, .045, hair, 0, 3.98, .32);
    b.box(parent, .20, .025, .02, 0x6b3936, 0, 3.58, .33);
    if (beard) {
      b.ball(parent, .24, .12, .095, hair, 0, 3.51, .28);
    }
    // The hair is visible under a distinct hard hat, rather than replacing the face.
    b.ball(parent, .39, .18, .32, hair, 0, 4.09, -.045);
    if (role === 'programmer' || role === 'director' || variant % 5 === 0) {
      const glasses = r.material(0x202938, .15, .28);
      const lens = r.box(.24, .16, .025);
      for (const x of [-.16, .16]) {
        const rim = new THREE.Mesh(lens, glasses);
        rim.position.set(x, 3.83, .375);
        parent.add(rim);
      }
      b.box(parent, .10, .022, .025, 0x202938, 0, 3.84, .391);
    }
    // Helmet dome, crown seam and projecting brim.
    b.ball(parent, .48, .25, .41, helmetColor, 0, 4.17, -.035, true);
    b.box(parent, 1.06, .085, .79, helmetColor, 0, 4.045, .085, true);
    b.box(parent, .055, .018, .43, 0xd8e2eb, 0, 4.401, -.02);
    b.box(parent, .24, .07, .025, 0xeaf3f6, 0, 4.17, .374);
  }

  function makeArm(THREE, b, parent, side, jacket, cuff, skin, glove) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * .84, 3.18, 0);
    parent.add(shoulder);
    b.ball(shoulder, .29, .28, .29, jacket, 0, -.12, 0, true);
    b.box(shoulder, .42, .63, .43, jacket, 0, -.39, 0, true);
    b.box(shoulder, .44, .095, .45, cuff, 0, -.66, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -.70;
    shoulder.add(elbow);
    b.ball(elbow, .21, .20, .20, jacket, 0, -.03, 0);
    b.box(elbow, .37, .52, .38, jacket, 0, -.30, 0, true);
    b.box(elbow, .40, .09, .41, cuff, 0, -.55, 0);
    const wrist = new THREE.Group();
    wrist.position.y = -.60;
    elbow.add(wrist);
    b.ball(wrist, .155, .17, .16, glove || skin, 0, -.11, .02);
    return { shoulder: shoulder, elbow: elbow, wrist: wrist };
  }

  function makeLeg(THREE, b, parent, side, trouser, boot, accent) {
    const hip = new THREE.Group();
    hip.position.set(side * .36, 1.98, 0);
    parent.add(hip);
    b.ball(hip, .30, .25, .29, trouser, 0, -.12, 0);
    b.box(hip, .48, .71, .51, trouser, 0, -.43, 0, true);
    const knee = new THREE.Group();
    knee.position.y = -.83;
    hip.add(knee);
    b.ball(knee, .23, .22, .25, accent, 0, -.06, .13);
    b.box(knee, .41, .66, .44, trouser, 0, -.41, 0, true);
    b.box(knee, .43, .13, .46, accent, 0, -.71, 0);
    b.box(knee, .46, .27, .52, boot, 0, -.84, .04, true);
    b.box(knee, .53, .15, .74, boot, 0, -.95, .17, true);
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
    b.box(body, 1.54, 1.38, .66, jacket, 0, 2.63, 0, true);
    b.box(body, 1.66, .22, .70, jacket, 0, 3.17, 0, true);
    b.box(body, 1.46, .25, .65, trouser, 0, 1.96, 0, true);
    b.box(body, 1.52, .13, .73, trim, 0, 2.04, 0);
    b.box(body, .09, 1.10, .026, 0xcbd4d8, 0, 2.66, .350);
    b.box(body, 1.54, .11, .045, trim, 0, 2.35, .359);
    b.box(body, 1.54, .11, .045, trim, 0, 2.35, -.359);
    b.box(body, .42, .33, .055, jacket, -.48, 2.38, .37);
    b.box(body, .42, .33, .055, jacket, .48, 2.38, .37);
    b.box(body, .45, .035, .025, trim, -.48, 2.54, .403);
    b.box(body, .45, .035, .025, trim, .48, 2.54, .403);
    b.box(body, .43, .13, .39, jacket, -.34, 3.30, .20);
    b.box(body, .43, .13, .39, jacket, .34, 3.30, .20);
    if (branded) {
      // Each plane faces outwards; the rear plane is rotated, so its writing is never mirrored.
      b.box(body, 1.19, .51, .018, 0x102b49, 0, 2.91, .365);
      b.decal(body, 'RISE AUTOMATION', 230, null, 1.13, .42, 0, 2.91, .378, false);
      b.box(body, 1.42, .70, .018, 0x102b49, 0, 2.77, -.365);
      b.decal(body, 'RISE', 380, null, 1.35, .38, 0, 2.92, -.378, true);
      b.decal(body, 'AUTOMATION', 265, null, 1.35, .28, 0, 2.63, -.378, true);
      b.box(body, .20, .19, .035, 0xf97316, -.63, 3.04, .38);
      b.decal(body, 'R', 205, null, .16, .14, -.63, 3.04, .405, false);
    } else {
      b.box(body, 1.50, .15, .040, 0x919a9c, 0, 2.91, .37);
      b.box(body, 1.50, .15, .040, 0x919a9c, 0, 2.91, -.37);
      if (role === 'electrician') b.box(body, .16, .36, .03, 0xebc84a, -.53, 2.85, .40);
      if (role === 'director') b.box(body, .32, .35, .05, 0xe4e6e5, -.54, 2.88, .41);
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
