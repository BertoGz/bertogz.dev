/*
 * World definition: terrain, paths, regions and which project lives where.
 * No rendering here. The model named by each landmark is in models.js.
 *
 * Coordinates are tiles. Tile (i, j) spans x in [i, i+1] and z in [j, j+1].
 * North is -z. Footprint sizes are odd so a landmark centers on its tile.
 */
(function () {
  const SIZE = 64;
  const T = { WATER: 0, SAND: 1, GRASS: 2, PATH: 3, PLAZA: 4 };
  const WATER_LEVEL = -0.22;
  const PLAZA = [32.5, 32.5, 3.9];

  // The island is a union of discs, one per region: [x, z, radius].
  const LOBES = [[32, 32, 12], [42.5, 21.5, 11], [18.5, 24, 9.5], [43.5, 42, 11]];

  const PATHS = [
    [[32, 32], [36, 27], [41, 23]],
    [[41, 23], [43, 21]],
    [[41, 23], [38, 22]],
    [[41, 23], [44, 24]],
    [[32, 32], [26, 29], [19, 26]],
    [[19, 26], [15, 23]],
    [[19, 26], [22, 22]],
    [[19, 26], [17.5, 27.5]],
    [[32, 32], [37, 37], [42, 42]],
    [[42, 42], [47, 41]],
    [[42, 42], [46, 44]],
    [[42, 42], [43, 46]],
  ];

  const REGIONS = [
    { id: "origin", name: "Origin Square", center: [32, 32], radius: 6, accent: "#edece7" },
    { id: "ai", name: "Ai Ridge", section: "AI Applications", center: [41, 21], radius: 9, accent: "#ff9a4a" },
    { id: "engines", name: "Game Dev", section: "Game Development", center: [19, 25], radius: 8, accent: "#5aa2ff" },
    { id: "apps", name: "Web Apps", section: "Web Applications", center: [42, 42], radius: 9, accent: "#edece7" },  ];

  const place = (id, repo, model, at, size, region, label) => ({ id, repo, model, at, size, region, label });

  const LANDMARKS = [
    place("signpost", null, "signpost", [32, 30], [1, 1], "origin", "Signpost"),

    place("argon", "argon-crowd-control", "watchtower", [43, 18], [3, 3], "ai", "Watchtower"),
    place("midiel", "midi-el", "playerOrgan", [46, 24], [3, 3], "ai", "Player organ"),

    place("portal", "portal-2d", "portalGate", [15, 21], [5, 1], "engines", "Twin gates"),
    place("navmesh", "navmesh-floodfill", "floodWell", [22, 19], [3, 3], "engines", "Flood well"),
    place("world-loader", "world-loader-demo", "mapTable", [15, 28], [3, 3], "engines", "Cartographer's table"),

    place("inventory", "inventory-manager", "chest", [41, 39], [3, 1], "apps", "Treasure chest"),
    place("nodechords", "NodeChords", "bandstand", [47, 38], [3, 3], "apps", "Bandstand"),
    place("movemnt", "movemnt-pro", "trainingYard", [38, 40], [3, 3], "apps", "Training yard"),
    place("blob", "blob-test", "blobPot", [43, 47], [1, 1], "apps", "Bubbling pot"),
  ];

  /* Deterministic noise, so the island is the same on every load */
  const hash = (x, z) => {
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = (a, b, v) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const noise = (x, z) => {
    const i = Math.floor(x), j = Math.floor(z);
    const u = smooth(0, 1, x - i), v = smooth(0, 1, z - j);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, z) => 0.6 * noise(x / 7, z / 7) + 0.3 * noise(x / 3.1 + 9, z / 3.1) + 0.1 * noise(x / 1.4, z / 1.4 + 4);

  // Positive on land, roughly the distance to the shore.
  const field = (x, z) => {
    let best = -Infinity;
    for (const [cx, cz, r] of LOBES) {
      best = Math.max(best, r - Math.hypot(x - cx, z - cz) * (1 + 0.22 * (fbm(x, z) - 0.5)));
    }
    return best;
  };

  const segDist = (px, pz, [ax, az], [bx, bz]) => {
    const dx = bx - ax, dz = bz - az;
    const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
  };
  const pathDist = (x, z) => {
    let best = Infinity;
    for (const line of PATHS) {
      for (let k = 0; k < line.length - 1; k++) best = Math.min(best, segDist(x, z, line[k], line[k + 1]));
    }
    return best;
  };
  const landmarkDist = (x, z) => {
    let best = Infinity;
    for (const { at, size } of LANDMARKS) {
      const dx = Math.abs(x - at[0] - 0.5) - size[0] / 2;
      const dz = Math.abs(z - at[1] - 0.5) - size[1] / 2;
      best = Math.min(best, Math.hypot(Math.max(dx, 0), Math.max(dz, 0)));
    }
    return best;
  };

  const tileIndex = (i, j) => i + j * SIZE;
  const cornerIndex = (i, j) => i + j * (SIZE + 1);

  /* Corner heights: flat near paths and landmarks, gently rolling elsewhere */
  const corners = new Float32Array((SIZE + 1) * (SIZE + 1));
  for (let j = 0; j <= SIZE; j++) {
    for (let i = 0; i <= SIZE; i++) {
      const f = field(i, j);
      if (f <= 0) {
        corners[cornerIndex(i, j)] = -0.7;
        continue;
      }
      const flat = Math.max(smooth(3.2, 1.4, pathDist(i, j)), smooth(4, 1.2, landmarkDist(i, j)), smooth(6.5, 4.2, Math.hypot(i - PLAZA[0], j - PLAZA[1])));
      const land = Math.max(0.06, 0.25 + (fbm(i * 1.7, j * 1.7) - 0.5) * 3.0 * (1 - flat));
      corners[cornerIndex(i, j)] = -0.36 + (land + 0.36) * smooth(0, 2.4, f);
    }
  }

  // Follows the same diagonal as the terrain triangles, so feet stay on the surface.
  const heightAt = (x, z) => {
    const i = Math.max(0, Math.min(SIZE - 1, Math.floor(x)));
    const j = Math.max(0, Math.min(SIZE - 1, Math.floor(z)));
    const fx = x - i, fz = z - j;
    const a = corners[cornerIndex(i, j)], b = corners[cornerIndex(i + 1, j)];
    const c = corners[cornerIndex(i + 1, j + 1)], d = corners[cornerIndex(i, j + 1)];
    return fx >= fz ? a + (b - a) * fx + (c - b) * fz : a + (c - d) * fx + (d - a) * fz;
  };

  /* Tile types and blockers */
  const tiles = new Uint8Array(SIZE * SIZE);
  const blocked = new Uint8Array(SIZE * SIZE);
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const x = i + 0.5, z = j + 0.5;
      const f = field(x, z);
      let type = f < 0 ? T.WATER : f < 1.4 ? T.SAND : T.GRASS;
      if (f > 0.5 && pathDist(x, z) < 1.05) type = T.PATH;
      if (Math.hypot(x - PLAZA[0], z - PLAZA[1]) < PLAZA[2]) type = T.PLAZA;
      tiles[tileIndex(i, j)] = type;
      if (f < 0.55) blocked[tileIndex(i, j)] = 1;
    }
  }

  for (const { at, size } of LANDMARKS) {
    const hw = (size[0] - 1) / 2, hd = (size[1] - 1) / 2;
    for (let j = at[1] - hd; j <= at[1] + hd; j++) {
      for (let i = at[0] - hw; i <= at[0] + hw; i++) blocked[tileIndex(i, j)] = 1;
    }
  }

  /* Scenery: blocks movement, not clickable */
  const deco = [];
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const k = tileIndex(i, j);
      if (blocked[k] || (tiles[k] !== T.GRASS && tiles[k] !== T.SAND)) continue;
      const x = i + 0.5, z = j + 0.5;
      if (pathDist(x, z) < 1.9 || landmarkDist(x, z) < 2.5 || Math.hypot(x - PLAZA[0], z - PLAZA[1]) < PLAZA[2] + 3) continue;
      const roll = hash(i + 0.3, j + 0.7);
      const grove = smooth(0.42, 0.7, noise(i / 6 + 20, j / 6));
      const treeChance = tiles[k] === T.GRASS ? 0.05 + 0.34 * grove : 0;
      if (roll < treeChance) {
        const kind = hash(i + 5.1, j + 2.3);
        deco.push({ type: "tree", x, z, scale: 0.8 + hash(j, i) * 0.5, variant: grove > 0.7 && kind < 0.55 ? 1 : kind < 0.8 ? 0 : 2 });
        blocked[k] = 1;
      } else if (roll > 0.982) {
        deco.push({ type: "rock", x, z, scale: 0.7 + hash(j, i) * 0.8 });
        blocked[k] = 1;
      }
    }
  }

  // Ground cover: decorative only, so it never blocks a tile.
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const k = tileIndex(i, j);
      if (blocked[k] || tiles[k] !== T.GRASS) continue;
      const x = i + 0.2 + hash(i, j + 3) * 0.6, z = j + 0.2 + hash(i + 3, j) * 0.6;
      if (pathDist(x, z) < 1.3) continue;
      const roll = hash(i + 11.3, j + 17.9);
      const variant = Math.floor(hash(i + 2.2, j + 8.8) * 4);
      if (roll < 0.07) deco.push({ type: "flower", x, z, scale: 1, variant });
      else if (roll < 0.26) deco.push({ type: "tuft", x, z, scale: 0.9 + hash(j, i + 1) * 0.5 });
      else if (roll < 0.3) deco.push({ type: "bush", x, z, scale: 0.8 + hash(j + 1, i) * 0.6 });
    }
  }

  // Sheep wander near these tiles. Skips any tile that scenery has taken.
  const critters = [[28, 24], [31, 25], [27, 36], [36, 35], [24, 36]].filter(([i, j]) => !blocked[tileIndex(i, j)]);

  window.WORLD = {
    SIZE, T, WATER_LEVEL, tiles, blocked, corners, deco, critters, heightAt, tileIndex, cornerIndex,
    regions: REGIONS,
    landmarks: LANDMARKS,
    spawn: [32, 34],
  };
})();
