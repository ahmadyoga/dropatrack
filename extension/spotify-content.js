// Content script — runs on Spotify pages (open.spotify.com)
// Injects DropATrack "+" buttons next to each track in playlists/albums

(() => {
  const API_BASE_PROD = 'https://dropatrack.vercel.app';
  // Use dev server if extension was loaded from localhost context, otherwise prod
  // Toggle this to 'API_BASE_DEV' for local testing, 'API_BASE_PROD' for production
  const API_BASE = API_BASE_PROD;
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

  // ─── Listen for popup / background messages ──────────────────────
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'getTrackInfo') {
      sendResponse(extractSpotifyTracks());
    }
    if (request.action === 'roomUpdated') {
      selectedRoom = request.selectedRoom || null;
      rooms = request.rooms || rooms;
      injectAll();
    }
    return true;
  });

  // Listen for storage changes from popup / background
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.selectedRoom) {
      selectedRoom = changes.selectedRoom.newValue || null;
    }
    if (changes.rooms) {
      rooms = changes.rooms.newValue || [];
    }
    injectAll();
  });

  // ─── Parse duration text (e.g. "3:42") to seconds ────────────────
  function parseDuration(text) {
    if (!text) return 0;
    const cleaned = text.trim();
    const parts = cleaned.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  // ─── Extract tracks from Spotify DOM ─────────────────────────────
  function extractSpotifyTracks() {
    const tracks = [];

    // Strategy 1: data-testid="tracklist-row" — most reliable
    const rows = document.querySelectorAll('[data-testid="tracklist-row"]');

    rows.forEach((row) => {
      const info = extractTrackFromRow(row);
      if (info) tracks.push(info);
    });

    // Strategy 2: Fallback — grid rows with role="row"
    if (tracks.length === 0) {
      const gridRows = document.querySelectorAll('[role="grid"] [role="row"]');
      gridRows.forEach((row) => {
        // Skip header row
        if (row.querySelector('[role="columnheader"]')) return;
        const info = extractTrackFromRow(row);
        if (info) tracks.push(info);
      });
    }

    return {
      tracks,
      trackCount: tracks.length,
      pageUrl: window.location.href,
      pageType: getSpotifyPageType(),
    };
  }

  function extractTrackFromRow(row) {
    // Track title — try data-testid first, then fallback
    const titleEl =
      row.querySelector('a[data-testid="internal-track-link"] div') ||
      row.querySelector('a[data-testid="internal-track-link"]') ||
      row.querySelector('[data-encore-id="text"] a') ||
      row.querySelector('.tracklist-name') ||
      row.querySelector('a[href*="/track/"]');

    const title = titleEl?.textContent?.trim();
    if (!title) return null;

    // Artist — usually in a span/a after the title, or in a separate column
    let artist = '';
    const artistEls =
      row.querySelectorAll('a[href*="/artist/"]') ||
      row.querySelectorAll('span[data-encore-id="text"] a');

    if (artistEls.length > 0) {
      artist = Array.from(artistEls)
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join(', ');
    }

    // If no artist link found, try the second column text
    if (!artist) {
      const columns = row.querySelectorAll('[data-encore-id="text"]');
      if (columns.length >= 2) {
        artist = columns[1]?.textContent?.trim() || '';
      }
    }

    // Duration — usually the last column
    const durationEl =
      row.querySelector('[data-testid="tracklist-duration"]') ||
      row.querySelector('[aria-label*="duration" i]');
    let durationText = durationEl?.textContent?.trim() || '';

    // Fallback: look for time-like text in the last column
    if (!durationText) {
      const allText = row.querySelectorAll('[data-encore-id="text"]');
      for (const el of allText) {
        const text = el.textContent?.trim() || '';
        if (/^\d{1,2}:\d{2}$/.test(text)) {
          durationText = text;
          break;
        }
      }
    }

    // Spotify track URL
    const trackLink = row.querySelector('a[href*="/track/"]');
    const spotifyUrl = trackLink?.getAttribute('href')
      ? `https://open.spotify.com${trackLink.getAttribute('href')}`
      : '';

    return {
      title,
      artist,
      duration_seconds: parseDuration(durationText),
      spotify_url: spotifyUrl,
    };
  }

  function getSpotifyPageType() {
    const path = window.location.pathname;
    if (path.startsWith('/playlist/')) return 'playlist';
    if (path.startsWith('/album/')) return 'album';
    if (path.startsWith('/track/')) return 'track';
    if (path.startsWith('/artist/')) return 'artist';
    return 'unknown';
  }

  // ─── Resolve a Spotify track to YouTube via our API ──────────────
  async function resolveAndAddTrack(track) {
    if (!selectedRoom) {
      throw new Error('No room selected');
    }

    // Step 1: Resolve Spotify track → YouTube video
    const resolveRes = await fetch(`${API_BASE}/api/spotify/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracks: [{ title: track.title, artist: track.artist }],
      }),
    });

    const resolveData = await resolveRes.json();
    if (!resolveRes.ok || !resolveData.resolved?.length) {
      throw new Error(resolveData.error || 'Could not find YouTube match');
    }

    const resolved = resolveData.resolved[0];

    // Step 2: Add resolved YouTube video to room queue
    const addRes = await fetch(`${API_BASE}/api/queue/add-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_slug: selectedRoom,
        videos: [resolved],
        added_by: 'Extension (Spotify)',
      }),
    });

    const addData = await addRes.json();
    if (!addRes.ok) {
      throw new Error(addData.error || 'Failed to add to queue');
    }

    return addData;
  }

  // ─── Create per-track "+" button ─────────────────────────────────
  function createTrackButton(track, parentRow) {
    const btn = document.createElement('button');
    btn.className = ITEM_BTN_CLASS;
    btn.textContent = '+';
    btn.title = selectedRoom
      ? `Add "${track.title}" to DropATrack`
      : 'No room selected — open extension popup';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!selectedRoom) {
        btn.textContent = '⚠';
        btn.title = 'No room selected — open extension popup first';
        setTimeout(() => {
          btn.textContent = '+';
          btn.title = `Add "${track.title}" to DropATrack`;
        }, 2000);
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<div class="dropatrack-spinner"></div>';

      try {
        await resolveAndAddTrack(track);
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

  // ─── Inject per-item buttons (main tracklist) ───────────────────
  function injectItemButtons() {
    if (!selectedRoom && rooms.length === 0) {
      // Remove stale buttons if no room
      document.querySelectorAll(`.${ITEM_BTN_CLASS}`).forEach((b) => b.remove());
      return;
    }

    // Strategy 1: data-testid rows
    let rows = document.querySelectorAll('[data-testid="tracklist-row"]');

    // Strategy 2: grid role rows
    if (rows.length === 0) {
      rows = document.querySelectorAll('[role="grid"] [role="row"]');
    }

    rows.forEach((row) => {
      // Skip header rows
      if (row.querySelector('[role="columnheader"]')) return;
      // Skip already-injected
      if (row.querySelector(`.${ITEM_BTN_CLASS}`)) return;

      const track = extractTrackFromRow(row);
      if (!track) return;

      const btn = createTrackButton(track, row);

      // Insert the button — try to find the duration column or action area
      const durationCol =
        row.querySelector('[data-testid="tracklist-duration"]') ||
        row.querySelector('[aria-label*="duration" i]');

      if (durationCol) {
        durationCol.style.position = 'relative';
        durationCol.insertAdjacentElement('beforebegin', btn);
      } else {
        // Fallback: append to end of row
        const lastCell = row.querySelector(':scope > div:last-child') || row;
        lastCell.appendChild(btn);
      }
    });
  }

  // ─── Extract track info from a queue panel item ──────────────────
  function extractTrackFromQueueItem(item) {
    // Title: .encore-text-body-medium or first prominent text
    const titleEl =
      item.querySelector('.encore-text-body-medium') ||
      item.querySelector('a[href*="/track/"]') ||
      item.querySelector('[data-testid="internal-track-link"]');

    const title = titleEl?.textContent?.trim();
    if (!title) return null;

    // Artist: subdued text with artist link
    let artist = '';
    const artistEls = item.querySelectorAll('a[href*="/artist/"]');
    if (artistEls.length > 0) {
      artist = Array.from(artistEls)
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join(', ');
    }

    // Fallback: .encore-text-body-small subdued text
    if (!artist) {
      const subduedEl = item.querySelector('.encore-internal-color-text-subdued');
      if (subduedEl) artist = subduedEl.textContent?.trim() || '';
    }

    return { title, artist, duration_seconds: 0, spotify_url: '' };
  }

  // ─── Inject buttons into Queue panel (right sidebar) ─────────────
  function injectQueueButtons() {
    if (!selectedRoom && rooms.length === 0) return;

    // Find the queue panel — it's an aside or section with Queue-related content
    // Queue items are li[role="row"] elements inside the right panel
    const queuePanel =
      document.querySelector('aside[aria-label*="queue" i]') ||
      document.querySelector('aside[aria-label*="Queue"]') ||
      document.querySelector('[data-testid="queue-page"]') ||
      document.querySelector('[aria-label="Queue"]');

    // If no explicit queue panel, try to find queue items in the right sidebar
    // Spotify's queue uses li[role="row"] but NOT inside a [role="grid"]
    // (the main tracklist uses [role="grid"] [role="row"])
    let queueItems = [];

    if (queuePanel) {
      queueItems = [...queuePanel.querySelectorAll('li[role="row"]')];
    } else {
      // Fallback: find li[role="row"] that are NOT inside a [role="grid"]
      // These are likely queue items in the right sidebar
      const allLiRows = document.querySelectorAll('li[role="row"]');
      allLiRows.forEach((li) => {
        if (!li.closest('[role="grid"]')) {
          queueItems.push(li);
        }
      });
    }

    queueItems.forEach((item) => {
      // Skip already-injected
      if (item.querySelector(`.${ITEM_BTN_CLASS}`)) return;

      const track = extractTrackFromQueueItem(item);
      if (!track) return;

      const btn = createTrackButton(track, item);
      btn.classList.add('dropatrack-queue-btn');

      // Insert at the end of the item, before any menu button
      const menu = item.querySelector('button[data-testid="queue-item-menu-trigger"]') ||
        item.querySelector('button[aria-label*="more" i]') ||
        item.querySelector('button:last-of-type');

      if (menu) {
        menu.insertAdjacentElement('beforebegin', btn);
      } else {
        item.appendChild(btn);
      }
    });
  }

  // ─── Inject room indicator (small floating badge) ────────────────
  function injectRoomBadge() {
    const BADGE_ID = 'dropatrack-room-badge';

    if (!selectedRoom && rooms.length === 0) {
      const existing = document.getElementById(BADGE_ID);
      if (existing) existing.remove();
      return;
    }

    if (document.getElementById(BADGE_ID)) {
      // Update text if already exists
      const badge = document.getElementById(BADGE_ID);
      const text = badge.querySelector('.dropatrack-badge-text');
      if (text) text.textContent = selectedRoom || 'No room';
      return;
    }

    const badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.className = 'dropatrack-room-badge';
    badge.innerHTML = `
      <div class="dropatrack-badge-logo">Drop<span>A</span>Track</div>
      <div class="dropatrack-badge-dot"></div>
      <div class="dropatrack-badge-text">${selectedRoom || 'No room'}</div>
    `;

    // Insert above the tracklist if possible
    const tracklistHeader = document.querySelector(
      '[data-testid="playlist-tracklist"], [data-testid="tracklist-row"]'
    );
    if (tracklistHeader) {
      const container = tracklistHeader.closest('[role="grid"]')?.parentElement || tracklistHeader.parentElement;
      if (container) {
        container.insertAdjacentElement('beforebegin', badge);
        return;
      }
    }

    // Fallback: top of main content
    const main = document.querySelector('main, [data-testid="playlist-page"]') || document.body;
    main.prepend(badge);
  }

  // ─── Master inject ───────────────────────────────────────────────
  function injectAll() {
    injectRoomBadge();
    injectItemButtons();
    injectQueueButtons();
  }

  // ─── MutationObserver for SPA navigation ─────────────────────────
  let debounceTimer = null;
  function debouncedInject() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      injectAll();
    }, 800);
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

    // Initial injection — stagger retries for lazy-rendered content
    setTimeout(injectAll, 2000);
    setTimeout(injectAll, 4000);
    setTimeout(injectAll, 8000);

    // Watch for SPA changes
    startObserver();

    // Spotify uses pushState for navigation
    const origPushState = history.pushState;
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      setTimeout(injectAll, 1500);
    };

    window.addEventListener('popstate', () => {
      setTimeout(injectAll, 1500);
    });
  }

  init();
})();
