// CHATI-AI V15 — adds a "New character" tile after the user's own
// characters on Home (see home-v15.css). The grid is re-rendered by
// script.js, so the tile is put back whenever the grid changes.
(() => {
  "use strict";

  const t = text => window.ChatiI18n?.t?.(text) ?? text;

  function ensureTile(grid) {
    const hasCards = grid.querySelector(".character-card");
    let tile = grid.querySelector(".v15-create-tile");
    if (!hasCards) {
      tile?.remove();
      return;
    }
    if (tile && tile === grid.lastElementChild) return;
    if (!tile) {
      tile = document.createElement("button");
      tile.type = "button";
      tile.className = "v15-create-tile";
      tile.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>' +
        "<span></span>";
      tile.querySelector("span").textContent = t("New character");
      tile.addEventListener("click", () => {
        if (typeof showCreateView === "function") showCreateView();
      });
    }
    grid.appendChild(tile);
  }

  function initialize() {
    const grid = document.getElementById("charactersGrid");
    if (!grid) return;
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        ensureTile(grid);
      });
    }).observe(grid, { childList: true });
    ensureTile(grid);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
