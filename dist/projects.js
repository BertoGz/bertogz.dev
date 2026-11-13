/*
 * All page content lives here.
 *
 * To link a newly deployed repo, set its `demo` to the live URL. The Live demo
 * button appears and the project moves to the Live section of the index.
 * See README.md for which repos can be deployed and what each one needs.
 */
window.PORTFOLIO = {
  sections: [
    {
      id: "ai",
      title: "AI orchestration",
      blurb: "Models placed inside control loops, with constrained outputs and working fallbacks.",
      features: ["argon-crowd-control"],
      rows: ["midi-el"],
    },
    {
      id: "engines",
      title: "Game engine development",
      blurb: "Physics, navigation, world streaming and spatial data structures.",
      features: ["portal-2d", "navmesh-floodfill", "world-loader-demo"],
    },
    {
      id: "apps",
      title: "Applications",
      blurb: "Complete products with real data models, persistence and auth.",
      features: ["NodeChords", "inventory-manager"],
      rows: ["movemnt-pro"],
    },
  ],

  projects: [
    {
      repo: "argon-crowd-control",
      title: "Argon Crowd Control",
      year: "2026",
      demo: "https://cerebralvalley.ai/e/gemini-4-argon-sf/hackathon/gallery/50",
      demoLabel: "Hackathon showcase",
      summary:
        "A venue crowd safety loop built for the Gemini 4 Argon SF Hackathon. Seeded physics drives hundreds of agents; the UI renders monochrome CCTV-style clips for Gemini, which proposes barriers, beacons, and gates as JSON. A validator clamps and repairs each plan before it hits the sim, repeating until crush-force and safety scores pass.",
      short: "Gemini watches simulated crowd CCTV and iteratively places barriers and gates until safety limits pass.",
      stack: ["TypeScript", "React", "Three.js", "Gemini API"],
      image: {
        repo: "argon-crowd-control",
        file: "screencap.png",
        width: 1542,
        height: 1074,
        alt: "Argon Crowd Control: simulated crowd, CCTV-style view, and Gemini safety loop UI",
      },
      loop: {
        steps: [
          ["Simulate", "Seeded physics, 240 agents"],
          ["Observe", "Monochrome CCTV, 4 FPS clip"],
          ["Reason", "Gemini video input, JSON schema"],
          ["Validate", "Clamp, cap and repair the plan"],
          ["Apply", "Barriers, beacons and gates"],
        ],
        repeat: "Repeats until the safety score and crush-force limits pass, up to 25 iterations.",
      },
      points: [
        ["Ground truth stays out of the prompt.", "The model sees only identical gray silhouettes and has to infer density and crush force from pixels. Physics telemetry is shown beside its estimate so the two can be compared."],
        ["Model output is constrained.", "Responses follow a strict JSON schema, then a validator clamps coordinates, caps barrier count and length, and drops invalid gates before anything reaches the simulation."],
        ["Failures fall back in stages.", "Requests fall through a chain of models and then to a local pixel analyzer, so a dropped connection doesn't end a run."],
        ["The physics is reproducible.", "Social and granular contact forces with spatial-hash neighbor lookup, driven by a seeded RNG so a plan can be replayed under identical conditions."],
      ],
    },
    {
      repo: "inventory-manager",
      title: "MyVMK Trunk",
      year: "2026",
      demo: "https://bertogz.github.io/inventory-manager/",
      demoLabel: "Web app",
      store: "https://chromewebstore.google.com/detail/myvmk-trunk/njkhacgocclnpjjablkfaapmifjcgila",
      storeLabel: "Chrome Web Store",
      summary:
        "myVMK companion app. Trunk tracks your inventory and room items automatically while you play, then lets you find any of them with semantic search, filters and tags, plus a catalog of every item ever released. shipped as a Chrome extension for in-game use.",
      short: "myVMK that tracks your inventory and finds items with semantic search.",
      stack: ["React", "Transformers.js", "IndexedDB", "PWA"],
      video: { youtube: "b7LwTnjykOw", title: "myVMK Trunk: Features & Reveal" },
      gallery: [
        { src: "https://lh3.googleusercontent.com/MYlpB-sldpqYiO-4h5nEZDcZMqZjXW55rD9SnWDy-65_BOjJ4Mst0e0Op_Wsay4bsJqJf1nW7qCPMbRXNT_QxLJpzA=s1280", width: 1280, height: 800, alt: "Trunk's Main Inventory tab open over myVMK, listing owned furniture with cost, quantity and tags" },
        { src: "https://lh3.googleusercontent.com/ysm0TZFhFJh0xfP5R9pEPWPpdhy_PrpcwS72Ahmk2uBEZrng2XQqXUtkUYIhU2VrCyBJZxCrPugzJLB3YMl9rUWDSg=s1280", width: 1280, height: 800, alt: "Trunk split view comparing the item catalog with the items placed in a myVMK room" },
        { src: "https://lh3.googleusercontent.com/-fryo4Ba7guiVxhNmcj-oGFXx0aL3MuBh_aalDhAsJTeLZwMJaJ4llmDXVsRngmkMJ4wjUl1tBJYhlf1h_BRIm34BNY=s1280", width: 1280, height: 800, alt: "MyVMK Trunk banner with a treasure chest and a myVMK avatar" },
      ],
      points: [
        ["Sync Items Live", "Inventory and room items sync automatically from the game, so the collection stays current without manual entry."],
        ["Semantic search.", "Search by theme, color or a loose description instead of an exact item name. An on-device embedding model runs through Transformers.js."],
        ["Filters, tags and sorting.", "Narrow thousands of items by category, custom tags and metadata, with multi-level sorting."],
        ["Master catalog.", "Browse every item in the game's history, build wish lists and generate sales sheets."],
      ],
    },
    {
      repo: "portal-2d",
      title: "Portal 2D",
      year: "2025",
      demo: "https://bertogz.github.io/portal-2d/",
      summary:
        "A 2D portal platformer on a hand-written Canvas engine. No game framework, delivered as a single 52 KB HTML file.",
      short: "Portal platformer on a hand-written Canvas engine.",
      stack: ["JavaScript", "Canvas 2D", "Custom engine"],
      image: { src: "assets/shots/portal.jpg", width: 1220, height: 702, alt: "Portal 2D gameplay with an orange portal on the left wall and a blue portal on a central pillar" },
      points: [
        ["Predictive portal steering.", "The engine projects a body's velocity forward and bends it toward a portal's center, so near misses connect."],
        ["Portal-aware collision.", "Wall contacts are suppressed around an active portal's aperture, letting bodies pass through solid geometry."],
        ["Built-in level editor.", "Levels can be authored, saved and reloaded from inside the game."],
      ],
    },
    {
      repo: "navmesh-floodfill",
      title: "NavMesh Flood-Fill",
      year: "2026",
      demo: "https://bertogz.github.io/navmesh-floodfill/",
      summary:
        "Directional search for AI pursuit. From a target's last known position and heading, it floods a navigation mesh to estimate where the target could be.",
      short: "Directional pursuit search over a navigation mesh.",
      stack: ["JavaScript", "Canvas 2D", "Godot mesh export"],
      image: { src: "assets/shots/navmesh.jpg", width: 1100, height: 688, alt: "Navigation mesh with a yellow flood region spreading forward from a last known position along a heading arrow" },
      points: [
        ["Direction-weighted Dijkstra.", "Edge cost scales with alignment to the travel vector: forward steps get cheaper, backward steps are penalized."],
        ["Occlusion-aware rules.", "Rear-cone limits apply only where the origin has line of sight, so pockets behind walls still fill once the search wraps around."],
        ["Built against a real level.", "Runs on 9,990 triangles and 5,319 vertices exported from a Godot level, with live tuning controls."],
      ],
    },
    {
      repo: "midi-el",
      title: "MidiEl Studio",
      year: "2026",
      demo: "https://bertogz.github.io/midi-el/",
      demoNote: "Needs your own Gemini API key.",
      summary:
        "A browser MIDI studio driven by plain-language prompts. Ask for a funky song or more jazz, and Gemini writes or revises the tracks, which play back in the browser and export as MIDI.",
      short: "Prompt-driven MIDI studio: Gemini writes and revises tracks you can play and export.",
      stack: ["React", "Tone.js", "Gemini API"],
    },
    {
      repo: "world-loader-demo",
      title: "World Loader",
      year: "2024",
      demo: "https://bertogz.github.io/world-loader-demo/",
      summary:
        "A JavaScript library for open-world maps too big to load into memory at once. Only the chunks around the player are streamed in, shown here in a Phaser 3 demo.",
      short: "Streams huge Tiled worlds chunk by chunk from IndexedDB.",
      stack: ["JavaScript", "Phaser 3", "IndexedDB (Dexie)", "RBush"],
      points: [
        ["Chunked storage.", "Tiled maps are converted once into chunk and object tables in IndexedDB, so only the chunks near the player are queried as they move."],
        ["Frame-budgeted loading.", "Objects are created and destroyed in batches of 50 with short pauses between them, so crossing into a new chunk doesn't stall a frame."],
        ["Spatial culling.", "Loaded objects go into an RBush R-tree, keeping per-frame work to what's on screen, with pixel-perfect scaled render textures for drawing."],
      ],
    },
    {
      repo: "NodeChords",
      title: "NodeChords",
      year: "2026",
      demo: "https://bertogz.github.io/NodeChords/",
      summary:
        "A chord progression builder modeled as a directed graph. Music theory scores the edges, so the app suggests where a progression can go next.",
      short: "Chord progression builder modeled as a directed graph.",
      stack: ["React", "React Flow", "Tone.js", "Vitest"],
      image: { src: "assets/shots/nodechords.jpg", width: 1200, height: 750, alt: "NodeChords graph editor showing a C, Am7, Fmaj7, G7 progression with suggested chords in a side panel" },
      points: [
        ["Theory as a scoring model.", "Build and Resolve modes rank chords by harmonic function, with secondary dominants and modulation bridges."],
        ["Full music workflow.", "Per-node voicings, measure-level timing, playback, and MIDI import and export."],
        ["Tested and shipped.", "Vitest covers theory, MIDI parsing and storage, and GitHub Actions handles deployment."],
      ],
    },
    {
      repo: "movemnt-pro",
      title: "Movemnt Pro",
      year: "2026",
      demo: "https://bertogz.github.io/movemnt-pro/",
      short: "Guided fitness flow covering calorie targets, custom playlists and routine building.",
      stack: ["React", "Web Audio"],
    },
    {
      repo: "blob-test",
      title: "Blob memory tester",
      year: "2026",
      demo: "https://bertogz.github.io/blob-test/",
      short: "Stress test for image Blobs in IndexedDB and ObjectURL lifecycle tracking.",
      stack: ["React", "IndexedDB"],
      indexOnly: true,
    },
  ],
};
