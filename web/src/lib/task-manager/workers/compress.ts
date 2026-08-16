import LibAVWrapper from "$lib/libav";
import type { FileInfo } from "$lib/types/libav";

import {
    buildAudioArgs,
    buildImageArgs,
    buildVideoArgs,
    imageCodecFor,
    imageQualityPresets,
    imageQualityRange,
    type CompressOptions,
    type CompressProbe,
} from "$lib/compress";

// the compress worker probes the input (duration, resolution, bitrates),
// builds the ffmpeg args from the chosen preset / custom target, and
// encodes. video and audio encode once; a custom target on an image runs
// a short encode-adjust loop until the output fits under the target.

const videoExts = new Set(["mp4", "m4v", "mov", "mkv"]);
const audioExts = new Set(["mp3", "m4a", "m4b", "opus", "ogg", "oga", "weba"]);

const kindFor = (ext: string): "video" | "audio" | "image" | undefined => {
    if (videoExts.has(ext)) return "video";
    if (audioExts.has(ext)) return "audio";
    if (["jpg", "webp", "avif"].includes(ext)) return "image";
    return undefined;
}

const probeInfo = (info: any): CompressProbe => {
    const video = info?.streams?.find((s: any) => s.codec_type === "video");
    const audio = info?.streams?.find((s: any) => s.codec_type === "audio");

    return {
        duration: Number(info?.format?.duration) || undefined,
        width: video?.width,
        height: video?.height,
        hasAudio: !!audio,
        videoBitrate: video?.bit_rate ? Number(video.bit_rate) : undefined,
        audioBitrate: audio?.bit_rate ? Number(audio.bit_rate) : undefined,
    };
}

const compress = async (files: File[], options: CompressOptions, output: FileInfo) => {
    if (!(files && output && options)) {
        self.postMessage({
            cobaltCompressWorker: {
                error: "queue.ffmpeg.no_args",
            }
        });
        return;
    }

    const ff = new LibAVWrapper((progress) => {
        self.postMessage({
            cobaltCompressWorker: {
                progress: {
                    durationProcessed: progress.out_time_sec,
                    speed: progress.speed,
                    size: progress.total_size,
                    currentFrame: progress.frame,
                    fps: progress.fps,
                }
            }
        })
    });

    ff.init({ variant: "encode", yesthreads: true });

    const error = (code: string) => {
        self.postMessage({
            cobaltCompressWorker: {
                error: code,
            }
        });
        ff.terminate();
    }

    try {
        const file = files[0];
        if (!file) {
            return error("queue.ffmpeg.probe_failed");
        }

        let file_info;
        try {
            file_info = await ff.probe(file);
        } catch (e) {
            console.error("error from compress worker @ probe:", e);
            if (e instanceof Error && e?.message?.toLowerCase().includes("out of memory")) {
                return error("queue.ffmpeg.out_of_memory");
            }
            return error("queue.ffmpeg.probe_failed");
        }

        if (!file_info?.format) {
            return error("queue.ffmpeg.no_input_format");
        }

        const probe = probeInfo(file_info);

        self.postMessage({
            cobaltCompressWorker: {
                progress: {
                    duration: probe.duration || 0,
                }
            }
        });

        const ext = options.outputExt;
        const kind = kindFor(ext);

        if (!kind) {
            return error("compress.no_encoder");
        }

        const render = (args: string[]) => ff.render({ files, output, args });

        if (kind === "image" && options.preset === "custom" && options.targetMb) {
            const inputExt = file.name.split(".").pop()?.toLowerCase();
            const animated = inputExt === "gif" && ext === "webp";

            // animated gif inputs become animated webp (no frame limit)
            const codec = ext === "jpg" ? "mjpeg" : ext === "webp" ? "libwebp" : "libaom-av1";
            const range = imageQualityRange[codec];
            const [worst, best] = range;

            const targetBytes = options.targetMb * 1024 * 1024;
            const ratio = Math.min(1, Math.max(0.1, targetBytes / (file.size || 1)));

            // quality estimate between the two ends of the range
            let q = Math.round(best + (worst - best) * (1 - ratio));
            q = Math.min(Math.max(worst, q), best);

            let kept: File | null = null;
            let smallest: File | null = null;
            let smallestSize = Infinity;

            for (let i = 0; i < 6; i++) {
                let result: File | undefined;
                try {
                    result = await render(buildImageArgs(options, q, animated));
                } catch (e) {
                    console.error("error from compress worker @ image render:", e);
                    break;
                }

                if (!result) break;
                if (result.size < smallestSize) {
                    smallestSize = result.size;
                    smallest = result;
                }

                if (result.size <= targetBytes) {
                    kept = result;
                    // under target: try raising quality towards `best`
                    const next = Math.round((q + best) / 2);
                    if (next === q) break;
                    q = next;
                } else {
                    // over target: drop quality towards `worst`
                    const next = Math.round((q + worst) / 2);
                    if (next === q) break;
                    q = next;
                }
            }

            if (kept || smallest) {
                await ff.terminate();
                self.postMessage({
                    cobaltCompressWorker: {
                        render: kept || smallest,
                    }
                });
                return;
            }

            return error("queue.ffmpeg.crashed");
        }

        let args: string[];

        try {
            if (kind === "video") {
                args = buildVideoArgs(probe, options);
            } else if (kind === "audio") {
                args = buildAudioArgs(probe, options);
            } else {
                const inputExt = file.name.split(".").pop()?.toLowerCase();
                const animated = inputExt === "gif" && ext === "webp";
                const preset = options.preset === "custom" ? "medium" : options.preset;
                const codec = imageCodecFor(ext);
                if (!codec) {
                    return error("compress.no_encoder");
                }
                const q = imageQualityPresets[codec]?.[preset] ?? 15;
                args = buildImageArgs(options, q, animated);
            }
        } catch (e) {
            console.error("error from compress worker @ args:", e);
            return error(e instanceof Error ? e.message : "queue.ffmpeg.crashed");
        }

        let renderResult;
        try {
            renderResult = await render(args);
        } catch (e) {
            console.error("error from the compress worker @ render:", e);
            return error("queue.ffmpeg.crashed");
        }

        if (!renderResult) {
            return error("queue.ffmpeg.no_render");
        }

        await ff.terminate();

        self.postMessage({
            cobaltCompressWorker: {
                render: renderResult
            }
        });
    } catch (e) {
        console.error("error from the compress worker:", e);
        return error("queue.ffmpeg.crashed");
    }
}

self.onmessage = async (event: MessageEvent) => {
    const ed = event.data.cobaltCompressWorker;
    if (ed?.files && ed?.options && ed?.output) {
        await compress(ed.files, ed.options, ed.output);
    }
}
