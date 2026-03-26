const API_BASE = 'https://dropatrack.vercel.app';
const DROPATRACK_PATTERN = /https?:\/\/(localhost:3000|dropatrack\.vercel\.app)\//;

const contentEl = document.getElementById('content');

let selectedRoom = null;
let videoInfo = null;
let allRoomSlugs = [];

// Initialize
(async () => {
  try {
    // 1. Get current YouTube tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('youtube.com/watch')) {
      contentEl.innerHTML = `
        <div class="status error">
          Navigate to a YouTube video page to use DropATrack
        </div>
      `;
      return;
    }

    // 2. Get video info from content script
    videoInfo = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });

    if (!videoInfo?.currentVideo) {
      contentEl.innerHTML = `
        <div class="status error">
          Could not detect video. Try refreshing the YouTube page.
        </div>
      `;
      return;
    }

    // 3. Find open DropATrack tabs to get room list
    const allTabs = await chrome.tabs.query({});
    const roomTabs = allTabs
      .filter(t => t.url && DROPATRACK_PATTERN.test(t.url))
      .map(t => {
        const url = new URL(t.url);
        const slug = url.pathname.replace(/^\//, '').split('/')[0];
        return slug && slug !== '' ? { slug, title: t.title, tabId: t.id } : null;
      })
      .filter(Boolean)
      .filter((room, idx, arr) => arr.findIndex(r => r.slug === room.slug) === idx);

    // 4. Load saved room from storage
    try {
      const stored = await chrome.storage.local.get(['selectedRoom']);
      if (stored.selectedRoom) {
        const match = roomTabs.find(r => r.slug === stored.selectedRoom);
        if (match) selectedRoom = match.slug;
      }
    } catch { /* ignore */ }

    // 5. Render UI
    render(roomTabs);
  } catch (err) {
    contentEl.innerHTML = `
      <div class="status error">
        Error: ${err.message}<br>
        <small>Try refreshing the YouTube page</small>
      </div>
    `;
  }
})();

function render(roomTabs) {
  let html = '';

  // Current video
  if (videoInfo.currentVideo) {
    html += `
      <div class="video-card">
        <div class="label">🎬 Current Video</div>
        <div class="video-info">
          <img src="${videoInfo.currentVideo.thumbnail_url}" alt="">
          <div class="title">${escapeHtml(videoInfo.currentVideo.title)}</div>
        </div>
      </div>
    `;
  }

  // Playlist/Mix
  if (videoInfo.isPlaylist && videoInfo.playlistVideos.length > 0) {
    html += `
      <div class="playlist-card">
        <div class="label">📋 Playlist / Mix Detected</div>
        <div class="count">${videoInfo.playlistVideos.length} videos in queue</div>
      </div>
    `;
  }

  // Room selector
  html += `<div class="room-section">`;
  html += `<div class="label">Select Room</div>`;

  if (roomTabs.length > 0) {
    html += `<div class="room-tabs" id="room-tabs">`;
    roomTabs.forEach((room, idx) => {
      html += `
        <div class="room-tab ${idx === 0 ? 'selected' : ''}" data-slug="${room.slug}">
          <div class="dot"></div>
          <div class="slug">${room.slug}</div>
        </div>
      `;
    });
    html += `</div>`;
    if (!selectedRoom) selectedRoom = roomTabs[0].slug;
    allRoomSlugs = roomTabs.map(r => r.slug);
    // Persist to storage for content script
    persistRoomSelection();
  } else {
    // Clear storage so inline buttons disappear
    selectedRoom = null;
    allRoomSlugs = [];
    persistRoomSelection();

    html += `
      <div class="no-rooms">
        No DropATrack rooms open.<br>
        Open a room at <a href="${API_BASE}" target="_blank" style="color:#22c55e">dropatrack.vercel.app</a> first.
      </div>
    `;
  }

  html += `</div>`;

  // Action buttons
  html += `<div class="actions" id="actions">`;

  if (videoInfo.currentVideo && roomTabs.length > 0) {
    html += `
      <button class="btn btn-primary" id="btn-add-video">
        ➕ Add Current Video
      </button>
    `;
  }

  if (videoInfo.isPlaylist && videoInfo.playlistVideos.length > 0 && roomTabs.length > 0) {
    html += `
      <button class="btn btn-secondary" id="btn-add-playlist">
        📋 Add All ${videoInfo.playlistVideos.length} Videos
      </button>
    `;
  }

  html += `</div>`;
  html += `<div id="status-area" style="margin-top:10px"></div>`;

  contentEl.innerHTML = html;

  // ─── Attach event listeners (CSP-safe, no inline handlers) ───────
  // Room tab selection
  document.querySelectorAll('.room-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.room-tab').forEach(t => t.classList.remove('selected'));
      tab.classList.add('selected');
      selectedRoom = tab.dataset.slug;
      persistRoomSelection();
    });
  });

  // Pre-select the saved room
  if (selectedRoom) {
    document.querySelectorAll('.room-tab').forEach(t => {
      t.classList.toggle('selected', t.dataset.slug === selectedRoom);
    });
  }

  // Add single video button
  const btnVideo = document.getElementById('btn-add-video');
  if (btnVideo) {
    btnVideo.addEventListener('click', addVideo);
  }

  // Add playlist button
  const btnPlaylist = document.getElementById('btn-add-playlist');
  if (btnPlaylist) {
    btnPlaylist.addEventListener('click', addPlaylist);
  }
}

