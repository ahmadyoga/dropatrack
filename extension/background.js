// Background service worker — watches for DropATrack room tabs
// and auto-updates chrome.storage so the content script can react

const DROPATRACK_PATTERN = /https?:\/\/(dropatrack\.vercel\.app)\//;

async function scanAndUpdateRooms() {
    try {
        const allTabs = await chrome.tabs.query({});
        const roomSlugs = allTabs
            .filter(t => t.url && DROPATRACK_PATTERN.test(t.url))
            .map(t => {
                const url = new URL(t.url);
                const slug = url.pathname.replace(/^\//, '').split('/')[0];
                return slug && slug !== '' ? slug : null;
            })
            .filter(Boolean)
            .filter((slug, idx, arr) => arr.indexOf(slug) === idx); // deduplicate

        const prev = await chrome.storage.local.get(['selectedRoom', 'rooms']);
        const prevRooms = prev.rooms || [];
        let selectedRoom = prev.selectedRoom || null;

        // If the selected room is no longer open, clear it
        if (selectedRoom && !roomSlugs.includes(selectedRoom)) {
            selectedRoom = roomSlugs[0] || null;
        }

        // If no room was selected but rooms are now available, pick the first
        if (!selectedRoom && roomSlugs.length > 0) {
            selectedRoom = roomSlugs[0];
        }

        // If no rooms at all, clear
        if (roomSlugs.length === 0) {
            selectedRoom = null;
        }

        // Only update storage if something changed
        const roomsChanged = JSON.stringify(prevRooms) !== JSON.stringify(roomSlugs);
        const roomChanged = prev.selectedRoom !== selectedRoom;

        if (roomsChanged || roomChanged) {
            await chrome.storage.local.set({ selectedRoom, rooms: roomSlugs });

            // Notify all YouTube tabs
            const ytTabs = allTabs.filter(t => t.url?.includes('youtube.com'));
            for (const tab of ytTabs) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'roomUpdated',
                    selectedRoom,
                    rooms: roomSlugs,
                }).catch(() => { });
            }
        }
    } catch (err) {
        console.error('DropATrack background: scan error', err);
    }
}

// Watch for tab events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
        scanAndUpdateRooms();
    }
});

chrome.tabs.onRemoved.addListener(() => {
    scanAndUpdateRooms();
});

chrome.tabs.onCreated.addListener(() => {
    scanAndUpdateRooms();
});

// Initial scan on install/startup
chrome.runtime.onStartup.addListener(scanAndUpdateRooms);
chrome.runtime.onInstalled.addListener(scanAndUpdateRooms);
