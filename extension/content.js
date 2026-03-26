// Content script — runs on YouTube pages
// Injects DropATrack buttons directly into the playlist panel sidebar

(() => {
  const API_BASE = 'https://dropatrack.vercel.app';
  const BANNER_ID = 'dropatrack-banner';
  const ITEM_BTN_CLASS = 'dropatrack-item-btn';

  let selectedRoom = null;
  let rooms = [];

  // ─── Storage helpers ──────────────────────────────────────────────
  async function loadRooms() {
    try {
      const data = await chrome.storage.local.get(['selectedRoom', 'rooms']);
      selectedRoom = data.selectedRoom || null;
      rooms = data.rooms || [];
    } catch { /* ignore */ }
  }

  async function saveSelectedRoom(slug) {
    selectedRoom = slug;
    try { await chrome.storage.local.set({ selectedRoom: slug }); } catch { /* ignore */ }
  }

  // ─── Listen for popup messages ────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'getVideoInfo') {
      sendResponse(extractVideoInfo());
    }
    if (request.action === 'roomUpdated') {
      // Popup saved a new room selection
      selectedRoom = request.selectedRoom || null;
      rooms = request.rooms || rooms;
      injectAll();
    }
    return true;
  });

  // Listen for storage changes from popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.selectedRoom) {
      selectedRoom = changes.selectedRoom.newValue || null;
      updateBannerRoomDisplay();
    }
    if (changes.rooms) {
      rooms = changes.rooms.newValue || [];
      updateBannerRoomDisplay();
    }
  });

  // ─── Parse timestamp text (e.g. "4:42" or "1:02:30") to seconds ──
  function parseTimestamp(text) {
    if (!text) return 0;
    // Handle both colon (4:42) and dot (4.42) separators
    const cleaned = text.trim().replace(/\./g, ':');
    const parts = cleaned.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  function extractDuration(item) {
    const badge = item.querySelector('badge-shape .yt-badge-shape__text, ytd-thumbnail-overlay-time-status-renderer #text, #thumbnail-overlay-time-status-renderer .yt-badge-shape__text');
    return parseTimestamp(badge?.textContent);
  }

  // ─── Extract video info (kept for popup compatibility) ────────────
  function extractVideoInfo() {
    const url = new URL(window.location.href);
    const videoId = url.searchParams.get('v');
    const listId = url.searchParams.get('list');

    const currentVideo = videoId ? {
      youtube_id: videoId,
      title: document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string')?.textContent?.trim() || document.title.replace(' - YouTube', ''),
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    } : null;

    const playlistVideos = [];
    const playlistPanel = document.querySelector('ytd-playlist-panel-renderer');

    if (playlistPanel) {
      const items = playlistPanel.querySelectorAll('ytd-playlist-panel-video-renderer');
      items.forEach((item) => {
        const link = item.querySelector('a#wc-endpoint');
        const href = link?.getAttribute('href') || '';
        const match = href.match(/[?&]v=([^&]+)/);
        const id = match?.[1];
        if (id) {
          const title = item.querySelector('#video-title')?.textContent?.trim() || '';
          const duration_seconds = extractDuration(item);
          playlistVideos.push({
            youtube_id: id,
            title,
            thumbnail_url: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
            duration_seconds,
          });
        }
      });
    }

    return {
      currentVideo,
      playlistVideos,
      playlistId: listId,
      isPlaylist: playlistVideos.length > 0,
      pageUrl: window.location.href,
    };
  }

  // ─── API call ─────────────────────────────────────────────────────
  async function addVideosToRoom(videos) {
    if (!selectedRoom || videos.length === 0) {
      throw new Error('No room selected');
    }

    const res = await fetch(`${API_BASE}/api/queue/add-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_slug: selectedRoom,
        videos,
        added_by: 'Extension',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add');
    return data;
  }

  // ─── Inject banner at top of playlist panel ───────────────────────
  function injectBanner() {
    const panel = document.querySelector('ytd-playlist-panel-renderer');
    if (!panel) return;

    // Remove banner if no room selected
    if (!selectedRoom && rooms.length === 0) {
      const existing = panel.querySelector(`#${BANNER_ID}`);
      if (existing) existing.remove();
      return;
    }

    // Don't double-inject
    if (panel.querySelector(`#${BANNER_ID}`)) return;

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'dropatrack-banner';

    banner.innerHTML = buildBannerHTML();

    // Insert at the top of the panel
    const header = panel.querySelector('#header, #top-row-container, .header');
    if (header) {
      header.insertAdjacentElement('afterend', banner);
    } else {
      panel.prepend(banner);
    }

    attachBannerEvents(banner);
  }

  function buildBannerHTML() {
    let html = `
      <div class="dropatrack-banner-logo">Drop<span>A</span>Track</div>
      <div class="dropatrack-banner-divider"></div>
    `;

    if (rooms.length > 0) {
      html += `<select class="dropatrack-room-select" id="dropatrack-room-select">`;
      rooms.forEach(r => {
        const sel = r === selectedRoom ? 'selected' : '';
        html += `<option value="${r}" ${sel}>${r}</option>`;
      });
      html += `</select>`;
      html += `<button class="dropatrack-btn-add-all" id="dropatrack-btn-add-all" title="Add all playlist videos to room">+ All</button>`;
    } else if (selectedRoom) {
      html += `<select class="dropatrack-room-select" id="dropatrack-room-select">`;
      html += `<option value="${selectedRoom}" selected>${selectedRoom}</option>`;
      html += `</select>`;
      html += `<button class="dropatrack-btn-add-all" id="dropatrack-btn-add-all" title="Add all playlist videos to room">+ All</button>`;
    } else {
      html += `<div class="dropatrack-no-room">Open extension popup to select a room</div>`;
    }

    return html;
  }

  function attachBannerEvents(banner) {
    const select = banner.querySelector('#dropatrack-room-select');
    if (select) {
      select.addEventListener('change', (e) => {
        saveSelectedRoom(e.target.value);
      });
    }

    const addAllBtn = banner.querySelector('#dropatrack-btn-add-all');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', async () => {
        if (!selectedRoom) return;
        const info = extractVideoInfo();
        if (!info.playlistVideos.length) return;

        addAllBtn.disabled = true;
        addAllBtn.textContent = '...';

        try {
          await addVideosToRoom(info.playlistVideos);
          addAllBtn.textContent = '✅';
          setTimeout(() => {
            addAllBtn.textContent = '+ All';
            addAllBtn.disabled = false;
          }, 2000);
        } catch (err) {
          addAllBtn.textContent = '❌';
          console.error('DropATrack: Add all failed', err);
          setTimeout(() => {
            addAllBtn.textContent = '+ All';
            addAllBtn.disabled = false;
          }, 2000);
        }
      });
    }
  }

  function updateBannerRoomDisplay() {
    const banner = document.querySelector(`#${BANNER_ID}`);
    if (!banner) {
      injectBanner();
      return;
    }
    banner.innerHTML = buildBannerHTML();
    attachBannerEvents(banner);
  }

  // ─── Inject per-item add button ───────────────────────────────────
  function injectItemButtons() {
    const panel = document.querySelector('ytd-playlist-panel-renderer');
    if (!panel) return;

    // Don't inject buttons if no room selected
    if (!selectedRoom && rooms.length === 0) {
      panel.querySelectorAll(`.${ITEM_BTN_CLASS}`).forEach(b => b.remove());
      return;
    }

    const items = panel.querySelectorAll('ytd-playlist-panel-video-renderer');
    items.forEach((item) => {
      // Skip if already injected
      if (item.querySelector(`.${ITEM_BTN_CLASS}`)) return;

      const link = item.querySelector('a#wc-endpoint');
      const href = link?.getAttribute('href') || '';
      const match = href.match(/[?&]v=([^&]+)/);
      const videoId = match?.[1];
      if (!videoId) return;

      const title = item.querySelector('#video-title')?.textContent?.trim() || '';

      const btn = document.createElement('button');
      btn.className = ITEM_BTN_CLASS;
      btn.textContent = '+';
      btn.title = 'Add to DropATrack';

      // Store reference to parent item for extracting duration at click time
      const parentItem = item;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!selectedRoom) {
          btn.textContent = '⚠';
          btn.title = 'No room selected — open extension popup first';
          setTimeout(() => { btn.textContent = '+'; btn.title = 'Add to DropATrack'; }, 2000);
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<div class="dropatrack-spinner"></div>';

        // Extract duration at click time (badge may not exist at injection time)
        const duration_seconds = extractDuration(parentItem);

        try {
          await addVideosToRoom([{
            youtube_id: videoId,
            title: parentItem.querySelector('#video-title')?.textContent?.trim() || title,
            thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration_seconds,
          }]);
          btn.innerHTML = '✓';
          btn.classList.add('success');
          setTimeout(() => {
            btn.innerHTML = '+';
            btn.classList.remove('success');
            btn.disabled = false;
          }, 2000);
        } catch (err) {
          btn.innerHTML = '✗';
          btn.classList.add('error');
          console.error('DropATrack: Add failed', err);
          setTimeout(() => {
            btn.innerHTML = '+';
            btn.classList.remove('error');
            btn.disabled = false;
          }, 2000);
        }
      });

      // Insert the button next to the three-dot menu
      const menu = item.querySelector('yt-icon-button, ytd-menu-renderer, #menu');
      if (menu) {
        menu.insertAdjacentElement('beforebegin', btn);
      } else {
        // Fallback: append to the item container
        const container = item.querySelector('#meta, #container') || item;
        container.appendChild(btn);
      }
    });
  }

  // ─── Master inject ────────────────────────────────────────────────
  function injectAll() {
    injectBanner();
    injectItemButtons();
  }

  // ─── MutationObserver for YouTube SPA navigation ──────────────────
  let debounceTimer = null;
  function debouncedInject() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      injectAll();
    }, 500);
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          debouncedInject();
          return;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────
  async function init() {
    await loadRooms();

    // Initial injection (wait a bit for YouTube to render playlist panel)
    setTimeout(injectAll, 1500);
    setTimeout(injectAll, 3000); // Retry in case panel loaded late

    // Watch for SPA changes
    startObserver();

    // Also re-inject on YouTube navigation events
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(injectAll, 1000);
    });
  }

  init();
})();

