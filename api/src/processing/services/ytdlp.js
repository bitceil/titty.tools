import youtubedl from "youtube-dl-exec";
import { create } from "youtube-dl-exec";

import { env } from "../../config.js";
import { createYtDlpCookies, destroyYtDlpCookies } from "../cookie/manager.js";

/*
    this is the only extractor cobalt needs.
    instead of maintaining bespoke scrapers for every website,
    we delegate extraction to yt-dlp, which supports thousands
    of sites and is updated independently of cobalt.

    the extractor maps yt-dlp's dump-json output onto the same
    response shape that the rest of the pipeline expects
    (urls, filenameAttributes, subtitles, fileMetadata, ...),
    so downstream code (match-action, stream handling and the
    web frontend's in-browser remuxing) works unchanged.

    note: animated media (isGif) isn't detected, so the convertGif
    request option is a no-op. everything else (video, audio, mute,
    subtitles, merge, photos) is supported.
*/

// youtube-dl-exec downloads a yt-dlp binary at install time.
// the binary path can be overridden with the YOUTUBE_DL_PATH env variable.
const ytDlp = process.env.YOUTUBE_DL_PATH
    ? create(process.env.YOUTUBE_DL_PATH)
    : youtubedl;

// returns the yt-dlp binary version (cached after the first call).
// used by the health endpoint and the startup log.
let cachedVersion;
const getYtDlpVersion = async () => {
    if (cachedVersion !== undefined) return cachedVersion;
    try {
        const { stdout } = await ytDlp.exec("--version");
        cachedVersion = String(stdout).trim() || undefined;
    } catch {
        cachedVersion = undefined;
    }
    return cachedVersion;
}

export { getYtDlpVersion };

// extracts the list of videos from a playlist/album/mix url.
// entries are fetched in flat mode, so this only does one
// metadata roundtrip instead of one per video.
//
// note: we use the raw exec() here on purpose. youtube-dl-exec's
// wrapper assumes a single JSON object on stdout, but yt-dlp prints
// one JSON line per entry for playlists, which breaks JSON.parse.
export const getPlaylistEntries = async (url) => {
    const cookiesFile = await createYtDlpCookies();

    try {
        const { stdout, stderr, exitCode } = await ytDlp.exec(url, {
            dumpJson: true,
            flatPlaylist: true,
            quiet: true,
            noWarnings: true,
            noColor: true,
            socketTimeout: 30,
            ...(cookiesFile ? { cookies: cookiesFile } : {}),
            ...(proxyEnv ? { proxy: proxyEnv } : {}),
        });

        if (exitCode !== 0) {
            return { error: mapError({ stderr }) };
        }

        // first line is the playlist info, the rest are the entries
        const objects = String(stdout).split("\n")
            .map(line => line.trim())
            .filter(line => line.startsWith("{"))
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return undefined;
                }
            })
            .filter(Boolean);

        if (!objects.length) {
            return { error: { error: "fetch.empty" } };
        }

        // with --flat-playlist --dump-json, yt-dlp prints one JSON
        // object per entry (no playlist header), so every line is an entry
        const entries = objects
            .map(entry => ({
                url: entry.url,
                id: entry.id,
                title: entry.title,
                duration: entry.duration,
            }))
            .filter(entry => entry.url || entry.id);

        return {
            title: entries.find(e => e.title)?.title,
            entries,
        };
    } catch (e) {
        return { error: mapError(e) };
    } finally {
        await destroyYtDlpCookies(cookiesFile);
    }
}

// does this url point at a playlist rather than a single video?
// (only meaningful for services that support playlists, e.g. youtube)
export const isPlaylistUrl = (url) => {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname.toLowerCase();
        const list = parsed.searchParams.get("list");
        return list?.length > 10
            || path.includes("/playlist")
            || path.includes("/set/")
            || path.includes("/album/");
    } catch {
        return false;
    }
}

const videoCodecPrefix = {
    h264: "avc1",
    av1: "av01",
    vp9: "vp9",
};

// protocols whose URLs point directly at playable media files.
// (yt-dlp reports modern youtube adaptive streams as plain https,
// and those urls respond to range requests, so they work through
// the tunnel and can be merged in the browser)
const directProtocols = new Set(["https", "http"]);

// hls playlists are processed server-side with ffmpeg
const hlsProtocols = new Set(["m3u8", "m3u8_native"]);

