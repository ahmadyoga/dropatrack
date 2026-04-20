// Content script — runs on YouTube and YouTube Music pages
// Injects DropATrack buttons into the playlist/queue panel

(() => {
  const API_BASE = 'https://dropatrack.vercel.app';
  const BANNER_ID = 'dropatrack-banner';
  const ITEM_BTN_CLASS = 'dropatrack-item-btn';
  const ACTION_BTN_ID = 'dropatrack-action-btn';

  // Detect which site we are on
  const IS_YTM = location.hostname === 'music.youtube.com';
  // On /watch pages the right panel shows queue + autoplay recommendations;
  // on /playlist, /browse etc. the main content is the track shelf.
  const IS_YTM_WATCH = IS_YTM && location.pathname.startsWith('/watch');

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
      sendResponse(IS_YTM ? extractYTMVideoInfo() : extractVideoInfo());
    }
    if (request.action === 'roomUpdated') {
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
    const cleaned = text.trim().replace(/\./g, ':');
    const parts = cleaned.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  function extractDuration(item) {
    const badge = item.querySelector(
      'badge-shape .yt-badge-shape__text, ytd-thumbnail-overlay-time-status-renderer #text, #thumbnail-overlay-time-status-renderer .yt-badge-shape__text'
    );
    return parseTimestamp(badge?.textContent);
  }

  function cleanPageTitle(title) {
    return (title || '')
      .replace(/\s*-\s*YouTube Music$/i, '')
      .replace(/\s*-\s*YouTube$/i, '')
      .trim();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── REGULAR YOUTUBE (www.youtube.com) ───────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  function extractVideoInfo() {
    const url = new URL(window.location.href);
    const videoId = url.searchParams.get('v');
    const listId = url.searchParams.get('list');

    const currentVideo = videoId ? {
      youtube_id: videoId,
      title:
        document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string')?.textContent?.trim()
        || cleanPageTitle(document.title),
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
      isYTM: false,
    };
  }

  // ─── Inject banner into regular YT playlist panel ─────────────────
  function injectBanner() {
    const panel = document.querySelector('ytd-playlist-panel-renderer');
    if (!panel) return;

    if (!selectedRoom && rooms.length === 0) {
      const existing = panel.querySelector(`#${BANNER_ID}`);
      if (existing) existing.remove();
      return;
    }

    if (panel.querySelector(`#${BANNER_ID}`)) return;

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'dropatrack-banner';
    banner.innerHTML = buildBannerHTML();

    const header = panel.querySelector('#header, #top-row-container, .header');
    if (header) {
      header.insertAdjacentElement('afterend', banner);
    } else {
      panel.prepend(banner);
    }

    attachBannerEvents(banner);
  }

  // ─── Inject per-item button into regular YT playlist ──────────────
  function injectItemButtons() {
    const panel = document.querySelector('ytd-playlist-panel-renderer');
    if (!panel) return;

    if (!selectedRoom && rooms.length === 0) {
      panel.querySelectorAll(`.${ITEM_BTN_CLASS}`).forEach(b => b.remove());
      return;
    }

    const items = panel.querySelectorAll('ytd-playlist-panel-video-renderer');
    items.forEach((item) => {
      if (item.querySelector(`.${ITEM_BTN_CLASS}`)) return;

      const link = item.querySelector('a#wc-endpoint');
      const href = link?.getAttribute('href') || '';
      const match = href.match(/[?&]v=([^&]+)/);
      const videoId = match?.[1];
      if (!videoId) return;

      const title = item.querySelector('#video-title')?.textContent?.trim() || '';
      const btn = createItemButton(videoId, title, () => extractDuration(item), item);

      const menu = item.querySelector('yt-icon-button, ytd-menu-renderer, #menu');
      if (menu) {
        menu.insertAdjacentElement('beforebegin', btn);
      } else {
        const container = item.querySelector('#meta, #container') || item;
        container.appendChild(btn);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── YOUTUBE MUSIC (music.youtube.com) ───────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  function extractYTMVideoInfo() {
    const url = new URL(window.location.href);
    const videoId = url.searchParams.get('v');

    // Current playing track
    let currentVideo = null;
    if (videoId) {
      // Try the player bar title
      const titleEl = document.querySelector(
        'ytmusic-player-bar .title, ytmusic-player-bar yt-formatted-string.title, .ytmusic-player-bar .content-info-wrapper .title'
      );
      currentVideo = {
        youtube_id: videoId,
        title: titleEl?.textContent?.trim() || cleanPageTitle(document.title),
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      };
    }

    // Queue items (always available on watch pages)
    const queueVideos = extractYTMQueueVideos();

    // Shelf items only on browse/playlist pages — on watch pages the
    // responsive-list-item elements belong to the autoplay recommendation
    // list, not the actual queue, so we skip them.
    const shelfVideos = IS_YTM_WATCH ? [] : extractYTMShelfVideos();

    const playlistVideos = queueVideos.length > 0 ? queueVideos : shelfVideos;

    return {
      currentVideo,
      playlistVideos,
      playlistId: url.searchParams.get('list') || null,
      isPlaylist: playlistVideos.length > 0,
      pageUrl: window.location.href,
      isYTM: true,
    };
  }

  // Extract from the "Up Next" queue panel — excludes autoplay recommendations
  function extractYTMQueueVideos() {
    const videos = [];
    const queue = document.querySelector('ytmusic-player-queue');
    if (!queue) return videos;

    // The autoplay separator is a div.autoplay inside ytmusic-player-queue
    // Everything after it is recommendations, not actual queue items.
    const separator = queue.querySelector('.autoplay');

    // Items are ytmusic-player-queue-item (not ytmusic-queue-item-renderer)
    const items = queue.querySelectorAll('ytmusic-player-queue-item');
    items.forEach((item) => {
      // Skip items that appear after the autoplay separator
      if (separator) {
        const position = separator.compareDocumentPosition(item);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return;
      }

      const videoId = extractYTMVideoId(item);
      if (!videoId) return;

      // Title is in .song-title's title attribute
      const title = item.querySelector('.song-title')?.getAttribute('title')
        || item.querySelector('.song-title')?.textContent?.trim() || '';

      // Duration is in .duration's title attribute (e.g. "4:10")
      const durationTitle = item.querySelector('.duration')?.getAttribute('title') || '';

      videos.push({
        youtube_id: videoId,
        title,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration_seconds: parseTimestamp(durationTitle),
      });
    });

    return videos;
  }

  // Extract autoplay / automix recommendation items
  // These are ytmusic-player-queue-item elements with the is-automix attribute
  function extractYTMAutoplayVideos() {
    const videos = [];
    const items = document.querySelectorAll(
      'ytmusic-player-queue ytmusic-player-queue-item[is-automix]'
    );
    items.forEach((item) => {
      const videoId = extractYTMVideoId(item);
      if (!videoId) return;

      const title = item.querySelector('.song-title')?.getAttribute('title')
        || item.querySelector('.song-title')?.textContent?.trim() || '';
      const durationTitle = item.querySelector('.duration')?.getAttribute('title') || '';

      videos.push({
        youtube_id: videoId,
        title,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration_seconds: parseTimestamp(durationTitle),
      });
    });
    return videos;
  }


  function extractYTMShelfVideos() {
    const videos = [];

    // On /playlist?list= pages: ytmusic-playlist-shelf-renderer contains the tracks
    // On album pages: ytmusic-shelf-renderer or ytmusic-music-shelf-renderer
    // Broad fallback: any ytmusic-responsive-list-item-renderer on the page
    const containers = [
      'ytmusic-playlist-shelf-renderer',
      'ytmusic-shelf-renderer',
      'ytmusic-music-shelf-renderer',
    ];

    let items = [];
    for (const container of containers) {
      const found = document.querySelectorAll(`${container} ytmusic-responsive-list-item-renderer`);
      if (found.length > 0) {
        items = [...items, ...found];
      }
    }

    // Fallback: grab all if none found in known containers
    if (items.length === 0) {
      items = [...document.querySelectorAll('ytmusic-responsive-list-item-renderer')];
    }

    items.forEach((item) => {
      const videoId = extractYTMVideoId(item);
      if (!videoId) return;

      const title = item.querySelector(
        '.title, yt-formatted-string.title, .flex-columns .title-column yt-formatted-string'
      )?.textContent?.trim() || '';
      const durationEl = item.querySelector('.duration, yt-formatted-string.fixed-column');
      const duration_seconds = parseTimestamp(durationEl?.textContent);

      if (!videos.find(v => v.youtube_id === videoId)) {
        videos.push({
          youtube_id: videoId,
          title,
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          duration_seconds,
        });
      }
    });

    return videos;
  }

  // Extract video ID from a YTM element — tries multiple strategies
  function extractYTMVideoId(item) {
    // Strategy 1: thumbnail img src — most reliable for queue items
    // e.g. src="https://i.ytimg.com/vi/ILeu1E3gzhQ/sddefault.jpg..."
    const thumb = item.querySelector('img[src*="/vi/"], img[src*="ytimg"]');
    if (thumb) {
      const m = (thumb.getAttribute('src') || '').match(/\/vi\/([^/]+)\//);
      if (m?.[1]) return m[1];
    }

    // Strategy 2: href containing /watch?v=
    const links = item.querySelectorAll('a[href*="/watch"], a[href*="v="]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const m = href.match(/[?&]v=([^&]+)/);
      if (m?.[1]) return m[1];
    }

    // Strategy 3: data-video-id attribute
    const withAttr = item.querySelector('[data-video-id]');
    if (withAttr?.dataset?.videoId) return withAttr.dataset.videoId;

    // Strategy 4: navigation-endpoint attribute (JSON-encoded)
    const navEl = item.querySelector('[navigation-endpoint]') || item.closest('[navigation-endpoint]');
    if (navEl) {
      try {
        const ep = JSON.parse(navEl.getAttribute('navigation-endpoint') || '{}');
        const vid = ep?.watchEndpoint?.videoId || ep?.videoId;
        if (vid) return vid;
      } catch { /* ignore */ }
    }

    // Strategy 5: item dataset
    if (item.dataset?.videoId) return item.dataset.videoId;

    return null;
  }


  // ─── Inject YTM Queue panel banner ───────────────────────────────
  function injectYTMBanner() {
    const queue = document.querySelector('ytmusic-player-queue');
    if (!queue) return;

    if (!selectedRoom && rooms.length === 0) {
      const existing = queue.querySelector(`#${BANNER_ID}`);
      if (existing) existing.remove();
      return;
    }

    if (queue.querySelector(`#${BANNER_ID}`)) return;

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'dropatrack-banner dropatrack-banner-ytm';
    banner.innerHTML = buildBannerHTML();

    // Insert at top of queue list
    const header = queue.querySelector('#header, #header-container, .header');
    if (header) {
      header.insertAdjacentElement('afterend', banner);
    } else {
      // Prepend to queue
      const inner = queue.querySelector('#queue, ytmusic-item-section-renderer') || queue;
      inner.prepend(banner);
    }

    attachBannerEvents(banner);
  }

  // ─── Inject per-item buttons into YTM queue ──────────────────────
  function injectYTMItemButtons() {
    const queue = document.querySelector('ytmusic-player-queue');

    if (queue) {
      // Autoplay separator — only inject buttons on items BEFORE it
      const separator = queue.querySelector('.autoplay');

      // Correct tag from real DOM is ytmusic-player-queue-item
      const queueItems = queue.querySelectorAll('ytmusic-player-queue-item');
      queueItems.forEach((item) => {
        if (separator) {
          const pos = separator.compareDocumentPosition(item);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return; // skip autoplay items
        }
        if (item.querySelector(`.${ITEM_BTN_CLASS}`)) return;
        injectYTMItemButton(item);
      });
    }

    // Also inject into automix/autoplay recommendation items
    if (queue) {
      const automixItems = queue.querySelectorAll(
        'ytmusic-player-queue-item[is-automix]'
      );
      automixItems.forEach((item) => {
        if (item.querySelector(`.${ITEM_BTN_CLASS}`)) return;
        injectYTMItemButton(item);
      });
    }

    // Shelf items (album/playlist browse pages only).
    // On /watch pages, ytmusic-responsive-list-item-renderer items below the
    // queue are autoplay recommendations — we don't want buttons there.
    if (!IS_YTM_WATCH) {
      const shelfItems = document.querySelectorAll(
        'ytmusic-responsive-list-item-renderer'
      );
      shelfItems.forEach((item) => {
        if (item.querySelector(`.${ITEM_BTN_CLASS}`)) return;
        injectYTMItemButton(item);
      });
    }
  }


  function injectYTMItemButton(item) {
    if (!selectedRoom && rooms.length === 0) return;

    const videoId = extractYTMVideoId(item);
    if (!videoId) return;

    // Title: prefer .song-title title attribute (queue items), fallback to text
    const title = item.querySelector('.song-title')?.getAttribute('title')
      || item.querySelector('.song-title, .title, yt-formatted-string.title')?.textContent?.trim() || '';

    const getDuration = () => {
      const durationTitle = item.querySelector('.duration')?.getAttribute('title') || '';
      return parseTimestamp(durationTitle
        || item.querySelector('.duration, .song-duration')?.textContent || '');
    };

    const btn = createItemButton(videoId, title, getDuration, item);

    // Insert before the three-dot menu button
    const menu = item.querySelector(
      'ytmusic-menu-renderer, yt-button-shape, tp-yt-paper-icon-button, .menu, #menu'
    );
    if (menu) {
      menu.insertAdjacentElement('beforebegin', btn);
    } else {
      const right = item.querySelector('.right-items, .secondary-flex-columns, #overlays') || item;
      right.appendChild(btn);
    }
  }

  // ─── Inject "Add All" button into YTM playlist/album .action-buttons ─
  function injectYTMActionButton() {
    // Only inject when a room is selected
    if (!selectedRoom && rooms.length === 0) {
      const existing = document.getElementById(ACTION_BTN_ID);
      if (existing) existing.remove();
      return;
    }

    // Don't double-inject
    if (document.getElementById(ACTION_BTN_ID)) return;

    // Target: the action-buttons row inside the playlist/album detail header
    const actionBar = document.querySelector(
      'ytmusic-detail-header-renderer .action-buttons, ' +
      'ytmusic-immersive-header-renderer .action-buttons, ' +
      'ytmusic-responsive-header-renderer .action-buttons, ' +
      '.action-buttons'
    );
    if (!actionBar) return;

    const btn = document.createElement('button');
    btn.id = ACTION_BTN_ID;
    btn.className = 'dropatrack-action-btn';
    btn.title = 'Add all tracks to DropATrack';
    btn.textContent = '🎵';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!selectedRoom) {
        btn.textContent = '⚠️';
        setTimeout(() => { btn.textContent = '🎵'; }, 2000);
        return;
      }

      const tracks = extractYTMShelfVideos();
      if (tracks.length === 0) {
        btn.textContent = '⚠️';
        setTimeout(() => { btn.textContent = '🎵'; }, 2000);
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳';

      try {
        await addVideosToRoom(tracks);
        btn.textContent = '✅';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '🎵';
        }, 2500);
      } catch (err) {
        btn.textContent = '❌';
        console.error('DropATrack action btn:', err);
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '🎵';
        }, 2500);
      }
    });

    // Append at the end of the action buttons row
    actionBar.appendChild(btn);
  }

  // ─── Remove stale YTM buttons (after navigation) ──────────────────
  function cleanYTMButtons() {
    if (!selectedRoom && rooms.length === 0) {
      document.querySelectorAll(`.${ITEM_BTN_CLASS}`).forEach(b => b.remove());
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── SHARED HELPERS ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  // Build shared banner HTML
  function buildBannerHTML() {
    let html = `
      <div class="dropatrack-banner-logo">Drop<span>A</span>Track</div>
      <div class="dropatrack-banner-divider"></div>
    `;

    const hasRoom = rooms.length > 0 || !!selectedRoom;

    if (rooms.length > 0) {
      html += `<select class="dropatrack-room-select" id="dropatrack-room-select">`;
      rooms.forEach(r => {
        const sel = r === selectedRoom ? 'selected' : '';
        html += `<option value="${r}" ${sel}>${r}</option>`;
      });
      html += `</select>`;
    } else if (selectedRoom) {
      html += `<select class="dropatrack-room-select" id="dropatrack-room-select">`;
      html += `<option value="${selectedRoom}" selected>${selectedRoom}</option>`;
      html += `</select>`;
    } else {
      html += `<div class="dropatrack-no-room">Open extension popup to select a room</div>`;
    }

    if (hasRoom) {
      html += `<button class="dropatrack-btn-add-all" id="dropatrack-btn-add-all" title="Add queue to room">+ Queue</button>`;
      // Only show the Autoplay button on watch pages (where automix items exist)
      if (IS_YTM_WATCH) {
        html += `<button class="dropatrack-btn-add-autoplay" id="dropatrack-btn-add-autoplay" title="Add autoplay recommendations to room">+ Auto</button>`;
      }
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

    // + Queue button — adds actual queued tracks only
    const addAllBtn = banner.querySelector('#dropatrack-btn-add-all');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', async () => {
        if (!selectedRoom) return;
        const info = IS_YTM ? extractYTMVideoInfo() : extractVideoInfo();
        if (!info.playlistVideos.length) {
          addAllBtn.textContent = '⚠️';
          setTimeout(() => { addAllBtn.textContent = IS_YTM_WATCH ? '+ Queue' : '+ All'; }, 2000);
          return;
        }

        addAllBtn.disabled = true;
        addAllBtn.textContent = '...';

        try {
          await addVideosToRoom(info.playlistVideos);
          addAllBtn.textContent = '✅';
          setTimeout(() => {
            addAllBtn.textContent = IS_YTM_WATCH ? '+ Queue' : '+ All';
            addAllBtn.disabled = false;
          }, 2000);
        } catch (err) {
          addAllBtn.textContent = '❌';
          console.error('DropATrack: Add all failed', err);
          setTimeout(() => {
            addAllBtn.textContent = IS_YTM_WATCH ? '+ Queue' : '+ All';
            addAllBtn.disabled = false;
          }, 2000);
        }
      });
    }

    // + Auto button — adds autoplay / automix recommendations
    const addAutoBtn = banner.querySelector('#dropatrack-btn-add-autoplay');
    if (addAutoBtn) {
      addAutoBtn.addEventListener('click', async () => {
        if (!selectedRoom) return;
        const tracks = extractYTMAutoplayVideos();
        if (!tracks.length) {
          addAutoBtn.textContent = '⚠️';
          setTimeout(() => { addAutoBtn.textContent = '+ Auto'; }, 2000);
          return;
        }

        addAutoBtn.disabled = true;
        addAutoBtn.textContent = '...';

        try {
          await addVideosToRoom(tracks);
          addAutoBtn.textContent = '✅';
          setTimeout(() => {
            addAutoBtn.textContent = '+ Auto';
            addAutoBtn.disabled = false;
          }, 2000);
        } catch (err) {
          addAutoBtn.textContent = '❌';
          console.error('DropATrack: Add autoplay failed', err);
          setTimeout(() => {
            addAutoBtn.textContent = '+ Auto';
            addAutoBtn.disabled = false;
          }, 2000);
        }
      });
    }
  }


  function updateBannerRoomDisplay() {
    const banner = document.querySelector(`#${BANNER_ID}`);
    if (!banner) {
      injectBannerForCurrentSite();
      return;
    }
    banner.innerHTML = buildBannerHTML();
    attachBannerEvents(banner);
  }

  // Create a per-item add button (shared between YT and YTM)
  function createItemButton(videoId, title, getDuration, parentItem) {
    const btn = document.createElement('button');
    btn.className = ITEM_BTN_CLASS;
    btn.textContent = '+';
    btn.title = 'Add to DropATrack';

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

      const duration_seconds = getDuration();
      const currentTitle = parentItem.querySelector(
        '#video-title, .song-title, .title, yt-formatted-string.title'
      )?.textContent?.trim() || title;

      try {
        await addVideosToRoom([{
          youtube_id: videoId,
          title: currentTitle,
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

    return btn;
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

  // ─── Master inject (site-aware) ───────────────────────────────────
  function injectBannerForCurrentSite() {
    if (IS_YTM) {
      injectYTMBanner();
    } else {
      injectBanner();
    }
  }

  function injectAll() {
    if (IS_YTM) {
      injectYTMBanner();
      injectYTMActionButton();
      injectYTMItemButtons();
      cleanYTMButtons();
    } else {
      injectBanner();
      injectItemButtons();
    }
  }

  // ─── MutationObserver for SPA navigation ──────────────────────────
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

    // Initial injection — stagger retries to handle late-rendered elements
    setTimeout(injectAll, 1500);
    setTimeout(injectAll, 3000);
    setTimeout(injectAll, 6000); // YTM sometimes takes longer

    // Watch for SPA changes
    startObserver();

    // YT navigation event
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(injectAll, 1000);
    });

    // YTM navigation event (fires on every route change in the SPA)
    window.addEventListener('yt-page-data-updated', () => {
      setTimeout(injectAll, 1000);
    });

    // YTM uses this event when the player queue updates
    window.addEventListener('yt-navigate-start', () => {
      // Clean up stale injected elements before new page renders
      document.querySelectorAll(`#${BANNER_ID}`).forEach(el => el.remove());
      const actionBtn = document.getElementById(ACTION_BTN_ID);
      if (actionBtn) actionBtn.remove();
    });
  }

  init();
})();
