/* The frame around the world: project panel, message log, minimap and context menu. */
(function () {
  "use strict";
  /** Bottom strip: welcome, region, arrivals, inspect. Set false to hide. */
  const SHOW_MESSAGE_LOG = false;
  /** Desktop: portfolio column on the left instead of the right. */
  const PANEL_ON_LEFT = true;

  const { projects } = window.PORTFOLIO;
  const W = window.WORLD;
  const byRepo = new Map(projects.map((p) => [p.repo, p]));
  const GITHUB = "https://github.com/BertoGz/";
  const AVATAR = "https://avatars.githubusercontent.com/u/62714188?s=460&v=4";
  const rootAsset = (src) =>
    /^https?:\/\//.test(src) ? src : `${typeof window.__PORTFOLIO_ROOT === "string" ? window.__PORTFOLIO_ROOT : "../"}${src}`;

  const $ = (id) => document.getElementById(id);
  const root = $("world"), panel = $("panel"), logEl = $("log"), action = $("action"), tag = $("tag"), menu = $("menu");
  const mini = $("mini"), side = $("side"), canvas = $("view"), handle = $("sheet-handle");
  const sheetQuery = matchMedia("(max-width: 860px), (max-height: 520px) and (orientation: landscape)");
  const landscapeQuery = matchMedia("(max-height: 520px) and (orientation: landscape)");

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const titleOf = (l) => (l.repo ? byRepo.get(l.repo).title : l.label);
  const regionOf = (id) => W.regions.find((r) => r.id === id);

  /* Message log */
  function log(text) {
    if (!SHOW_MESSAGE_LOG) return;
    const line = document.createElement("p");
    line.textContent = text;
    logEl.append(line);
    while (logEl.children.length > 40) logEl.firstChild.remove();
    logEl.scrollTop = logEl.scrollHeight;
  }

  if (!SHOW_MESSAGE_LOG) {
    root.classList.add("no-log");
    logEl.hidden = true;
  }
  if (PANEL_ON_LEFT) root.classList.add("panel-left");

  /* Panel — one DOM subtree per view; reopening the sheet reuses it instead of innerHTML. */
  let tab = "bio";
  let cardId = null;
  let world = null;
  const panelViews = new Map();
  const panelScroll = new Map();
  let activePanelKey = null;

  const panelKey = () => (cardId ? `card:${cardId}` : tab);

  function paintPanel() {
    const key = panelKey();
    if (activePanelKey && activePanelKey !== key) panelScroll.set(activePanelKey, panel.scrollTop);

    let view = panelViews.get(key);
    const viewClass = key.startsWith("card:") ? "panel-view panel-view--card" : "panel-view";
    if (!view) {
      view = document.createElement("div");
      view.className = viewClass;
      if (key === "bio") view.innerHTML = bioHTML();
      else if (key.startsWith("card:")) view.innerHTML = cardHTML(landmarkById(cardId));
      else view.innerHTML = listHTML();
      panel.appendChild(view);
      panelViews.set(key, view);
    } else {
      view.className = viewClass;
    }

    const previous = activePanelKey ? panelViews.get(activePanelKey) : null;
    if (previous && previous !== view) previous.hidden = true;
    view.hidden = false;
    panel.scrollTop = panelScroll.get(key) ?? 0;
    activePanelKey = key;
  }

  function refreshChrome() {
    document.querySelectorAll("[data-tab]").forEach((el) => {
      const on = el.dataset.tab === tab;
      el.classList.toggle("on", on && (!sheetQuery.matches || root.classList.contains("sheet-open")));
      el.setAttribute("aria-pressed", String(on));
    });
    updateHandle();
    syncInsets();
  }

  function render() {
    paintPanel();
    refreshChrome();
  }

  const linkRow = (p) => `
    <div class="links">
      ${p.demo ? `<a class="primary" href="${esc(p.demo)}" target="_blank" rel="noopener">${esc(p.demoLabel || "Live demo")} <span aria-hidden="true">↗</span></a>` : ""}
      ${p.store ? `<a href="${esc(p.store)}" target="_blank" rel="noopener">${esc(p.storeLabel || "Chrome Web Store")}</a>` : ""}
      <a href="${esc(GITHUB + p.repo)}" target="_blank" rel="noopener">Source</a>
    </div>`;

  function listHTML() {
    return W.regions
      .filter((r) => r.section)
      .map((r) => `
        <section class="region">
          <h2>${esc(r.name)}<span>${esc(r.section)}</span></h2>
          <ul>
            ${W.landmarks.filter((l) => l.region === r.id && l.repo).map((l) => {
              const p = byRepo.get(l.repo);
              return `<li><button type="button" data-go="${esc(l.id)}"><span class="item-title">${esc(p.title)}</span><span class="item-tag">${p.demo ? "Live" : ""}</span></button></li>`;
            }).join("")}
          </ul>
        </section>`)
      .join("");
  }

  function cardHTML(l) {
    const p = byRepo.get(l.repo);
    const points = p.points ? `<dl>${p.points.map(([lead, text]) => `<div><dt>${esc(lead.replace(/\.$/, ""))}</dt><dd>${esc(text)}</dd></div>`).join("")}</dl>` : "";
    const imageSrc = p.image ? rootAsset(p.image.src) : "";
    const image = p.image ? `<img src="${esc(imageSrc)}" width="${p.image.width}" height="${p.image.height}" alt="${esc(p.image.alt)}" loading="lazy">` : "";
    const video = p.video
      ? `<div class="card-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(p.video.youtube)}?rel=0" title="${esc(p.video.title)}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
      : "";
    const gallery = p.gallery
      ? `<ul class="card-gallery">${p.gallery.map((s) => `<li><a href="${esc(s.src)}" target="_blank" rel="noopener"><img src="${esc(s.src)}" width="${s.width}" height="${s.height}" alt="${esc(s.alt)}" loading="lazy"></a></li>`).join("")}</ul>`
      : "";
    return `
      <header class="card-sticky">
        <button type="button" class="back-list" data-list>← All projects</button>
      </header>
      <article class="card">
        <p class="card-place">${esc(l.label)} · ${esc(regionOf(l.region).name)}</p>
        <h2>${esc(p.title)}</h2>
        <p class="card-meta">${esc(p.year)} · ${p.stack.map(esc).join(", ")}</p>
        <p class="card-summary">${esc(p.summary || p.short)}</p>
        ${linkRow(p)}
        ${p.demoNote ? `<p class="card-note">${esc(p.demoNote)}</p>` : ""}
        ${video}
        ${gallery}
        ${image}
        ${points}
      </article>`;
  }

  const bioHTML = () => `
    <article class="about">
      <img class="about-portrait" src="${AVATAR}" alt="" width="200" height="200" decoding="async">
      <h2>Berto Gonzalez</h2>
      <p class="about-role">Software engineer</p>
      <p>Greetings! I have a background in fullstack web and mobile engineering. I'm also a hobbyist game dev at heart. Whether I'm building production software or tinkering with godot, I love solving problems systemically and I'm genuinely driven by learning how things work.<br><br>Have a look around and get to know some of my projects.</p>
      <ul class="about-links">
        <li><a href="https://github.com/BertoGz" target="_blank" rel="noopener">GitHub</a></li>
        <li><a href="https://www.linkedin.com/in/berto-gonzalez-7b463b1aa/" target="_blank" rel="noopener">LinkedIn</a></li>
        <li><a href="mailto:bertogz.dev@gmail.com">bertogz.dev@gmail.com</a></li>
        
      </ul>
    </article>`;

  // The handle only appears on the portrait sheet, when there's more to show.
  function updateHandle() {
    const tall = root.classList.contains("sheet-tall");
    handle.hidden = !(sheetQuery.matches && !landscapeQuery.matches && (tall || panel.scrollHeight > panel.clientHeight + 1));
    handle.setAttribute("aria-label", tall ? "Shrink panel" : "Expand panel");
    handle.setAttribute("aria-expanded", String(tall));
  }

  const landmarkById = (id) => W.landmarks.find((l) => l.id === id);

  function syncInsets() {
    const open = sheetQuery.matches && root.classList.contains("sheet-open");
    const playRight = open && landscapeQuery.matches ? side.offsetWidth : 0;
    const playBottom = open && !landscapeQuery.matches ? side.offsetHeight : 0;
    root.style.setProperty("--play-right", `${playRight}px`);
    root.style.setProperty("--play-bottom", `${playBottom}px`);
    if (!world) return;
    if (!open) world.setInset(0, 0);
    else if (landscapeQuery.matches) world.setInset(side.offsetWidth, 0);
    else world.setInset(0, side.offsetHeight);
  }

  function openSheet(open) {
    root.classList.toggle("sheet-open", open);
    if (!open) root.classList.remove("sheet-tall");
    refreshChrome();
  }

  function setTab(next) {
    if (sheetQuery.matches && root.classList.contains("sheet-open") && tab === next && !cardId) {
      openSheet(false);
      return;
    }
    tab = next;
    cardId = null;
    paintPanel();
    openSheet(true);
  }

  function showCard(l) {
    tab = "projects";
    cardId = l.id;
    paintPanel();
    openSheet(true);
  }

  function visit(l, immediate) {
    if (immediate && l.repo) showCard(l);
    if (world) world.goToLandmark(l.id);
    else if (l.repo) showCard(l);
  }

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) visit(landmarkById(go.dataset.go), true);
    if (e.target.closest("[data-list]")) { cardId = null; paintPanel(); refreshChrome(); }
    const tabButton = e.target.closest("[data-tab]");
    if (tabButton) setTab(tabButton.dataset.tab);
    if (e.target.closest("[data-close]")) openSheet(false);
    if (e.target.closest("[data-expand]")) {
      root.classList.toggle("sheet-tall");
      updateHandle();
      syncInsets();
    }
  });

  /* Context menu */
  function closeMenu() {
    menu.hidden = true;
    menu.innerHTML = "";
  }

  function openMenu(hit, x, y) {
    const entries = [];
    const l = hit.landmark;
    if (l) {
      const p = l.repo && byRepo.get(l.repo);
      entries.push({ label: `Visit <em>${esc(titleOf(l))}</em>`, run: () => visit(l, false) });
      if (p) {
        entries.push({ label: "Inspect", run: () => log(`${titleOf(l)}: ${p.short}`) });
        if (p.demo) entries.push({ label: "Live demo", href: p.demo });
        entries.push({ label: "Source", href: GITHUB + p.repo });
      }
    }
    if (hit.tile) entries.push({ label: "Walk here", run: () => world.walkTo(hit.tile.i, hit.tile.j) });
    if (!entries.length) return;
    entries.push({ label: "Cancel", run: () => {} });

    menu.innerHTML = entries
      .map((item, n) => item.href
        ? `<a role="menuitem" href="${esc(item.href)}" target="_blank" rel="noopener" data-entry="${n}">${item.label}</a>`
        : `<button type="button" role="menuitem" data-entry="${n}">${item.label}</button>`)
      .join("");
    menu.hidden = false;
    const pad = 8;
    menu.style.left = `${Math.max(pad, Math.min(x, innerWidth - menu.offsetWidth - pad))}px`;
    menu.style.top = `${Math.max(pad, Math.min(y, innerHeight - menu.offsetHeight - pad))}px`;
    menu.onclick = (e) => {
      const el = e.target.closest("[data-entry]");
      if (!el) return;
      const item = entries[Number(el.dataset.entry)];
      closeMenu();
      if (item.run) item.run();
    };
  }

  document.addEventListener("pointerdown", (e) => {
    if (!menu.hidden && !menu.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!menu.hidden) closeMenu();
    else if (cardId) { cardId = null; paintPanel(); refreshChrome(); }
    else if (root.classList.contains("sheet-open")) openSheet(false);
  });

  /* Minimap, north up */
  const MINI_FILL = ["#0d1626", "#2a2925", "#1a2226", "#3a404b", "#4a505c"];
  const miniBase = document.createElement("canvas");
  miniBase.width = miniBase.height = W.SIZE * 4;
  {
    const c = miniBase.getContext("2d");
    for (let j = 0; j < W.SIZE; j++) {
      for (let i = 0; i < W.SIZE; i++) {
        c.fillStyle = MINI_FILL[W.tiles[W.tileIndex(i, j)]];
        c.fillRect(i * 4, j * 4, 4, 4);
      }
    }
    c.fillStyle = "#28342f";
    for (const d of W.deco) if (d.type === "tree") c.fillRect(d.x * 4 - 2, d.z * 4 - 2, 4, 4);
    for (const l of W.landmarks) {
      c.fillStyle = regionOf(l.region).accent;
      c.fillRect((l.at[0] + 0.5) * 4 - 4, (l.at[1] + 0.5) * 4 - 4, 8, 8);
    }
  }
  const miniCtx = mini.getContext("2d");
  let miniKey = "";

  function drawMini() {
    if (!world) return;
    const size = mini.clientWidth || 1;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (mini.width !== Math.round(size * dpr)) mini.width = mini.height = Math.round(size * dpr);
    const { player, cam } = world;
    const key = `${player.x.toFixed(2)},${player.z.toFixed(2)},${cam.yaw.toFixed(2)},${mini.width}`;
    if (key === miniKey) return;
    miniKey = key;
    const s = mini.width / W.SIZE;
    miniCtx.imageSmoothingEnabled = false;
    miniCtx.clearRect(0, 0, mini.width, mini.height);
    miniCtx.drawImage(miniBase, 0, 0, mini.width, mini.height);
    const px = player.x * s, pz = player.z * s;
    const a = -cam.yaw - Math.PI / 2, reach = 12 * s;
    miniCtx.fillStyle = "rgba(237,236,231,.14)";
    miniCtx.beginPath();
    miniCtx.moveTo(px, pz);
    miniCtx.arc(px, pz, reach, a - 0.5, a + 0.5);
    miniCtx.closePath();
    miniCtx.fill();
    miniCtx.fillStyle = "#ffffff";
    miniCtx.beginPath();
    miniCtx.arc(px, pz, Math.max(2.5, 1.1 * s), 0, Math.PI * 2);
    miniCtx.fill();
  }

  mini.addEventListener("click", (e) => {
    if (!world) return;
    const r = mini.getBoundingClientRect();
    world.walkTo(Math.floor(((e.clientX - r.left) / r.width) * W.SIZE), Math.floor(((e.clientY - r.top) / r.height) * W.SIZE));
  });

  /* Start */
  render();

  try {
    world = window.createWorld(canvas, {
      onLandmarkClick(l) {
        visit(l, true);
      },
      onArrive(l) {
        if (l.repo) {
          log(`You reach the ${l.label.toLowerCase()}: ${titleOf(l)}.`);
        } else {
          tab = "bio";
          cardId = null;
          paintPanel();
          openSheet(true);
          log("The signpost reads: Berto Gonzalez, software engineer.");
        }
      },
      onRegion(r) {
        log(r.section ? `You enter ${r.name}. ${r.section}.` : `You are in ${r.name}.`);
      },
      onHover({ landmark, tile }) {
        canvas.style.cursor = landmark ? "pointer" : tile ? "crosshair" : "default";
        action.innerHTML = landmark
          ? `Visit <em>${esc(titleOf(landmark))}</em> <span>${esc(landmark.label)}</span>`
          : tile ? "Walk" : "";
      },
      onContext: openMenu,
      onDismiss: closeMenu,
      onFrame([x, y, w]) {
        tag.style.opacity = w > 0 ? 1 : 0;
        tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
        drawMini();
      },
    });
    window.world = world;
  } catch (error) {
    root.classList.add("no-webgl");
    console.warn(error);
  }

  // Opening in the same tick the world is created leaves the canvas blank; wait one frame.
  if (sheetQuery.matches) requestAnimationFrame(() => openSheet(true));

  sheetQuery.addEventListener("change", () => refreshChrome());
  window.addEventListener("resize", syncInsets);

  const BGM_GAP_MS = 60_000;
  const bgmBtn = $("bgm-mute");
  const bgm = new Audio(rootAsset("assets/bg-music.mp3"));
  bgm.preload = "auto";
  bgm.volume = 0.7;
  let bgmGapTimer = null;
  let bgmGapEndsAt = 0;
  let bgmEverStarted = false;
  let bgmMuted = true;

  const speakerIcon = (muted) => muted
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.6 3 2.1-2.1 1.4 1.4L18 13.4l2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1-2.1-2.1 1.4-1.4 2.1 2.1z"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm11.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zm0-8.5v2.1a6.5 6.5 0 0 1 0 12.8v2.1a8.5 8.5 0 0 0 0-17z"/></svg>`;

  const paintBgmBtn = () => {
    if (!bgmBtn) return;
    bgmBtn.innerHTML = speakerIcon(bgmMuted);
    bgmBtn.setAttribute("aria-pressed", bgmMuted ? "true" : "false");
    bgmBtn.setAttribute("aria-label", bgmMuted ? "Unmute music" : "Mute music");
  };

  const clearBgmGap = () => {
    if (bgmGapTimer) clearTimeout(bgmGapTimer);
    bgmGapTimer = null;
  };

  const scheduleBgmGap = () => {
    clearBgmGap();
    if (!bgmGapEndsAt) bgmGapEndsAt = Date.now() + BGM_GAP_MS;
    const wait = Math.max(0, bgmGapEndsAt - Date.now());
    bgmGapTimer = setTimeout(() => {
      bgmGapTimer = null;
      bgmGapEndsAt = 0;
      if (bgmMuted) return;
      bgm.currentTime = 0;
      bgm.play().catch(() => {});
    }, wait);
  };

  const setBgmMuted = (muted) => {
    bgmMuted = muted;
    paintBgmBtn();
    if (muted) {
      bgm.pause();
      return;
    }
    if (!bgmEverStarted) {
      bgmEverStarted = true;
      bgm.currentTime = 0;
      bgm.play().catch(() => {});
      return;
    }
    if (bgmGapEndsAt) {
      scheduleBgmGap();
      return;
    }
    if (bgm.ended) bgm.currentTime = 0;
    bgm.play().catch(() => {});
  };

  bgm.addEventListener("error", () => {
    console.warn("Background music failed to load:", bgm.src, bgm.error);
  });

  bgm.addEventListener("ended", () => {
    bgmGapEndsAt = Date.now() + BGM_GAP_MS;
    if (!bgmMuted) scheduleBgmGap();
  });

  paintBgmBtn();
  bgmBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setBgmMuted(!bgmMuted);
  });

  log("Welcome. Walk the island: each landmark is a project.");
  log(sheetQuery.matches ? "Tap the ground to walk. Tap a landmark to open it." : "Click the ground to walk, click a landmark to open it. Right-click for options.");
})();