// headers that don't require proxying the media file through cobalt
const allowedHeaderKeys = new Set([
    "user-agent",
    "accept",
    "accept-language",
    "accept-encoding",
    "sec-fetch-mode",
    "sec-fetch-site",
    "sec-fetch-dest",
    "priority",
]);

const getHeight = (f) => f.height || (f.width ? Math.round((f.width * 9) / 16) : undefined);
const getResolution = (f) => f.width && f.height ? `${f.width}x${f.height}` : undefined;

const proxyEnv = env.externalProxy
    || process.env.HTTPS_PROXY
    || process.env.HTTP_PROXY;

const needsProxy = (headers) => headers
    && Object.keys(headers).some(h => !allowedHeaderKeys.has(h.toLowerCase()));

// some extractors (notably twitter) report formats without any codec
// info: hls audio streams come back with vcodec "none" and no acodec,
// and progressive mp4s come back with no vcodec/acodec at all. yt-dlp
// itself treats a missing codec as "unknown, stream present" (its -F
// output shows "unknown" for these), so we mirror that here instead of
// dropping the formats entirely.

// a direct https format with a resolution but no codec info is a single
// video+audio file (progressive mp4)
const isProgressiveFormat = (f) => !f.vcodec && !f.acodec
    && (f.height || f.width);

// audio streams without an acodec can still be identified by their
// resolution/format id/bitrate
const looksLikeAudioOnly = (f) => /audio only/i.test(f.resolution || "")
    || /audio/i.test(f.format_id || "")
    || f.abr > 0;

const isAudioOnlyFormat = (f) => (!f.vcodec || f.vcodec === "none")
    && !isProgressiveFormat(f)
    && ((f.acodec && f.acodec !== "none") || looksLikeAudioOnly(f));

const isVideoOnlyFormat = (f) => f.vcodec && f.vcodec !== "none"
    && (!f.acodec || f.acodec === "none");

const isCombinedFormat = (f) => (f.vcodec && f.vcodec !== "none"
    && f.acodec && f.acodec !== "none")
    || isProgressiveFormat(f);

const pickAudio = (formats) => {
    const prefExt = ["m4a", "mp4", "mp3"];
    return [...formats].sort((a, b) => {
        const aPref = prefExt.indexOf(a.ext),
              bPref = prefExt.indexOf(b.ext);
        if (aPref !== -1 || bPref !== -1) {
            if (aPref === -1) return 1;
            if (bPref === -1) return -1;
            if (aPref !== bPref) return aPref - bPref;
        }
        return (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0);
    })[0];
}

// best audio-only format for merging with a video stream.
// prefers a container compatible with the video container,
// otherwise the browser-side merge would fail.
const pickAudioForMerge = (formats, videoExt) => {
    const audioFormats = formats.filter(f =>
        f.url && isAudioOnlyFormat(f)
    );

    const direct = audioFormats.filter(f => directProtocols.has(f.protocol));
    const hls = audioFormats.filter(f => hlsProtocols.has(f.protocol));

    const prefExt = videoExt === "webm"
        ? ["webm", "opus", "ogg"]
        : ["m4a", "mp4", "mp3"];

    const rank = (a, b) => {
        const aPref = prefExt.indexOf(a.ext),
              bPref = prefExt.indexOf(b.ext);
        if (aPref !== -1 || bPref !== -1) {
            if (aPref === -1) return 1;
            if (bPref === -1) return -1;
            if (aPref !== bPref) return aPref - bPref;
        }
        return (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0);
    };

    const best = (list) => list.length ? [...list].sort(rank)[0] : undefined;
    return best(direct) || best(hls);
}

const pickVideo = (formats, { height, codec, ext }) => {
    let candidates = formats.filter(f => f.url);

    if (!candidates.length) return;

    if (codec) {
        const prefix = videoCodecPrefix[codec];
        const filtered = candidates.filter(f =>
            f.vcodec && f.vcodec.startsWith(prefix)
        );
        if (filtered.length) candidates = filtered;
    }

    if (ext && ext !== "auto") {
        const filtered = candidates.filter(f => f.ext === ext);
        if (filtered.length) candidates = filtered;
    }

    const withHeight = candidates.filter(f => getHeight(f));

    if (height && withHeight.length) {
        const capped = withHeight.filter(f => getHeight(f) <= height);
        if (capped.length) {
            return capped.sort((a, b) => getHeight(b) - getHeight(a))[0];
        }
        // no format within the requested quality, take the lowest available
        return withHeight.sort((a, b) => getHeight(a) - getHeight(b))[0];
    }

    return candidates.sort(
        (a, b) => (getHeight(b) || 0) - (getHeight(a) || 0)
    )[0];
}