async function addVideo() {
  if (!selectedRoom || !videoInfo?.currentVideo) return;

  const btn = document.getElementById('btn-add-video');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> Adding...`;

  try {
    const res = await fetch(`${API_BASE}/api/queue/add-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_slug: selectedRoom,
        videos: [videoInfo.currentVideo],
        added_by: 'Extension',
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showStatus('success', `✅ ${data.message}`);
      btn.innerHTML = `✅ Added!`;
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `➕ Add Current Video`;
      }, 2000);
    } else {
      showStatus('error', `❌ ${data.error}`);
      btn.disabled = false;
      btn.innerHTML = `➕ Add Current Video`;
    }
  } catch (err) {
    showStatus('error', `❌ Network error: ${err.message}`);
    btn.disabled = false;
    btn.innerHTML = `➕ Add Current Video`;
  }
}

async function addPlaylist() {
  if (!selectedRoom || !videoInfo?.playlistVideos?.length) return;

  const btn = document.getElementById('btn-add-playlist');
  const count = videoInfo.playlistVideos.length;
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> Adding ${count} videos...`;

  try {
    const res = await fetch(`${API_BASE}/api/queue/add-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_slug: selectedRoom,
        videos: videoInfo.playlistVideos,
        added_by: 'Extension',
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showStatus('success', `✅ ${data.message}`);
      btn.innerHTML = `✅ Added!`;
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `📋 Add All ${count} Videos`;
      }, 2000);
    } else {
      showStatus('error', `❌ ${data.error}`);
      btn.disabled = false;
      btn.innerHTML = `📋 Add All ${count} Videos`;
    }
  } catch (err) {
    showStatus('error', `❌ Network error: ${err.message}`);
    btn.disabled = false;
    btn.innerHTML = `📋 Add All ${count} Videos`;
  }
}

function showStatus(type, message) {
  const area = document.getElementById('status-area');
  area.innerHTML = `<div class="status ${type}">${message}</div>`;
  setTimeout(() => { area.innerHTML = ''; }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function persistRoomSelection() {
  try {
    await chrome.storage.local.set({
      selectedRoom,
      rooms: allRoomSlugs,
    });
    // Also notify the active YouTube tab's content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes('youtube.com')) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'roomUpdated',
        selectedRoom,
        rooms: allRoomSlugs,
      }).catch(() => { });
    }
  } catch { /* ignore */ }
}
