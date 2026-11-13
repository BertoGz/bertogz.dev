/*
 * One function per model. To redesign a landmark, replace its function body.
 *
 * Each function draws around (0, 0) with y = 0 on the ground, in tile units.
 * +z faces the default camera. Stay inside the landmark's footprint from map.js.
 *
 *   b.color(hex)                               color for what follows
 *   b.mat("lit" | "unlit" | "swirl")           surface type for what follows
 *   b.box(x, y, z, sx, sy, sz)                 y is the bottom face
 *   b.wall(x0, z0, x1, z1, y, h, thick)        a box between two points
 *   b.beam([x, y, z], [x, y, z], thick)        a square rod between two points
 *   b.gable(x, y, z, sx, sy, sz, axis, end)    roof, ridge along "x" or "z", optional end color
 *   b.frustum(x, y, z, r0, r1, h, sides, rot)  r1 = 0 makes a cone
 *   b.blob(x, y, z, rx, ry, rz, segs, rings, rough)  lumpy sphere, y is its center
 *   b.oval(x, y, z, rx, ry, thick, segs)       upright ring facing z, y is its center
 *   b.disc(x, y, z, rx, ry, segs)              upright filled oval facing z
 *   b.poly([[x, y, z], ...])                   flat polygon
 *   b.smoke(x, y, z)                           rising smoke from this point
 *   b.vary                                     0 to 1, stable per object
 *   b.accent                                   the region's color
 */
