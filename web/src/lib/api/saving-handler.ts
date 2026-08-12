import env from "$lib/env";
import API from "$lib/api/api";
import settings from "$lib/state/settings";
import lazySettingGetter from "$lib/settings/lazy-get";

import { get } from "svelte/store";
import { t } from "$lib/i18n/translations";
import { downloadFile } from "$lib/download";
import { createDialog } from "$lib/state/dialogs";
import { downloadButtonState } from "$lib/state/omnibox";
import { createSavePipeline } from "$lib/task-manager/queue";
import { entryUrl } from "$lib/api/playlist";

import type { CobaltPlaylistEntry, CobaltSaveRequestBody } from "$lib/types/api";

type SavingHandlerArgs = {
    url?: string,
    request?: CobaltSaveRequestBody,
    oldTaskId?: string
}

export const savingHandler = async ({ url, request, oldTaskId }: SavingHandlerArgs) => {
    downloadButtonState.set("think");

    const error = (errorText: string) => {
        return createDialog({
            id: "save-error",
            type: "small",
            mascot: "error",
            buttons: [
                {
                    text: get(t)("button.gotit"),
                    main: true,
                    action: () => {},
                },
            ],
            bodyText: errorText,
        });
    }

    const getSetting = lazySettingGetter(get(settings));

    if (!request && !url) return;

    const selectedRequest = request || {
        url: url!,

        // not lazy cuz default depends on device capabilities
        localProcessing: get(settings).save.localProcessing,

        alwaysProxy: getSetting("save", "alwaysProxy"),
        downloadMode: getSetting("save", "downloadMode"),

        subtitleLang: getSetting("save", "subtitleLang"),
        filenameStyle: getSetting("save", "filenameStyle"),
        disableMetadata: getSetting("save", "disableMetadata"),

        audioFormat: getSetting("save", "audioFormat"),
        audioBitrate: getSetting("save", "audioBitrate"),
        tiktokFullAudio: getSetting("save", "tiktokFullAudio"),
        youtubeDubLang: getSetting("save", "youtubeDubLang"),
        youtubeBetterAudio: getSetting("save", "youtubeBetterAudio"),

        videoQuality: getSetting("save", "videoQuality"),
        youtubeVideoCodec: getSetting("save", "youtubeVideoCodec"),
        youtubeVideoContainer: getSetting("save", "youtubeVideoContainer"),
        youtubeHLS: env.ENABLE_DEPRECATED_YOUTUBE_HLS ? getSetting("save", "youtubeHLS") : undefined,

        allowH265: getSetting("save", "allowH265"),
        convertGif: getSetting("save", "convertGif"),
    }

    const response = await API.request(selectedRequest);

    if (!response) {
        downloadButtonState.set("error");
        return error(get(t)("error.api.unreachable"));
    }

    if (response.status === "playlist") {
        downloadButtonState.set("done");
        return confirmPlaylistDownload(response.entries);
    }

    if (response.status === "error") {
        downloadButtonState.set("error");

        return error(
            get(t)(response.error.code, response?.error?.context)
        );
    }

    if (response.status === "redirect") {
        downloadButtonState.set("done");

        return downloadFile({
            url: response.url,
            urlType: "redirect",
        });
    }

    if (response.status === "tunnel") {
        downloadButtonState.set("check");

        const probeResult = await API.probeCobaltTunnel(response.url);

        if (probeResult === 200) {
            downloadButtonState.set("done");

            return downloadFile({
                url: response.url,
            });
        } else {
            downloadButtonState.set("error");
            return error(get(t)("error.tunnel.probe"));
        }
    }

    if (response.status === "local-processing") {
        downloadButtonState.set("done");
        return createSavePipeline(response, selectedRequest, oldTaskId);
    }

    if (response.status === "picker") {
        downloadButtonState.set("done");
        const buttons = [
            {
                text: get(t)("button.done"),
                main: true,
                action: () => { },
            },
        ];

        if (response.audio) {
            const pickerAudio = response.audio;
            buttons.unshift({
                text: get(t)("button.download.audio"),
                main: false,
                action: () => {
                    downloadFile({
                        url: pickerAudio,
                    });
                },
            });
        }

        return createDialog({
            id: "download-picker",
            type: "picker",
            items: response.picker,
            buttons,
        });
    }

    downloadButtonState.set("error");
    return error(get(t)("error.api.unknown_response"));
}

// shared by the omnibox playlist flow and the api "playlist" status:
// asks the user whether they want to download every video in the playlist,
// then queues them one at a time
export const confirmPlaylistDownload = (entries: CobaltPlaylistEntry[]) => {
    const urls = (entries || [])
        .map(entryUrl)
        .filter((u): u is string => !!u);

    if (!urls.length) {
        return createDialog({
            id: "playlist-error",
            type: "small",
            mascot: "error",
            buttons: [
                {
                    text: get(t)("button.gotit"),
                    main: true,
                    action: () => {},
                },
            ],
            bodyText: get(t)("save.playlist.error"),
        });
    }

    return createDialog({
        id: "playlist-confirm",
        type: "small",
        mascot: "question",
        leftAligned: true,
        title: get(t)("save.playlist.title"),
        bodyText: get(t)("save.playlist.confirm").replace("{count}", String(urls.length)),
        buttons: [
            {
                text: get(t)("button.cancel"),
                main: false,
                action: () => {},
            },
            {
                text: get(t)("save.playlist.download"),
                main: true,
                // run in the background so the dialog closes right away,
                // the queue then fills up as each video is processed
                action: () => {
                    (async () => {
                        for (const videoUrl of urls) {
                            try {
                                await savingHandler({ url: videoUrl });
                            } catch {}
                        }
                    })();
                },
            },
        ],
    });
}
