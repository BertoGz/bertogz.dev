/* WebGL2 renderer, camera, tile pathfinding and pointer input for the world page. */
(function () {
  "use strict";
  const W = window.WORLD;
  const MODELS = window.WORLD_MODELS;
  const { SIZE, T, WATER_LEVEL, tiles, blocked, corners, heightAt, tileIndex, cornerIndex } = W;

  const hex = (s) => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const MAT = { lit: 0, unlit: 1, swirl: 2, water: 3 };
  const STRIDE = 10;

  const SKY = hex("#a7c4d2");
  const SUN = (() => {
    const v = [-0.5, 0.76, 0.42], l = Math.hypot(...v);
    return v.map((c) => c / l);
  })();
  const TILE_COLOR = {
    [T.WATER]: hex("#2a5c78"), [T.SAND]: hex("#c9b27a"), [T.GRASS]: hex("#5d8a3a"),
    [T.PATH]: hex("#8c6d45"), [T.PLAZA]: hex("#8f8b80"),
  };
  const WATER_COLOR = hex("#2f78aa");
  const SEABED_COLOR = hex("#1f4a68");
  const FX = { hover: [0.96, 0.93, 0.8], walk: [1, 1, 1] };
  const RING_HOVER = [1, 0.95, 0.78];
  const RING_SELECTED = [1, 0.78, 0.2];

  /* Matrices, column-major */
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  };
  const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const IDENTITY = identity();
  const translate = (x, y, z) => { const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m; };
  const scaling = (s) => { const m = identity(); m[0] = m[5] = m[10] = s; return m; };
  const rotateY = (a) => { const m = identity(); m[0] = Math.cos(a); m[2] = -Math.sin(a); m[8] = Math.sin(a); m[10] = Math.cos(a); return m; };
  const rotateX = (a) => { const m = identity(); m[5] = Math.cos(a); m[6] = Math.sin(a); m[9] = -Math.sin(a); m[10] = Math.cos(a); return m; };

  const perspective = (fovy, aspect, near, far) => {
    const f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
    return m;
  };
  const lookAt = (e, t) => {
    let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2];
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1,
    ]);
  };
  const invert = (a) => {
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4];
    const b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12];
    const b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    return new Float32Array([
      (a[5] * b11 - a[6] * b10 + a[7] * b09) * det, (a[2] * b10 - a[1] * b11 - a[3] * b09) * det,
      (a[13] * b05 - a[14] * b04 + a[15] * b03) * det, (a[10] * b04 - a[9] * b05 - a[11] * b03) * det,
      (a[6] * b08 - a[4] * b11 - a[7] * b07) * det, (a[0] * b11 - a[2] * b08 + a[3] * b07) * det,
      (a[14] * b02 - a[12] * b05 - a[15] * b01) * det, (a[8] * b05 - a[10] * b02 + a[11] * b01) * det,
      (a[4] * b10 - a[5] * b08 + a[7] * b06) * det, (a[1] * b08 - a[0] * b10 - a[3] * b06) * det,
      (a[12] * b04 - a[13] * b02 + a[15] * b00) * det, (a[9] * b02 - a[8] * b04 - a[11] * b00) * det,
      (a[5] * b07 - a[4] * b09 - a[6] * b06) * det, (a[0] * b09 - a[1] * b07 + a[2] * b06) * det,
      (a[13] * b01 - a[12] * b03 - a[14] * b00) * det, (a[8] * b03 - a[9] * b01 + a[10] * b00) * det,
    ]);
  };
  const apply = (m, x, y, z, w) => [
    m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    m[2] * x + m[6] * y + m[10] * z + m[14] * w, m[3] * x + m[7] * y + m[11] * z + m[15] * w,
  ];

  /* Geometry builder handed to each model. Output is flat-shaded, in world space. */
  function Builder(cx, cz, base, opts = {}) {
    const tris = [], boxes = [], emitters = [];
    let fill = hex("#888888"), mat = MAT.lit, top = 0;
    let seed = Math.floor((opts.vary || 0) * 1e6) + 4099;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 4; k++) rand();

    const P = (x, y, z) => {
      top = Math.max(top, y);
      return [cx + x, base + y, cz + z];
    };
    const bound = (pts) => {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (const p of pts) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
      boxes.push({ min, max });
    };
    const faceShade = () => (mat === MAT.lit ? 0.94 + rand() * 0.12 : 1);
    const pushVertex = (p, c, n, m) => tris.push(p[0], p[1], p[2], c[0], c[1], c[2], n[0], n[1], n[2], m);

    const tri = (a, b, c, ctr, shade) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      // Winding varies between primitives, so point each normal away from the primitive's center.
      const outward = ((a[0] + b[0] + c[0]) / 3 - ctr[0]) * nx + ((a[1] + b[1] + c[1]) / 3 - ctr[1]) * ny + ((a[2] + b[2] + c[2]) / 3 - ctr[2]) * nz;
      if (outward < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const col = [fill[0] * shade, fill[1] * shade, fill[2] * shade];
      for (const p of [a, b, c]) pushVertex(p, col, [nx, ny, nz], mat);
    };
    const quad = (a, b, c, d, ctr) => {
      const shade = faceShade();
      tri(a, b, c, ctr, shade);
      tri(a, c, d, ctr, shade);
    };
    const triFace = (a, b, c, ctr) => tri(a, b, c, ctr, faceShade());

    return {
      tris, boxes, emitters,
      vary: opts.vary || 0,
      accent: opts.accent || "#ffffff",
      top: () => top,

      color(c) { fill = hex(c); },
      mat(name) { mat = MAT[name]; },

      box(x, y, z, sx, sy, sz) {
        const hx = sx / 2, hz = sz / 2;
        const c = [
          P(x - hx, y, z - hz), P(x + hx, y, z - hz), P(x + hx, y, z + hz), P(x - hx, y, z + hz),
          P(x - hx, y + sy, z - hz), P(x + hx, y + sy, z - hz), P(x + hx, y + sy, z + hz), P(x - hx, y + sy, z + hz),
        ];
        const ctr = [cx + x, base + y + sy / 2, cz + z];
        quad(c[4], c[5], c[6], c[7], ctr);
        quad(c[0], c[1], c[5], c[4], ctr);
        quad(c[1], c[2], c[6], c[5], ctr);
        quad(c[2], c[3], c[7], c[6], ctr);
        quad(c[3], c[0], c[4], c[7], ctr);
        bound(c);
      },

      wall(x0, z0, x1, z1, y, h, thick) {
        const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1;
        const nx = (-dz / l) * (thick / 2), nz = (dx / l) * (thick / 2);
        const c = [
          P(x0 + nx, y, z0 + nz), P(x1 + nx, y, z1 + nz), P(x1 - nx, y, z1 - nz), P(x0 - nx, y, z0 - nz),
          P(x0 + nx, y + h, z0 + nz), P(x1 + nx, y + h, z1 + nz), P(x1 - nx, y + h, z1 - nz), P(x0 - nx, y + h, z0 - nz),
        ];
        const ctr = [cx + (x0 + x1) / 2, base + y + h / 2, cz + (z0 + z1) / 2];
        quad(c[4], c[5], c[6], c[7], ctr);
        quad(c[0], c[1], c[5], c[4], ctr);
        quad(c[1], c[2], c[6], c[5], ctr);
        quad(c[2], c[3], c[7], c[6], ctr);
        quad(c[3], c[0], c[4], c[7], ctr);
        bound(c);
      },

      beam(a, b, thick) {
        const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const l = Math.hypot(d[0], d[1], d[2]) || 1;
        const dn = d.map((v) => v / l);
        const up = Math.abs(dn[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        let u = [dn[1] * up[2] - dn[2] * up[1], dn[2] * up[0] - dn[0] * up[2], dn[0] * up[1] - dn[1] * up[0]];
        const ul = Math.hypot(u[0], u[1], u[2]) || 1;
        u = u.map((v) => (v / ul) * (thick / 2));
        const nv = [dn[1] * u[2] - dn[2] * u[1], dn[2] * u[0] - dn[0] * u[2], dn[0] * u[1] - dn[1] * u[0]];
        const at = (p, su, sv) => P(p[0] + u[0] * su + nv[0] * sv, p[1] + u[1] * su + nv[1] * sv, p[2] + u[2] * su + nv[2] * sv);
        const ring = (p) => [at(p, 1, 1), at(p, -1, 1), at(p, -1, -1), at(p, 1, -1)];
        const ra = ring(a), rb = ring(b);
        const ctr = [cx + (a[0] + b[0]) / 2, base + (a[1] + b[1]) / 2, cz + (a[2] + b[2]) / 2];
        for (let k = 0; k < 4; k++) {
          const n = (k + 1) % 4;
          quad(ra[k], ra[n], rb[n], rb[k], ctr);
        }
        quad(rb[0], rb[1], rb[2], rb[3], ctr);
        bound([...ra, ...rb]);
      },

      gable(x, y, z, sx, sy, sz, axis, endColor) {
        const hx = sx / 2, hz = sz / 2;
        const c = [P(x - hx, y, z - hz), P(x + hx, y, z - hz), P(x + hx, y, z + hz), P(x - hx, y, z + hz)];
        const ridge = axis === "x"
          ? [P(x - hx, y + sy, z), P(x + hx, y + sy, z)]
          : [P(x, y + sy, z - hz), P(x, y + sy, z + hz)];
        const ctr = [cx + x, base + y + sy * 0.3, cz + z];
        const roof = fill;
        const end = endColor ? hex(endColor) : roof;
        if (axis === "x") {
          quad(c[0], c[1], ridge[1], ridge[0], ctr);
          quad(c[3], c[2], ridge[1], ridge[0], ctr);
          fill = end;
          triFace(c[0], c[3], ridge[0], ctr);
          triFace(c[1], c[2], ridge[1], ctr);
        } else {
          quad(c[0], c[3], ridge[1], ridge[0], ctr);
          quad(c[1], c[2], ridge[1], ridge[0], ctr);
          fill = end;
          triFace(c[0], c[1], ridge[0], ctr);
          triFace(c[3], c[2], ridge[1], ctr);
        }
        fill = roof;
        bound([...c, ...ridge]);
      },

      frustum(x, y, z, r0, r1, h, sides = 8, rot = 0) {
        const low = [], high = [];
        for (let k = 0; k < sides; k++) {
          const a = rot + (k / sides) * Math.PI * 2;
          low.push(P(x + Math.cos(a) * r0, y, z + Math.sin(a) * r0));
          high.push(P(x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1));
        }
        const ctr = [cx + x, base + y + h / 2, cz + z];
        for (let k = 0; k < sides; k++) {
          const n = (k + 1) % sides;
          if (r1 > 0 && r0 > 0) quad(low[k], low[n], high[n], high[k], ctr);
          else if (r0 > 0) triFace(low[k], low[n], high[k], ctr);
          else triFace(low[k], high[n], high[k], ctr);
        }
        if (r1 > 0) {
          const shade = faceShade();
          for (let k = 1; k < sides - 1; k++) tri(high[0], high[k], high[k + 1], [ctr[0], ctr[1] - 1, ctr[2]], shade);
        }
        bound([...low, ...high]);
      },

      blob(x, y, z, rx, ry, rz, segs = 6, rings = 3, rough = 0.12) {
        const rows = [];
        for (let r = 1; r < rings; r++) {
          const phi = (Math.PI * r) / rings, row = [];
          for (let s = 0; s < segs; s++) {
            const theta = (Math.PI * 2 * s) / segs + ((r % 2) * Math.PI) / segs;
            const j = 1 + (rand() - 0.5) * 2 * rough;
            row.push(P(x + Math.cos(theta) * Math.sin(phi) * rx * j, y + Math.cos(phi) * ry * j, z + Math.sin(theta) * Math.sin(phi) * rz * j));
          }
          rows.push(row);
        }
        const peak = P(x, y + ry, z), foot = P(x, y - ry, z);
        const ctr = [cx + x, base + y, cz + z];
        for (let s = 0; s < segs; s++) {
          const n = (s + 1) % segs;
          triFace(peak, rows[0][s], rows[0][n], ctr);
          triFace(foot, rows[rows.length - 1][s], rows[rows.length - 1][n], ctr);
          for (let r = 0; r < rows.length - 1; r++) quad(rows[r][s], rows[r][n], rows[r + 1][n], rows[r + 1][s], ctr);
        }
        bound([peak, foot, ...rows.flat()]);
      },

      oval(x, y, z, rx, ry, thick, segs = 16) {
        for (let k = 0; k < segs; k++) {
          const a0 = (k / segs) * Math.PI * 2, a1 = ((k + 1) / segs) * Math.PI * 2;
          this.beam([x + Math.cos(a0) * rx, y + Math.sin(a0) * ry, z], [x + Math.cos(a1) * rx, y + Math.sin(a1) * ry, z], thick);
        }
      },

      // The surface coordinates ride in the normal slot, for the swirl shader.
      disc(x, y, z, rx, ry, segs = 20) {
        const center = P(x, y, z), rim = [];
        for (let k = 0; k <= segs; k++) {
          const a = (k / segs) * Math.PI * 2;
          rim.push([P(x + Math.cos(a) * rx, y + Math.sin(a) * ry, z), Math.cos(a), Math.sin(a)]);
        }
        for (let k = 0; k < segs; k++) {
          pushVertex(center, fill, [0, 0, 0], mat);
          pushVertex(rim[k][0], fill, [rim[k][1], rim[k][2], 0], mat);
          pushVertex(rim[k + 1][0], fill, [rim[k + 1][1], rim[k + 1][2], 0], mat);
        }
        bound(rim.map((r) => r[0]));
      },

      poly(points) {
        const pts = points.map(([x, y, z]) => P(x, y, z));
        const u = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
        const v = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]];
        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const l = Math.hypot(n[0], n[1], n[2]) || 1;
        n = n.map((c) => c / l);
        if (n[1] < -0.01 || (Math.abs(n[1]) <= 0.01 && n[2] < 0)) n = n.map((c) => -c);
        const shade = faceShade();
        const col = [fill[0] * shade, fill[1] * shade, fill[2] * shade];
        for (let k = 1; k < pts.length - 1; k++) {
          pushVertex(pts[0], col, n, mat);
          pushVertex(pts[k], col, n, mat);
          pushVertex(pts[k + 1], col, n, mat);
        }
        bound(pts);
      },

      smoke(x, y, z) { emitters.push(P(x, y, z)); },
    };
  }

  const VS = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aColor;
  layout(location=2) in vec3 aNormal;
  layout(location=3) in float aMat;
  uniform mat4 uVP, uModel;
  uniform vec3 uCam, uSun;
  uniform float uTime, uMotion;
  uniform vec2 uOffset;
  out vec3 vColor, vWorld, vUV;
  flat out vec3 vFacet;
  flat out float vMat;
  out float vDist;
  void main() {
    vec4 w = uModel * vec4(aPos, 1.);
    vec3 c = aColor;
    if (aMat > 2.5) {
      float wave = sin(w.x * .9 + uTime * 1.1) * cos(w.z * .7 + uTime * .8) + .5 * sin(w.x * .33 + w.z * .41 - uTime * .6);
      w.y += wave * .06 * uMotion;
      c *= 1. + wave * .13;
    } else if (aMat < .5) {
      float sun = max(dot(normalize(mat3(uModel) * aNormal), uSun), 0.);
      c *= vec3(.56, .58, .66) + vec3(.62, .58, .48) * sun;
    }
    vColor = c;
    vFacet = c;
    vMat = aMat;
    vUV = aNormal;
    vWorld = w.xyz;
    vDist = distance(w.xyz, uCam);
    gl_Position = uVP * w;
    gl_Position.xy += uOffset * gl_Position.w;
  }`;

  const FS = `#version 300 es
  precision highp float;
  in vec3 vColor, vWorld, vUV;
  flat in vec3 vFacet;
  flat in float vMat;
  in float vDist;
  uniform vec3 uFog;
  uniform vec2 uFogRange;
  uniform float uLift, uTime, uMotion, uAlpha;
  uniform vec4 uFlat;
  out vec4 o;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    if (uFlat.a > 0.) { o = uFlat; return; }
    vec3 c = vColor;
    if (vMat > 2.5) {
      c = vFacet;
    } else if (vMat > 1.5) {
      float r = length(vUV.xy), a = atan(vUV.y, vUV.x);
      float band = floor((sin(a * 3. + r * 9. - uTime * 2.4 * uMotion) * .5 + .5) * 4.) / 3.;
      c = vColor * (.55 + .85 * band) + vec3(.16) * (1. - r);
    } else if (vMat < .5) {
      c *= .965 + .07 * hash(floor(vWorld.xz * 6.) + floor(vWorld.y * 6.));
    }
    c = mix(c, vec3(1.), uLift);
    c = mix(c, uFog, smoothstep(uFogRange.x, uFogRange.y, vDist));
    o = vec4(c, uAlpha);
  }`;

  window.createWorld = function (canvas, hooks) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, stencil: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");

    canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
    canvas.addEventListener("webglcontextrestored", () => location.reload());

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const u = {};
    for (const name of ["uVP", "uModel", "uCam", "uSun", "uTime", "uMotion", "uFog", "uFogRange", "uLift", "uAlpha", "uOffset", "uFlat"]) u[name] = gl.getUniformLocation(program, name);

    const makeMesh = (data, mode, usage) => {
      const vao = gl.createVertexArray();
      const buffer = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), usage || gl.STATIC_DRAW);
      const stride = STRIDE * 4;
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 36);
      gl.bindVertexArray(null);
      return { vao, buffer, count: data.length / STRIDE, mode };
    };

    /* Terrain: colors blend across tiles, except the paving, which stays hard-edged */
    const noiseAt = (x, z) => {
      const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
    const patch = (x, z) => {
      const fx = x / 5, fz = z / 5, i = Math.floor(fx), j = Math.floor(fz);
      const a = smooth(0, 1, fx - i), b = smooth(0, 1, fz - j);
      const v = (m, n) => noiseAt(m + 41, n + 7);
      return v(i, j) * (1 - a) * (1 - b) + v(i + 1, j) * a * (1 - b) + v(i, j + 1) * (1 - a) * b + v(i + 1, j + 1) * a * b;
    };

    const tileAt = (i, j) => (i < 0 || j < 0 || i >= SIZE || j >= SIZE ? T.WATER : tiles[tileIndex(i, j)]);
    const heightOf = (i, j) => corners[cornerIndex(clamp(i, 0, SIZE), clamp(j, 0, SIZE))];

    // Soft ground shadows, baked into the terrain: each object darkens the corners it would shade.
    const cornerShade = new Float32Array((SIZE + 1) * (SIZE + 1)).fill(1);
    const addShadow = (cx, cz, hw, hd, height, strength) => {
      const reach = Math.min(height * 0.42, 2.2);
      const sx = (-SUN[0] / SUN[1]) * reach, sz = (-SUN[2] / SUN[1]) * reach;
      const px = cx + sx / 2, pz = cz + sz / 2;
      const ex = hw + Math.abs(sx) / 2, ez = hd + Math.abs(sz) / 2;
      for (let j = Math.max(0, Math.floor(pz - ez - 2)); j <= Math.min(SIZE, Math.ceil(pz + ez + 2)); j++) {
        for (let i = Math.max(0, Math.floor(px - ex - 2)); i <= Math.min(SIZE, Math.ceil(px + ex + 2)); i++) {
          const dx = Math.max(Math.abs(i - px) - ex, 0), dz = Math.max(Math.abs(j - pz) - ez, 0);
          const k = cornerIndex(i, j);
          cornerShade[k] = Math.min(cornerShade[k], 1 - strength * smooth(1.5, 0.2, Math.hypot(dx, dz)));
        }
      }
    };

    const regionOf = new Map(W.regions.map((r) => [r.id, r]));

    /* Landmarks, one mesh each so hovering can light one up */
    const smokeSources = [];
    const landmarks = W.landmarks.map((l, n) => {
      const cx = l.at[0] + 0.5, cz = l.at[1] + 0.5;
      const base = heightAt(cx, cz);
      const b = Builder(cx, cz, base, { accent: regionOf.get(l.region).accent, vary: Math.sin(n * 43.17) * 0.5 + 0.5 });
      MODELS[l.model](b, l);
      smokeSources.push(...b.emitters);
      const height = b.top();
      addShadow(cx, cz, l.size[0] / 2 - 0.2, l.size[1] / 2 - 0.2, height, l.size[0] > 1 ? 0.34 : 0.14);
      // One volume per landmark, so the gaps in open structures still count as the landmark.
      const box = {
        min: [0, 1, 2].map((k) => Math.min(...b.boxes.map((part) => part.min[k]))),
        max: [0, 1, 2].map((k) => Math.max(...b.boxes.map((part) => part.max[k]))),
      };
      return { ...l, cx, cz, base, height, box, mesh: makeMesh(b.tris, gl.TRIANGLES) };
    });
    const landmarkById = new Map(landmarks.map((l) => [l.id, l]));

    /* Scenery, merged into one mesh */
    const decoData = [];
    W.deco.forEach((item, n) => {
      const b = Builder(item.x, item.z, heightAt(item.x, item.z), { vary: Math.sin(n * 91.7) * 0.5 + 0.5 });
      MODELS[item.type](b, item.scale, item.variant);
      for (let k = 0; k < b.tris.length; k++) decoData.push(b.tris[k]);
      if (item.type === "tree") addShadow(item.x, item.z, 0.5 * item.scale, 0.5 * item.scale, 3 * item.scale, 0.22);
    });

    const terrainData = [];
    {
      const cornerColor = (i, j) => {
        let r = 0, g = 0, b = 0, n = 0;
        for (const [ti, tj] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
          const type = tileAt(ti, tj);
          const col = TILE_COLOR[type === T.PLAZA ? T.PATH : type];
          const weight = type === T.PATH || type === T.PLAZA ? 3 : type === T.SAND ? 1.5 : 1;
          r += col[0] * weight; g += col[1] * weight; b += col[2] * weight; n += weight;
        }
        const type = tileAt(i, j);
        const mottle = 0.93 + patch(i, j) * 0.15 + (noiseAt(i, j) - 0.5) * 0.07;
        const shade = cornerShade[cornerIndex(i, j)];
        const warm = type === T.GRASS ? (patch(i + 30, j) - 0.5) * 0.08 : 0;
        return [(r / n) * mottle * shade + warm, (g / n) * mottle * shade, (b / n) * mottle * shade];
      };
      const normalAt = (i, j) => {
        const nx = heightOf(i - 1, j) - heightOf(i + 1, j), nz = heightOf(i, j - 1) - heightOf(i, j + 1);
        const l = Math.hypot(nx, 2, nz);
        return [nx / l, 2 / l, nz / l];
      };
      const colors = [], normals = [];
      for (let j = 0; j <= SIZE; j++) for (let i = 0; i <= SIZE; i++) {
        colors.push(cornerColor(i, j));
        normals.push(normalAt(i, j));
      }
      const vertex = (i, j, color) => {
        const k = cornerIndex(i, j), n = normals[k], c = color || colors[k];
        terrainData.push(i, corners[k], j, c[0], c[1], c[2], n[0], n[1], n[2], MAT.lit);
      };
      for (let j = 0; j < SIZE; j++) {
        for (let i = 0; i < SIZE; i++) {
          let flat = null;
          if (tiles[tileIndex(i, j)] === T.PLAZA) {
            const v = 0.95 + noiseAt(i + 3, j + 9) * 0.1;
            flat = TILE_COLOR[T.PLAZA].map((c) => c * v);
          }
          const shaded = (ci, cj) => (flat ? flat.map((c) => c * cornerShade[cornerIndex(ci, cj)]) : null);
          vertex(i, j, shaded(i, j)); vertex(i + 1, j, shaded(i + 1, j)); vertex(i + 1, j + 1, shaded(i + 1, j + 1));
          vertex(i, j, shaded(i, j)); vertex(i + 1, j + 1, shaded(i + 1, j + 1)); vertex(i, j + 1, shaded(i, j + 1));
        }
      }
    }

    /* Water: a coarse grid of facets the vertex shader ripples, over a seabed plane */
    const MARGIN = 26;
    const waterData = [], seabedData = [];
    {
      const lo = -MARGIN, hi = SIZE + MARGIN, step = 2;
      for (const [x, z] of [[lo, lo], [hi, lo], [hi, hi], [lo, lo], [hi, hi], [lo, hi]]) {
        seabedData.push(x, -0.9, z, SEABED_COLOR[0], SEABED_COLOR[1], SEABED_COLOR[2], 0, 0, 0, MAT.unlit);
      }
      const add = (x, z) => {
        waterData.push(x, WATER_LEVEL, z, WATER_COLOR[0], WATER_COLOR[1], WATER_COLOR[2], 0, 1, 0, MAT.water);
      };
      for (let z = lo; z < hi; z += step) for (let x = lo; x < hi; x += step) {
        add(x, z); add(x + step, z); add(x + step, z + step);
        add(x, z); add(x + step, z + step); add(x, z + step);
      }
    }

    /* Moving parts */
    const part = (name, accent) => {
      const b = Builder(0, 0, 0, { accent, vary: 0.4 });
      MODELS[name](b);
      return makeMesh(b.tris, gl.TRIANGLES);
    };
    const playerParts = { body: part("playerBody"), head: part("playerHead"), arm: part("playerArm"), leg: part("playerLeg") };
    const sheepParts = { body: part("sheepBody"), head: part("sheepHead"), leg: part("sheepLeg") };
    const puff = part("smokePuff");
    const gemMeshes = new Map(W.regions.map((r) => [r.id, part("gem", r.accent === "#edece7" ? "#ffd25e" : r.accent)]));

    const staticMeshes = {
      seabed: makeMesh(seabedData, gl.TRIANGLES),
      terrain: makeMesh(terrainData, gl.TRIANGLES),
      deco: makeMesh(decoData, gl.TRIANGLES),
      water: makeMesh(waterData, gl.TRIANGLES),
    };
    const fxLines = makeMesh(new Array(STRIDE * 2).fill(0), gl.LINES, gl.DYNAMIC_DRAW);
    const fxShadows = makeMesh(new Array(STRIDE * 3).fill(0), gl.TRIANGLES, gl.DYNAMIC_DRAW);

    /* Tile pathfinding: Dijkstra over the grid, eight directions, no cut corners */
    const flood = (start) => {
      // Float64 so stored costs match the heap's values exactly; Float32 rounding made the
      // `c > cost[k]` stale check skip real nodes and cut the island into fake pieces.
      const cost = new Float64Array(SIZE * SIZE).fill(Infinity);
      const prev = new Int32Array(SIZE * SIZE).fill(-1);
      const heap = [];
      const push = (c, k) => {
        heap.push([c, k]);
        for (let n = heap.length - 1; n > 0;) {
          const p = (n - 1) >> 1;
          if (heap[p][0] <= heap[n][0]) break;
          [heap[p], heap[n]] = [heap[n], heap[p]];
          n = p;
        }
      };
      const pop = () => {
        const top = heap[0], last = heap.pop();
        if (heap.length) {
          heap[0] = last;
          for (let n = 0;;) {
            const l = n * 2 + 1, r = l + 1;
            let m = n;
            if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
            if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
            if (m === n) break;
            [heap[m], heap[n]] = [heap[n], heap[m]];
            n = m;
          }
        }
        return top;
      };
      cost[start] = 0;
      push(0, start);
      while (heap.length) {
        const [c, k] = pop();
        if (c > cost[k]) continue;
        const i = k % SIZE, j = (k - i) / SIZE;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const ni = i + dx, nj = j + dz;
          if (ni < 0 || nj < 0 || ni >= SIZE || nj >= SIZE) continue;
          const nk = tileIndex(ni, nj);
          if (blocked[nk]) continue;
          if (dx && dz && (blocked[tileIndex(ni, j)] || blocked[tileIndex(i, nj)])) continue;
          const nc = c + (dx && dz ? 1.414 : 1);
          if (nc < cost[nk]) { cost[nk] = nc; prev[nk] = k; push(nc, nk); }
        }
      }
      return { cost, prev };
    };

    const walkPath = (prev, start, goal) => {
      const out = [];
      for (let k = goal; k !== start && k !== -1; k = prev[k]) out.push(k);
      return out.reverse();
    };

    /* State */
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SPEED = reduced ? Infinity : 4.6;
    const portrait = () => canvas.clientHeight > canvas.clientWidth * 1.1;
    const player = { i: W.spawn[0], j: W.spawn[1], x: W.spawn[0] + 0.5, z: W.spawn[1] + 0.5, yaw: 0, targetYaw: 0, phase: 0, swing: 0 };
    let path = [];
    let pending = null;
    let currentRegion = null;
    let destination = null;
    let clickFx = null;
    let hover = { landmark: null, tile: null };
    let selected = null; // { landmark, alpha, fading }

    const critters = W.critters.map(([i, j], n) => ({
      homeI: i, homeJ: j, x: i + 0.5, z: j + 0.5, tx: i + 0.5, tz: j + 0.5,
      yaw: n * 2.1, wait: 1 + (n % 3) * 1.4, step: 0,
    }));

    const cam = { yaw: 0, pitch: 0.86, dist: 32, zoom: 32, x: player.x, y: 0.3, z: player.z };
    const inset = { right: 0, bottom: 0, currentRight: 0, currentBottom: 0 };
    let cssW = 1, cssH = 1;
    let invVP = identity(), VP = identity();
    let eye = [0, 0, 0];

    const fitZoom = () => { cam.zoom = cam.dist = portrait() ? 34 : 32; };

    // Renders below screen resolution on purpose. A whole-number divisor keeps the pixels even.
    function resize() {
      cssW = canvas.clientWidth || 1;
      cssH = canvas.clientHeight || 1;
      const dpr = window.devicePixelRatio || 1;
      const deviceW = cssW * dpr, deviceH = cssH * dpr;
      const divisor = Math.max(1, Math.round(Math.min(deviceW, deviceH) / 540));
      canvas.width = Math.max(1, Math.round(deviceW / divisor));
      canvas.height = Math.max(1, Math.round(deviceH / divisor));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function updateCamera() {
      const aspect = cssW / cssH;
      const fov = aspect < 0.8 ? 0.8 : 0.56;
      const cp = Math.cos(cam.pitch);
      eye = [
        cam.x + Math.sin(cam.yaw) * cp * cam.dist,
        cam.y + Math.sin(cam.pitch) * cam.dist,
        cam.z + Math.cos(cam.yaw) * cp * cam.dist,
      ];
      const V = lookAt(eye, [cam.x, cam.y, cam.z]);
      const P = perspective(fov, aspect, 0.5, 260);
      // Keeps the player centered in whatever a panel leaves uncovered.
      const shift = identity();
      shift[12] = -inset.currentRight / cssW;
      shift[13] = inset.currentBottom / cssH;
      VP = mul(shift, mul(P, V));
      invVP = invert(VP);
    }

    const project = (x, y, z) => {
      const c = apply(VP, x, y, z, 1);
      return [((c[0] / c[3]) * 0.5 + 0.5) * cssW, (0.5 - (c[1] / c[3]) * 0.5) * cssH, c[3]];
    };

    /* Picking */
    const rayFrom = (sx, sy) => {
      const nx = (sx / cssW) * 2 - 1, ny = 1 - (sy / cssH) * 2;
      const a = apply(invVP, nx, ny, -1, 1), b = apply(invVP, nx, ny, 1, 1);
      const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
      const f = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
      const d = [f[0] - o[0], f[1] - o[1], f[2] - o[2]];
      const l = Math.hypot(d[0], d[1], d[2]);
      return { o, d: [d[0] / l, d[1] / l, d[2] / l] };
    };

    const rayBox = (o, d, box) => {
      let near = -Infinity, far = Infinity;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(d[k]) < 1e-6) {
          if (o[k] < box.min[k] || o[k] > box.max[k]) return Infinity;
          continue;
        }
        const t0 = (box.min[k] - o[k]) / d[k], t1 = (box.max[k] - o[k]) / d[k];
        near = Math.max(near, Math.min(t0, t1));
        far = Math.min(far, Math.max(t0, t1));
      }
      return near <= far && far > 0 ? Math.max(near, 0) : Infinity;
    };

    const surface = (x, z) => (x >= 0 && z >= 0 && x <= SIZE && z <= SIZE ? Math.max(heightAt(x, z), WATER_LEVEL) : WATER_LEVEL);

    const rayGround = (o, d) => {
      if (d[1] >= -1e-4) return null;
      let t = Math.max(0, (3 - o[1]) / d[1]);
      let lo = t;
      for (let n = 0; n < 700; n++, t += 0.16) {
        const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t;
        if (y <= surface(x, z)) {
          for (let k = 0; k < 6; k++) {
            const m = (lo + t) / 2;
            if (o[1] + d[1] * m <= surface(o[0] + d[0] * m, o[2] + d[2] * m)) t = m; else lo = m;
          }
          return { t, i: Math.floor(o[0] + d[0] * t), j: Math.floor(o[2] + d[2] * t) };
        }
        lo = t;
      }
      return null;
    };

    function pickAt(sx, sy, forgiving) {
      const { o, d } = rayFrom(sx, sy);
      const ground = rayGround(o, d);
      let landmark = null, best = ground ? ground.t : Infinity;
      for (const l of landmarks) {
        const t = rayBox(o, d, l.box);
        if (t < best) { best = t; landmark = l; }
      }
      // Fingers are imprecise, so a tap near a landmark counts as a tap on it.
      if (!landmark && forgiving) {
        let nearest = 34;
        for (const l of landmarks) {
          const [px, py, w] = project(l.cx, l.base + l.height * 0.55, l.cz);
          if (w <= 0) continue;
          const gap = Math.hypot(px - sx, py - sy);
          if (gap < nearest) { nearest = gap; landmark = l; }
        }
      }
      const tile = ground && ground.i >= 0 && ground.j >= 0 && ground.i < SIZE && ground.j < SIZE ? { i: ground.i, j: ground.j } : null;
      return { landmark, tile };
    }

    /* Movement */
    function routeOrigin() {
      return path.length ? path[0] : tileIndex(player.i, player.j);
    }

    function follow(route, head) {
      path = head === undefined ? route : [head, ...route];
    }

    function walkTo(i, j) {
      pending = null;
      selected = null;
      const moving = path.length > 0;
      const origin = routeOrigin();
      const { cost, prev } = flood(origin);
      let goal = tileIndex(clamp(i, 0, SIZE - 1), clamp(j, 0, SIZE - 1));
      if (blocked[goal] || cost[goal] === Infinity) {
        let bestScore = Infinity;
        goal = origin;
        for (let k = 0; k < SIZE * SIZE; k++) {
          if (cost[k] === Infinity) continue;
          const ci = k % SIZE, cj = (k - ci) / SIZE;
          const score = (ci - i) ** 2 + (cj - j) ** 2 + cost[k] * 0.001;
          if (score < bestScore) { bestScore = score; goal = k; }
        }
      }
      follow(walkPath(prev, origin, goal), moving ? origin : undefined);
      destination = goal;
      const gi = goal % SIZE;
      clickFx = { i: gi, j: (goal - gi) / SIZE, t: 0, color: FX.walk };
      if (!path.length) arrive();
    }

    function goToLandmark(id) {
      const l = typeof id === "string" ? landmarkById.get(id) : id;
      if (!l) {
        console.warn("[goToLandmark] unknown landmark", id);
        debugger;
        return false;
      }
      const moving = path.length > 0;
      const origin = routeOrigin();
      const { cost, prev } = flood(origin);
      const hw = (l.size[0] - 1) / 2, hd = (l.size[1] - 1) / 2;
      let goal = -1, best = Infinity;
      for (let j = l.at[1] - hd - 1; j <= l.at[1] + hd + 1; j++) {
        for (let i = l.at[0] - hw - 1; i <= l.at[0] + hw + 1; i++) {
          if (i < 0 || j < 0 || i >= SIZE || j >= SIZE) continue;
          const k = tileIndex(i, j);
          if (cost[k] === Infinity) continue;
          // Favor the side facing the camera, so the building doesn't hide the player on arrival.
          const score = cost[k] - 1.5 * ((i + 0.5 - l.cx) * Math.sin(cam.yaw) + (j + 0.5 - l.cz) * Math.cos(cam.yaw));
          if (score < best) { best = score; goal = k; }
        }
      }
      if (goal < 0) {
        const oi = origin % SIZE, oj = (origin - oi) / SIZE;
        console.warn("[goToLandmark] no reachable approach tile", {
          id: l.id,
          routeOrigin: [oi, oj],
          playerTile: [player.i, player.j],
          moving,
          landmarkAt: l.at,
          footprint: l.size,
        });
        debugger;
        return false;
      }
      follow(walkPath(prev, origin, goal), moving ? origin : undefined);
      pending = l;
      destination = null;
      clickFx = null;
      selected = { landmark: l, alpha: 1, fading: false };
      if (!path.length) arrive();
      return true;
    }

    function arrive() {
      destination = null;
      if (!pending) return;
      const l = pending;
      pending = null;
      if (selected && selected.landmark === l) selected.fading = true;
      player.targetYaw = Math.atan2(l.cx - player.x, l.cz - player.z);
      if (reduced) player.yaw = player.targetYaw;
      hooks.onArrive(l);
    }

    function checkRegion() {
      let found = null;
      for (const r of W.regions) {
        if (Math.hypot(player.x - r.center[0], player.z - r.center[1]) < r.radius) { found = r; break; }
      }
      if (found && found !== currentRegion) {
        currentRegion = found;
        hooks.onRegion(found);
      }
    }

    function stepPlayer(dt) {
      let remain = SPEED * dt;
      const moving = path.length > 0;
      while (remain > 0 && path.length) {
        const k = path[0];
        const ti = k % SIZE, tj = (k - ti) / SIZE;
        const gx = ti + 0.5, gz = tj + 0.5;
        const dx = gx - player.x, dz = gz - player.z;
        const d = Math.hypot(dx, dz);
        if (d > 1e-5) {
          player.targetYaw = Math.atan2(dx, dz);
          if (reduced) player.yaw = player.targetYaw;
        }
        if (d <= remain) {
          player.x = gx; player.z = gz; player.i = ti; player.j = tj;
          remain -= d;
          path.shift();
          checkRegion();
          if (!path.length) arrive();
        } else {
          player.x += (dx / d) * remain;
          player.z += (dz / d) * remain;
          remain = 0;
        }
      }
      let delta = player.targetYaw - player.yaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      player.yaw += delta * (1 - Math.exp(-dt * 14));
      if (moving && !reduced) player.phase += dt * 11;
      const swingGoal = path.length && !reduced ? 1 : 0;
      player.swing += (swingGoal - player.swing) * (1 - Math.exp(-dt * 12));
    }

    function stepCritters(dt) {
      if (reduced) return;
      for (const c of critters) {
        const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
        if (d > 0.02) {
          const move = Math.min(d, 0.85 * dt);
          c.x += (dx / d) * move;
          c.z += (dz / d) * move;
          c.step += dt * 9;
          let turn = Math.atan2(dx, dz) - c.yaw;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          c.yaw += turn * (1 - Math.exp(-dt * 6));
          continue;
        }
        c.wait -= dt;
        if (c.wait > 0) continue;
        c.wait = 1.5 + Math.random() * 4.5;
        const ni = Math.floor(c.x) + Math.round(Math.random() * 2 - 1);
        const nj = Math.floor(c.z) + Math.round(Math.random() * 2 - 1);
        if (ni < 0 || nj < 0 || ni >= SIZE || nj >= SIZE) continue;
        if (blocked[tileIndex(ni, nj)] || Math.hypot(ni - c.homeI, nj - c.homeJ) > 3.5) continue;
        c.tx = ni + 0.5;
        c.tz = nj + 0.5;
      }
    }

    /* Pointer input */
    const pointers = new Map();
    let gesture = null;
    const heldKeys = new Set();
    let pointerActive = false;
    let hoverDirty = false;
    let lastMouse = null;

    const updateHover = () => {
      if (!lastMouse) return;
      const next = pickAt(lastMouse.x, lastMouse.y, false);
      const landmarkChanged = next.landmark !== hover.landmark;
      const tileChanged = !!next.tile !== !!hover.tile || (next.tile && (next.tile.i !== hover.tile.i || next.tile.j !== hover.tile.j));
      hover = next;
      if (landmarkChanged || tileChanged) hooks.onHover(hover);
    };

    const clearHover = () => {
      lastMouse = null;
      if (hover.landmark || hover.tile) {
        hover = { landmark: null, tile: null };
        hooks.onHover(hover);
      }
    };

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      hooks.onDismiss();

      if (pointers.size === 2) {
        if (gesture && gesture.timer) clearTimeout(gesture.timer);
        const [a, b] = [...pointers.values()];
        gesture = { pinch: Math.hypot(a.x - b.x, a.y - b.y), startZoom: cam.zoom };
        return;
      }
      if (pointers.size > 2 || e.button === 2) return;

      gesture = { x: e.offsetX, y: e.offsetY, lastX: e.offsetX, lastY: e.offsetY, button: e.button, type: e.pointerType, moved: false, timer: null, held: false };
      if (e.pointerType === "touch") {
        const current = gesture, clientX = e.clientX, clientY = e.clientY;
        current.timer = setTimeout(() => {
          current.held = true;
          hooks.onContext(pickAt(current.x, current.y, true), clientX, clientY);
        }, 480);
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });

      if (e.pointerType === "mouse" && !gesture) {
        lastMouse = { x: e.offsetX, y: e.offsetY };
        hoverDirty = true;
      }
      if (!gesture) return;

      if (gesture.pinch) {
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
          cam.zoom = clamp((gesture.startZoom * gesture.pinch) / d, 12, 50);
          pointerActive = true;
        }
        return;
      }

      const dx = e.offsetX - gesture.lastX, dy = e.offsetY - gesture.lastY;
      if (!gesture.moved && Math.hypot(e.offsetX - gesture.x, e.offsetY - gesture.y) > 7) {
        gesture.moved = true;
        if (gesture.timer) clearTimeout(gesture.timer);
        clearHover();
      }
      if (gesture.moved) {
        cam.yaw -= dx * 0.0065;
        cam.pitch = clamp(cam.pitch + dy * 0.004, 0.62, 1.42);
        pointerActive = true;
      }
      gesture.lastX = e.offsetX;
      gesture.lastY = e.offsetY;
    });

    const release = (e) => {
      pointers.delete(e.pointerId);
      const g = gesture;
      if (g && g.timer) clearTimeout(g.timer);
      if (e.type === "pointerup" && g && !g.pinch && !g.moved && !g.held && g.button === 0 && pointers.size === 0) {
        const hit = pickAt(g.x, g.y, g.type === "touch");
        if (hit.landmark) hooks.onLandmarkClick(hit.landmark);
        else if (hit.tile) walkTo(hit.tile.i, hit.tile.j);
      }
      if (pointers.size === 0) gesture = null;
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !pointers.size) clearHover(); });

    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (gesture && gesture.type === "touch") return;
      hooks.onContext(pickAt(e.offsetX, e.offsetY, false), e.clientX, e.clientY);
    });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      cam.zoom = clamp(cam.zoom * Math.exp(e.deltaY * 0.0012), 12, 50);
    }, { passive: false });

    const typing = () => {
      const a = document.activeElement;
      return a && a !== document.body && a !== canvas;
    };
    window.addEventListener("keydown", (e) => {
      if (e.key.startsWith("Arrow") && !typing()) { heldKeys.add(e.key); e.preventDefault(); }
    });
    window.addEventListener("keyup", (e) => heldKeys.delete(e.key));
    window.addEventListener("blur", () => heldKeys.clear());

    /* Frame */
    const draw = (mesh, model, lift, alpha) => {
      gl.bindVertexArray(mesh.vao);
      gl.uniformMatrix4fv(u.uModel, false, model || IDENTITY);
      gl.uniform1f(u.uLift, lift || 0);
      gl.uniform1f(u.uAlpha, alpha === undefined ? 1 : alpha);
      gl.drawArrays(mesh.mode, 0, mesh.count);
    };

    const lineData = [], shadowData = [];
    const fxVertex = (out, p, c) => out.push(p[0], p[1], p[2], c[0], c[1], c[2], 0, 0, 0, MAT.unlit);
    const fxLine = (a, b, c) => { fxVertex(lineData, a, c); fxVertex(lineData, b, c); };
    const outline = (cx, cz, hw, hd, color) => {
      const pts = [[cx - hw, cz - hd], [cx + hw, cz - hd], [cx + hw, cz + hd], [cx - hw, cz + hd]].map(([x, z]) => [x, surface(x, z) + 0.06, z]);
      for (let k = 0; k < 4; k++) fxLine(pts[k], pts[(k + 1) % 4], color);
    };
    const blobShadow = (x, z, r) => {
      const black = [0, 0, 0];
      const point = (a) => {
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r * 0.9;
        return [px, surface(px, pz) + 0.04, pz];
      };
      const center = [x, surface(x, z) + 0.04, z];
      for (let k = 0; k < 10; k++) {
        fxVertex(shadowData, center, black);
        fxVertex(shadowData, point((k / 10) * Math.PI * 2), black);
        fxVertex(shadowData, point(((k + 1) / 10) * Math.PI * 2), black);
      }
    };

    function upload(mesh, data) {
      mesh.count = data.length / STRIDE;
      if (!data.length) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    }

    function buildFx(dt) {
      lineData.length = 0;
      shadowData.length = 0;
      if (hover.tile && !hover.landmark) outline(hover.tile.i + 0.5, hover.tile.j + 0.5, 0.5, 0.5, FX.hover);
      if (destination !== null) {
        const ti = destination % SIZE, tj = (destination - ti) / SIZE;
        outline(ti + 0.5, tj + 0.5, 0.32, 0.32, FX.walk);
      }
      if (selected && selected.fading) {
        selected.alpha -= dt / 0.7;
        if (selected.alpha <= 0) selected = null;
      }
      if (clickFx) {
        clickFx.t += dt / 0.42;
        if (clickFx.t >= 1) clickFx = null;
        else outline(clickFx.i + 0.5, clickFx.j + 0.5, 0.75 - clickFx.t * 0.44, 0.75 - clickFx.t * 0.44, clickFx.color);
      }
      upload(fxLines, lineData);

      blobShadow(player.x, player.z, 0.42);
      for (const c of critters) blobShadow(c.x, c.z, 0.4);
      upload(fxShadows, shadowData);
    }

    function renderPlayer() {
      const y = heightAt(player.x, player.z);
      const root = mul(translate(player.x, y, player.z), rotateY(player.yaw));
      const swing = Math.sin(player.phase) * 0.72 * player.swing;
      draw(playerParts.body, root);
      draw(playerParts.head, root);
      draw(playerParts.leg, mul(root, mul(translate(-0.13, 0.62, 0), rotateX(swing))));
      draw(playerParts.leg, mul(root, mul(translate(0.13, 0.62, 0), rotateX(-swing))));
      draw(playerParts.arm, mul(root, mul(translate(-0.33, 1.24, 0), rotateX(-swing * 0.85))));
      draw(playerParts.arm, mul(root, mul(translate(0.33, 1.24, 0), rotateX(swing * 0.85))));
    }

    function renderCritters() {
      for (const c of critters) {
        const y = heightAt(c.x, c.z);
        const root = mul(translate(c.x, y, c.z), rotateY(c.yaw));
        const swing = Math.sin(c.step) * 0.5;
        draw(sheepParts.body, root);
        draw(sheepParts.head, root);
        for (const [x, z, s] of [[-0.16, 0.24, 1], [0.16, 0.24, -1], [-0.16, -0.24, -1], [0.16, -0.24, 1]]) {
          draw(sheepParts.leg, mul(root, mul(translate(x, 0.28, z), mul(rotateX(swing * s), translate(0, -0.28, 0)))));
        }
      }
    }

    function renderSmoke(t) {
      if (reduced) return;
      for (const [x, y, z] of smokeSources) {
        for (let k = 0; k < 6; k++) {
          const p = (t * 0.28 + k / 6) % 1;
          const drift = Math.sin(t * 0.9 + k * 2.3) * 0.18;
          // Swells, then thins out to nothing, since these puffs are opaque.
          const size = 0.04 + Math.sin(p * Math.PI) * 0.15;
          draw(puff, mul(translate(x + drift * p + p * 0.5, y + p * 1.9, z - p * 0.2), scaling(size)));
        }
      }
    }

    function renderGems(t) {
      for (const l of landmarks) {
        const bob = reduced ? 0 : Math.sin(t * 2 + l.cx) * 0.1;
        const spin = reduced ? 0 : t * 1.2;
        draw(gemMeshes.get(l.region), mul(translate(l.cx, l.base + l.height + 0.55 + bob, l.cz), rotateY(spin)));
      }
    }

    function render(time, dt) {
      const t = time / 1000;
      buildFx(dt);
      gl.clearColor(SKY[0], SKY[1], SKY[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.useProgram(program);
      gl.uniformMatrix4fv(u.uVP, false, VP);
      gl.uniform3fv(u.uCam, eye);
      gl.uniform3fv(u.uSun, SUN);
      gl.uniform3fv(u.uFog, SKY);
      gl.uniform2f(u.uFogRange, cam.dist * 1.25, cam.dist * 2.9);
      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uMotion, reduced ? 0 : 1);
      gl.uniform2f(u.uOffset, 0, 0);
      gl.uniform4f(u.uFlat, 0, 0, 0, 0);

      draw(staticMeshes.seabed);
      draw(staticMeshes.terrain);
      draw(staticMeshes.deco);
      const pulse = reduced ? 0.2 : 0.16 + 0.1 * Math.sin(t * 7);
      for (const l of landmarks) {
        const isSelected = selected && selected.landmark === l;
        draw(l.mesh, null, isSelected ? pulse * selected.alpha : hover.landmark === l ? 0.1 : 0);
      }
      renderPlayer();
      renderCritters();
      renderSmoke(t);
      renderGems(t);
      if (fxLines.count) draw(fxLines);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      if (fxShadows.count) draw(fxShadows, null, 0, 0.32);
      draw(staticMeshes.water, null, 0, 0.8);

      if (hover.landmark && !(selected && selected.landmark === hover.landmark)) drawSilhouette(hover.landmark.mesh, RING_HOVER, 0.85);
      if (selected) drawSilhouette(selected.landmark.mesh, RING_SELECTED, selected.alpha);
      gl.depthMask(true);
    }

    // Outlines an object: marks its shape in the stencil, then draws copies nudged
    // in eight directions, keeping only the ring that falls outside that shape.
    function drawSilhouette(mesh, color, alpha) {
      const ring = Math.max(1, Math.round((2 * canvas.width) / cssW));
      const dx = (ring * 2) / canvas.width, dy = (ring * 2) / canvas.height;
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.STENCIL_TEST);
      gl.clear(gl.STENCIL_BUFFER_BIT);
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 1, 255);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      draw(mesh);
      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.NOTEQUAL, 1, 255);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.uniform4f(u.uFlat, color[0], color[1], color[2], alpha);
      for (const [sx, sy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        gl.uniform2f(u.uOffset, sx * dx, sy * dy);
        draw(mesh);
      }
      gl.uniform2f(u.uOffset, 0, 0);
      gl.uniform4f(u.uFlat, 0, 0, 0, 0);
      gl.disable(gl.STENCIL_TEST);
      gl.enable(gl.DEPTH_TEST);
    }

    let last = performance.now();
    let rafId = 0;

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      const held = heldKeys.size > 0;
      const zoomEasing = Math.abs(cam.zoom - cam.dist) > 0.01;
      const camEasing = Math.hypot(cam.x - player.x, cam.z - player.z) > 0.01;
      const insetEasing = Math.abs(inset.right - inset.currentRight) > 0.5 || Math.abs(inset.bottom - inset.currentBottom) > 0.5;
      const busy = path.length > 0 || held || zoomEasing || camEasing || insetEasing || pointerActive || hoverDirty || clickFx || selected || Math.abs(player.swing) > 0.01;
      // Only ambient motion remains when nothing else is happening, so idle at 30 fps.
      if (!busy && now - last < 32) return;
      pointerActive = false;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      stepPlayer(dt);
      stepCritters(dt);

      if (held) {
        const turn = dt * 1.7, tilt = dt * 0.9;
        if (heldKeys.has("ArrowLeft")) cam.yaw -= turn;
        if (heldKeys.has("ArrowRight")) cam.yaw += turn;
        if (heldKeys.has("ArrowUp")) cam.pitch = clamp(cam.pitch + tilt, 0.62, 1.42);
        if (heldKeys.has("ArrowDown")) cam.pitch = clamp(cam.pitch - tilt, 0.62, 1.42);
      }

      const track = reduced ? 1 : 1 - Math.exp(-dt * 7);
      cam.x += (player.x - cam.x) * track;
      cam.z += (player.z - cam.z) * track;
      cam.y += (heightAt(player.x, player.z) + 0.6 - cam.y) * track;
      const ease = reduced ? 1 : 1 - Math.exp(-dt * 10);
      cam.dist += (cam.zoom - cam.dist) * ease;
      inset.currentRight += (inset.right - inset.currentRight) * ease;
      inset.currentBottom += (inset.bottom - inset.currentBottom) * ease;

      updateCamera();
      if (hoverDirty) { hoverDirty = false; updateHover(); }
      render(now, dt);
      hooks.onFrame(project(player.x, heightAt(player.x, player.z) + 2.05, player.z));
    }

    new ResizeObserver(() => { resize(); updateCamera(); }).observe(canvas);
    resize();
    fitZoom();
    updateCamera();
    cam.y = heightAt(player.x, player.z) + 0.6;
    checkRegion();
    rafId = requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(rafId);
      if (!document.hidden) {
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    });

    return {
      player, cam, walkTo, goToLandmark, pickAt, project,
      setInset(right, bottom) { inset.right = right; inset.bottom = bottom; },
      isWalking: () => path.length > 0,
      landmarks: () => landmarks,
      gl,
    };
  };
})();
