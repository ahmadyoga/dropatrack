// Content script — runs on YouTube pages
// Extracts current video and playlist/mix videos from the sidebar

(() => {
  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'getVideoInfo') {
      const info = extractVideoInfo();
      sendResponse(info);
    }
    return true; // Keep channel open for async response
  });

  function extractVideoInfo() {
    const url = new URL(window.location.href);
    const videoId = url.searchParams.get('v');
    const listId = url.searchParams.get('list');

    // Current video
    const currentVideo = videoId ? {
      youtube_id: videoId,
      title: document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string')?.textContent?.trim() || document.title.replace(' - YouTube', ''),
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    } : null;

    // Playlist/Mix videos from the sidebar
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
          playlistVideos.push({
            youtube_id: id,
            title,
            thumbnail_url: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
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
})();