(function () {
  const C = {
    plaster: "#d9caa3", timber: "#553820", wood: "#7a5531", woodLight: "#9d7646", woodDark: "#4c3320",
    thatch: "#b8953f", thatchDark: "#9c7c35", tile: "#a44f35", tileDark: "#8a402c", slate: "#5e6a7a",
    stone: "#9a968c", stoneDark: "#77746c", stoneLight: "#b1ada1", brick: "#8d4c37",
    iron: "#3d4147", brass: "#c79a3c", gold: "#dfb443", glass: "#27384a", dark: "#1d1712",
    canvas: "#ddd6c2", blue: "#3f6fb0", red: "#a93a32", redDark: "#832a26", orange: "#d9772f", straw: "#c8a959",
    leaf: "#477a2e", leafDark: "#386427", leafLight: "#5d8f38", pine: "#2f5c37", pineDark: "#274c2e",
    trunk: "#5b4027", rock: "#8e8c84", skin: "#d8a578", hair: "#3a2616", tunic: "#3a6ea5", tunicDark: "#2c5684",
    trouser: "#4d3b2a", boot: "#2b211a", wool: "#e6e0d2", sand: "#c7ad72", parchment: "#e0d0a0",
  };

  const flatDisc = (b, x, y, z, r, n = 12) => {
    const pts = [];
    for (let k = 0; k < n; k++) pts.push([x + Math.cos((k / n) * Math.PI * 2) * r, y, z + Math.sin((k / n) * Math.PI * 2) * r]);
    b.poly(pts);
  };

  // A round wall built from straight segments. `skip` leaves one segment open.
  const ringWall = (b, x, z, r, n, y, h, thick, offset = 0, skip = -1) => {
    for (let k = 0; k < n; k++) {
      if (k === skip) continue;
      const a0 = offset + (k / n) * Math.PI * 2, a1 = offset + ((k + 1) / n) * Math.PI * 2;
      b.wall(x + Math.cos(a0) * r, z + Math.sin(a0) * r, x + Math.cos(a1) * r, z + Math.sin(a1) * r, y, h, thick);
    }
  };

  window.WORLD_MODELS = {
    signpost(b) {
      b.color(C.stone);
      b.frustum(0, 0, 0, 0.36, 0.28, 0.18, 7);
      b.color(C.wood);
      b.box(0, 0.18, 0, 0.16, 2.15, 0.16);
      b.color(C.woodLight);
      b.box(0.3, 1.78, 0, 0.82, 0.3, 0.07);
      b.poly([[0.71, 1.78, 0.04], [0.92, 1.93, 0.04], [0.71, 2.08, 0.04]]);
      b.box(-0.26, 1.34, 0, 0.72, 0.28, 0.07);
      b.poly([[-0.62, 1.34, 0.04], [-0.82, 1.48, 0.04], [-0.62, 1.62, 0.04]]);
      b.color(C.gold);
      b.frustum(0, 2.33, 0, 0.13, 0, 0.2, 6);
    },

    // Argon Crowd Control: a lookout watching a crowd, with roped barriers below.
    watchtower(b) {
      b.color(C.stone);
      b.frustum(0, 0, 0, 1.72, 1.3, 3.0, 4, Math.PI / 4);
      b.color(C.stoneDark);
      b.frustum(0, 0.95, 0, 1.62, 1.6, 0.09, 4, Math.PI / 4);
      b.frustum(0, 2.0, 0, 1.47, 1.45, 0.09, 4, Math.PI / 4);
      b.color(C.dark);
      b.box(0, 0, 1.2, 0.62, 1.15, 0.07);
      b.color(C.timber);
      b.box(0, 1.15, 1.2, 0.78, 0.1, 0.1);

      b.color(C.wood);
      b.box(0, 3.0, 0, 2.75, 0.15, 2.75);
      for (const x of [-1.25, 1.25]) for (const z of [-1.25, 1.25]) b.box(x, 3.15, z, 0.1, 0.5, 0.1);
      b.color(C.woodLight);
      for (const z of [-1.25, 1.25]) b.box(0, 3.55, z, 2.6, 0.07, 0.07);
      for (const x of [-1.25, 1.25]) b.box(x, 3.55, 0, 0.07, 0.07, 2.6);

      b.color(C.timber);
      for (const x of [-1.0, 1.0]) for (const z of [-1.0, 1.0]) b.box(x, 3.15, z, 0.13, 1.3, 0.13);
      b.color(C.slate);
      b.frustum(0, 4.45, 0, 2.08, 0, 1.3, 4, Math.PI / 4);

      // Spyglass, trained on the crowd
      b.color(C.brass);
      b.beam([0.15, 3.78, 0.4], [0.7, 4.0, 1.5], 0.16);
      b.color(C.iron);
      b.beam([0.15, 3.15, 0.4], [0.32, 3.86, 0.8], 0.06);

      b.color(C.iron);
      b.beam([0, 5.72, 0], [0, 6.35, 0], 0.05);
      b.color(C.orange);
      b.poly([[0, 6.32, 0], [0.62, 6.17, 0], [0, 6.0, 0]]);
      b.box(-0.0, 2.25, 1.03, 0.62, 0.68, 0.04);

      for (const [x, z] of [[-1.34, 1.34], [1.34, 1.34], [1.34, -0.1], [-1.34, -0.1]]) {
        b.color(C.iron);
        b.box(x, 0, z, 0.09, 0.62, 0.09);
      }
      b.color(C.orange);
      b.beam([-1.34, 0.55, 1.34], [-0.62, 0.42, 1.36], 0.04);
      b.beam([0.62, 0.42, 1.36], [1.34, 0.55, 1.34], 0.04);
      b.beam([1.34, 0.55, 1.34], [1.34, 0.45, -0.1], 0.04);
      b.beam([-1.34, 0.55, 1.34], [-1.34, 0.45, -0.1], 0.04);
    },

    // MyVMK Trunk: a small treasure chest, lid propped open on its hoard.
    // Trim pieces straddle the surface they sit on, so no two faces are coplanar.
    chest(b) {
      const w = 1.4, d = 0.82, h = 0.56, z0 = -0.04;
      const front = z0 + d / 2, back = z0 - d / 2;

      b.color(C.woodDark);
      b.box(0, 0, z0, w + 0.06, 0.08, d + 0.06);
      b.color(C.wood);
      b.box(0, 0.06, z0, w, h - 0.06, d);
      b.color(C.woodDark);
      b.box(0, h - 0.06, z0, w + 0.04, 0.08, d + 0.04);
      b.box(0, 0.3, front, w - 0.08, 0.025, 0.03);

      b.color(C.iron);
      for (const x of [-0.45, 0.45]) {
        b.box(x, 0.1, front, 0.08, h - 0.2, 0.05);
        b.box(x, 0.1, back, 0.08, h - 0.2, 0.05);
      }

      b.color(C.brass);
      b.box(0, h - 0.27, front, 0.17, 0.19, 0.07);
      b.color(C.dark);
      b.box(0, h - 0.22, front + 0.03, 0.035, 0.08, 0.03);

      b.color(C.gold);
      b.blob(0, h, z0, w * 0.42, 0.15, d * 0.38, 9, 4, 0.18);
      b.color("#f2cf5c");
      b.blob(-0.25, h + 0.09, z0 + 0.05, 0.22, 0.08, 0.17, 7, 3, 0.2);
      b.blob(0.3, h + 0.07, z0 - 0.04, 0.2, 0.07, 0.15, 7, 3, 0.2);
      for (const [x, z, col] of [[-0.42, 0.06, "#c0392b"], [0.1, 0.1, "#2f7fc4"], [0.45, -0.1, "#2c8a4f"], [-0.08, -0.14, b.accent]]) {
        b.color(col);
        b.blob(x, h + 0.14, z0 + z, 0.05, 0.05, 0.05, 6, 3, 0);
      }

      // Rounded lid, hinged at the back and tipped open.
      const r = d / 2 + 0.02, open = 1.05, half = w / 2 + 0.02, n = 8;
      const lidPoint = (t, x, grow = 0) => {
        const a = Math.PI * (1 - t), rr = r + grow;
        const lz = r + Math.cos(a) * rr, ly = Math.sin(a) * rr;
        return [x, h + 0.02 + lz * Math.sin(open) + ly * Math.cos(open), back - 0.02 + lz * Math.cos(open) - ly * Math.sin(open)];
      };
      const strip = (x0, x1, grow) => {
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n;
          b.poly([lidPoint(t0, x0, grow), lidPoint(t0, x1, grow), lidPoint(t1, x1, grow), lidPoint(t1, x0, grow)]);
        }
      };
      b.color(C.wood);
      strip(-half, half, 0);
      b.color(C.woodDark);
      for (const x of [-half, half]) {
        const cap = [];
        for (let k = 0; k <= n; k++) cap.push(lidPoint(k / n, x));
        b.poly(cap);
      }
      b.color(C.iron);
      for (const x of [-0.45, 0.45]) strip(x - 0.04, x + 0.04, 0.04);

      b.color(C.gold);
      for (const [x, z, s] of [[-0.35, 0.47, 2], [0.3, 0.46, 1]]) {
        for (let k = 0; k < s; k++) b.frustum(x + k * 0.01, 0.03 + k * 0.03, z, 0.055, 0.055, 0.025, 8);
      }
      b.color("#f2cf5c");
      for (const [x, z] of [[-0.6, 0.46], [0.05, 0.48], [0.55, 0.44]]) flatDisc(b, x, 0.05, z, 0.05, 8);
    },

    // Portal 2D: two linked gates, one blue and one orange.
    portalGate(b) {
      const gate = (x, glow) => {
        b.color(C.stoneDark);
        b.box(x, 0, 0, 1.85, 0.16, 0.86);
        b.color(C.stone);
        b.box(x, 0.16, 0, 1.55, 0.12, 0.66);
        b.oval(x, 1.58, 0, 0.86, 1.32, 0.2, 18);
        b.color(glow);
        b.mat("swirl");
        b.disc(x, 1.58, 0, 0.78, 1.24, 22);
        b.mat("lit");
      };
      gate(-1.55, "#3d8bff");
      gate(1.55, "#ff8a2b");
    },

    // NavMesh Flood-Fill: a well whose triangulated apron is being flooded forward.
    floodWell(b) {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, mid = (a0 + a1) / 2;
        const inner0 = [Math.cos(a0) * 0.95, 0.04, Math.sin(a0) * 0.95];
        const inner1 = [Math.cos(a1) * 0.95, 0.04, Math.sin(a1) * 0.95];
        const outer = [Math.cos(mid) * 1.47, 0.04, Math.sin(mid) * 1.47];
        const forward = Math.sin(mid) > 0.1;
        b.color(forward ? (k % 2 ? "#4f8cc4" : "#6aa5d6") : k % 2 ? C.stoneDark : C.stone);
        b.poly([inner0, inner1, outer]);
      }
      b.color(C.stone);
      ringWall(b, 0, 0, 0.92, 10, 0, 0.72, 0.2);
      b.color("#2f7fc4");
      b.mat("unlit");
      flatDisc(b, 0, 0.5, 0, 0.84, 10);
      b.mat("lit");

      b.color(C.timber);
      b.box(-0.96, 0.72, 0, 0.13, 1.42, 0.13);
      b.box(0.96, 0.72, 0, 0.13, 1.42, 0.13);
      b.color(C.wood);
      b.beam([-1.02, 1.85, 0], [1.02, 1.85, 0], 0.12);
      b.color(C.tile);
      b.gable(0, 2.14, 0, 2.5, 0.68, 1.5, "x", C.timber);
      b.color(C.canvas);
      b.beam([0, 1.85, 0], [0, 1.2, 0], 0.03);
      b.color(C.wood);
      b.frustum(0, 0.92, 0, 0.17, 0.21, 0.28, 8);
      b.color(C.iron);
      b.frustum(0, 1.12, 0, 0.205, 0.215, 0.04, 8);
    },

    // World Loader: a table of map chunks under a striped canopy.
    mapTable(b) {
      b.color(C.timber);
      for (const x of [-1.2, 1.2]) for (const z of [-1.05, 1.05]) b.box(x, 0, z, 0.1, 1.85, 0.1);
      for (let k = 0; k < 5; k++) {
        b.color(k % 2 ? C.canvas : C.blue);
        b.gable(0, 1.85, -1.22 + (k + 0.5) * 0.488, 2.8, 0.85, 0.5, "z", k % 2 ? C.canvas : C.blue);
      }
      b.color(C.wood);
      b.box(0, 0.62, 0, 1.75, 0.1, 1.25);
      for (const x of [-0.75, 0.75]) for (const z of [-0.5, 0.5]) b.box(x, 0, z, 0.1, 0.62, 0.1);
      b.color(C.parchment);
      b.box(0, 0.72, 0, 1.55, 0.02, 1.08);
      const chunks = ["#5e8f42", "#5e8f42", "#4a7a36", "#c7ad72", "#5e8f42", "#3f6f9e", "#4a7a36", "#5e8f42", "#c7ad72", "#3f6f9e", "#3f6f9e", "#4a7a36"];
      chunks.forEach((col, k) => {
        const i = k % 4, j = (k - i) / 4;
        b.color(col);
        b.box(-0.54 + i * 0.36, 0.74, -0.33 + j * 0.33, 0.33, 0.02 + (k % 5 === 0 ? 0.05 : 0), 0.3);
      });
      b.color(C.red);
      b.frustum(-0.18, 0.76, 0.0, 0.06, 0, 0.2, 5);
      b.color(C.wood);
      b.frustum(-1.05, 0, 0.72, 0.17, 0.2, 0.42, 6);
    },

    // NodeChords: a bandstand strung with a small graph of lit chords.
    bandstand(b) {
      b.color(C.stoneLight);
      b.frustum(0, 0, 0, 1.45, 1.4, 0.18, 8, Math.PI / 8);
      b.color(C.woodLight);
      b.frustum(0, 0.18, 0, 1.36, 1.34, 0.12, 8, Math.PI / 8);
      b.color(C.canvas);
      const posts = [];
      for (let k = 0; k < 8; k++) {
        const a = Math.PI / 8 + (k / 8) * Math.PI * 2;
        posts.push([Math.cos(a) * 1.18, Math.sin(a) * 1.18]);
        b.box(posts[k][0], 0.3, posts[k][1], 0.1, 1.72, 0.1);
      }
      b.color(C.tile);
      b.frustum(0, 2.02, 0, 1.68, 0, 1.0, 8, Math.PI / 8);
      b.color(C.gold);
      b.frustum(0, 3.0, 0, 0.12, 0, 0.42, 6);

      const nodes = [[-0.55, 1.15, 0.2, "#ffd36e"], [0.25, 1.48, -0.42, "#6fd2ff"], [0.6, 1.02, 0.42, "#ff8fb1"], [-0.1, 1.72, 0.42, "#b6f08a"]];
      b.color(C.iron);
      for (const [x, y, z] of nodes) b.beam([x, y + 0.1, z], [x * 0.5, 2.05, z * 0.5], 0.015);
      b.color(C.gold);
      b.beam([-0.55, 1.15, 0.2], [0.25, 1.48, -0.42], 0.02);
      b.beam([0.25, 1.48, -0.42], [0.6, 1.02, 0.42], 0.02);
      b.beam([-0.55, 1.15, 0.2], [-0.1, 1.72, 0.42], 0.02);
      b.beam([-0.1, 1.72, 0.42], [0.6, 1.02, 0.42], 0.02);
      b.mat("unlit");
      for (const [x, y, z, col] of nodes) {
        b.color(col);
        b.blob(x, y, z, 0.13, 0.13, 0.13, 6, 3, 0.02);
      }
      b.mat("lit");
    },

    // Movemnt Pro: a fenced yard with a pull-up frame and a practice dummy.
    trainingYard(b) {
      b.color("#a8895a");
      b.box(0, 0, 0.1, 2.5, 0.03, 2.3);

      b.color(C.timber);
      for (const [x, z] of [[-1.38, -1.28], [0, -1.28], [1.38, -1.28], [-1.38, 0.4], [1.38, 0.4]]) b.box(x, 0, z, 0.11, 0.78, 0.11);
      b.color(C.woodLight);
      for (const y of [0.34, 0.64]) {
        b.beam([-1.38, y, -1.28], [1.38, y, -1.28], 0.06);
        b.beam([-1.38, y, -1.28], [-1.38, y, 0.4], 0.06);
        b.beam([1.38, y, -1.28], [1.38, y, 0.4], 0.06);
      }

      b.color(C.timber);
      b.box(-1.0, 0, -0.65, 0.13, 2.1, 0.13);
      b.box(0.55, 0, -0.65, 0.13, 2.1, 0.13);
      b.color(C.iron);
      b.beam([-1.05, 2.0, -0.65], [0.6, 2.0, -0.65], 0.07);

      b.color(C.timber);
      b.box(0.65, 0, 0.75, 0.14, 1.75, 0.14);
      b.color(C.wood);
      b.beam([0.2, 1.3, 0.75], [1.1, 1.3, 0.75], 0.1);
      b.color(C.straw);
      b.frustum(0.65, 0.68, 0.75, 0.3, 0.26, 0.72, 7);
      b.blob(0.65, 1.7, 0.75, 0.21, 0.21, 0.21, 6, 3, 0.05);
      b.color(C.red);
      flatDiscFront(b, 0.65, 1.05, 1.02, 0.14);

      b.color(C.iron);
      b.beam([-1.0, 0.16, 0.8], [-0.1, 0.16, 0.8], 0.05);
      b.frustum(-1.0, 0, 0.8, 0.17, 0.17, 0.32, 8);
      b.frustum(-0.1, 0, 0.8, 0.17, 0.17, 0.32, 8);
    },

    // MidiEl Studio: an organ that plays itself from a prompted piano roll.
    playerOrgan(b) {
      b.color(C.wood);
      b.box(0, 0, -0.4, 2.7, 1.0, 1.5);
      b.color(C.woodDark);
      b.box(0, 1.0, -0.8, 2.85, 0.12, 0.8);
      b.box(0, 0.6, 0.6, 2.55, 0.12, 0.5);
      b.color("#f1ebdd");
      for (let k = 0; k < 14; k++) b.box(-1.17 + k * 0.18, 0.72, 0.62, 0.16, 0.04, 0.42);
      b.color(C.dark);
      [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach((k) => b.box(-1.08 + k * 0.18, 0.76, 0.52, 0.1, 0.04, 0.24));

      for (let k = -5; k <= 5; k++) {
        const h = 1.35 + (5 - Math.abs(k)) * 0.27, x = k * 0.25;
        b.color(k % 2 ? C.brass : C.gold);
        b.frustum(x, 1.12, -0.85, 0.11, 0.1, h, 6);
        b.color(C.dark);
        b.box(x, 1.38, -0.74, 0.1, 0.11, 0.02);
      }

      b.color(C.timber);
      b.beam([-0.92, 1.0, 0.3], [-0.92, 1.8, 0.0], 0.07);
      b.beam([0.92, 1.0, 0.3], [0.92, 1.8, 0.0], 0.07);
      b.beam([-0.95, 1.8, 0.0], [0.95, 1.8, 0.0], 0.09);
      b.color(C.parchment);
      const roll = (x, t) => [x, 1.0 + t * 0.78, 0.3 - t * 0.29];
      b.poly([roll(-0.85, 0), roll(0.85, 0), roll(0.85, 1), roll(-0.85, 1)]);

      // Notes on the roll, as in a MIDI editor
      b.mat("unlit");
      [[-0.72, 0.15, 0.34, "#c0392b"], [-0.34, 0.42, 0.26, "#2f7fc4"], [-0.05, 0.28, 0.4, "#2c8a4f"], [0.38, 0.62, 0.3, "#c0392b"], [-0.55, 0.72, 0.3, "#2f7fc4"], [0.05, 0.84, 0.24, "#d98a1f"], [0.5, 0.2, 0.26, "#d98a1f"]].forEach(([x, t, len, col]) => {
        b.color(col);
        const lift = (px, pt) => { const p = roll(px, pt); p[2] += 0.015; return p; };
        b.poly([lift(x, t), lift(x + len, t), lift(x + len, t + 0.09), lift(x, t + 0.09)]);
      });
      b.mat("lit");
    },

    // Blob memory tester: a cauldron with something swelling out of it.
    blobPot(b) {
      b.color(C.woodDark);
      b.beam([-0.42, 0.06, -0.3], [0.42, 0.06, 0.3], 0.1);
      b.beam([-0.42, 0.06, 0.3], [0.42, 0.06, -0.3], 0.1);
      b.mat("unlit");
      b.color("#ff8b2e");
      b.frustum(0, 0.08, 0, 0.26, 0.1, 0.16, 6);
      b.mat("lit");
      b.color(C.iron);
      b.frustum(0, 0.16, 0, 0.3, 0.42, 0.24, 9);
      b.frustum(0, 0.4, 0, 0.42, 0.33, 0.2, 9);
      b.frustum(0, 0.6, 0, 0.37, 0.38, 0.05, 9);
      b.mat("unlit");
      b.color("#7ad64e");
      b.blob(0, 0.74, 0, 0.3, 0.24, 0.3, 8, 3, 0.08);
      b.color("#9be86e");
      b.blob(0.17, 1.02, 0.08, 0.1, 0.1, 0.1, 6, 3, 0.04);
      b.blob(-0.1, 1.18, -0.08, 0.06, 0.06, 0.06, 6, 3, 0.02);
      b.mat("lit");
    },

    /* Scenery */
    tree(b, scale, variant) {
      if (variant === 1) {
        b.color(C.trunk);
        b.frustum(0, 0, 0, 0.17 * scale, 0.12 * scale, 0.7 * scale, 6);
        b.color(C.pineDark);
        b.frustum(0, 0.5 * scale, 0, 0.92 * scale, 0, 1.25 * scale, 7, b.vary * 3);
        b.color(C.pine);
        b.frustum(0, 1.15 * scale, 0, 0.72 * scale, 0, 1.1 * scale, 7, b.vary * 5);
        b.frustum(0, 1.75 * scale, 0, 0.5 * scale, 0, 0.92 * scale, 6, b.vary);
        return;
      }
      b.color(C.trunk);
      b.frustum(0, 0, 0, 0.22 * scale, 0.14 * scale, 1.15 * scale, 6);
      b.beam([0, 0.85 * scale, 0], [0.45 * scale, 1.35 * scale, 0.15 * scale], 0.09 * scale);
      b.color(variant === 2 ? C.leafLight : C.leafDark);
      b.blob(0, 1.75 * scale, 0, 1.0 * scale, 0.82 * scale, 1.0 * scale, 7, 4, 0.14);
      b.color(variant === 2 ? "#6e9c3f" : C.leaf);
      b.blob(0.42 * scale, 2.2 * scale, 0.18 * scale, 0.66 * scale, 0.56 * scale, 0.66 * scale, 6, 3, 0.14);
      b.color(C.leafLight);
      b.blob(-0.3 * scale, 2.42 * scale, -0.12 * scale, 0.5 * scale, 0.42 * scale, 0.5 * scale, 6, 3, 0.12);
    },

    rock(b, scale) {
      b.color(C.rock);
      b.blob(0, 0.12 * scale, 0, 0.5 * scale, 0.36 * scale, 0.42 * scale, 6, 3, 0.2);
      b.color(C.stoneDark);
      b.blob(0.3 * scale, 0.06 * scale, 0.22 * scale, 0.22 * scale, 0.16 * scale, 0.2 * scale, 5, 3, 0.2);
    },

    bush(b, scale) {
      b.color(C.leafDark);
      b.blob(0, 0.26 * scale, 0, 0.42 * scale, 0.32 * scale, 0.42 * scale, 6, 3, 0.16);
      b.color(C.leaf);
      b.blob(0.14 * scale, 0.42 * scale, 0.08 * scale, 0.26 * scale, 0.2 * scale, 0.26 * scale, 5, 3, 0.14);
    },

    flower(b, scale, variant) {
      const petal = ["#e8c63f", "#d9627a", "#f0ece0", "#8a7ad6"][variant % 4];
      for (const [x, z] of [[-0.13, 0.05], [0.12, -0.1], [0.03, 0.15]]) {
        b.color(C.leaf);
        b.beam([x, 0, z], [x, 0.2 * scale, z], 0.02);
        b.color(petal);
        b.box(x, 0.18 * scale, z, 0.1, 0.05, 0.1);
      }
    },

    tuft(b, scale) {
      b.color(C.leafLight);
      for (const [x, z, h] of [[-0.09, 0, 0.3], [0.08, 0.06, 0.22], [0.02, -0.08, 0.26]]) b.frustum(x, 0, z, 0.05, 0, h * scale, 3);
    },

    /* Player: the arm and leg pivot at y = 0, at the shoulder and hip */
    playerBody(b) {
      b.color(C.tunic);
      b.box(0, 0.86, 0, 0.5, 0.42, 0.28);
      b.color(C.tunicDark);
      b.frustum(0, 0.62, 0, 0.34, 0.31, 0.26, 4, Math.PI / 4);
      b.color(C.timber);
      b.box(0, 0.82, 0, 0.5, 0.07, 0.3);
      b.color(C.brass);
      b.box(0, 0.82, 0.15, 0.09, 0.07, 0.02);
      b.color(C.trouser);
      b.box(0, 0.58, 0, 0.42, 0.08, 0.24);
    },
    playerHead(b) {
      b.color(C.skin);
      b.box(0, 1.28, 0, 0.32, 0.33, 0.3);
      b.color(C.hair);
      b.box(0, 1.53, -0.02, 0.36, 0.13, 0.35);
      b.box(0, 1.34, -0.16, 0.34, 0.22, 0.06);
      b.color(C.dark);
      for (const x of [-0.08, 0.08]) b.box(x, 1.42, 0.15, 0.05, 0.06, 0.02);
    },
    playerArm(b) {
      b.color(C.tunic);
      b.box(0, -0.3, 0, 0.15, 0.3, 0.16);
      b.color(C.skin);
      b.box(0, -0.54, 0, 0.12, 0.24, 0.13);
    },
    playerLeg(b) {
      b.color(C.trouser);
      b.box(0, -0.44, 0, 0.17, 0.44, 0.18);
      b.color(C.boot);
      b.box(0, -0.62, 0.03, 0.18, 0.18, 0.26);
    },

    sheepBody(b) {
      b.color(C.wool);
      b.blob(0, 0.46, 0, 0.3, 0.26, 0.4, 7, 4, 0.1);
      b.blob(0, 0.56, -0.2, 0.2, 0.17, 0.2, 6, 3, 0.12);
    },
    sheepHead(b) {
      b.color(C.dark);
      b.box(0, 0.5, 0.44, 0.17, 0.2, 0.22);
      b.box(-0.11, 0.62, 0.42, 0.08, 0.05, 0.08);
      b.box(0.11, 0.62, 0.42, 0.08, 0.05, 0.08);
    },
    sheepLeg(b) {
      b.color(C.dark);
      b.box(0, 0, 0, 0.07, 0.28, 0.07);
    },

    smokePuff(b) {
      b.color("#d9d8d2");
      b.mat("unlit");
      b.blob(0, 0, 0, 1, 1, 1, 5, 3, 0.15);
    },

    gem(b) {
      b.color(b.accent);
      b.mat("unlit");
      b.frustum(0, 0, 0, 0, 0.17, 0.2, 4);
      b.frustum(0, 0.2, 0, 0.17, 0, 0.3, 4);
    },
  };

  // A flat target disc facing the camera.
  function flatDiscFront(b, x, y, z, r) {
    const pts = [];
    for (let k = 0; k < 10; k++) pts.push([x + Math.cos((k / 10) * Math.PI * 2) * r, y + Math.sin((k / 10) * Math.PI * 2) * r, z]);
    b.poly(pts);
  }
})();