const mapMetadata = (info) => {
    const meta = {};
    const set = (key, value) => {
        if (value !== undefined && value !== null && value !== "") {
            meta[key] = String(value);
        }
    };

    set("title", info.title);
    set("artist", info.artist || info.uploader || info.creator || info.channel);
    set("album", info.album);
    set("album_artist", info.album_artist);
    set("composer", info.composer);
    set("genre", info.genre);
    set("copyright", info.copyright);
    set("track", info.track_number ?? info.track);
    set("date", info.release_date || info.upload_date);

    return Object.keys(meta).length ? meta : undefined;
}

const pickContainer = (videoExt, audioExt) => {
    if (videoExt === "webm") return "webm";
    if (videoExt === "mkv") return "mkv";
    if (["m4a", "mp4", "mp3", "opus", "aac"].includes(audioExt)) return "mp4";
    return videoExt || "mp4";
}

// youtube refuses the default player clients with a bot check from time to
// time ("sign in to confirm you're not a bot", http 429, ...). shared between
// mapError and the retry logic below so they can't drift apart.
const botCheckPattern = /not a bot|unusual traffic/i;
const botCheckRetryPattern = /not a bot|unusual traffic|http error 429|too many requests|rate ?limit/i;

const mapError = (e) => {
    const text = String(e?.stderr || e?.message || "");

    if (/unsupported url|no suitable extractor/i.test(text)) {
        return { error: "link.unsupported" };
    }
    if (/confirm your age|age-?restricted|age.?gated/i.test(text)) {
        return { error: "content.video.age" };
    }
    // note: yt-dlp uses a curly apostrophe (U+2019) in "you're",
    // so match on "not a bot" instead of trying to match the quote
    if (botCheckPattern.test(text)) {
        return { error: "fetch.rate" };
    }
    if (/this video is private|video is private|private video|is private/i.test(text)) {
        return { error: "content.video.private" };
    }
    // geo checks must come before the generic "not available" rule,
    // as in "this video is not available in your country"
    if (/not available in your country|geo-?restricted|unavailable in your region/i.test(text)) {
        return { error: "content.video.region" };
    }
    if (/has been removed|video unavailable|is unavailable|not available|no longer available|removed by the uploader|deleted by the uploader|looks truncated|incomplete (youtube|video) id/i.test(text)) {
        return { error: "content.video.unavailable" };
    }
    if (/account authentication is required|you need to log ?in|login is required|sign in to continue/i.test(text)) {
        return { error: "content.video.unavailable" };
    }
    if (/this live (event|stream)|stream is offline|live stream ended/i.test(text)) {
        return { error: "content.video.live" };
    }
    if (/http error 404/i.test(text)) {
        return { error: "content.video.unavailable" };
    }
    if (/http error 429|too many requests|rate ?limit/i.test(text)) {
        return { error: "fetch.rate" };
    }
    if (/http error 403/i.test(text)) {
        return { error: "content.video.unavailable" };
    }
    if (/timed ?out|network error|unable to download|unable to connect|connection/i.test(text)) {
        return { error: "fetch.fail" };
    }
    if (/no video formats found|no formats|no matching format|unable to extract/i.test(text)) {
        return { error: "fetch.empty" };
    }

    return { error: "fetch.fail" };
}

const isYouTubeUrl = (url) => {
    try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return host === "youtube.com"
            || host === "youtu.be"
            || host.endsWith(".youtube.com")
            || host.endsWith(".youtube-nocookie.com");
    } catch {
        return false;
    }
}

// youtube sometimes refuses the default player clients with a bot check
// ("sign in to confirm you're not a bot"). the embedded player client is
// generally allowed without authentication and keeps full quality, so we
// retry with it once before giving up.
const isBotCheck = (e) => botCheckRetryPattern
    .test(String(e?.stderr || e?.message || ""));

