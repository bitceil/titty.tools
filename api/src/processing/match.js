import { strict as assert } from "node:assert";

import { env } from "../config.js";
import { createResponse } from "../processing/request.js";

import matchAction from "./match-action.js";

import { friendlyServiceName } from "./service-alias.js";

import ytdlp from "./services/ytdlp.js";

let freebind;

export default async function({ host, url, params, authType }) {
    assert(url instanceof URL);
    let requestIP;

    if (env.freebindCIDR) {
        if (!freebind) {
            freebind = await import('freebind');
        }

        requestIP = freebind.ip.random(env.freebindCIDR);
    }

    try {
        let isAudioOnly = params.downloadMode === "audio",
            isAudioMuted = params.downloadMode === "mute";

        const subtitleLang =
            params.subtitleLang !== "none" ? params.subtitleLang : undefined;

        const r = await ytdlp({
            service: host,
            url: url.toString(),
            downloadMode: params.downloadMode,
            videoQuality: params.videoQuality,
            youtubeVideoCodec: params.youtubeVideoCodec,
            youtubeVideoContainer: params.youtubeVideoContainer,
            subtitleLang,
        });

        if (r.isAudioOnly) {
            isAudioOnly = true;
            isAudioMuted = false;
        }

        if (r.error && r.critical) {
            return createResponse("critical", {
                code: `error.api.${r.error}`,
            })
        }

        if (r.error) {
            let context;
            switch(r.error) {
                case "content.too_long":
                    context = {
                        limit: parseFloat((env.durationLimit / 60).toFixed(2)),
                    }
                    break;

                case "fetch.fail":
                case "fetch.rate":
                case "fetch.critical":
                case "link.unsupported":
                case "content.video.unavailable":
                    context = {
                        service: friendlyServiceName(host),
                    }
                    break;
            }

            return createResponse("error", {
                code: `error.api.${r.error}`,
                context,
            })
        }

        let localProcessing = params.localProcessing;
        const lpEnv = env.forceLocalProcessing;
        const shouldForceLocal = lpEnv === "always" || (lpEnv === "session" && authType === "session");
        const localDisabled = (!localProcessing || localProcessing === "disabled");

        if (shouldForceLocal && localDisabled) {
            localProcessing = "preferred";
        }

        return matchAction({
            r,
            host,
            audioFormat: params.audioFormat,
            isAudioOnly,
            isAudioMuted,
            disableMetadata: params.disableMetadata,
            filenameStyle: params.filenameStyle,
            convertGif: params.convertGif,
            requestIP,
            audioBitrate: params.audioBitrate,
            alwaysProxy: params.alwaysProxy || localProcessing === "forced",
            localProcessing,
        })
    } catch {
        return createResponse("error", {
            code: "error.api.fetch.critical",
            context: {
                service: friendlyServiceName(host),
            }
        })
    }
}
