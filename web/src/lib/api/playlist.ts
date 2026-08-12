import { currentApiURL } from "$lib/api/api-url";

import type { CobaltPlaylistEntry, CobaltPlaylistResponse } from "$lib/types/api";

// matches urls that point at a playlist/mix/album rather than a single video.
// youtube is the main case (list= is ~34 chars), but this also catches
// other services that use a list param, e.g. soundcloud set pages.
export const isPlaylistUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        const list = parsed.searchParams.get("list");
        const path = parsed.pathname.toLowerCase();
        return (!!list && list.length > 10)
            || path.includes("/playlist")
            || path.includes("/set/")
            || path.includes("/album/");
    } catch {
        return false;
    }
}

// expands a playlist url into its individual video entries via the api.
export const getPlaylistEntries = async (url: string): Promise<CobaltPlaylistResponse | undefined> => {
    try {
        const response = await fetch(
            `${currentApiURL()}/playlist?url=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(30000) }
        );

        if (!response.ok) {
            return;
        }

        const data: CobaltPlaylistResponse = await response.json();
        if (data.status !== "ok" || !Array.isArray(data.entries)) {
            return;
        }

        return data;
    } catch {
        return;
    }
}

// builds a download url for an entry that only has an id (flat playlists
// return ids instead of full urls for some services)
export const entryUrl = (entry: CobaltPlaylistEntry): string | undefined => {
    if (entry.url) {
        return entry.url;
    }
    if (entry.id) {
        try {
            const parsed = new URL(entry.id);
            if (parsed.protocol.startsWith("http")) {
                return entry.id;
            }
        } catch {}
        return `https://youtube.com/watch?v=${entry.id}`;
    }
}