export default async function ({
    service = "unknown",
    url,
    downloadMode = "auto",
    videoQuality = "1080",
    youtubeVideoCodec,
    youtubeVideoContainer,
    subtitleLang,
}) {
    const isAudioOnly = downloadMode === "audio";
    const isAudioMuted = downloadMode === "mute";

    const cookiesFile = await createYtDlpCookies();

    const runYtDlp = (extraArgs = {}) => ytDlp(url, {
        dumpJson: true,
        noPlaylist: true,
        quiet: true,
        noWarnings: true,
        noColor: true,
        socketTimeout: 30,
        ...(cookiesFile ? { cookies: cookiesFile } : {}),
        ...(proxyEnv ? { proxy: proxyEnv } : {}),
        ...extraArgs,
    });

    let info;
    try {
        info = await runYtDlp();
    } catch (e) {
        if (isBotCheck(e) && isYouTubeUrl(url)) {
            try {
                info = await runYtDlp({ extractorArgs: "youtube:player_client=web_embedded" });
            } catch (e2) {
                // prefer the retry's error when it's more specific than the
                // first one (a bot check can mask "video unavailable" etc.)
                const first = mapError(e),
                      second = mapError(e2);
                return second.error === "fetch.fail" && first.error !== "fetch.fail"
                    ? first
                    : second;
            }
        } else {
            return mapError(e);
        }
    } finally {
        await destroyYtDlpCookies(cookiesFile);
    }

    if (info.live_status === "is_live" || info.is_live) {
        return { error: "content.video.live" };
    }

    if (info.duration && env.durationLimit && info.duration > env.durationLimit) {
        return { error: "content.too_long" };
    }

    const formats = (info.formats || []).filter(f => f.url);
    const originalRequest = {
        url,
        downloadMode,
        videoQuality,
        youtubeVideoCodec,
        youtubeVideoContainer,
        subtitleLang,
    };

    const filenameBase = {
        service,
        id: info.id || url,
        title: info.title || "media",
        author: info.uploader || info.artist || info.creator || info.channel,
    };

    const fileMetadata = mapMetadata(info);

    // image posts (photos) don't have playable formats
    const images = info.images?.length
        ? info.images
        : (!formats.length ? (info.thumbnails || []) : []);

    if (!formats.length) {
        if (images.length) {
            const picker = images.map(image => {
                const imageUrl = typeof image === "string" ? image : image.url;
                return imageUrl && {
                    type: "photo",
                    url: imageUrl,
                    thumb: imageUrl,
                };
            }).filter(Boolean);

            if (picker.length) {
                return {
                    picker,
                    fileMetadata,
                    filenameAttributes: filenameBase,
                    originalRequest,
                };
            }
        }

        return { error: "fetch.empty" };
    }

    // subtitles
    let subtitles;
    if (subtitleLang && (info.subtitles || info.automatic_captions)) {
        const tracks = { ...info.subtitles, ...info.automatic_captions };
        const lang = Object.keys(tracks).find(l =>
            l.toLowerCase().startsWith(subtitleLang.toLowerCase())
        );

        if (lang && tracks[lang]?.length) {
            const track = tracks[lang].find(t => t.ext === "vtt") || tracks[lang][0];
            if (track?.url) {
                subtitles = track.url;
                fileMetadata.sublanguage = lang;
            }
        }
    }

    if (isAudioOnly) {
        const audioFormats = formats.filter(isAudioOnlyFormat);

        const audio = pickAudio(audioFormats.filter(f => directProtocols.has(f.protocol)))
            || pickAudio(audioFormats.filter(f => hlsProtocols.has(f.protocol)))
            || pickAudio(audioFormats.filter(f =>
                directProtocols.has(f.protocol) || hlsProtocols.has(f.protocol)
            ));

        if (!audio) {
            return { error: "fetch.empty" };
        }

        const isHLS = hlsProtocols.has(audio.protocol);

        return {
            urls: audio.url,
            isAudioOnly: true,
            isHLS,
            bestAudio: audio.ext === "mp3" ? "mp3" : undefined,
            cover: info.thumbnail,
            headers: needsProxy(audio.http_headers) ? audio.http_headers : undefined,
            fileMetadata,
            filenameAttributes: {
                ...filenameBase,
                extension: audio.ext || "mp4",
            },
            originalRequest,
        };
    }

    const videoFormats = formats.filter(f =>
        (f.vcodec && f.vcodec !== "none") || isProgressiveFormat(f)
    );

    const height = videoQuality === "max" ? undefined : Number(videoQuality);
    const codec = youtubeVideoCodec;
    const ext = youtubeVideoContainer;

    const heightValue = (f) => getHeight(f);
    const satisfies = (h) => !height || h >= height;

    const singleResult = (f, isHLS = false) => ({
        urls: f.url,
        isHLS,
        headers: needsProxy(f.http_headers) ? f.http_headers : undefined,
        subtitles,
        fileMetadata,
        filenameAttributes: {
            ...filenameBase,
            resolution: getResolution(f),
            qualityLabel: heightValue(f) ? `${heightValue(f)}p` : undefined,
            extension: f.ext || "mp4",
        },
        originalRequest,
    });

    const mergeResult = (v, a, isHLS = false) => {
        const mergedHeaders = { ...v.http_headers, ...a.http_headers };
        return {
            urls: [v.url, a.url],
            isHLS,
            headers: needsProxy(mergedHeaders) ? mergedHeaders : undefined,
            subtitles,
            fileMetadata,
            filenameAttributes: {
                ...filenameBase,
                resolution: getResolution(v),
                qualityLabel: heightValue(v) ? `${heightValue(v)}p` : undefined,
                extension: pickContainer(v.ext, a.ext),
            },
            originalRequest,
        };
    }

    const direct = videoFormats.filter(f => directProtocols.has(f.protocol));
    const hls = videoFormats.filter(f => hlsProtocols.has(f.protocol));

    // candidate routes, best quality first
    const videoOnlyDirect = pickVideo(
        direct.filter(isVideoOnlyFormat), { height, codec, ext }
    );
    const audioDirect = videoOnlyDirect && pickAudioForMerge(formats, videoOnlyDirect.ext);

    const combinedDirect = pickVideo(
        direct.filter(isCombinedFormat), { height, codec, ext }
    );

    const videoOnlyHls = pickVideo(
        hls.filter(isVideoOnlyFormat), { height, codec, ext }
    );
    const audioHls = videoOnlyHls && pickAudioForMerge(formats, videoOnlyHls.ext);

    const combinedHls = pickVideo(
        hls.filter(isCombinedFormat), { height, codec, ext }
    );

    // candidate routes, best quality first
    const routes = [];

    // direct video + audio streams, merged in the browser
    if (videoOnlyDirect && audioDirect) {
        routes.push({
            make: () => mergeResult(videoOnlyDirect, audioDirect),
            height: heightValue(videoOnlyDirect),
            priority: 4,
        });
    }

    // single direct file with audio
    if (combinedDirect) {
        routes.push({
            make: () => singleResult(combinedDirect),
            height: heightValue(combinedDirect),
            priority: 3,
        });
    }

    // hls video + audio, merged server-side with ffmpeg
    if (videoOnlyHls && audioHls) {
        routes.push({
            make: () => mergeResult(videoOnlyHls, audioHls, true),
            height: heightValue(videoOnlyHls),
            priority: 2,
        });
    }

    // single hls playlist, remuxed server-side
    if (combinedHls) {
        routes.push({
            make: () => singleResult(combinedHls, true),
            height: heightValue(combinedHls),
            priority: 1,
        });
    }

    // a route that satisfies the requested quality wins,
    // otherwise we take the highest quality route available.
    // for "max" quality the tallest route always wins.
    let chosen;

    if (height) {
        chosen = routes.find(route => satisfies(route.height));
    }

    if (!chosen) {
        chosen = routes.sort(
            (a, b) => (b.height || 0) - (a.height || 0) || b.priority - a.priority
        )[0];
    }

    if (chosen) {
        return chosen.make();
    }

    // last resort for muted downloads: video without audio is fine
    if (isAudioMuted) {
        const anyDirect = pickVideo(direct, { height, codec, ext });
        if (anyDirect) return singleResult(anyDirect);
        const anyHls = pickVideo(hls, { height, codec, ext });
        if (anyHls) return singleResult(anyHls, true);
    }

    // image posts that also carry playable formats (e.g. tiktok photos)
    // fall back to a photo picker
    if (images.length) {
        const picker = images.map(image => {
            const imageUrl = typeof image === "string" ? image : image.url;
            return imageUrl && {
                type: "photo",
                url: imageUrl,
                thumb: imageUrl,
            };
        }).filter(Boolean);

        if (picker.length) {
            return {
                picker,
                fileMetadata,
                filenameAttributes: filenameBase,
                originalRequest,
            };
        }
    }

    return { error: "fetch.empty" };
}
