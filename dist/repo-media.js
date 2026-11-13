/* Resolve GitHub repo file paths to raw URLs once per page load (shared by index + world). */
(function () {
  "use strict";
  const OWNER = "BertoGz";
  const urlCache = new Map();
  const imageCache = new Map();

  const key = (repo, file, branch) => `${repo}@${branch || "master"}:${file}`;

  function rawUrl(repo, file, branch) {
    const k = key(repo, file, branch);
    let url = urlCache.get(k);
    if (!url) {
      url = `https://raw.githubusercontent.com/${OWNER}/${repo}/${branch || "master"}/${file}`;
      urlCache.set(k, url);
    }
    return url;
  }

  function resolveImage(spec) {
    if (!spec) return spec;
    if (spec.src) return spec;
    if (!spec.repo || !spec.file) return spec;
    const k = key(spec.repo, spec.file, spec.branch);
    let resolved = imageCache.get(k);
    if (!resolved) {
      resolved = {
        src: rawUrl(spec.repo, spec.file, spec.branch),
        width: spec.width,
        height: spec.height,
        alt: spec.alt,
      };
      imageCache.set(k, resolved);
    }
    return resolved;
  }

  function enrichProjects() {
    const list = window.PORTFOLIO?.projects;
    if (!list) return;
    for (const p of list) {
      if (p.image?.file) p.image = resolveImage(p.image);
    }
  }

  window.repoMedia = { rawUrl, resolveImage, enrichProjects };
  enrichProjects();
})();
