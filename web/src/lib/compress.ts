// in-browser compression for the compress tab.
//
// video rides libopenh264 (h264): the only sane video encoder in the
// libav.js encode build (no vp8/vp9, av1 is far too slow for video).
// audio and images use the same encoders as the convert tab.
//
// presets map to bitrate tiers scaled by resolution (video) or
// quality/bitrate values (audio, image). the custom preset targets a
// max output size in MB: video/audio compute the bitrate from the
// probed duration with a safety margin so the output stays under the
// target; images run an encode-adjust loop in the worker instead.
//
// the output format follows the input where the container can hold an
// efficient encode (mp4 -> mp4, jpg -> jpg, mp3 -> mp3) and switches
// only when it can't (webm/avi -> mp4, wav/flac -> m4a, png/bmp ->
// webp, gif -> animated webp).

export type CompressPreset = "low" | "medium" | "high" | "custom";
export type CompressKind = "video" | "audio" | "image";

export type CompressOptions = {
    preset: CompressPreset,
    // custom preset: max output size per file, in MB
    targetMb?: number,
    stripMetadata: boolean,
    // decided on the main thread by compressFormatFor()
    outputExt: string,
    outputMime: string,
}

export type CompressProbe = {
    duration?: number,
    width?: number,
    height?: number,
    hasAudio?: boolean,
    videoBitrate?: number,
    audioBitrate?: number,
}

// output format for a file: same container when it can hold h264+aac
// (video), or the same lossy codec (audio/image); switch otherwise
export const compressFormatFor = (file: File): { ext: string, mime: string } | undefined => {
    const kind = file.type.split("/")[0];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (kind === "video") {
        const same = ["mp4", "mov", "m4v", "mkv"].includes(ext);
        if (same) {
            return {
                ext,
                mime: ext === "mkv"
                    ? "video/x-matroska"
                    : ext === "mov"
                        ? "video/quicktime"
                        : "video/mp4",
            };
        }
        // webm/avi/ts/... can't hold h264 (or the container is pointless
        // to recompress), so they all land in mp4
        return { ext: "mp4", mime: "video/mp4" };
    }

    if (kind === "audio") {
        const same = ["mp3", "m4a", "m4b", "opus", "ogg", "oga", "weba"];
        if (same.includes(ext)) {
            const mimes: Record<string, string> = {
                mp3: "audio/mpeg",
                m4a: "audio/mp4",
                m4b: "audio/mp4",
                opus: "audio/ogg",
                ogg: "audio/ogg",
                oga: "audio/ogg",
                weba: "audio/webm",
            };
            return { ext, mime: mimes[ext] };
        }
        // lossless/raw (wav, flac, aiff, alac, wma, ...) -> lossy aac
        return { ext: "m4a", mime: "audio/mp4" };
    }

    if (kind === "image") {
        if (ext === "gif") {
            // animated webp keeps the animation and shrinks a lot
            return { ext: "webp", mime: "image/webp" };
        }
        const same = ["jpg", "jpeg", "webp", "avif"];
        if (same.includes(ext)) {
            const mimes: Record<string, string> = {
                jpg: "image/jpeg",
                jpeg: "image/jpeg",
                webp: "image/webp",
                avif: "image/avif",
            };
            return { ext: ext === "jpeg" ? "jpg" : ext, mime: mimes[ext] };
        }
        // lossless rasters (png, bmp, tiff) -> lossy webp
        return { ext: "webp", mime: "image/webp" };
    }

    return undefined;
}

export const compressKindFor = (file: File): CompressKind | undefined => {
    const kind = file.type.split("/")[0];
    if (kind === "video" || kind === "audio" || kind === "image") {
        return kind;
    }
    return undefined;
}

// is this file ffmpeg-readable for compression? (the compress tab only
// accepts inputs the libav encode build can decode directly)
const compressibleImageExts = new Set(["png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "avif", "gif"]);
const compressibleVideoExts = new Set(["mp4", "m4v", "mov", "mkv", "webm", "avi", "ts", "m2ts", "flv", "wmv", "mpg", "mpeg", "3gp", "ogv"]);
const compressibleAudioExts = new Set(["mp3", "m4a", "m4b", "aac", "opus", "ogg", "oga", "weba", "flac", "wav", "wma", "aiff", "aif", "alac"]);

export const isCompressible = (file: File) => {
    const kind = file.type.split("/")[0];
    if (kind === "video" || kind === "audio") {
        return true;
    }
    if (kind === "image") {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        return compressibleImageExts.has(ext)
            || ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/tiff", "image/gif", "image/avif"].includes(file.type);
    }
    return false;
}

// extensions used by the file picker / drop receiver
export const compressAcceptTypes = [
    "video/*",
    "audio/*",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/gif",
    "image/avif",
];

export const compressAcceptExtensions = [
    // video
    "mp4", "m4v", "mov", "mkv", "webm", "avi", "ts", "m2ts", "flv", "wmv",
    "mpg", "mpeg", "3gp", "ogv",
    // audio
    "mp3", "m4a", "m4b", "aac", "opus", "ogg", "oga", "weba", "flac", "wav",
    "wma", "aiff", "aif", "alac",
    // images
    "png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "avif", "gif",
];

// ---------------------------------------------------------------------------
// preset tables (verified against the libav.js encode build)
// ---------------------------------------------------------------------------

// h264 bitrate (kbps) by resolution tier, keyed by max height
const videoBitrateTiers: Record<Exclude<CompressPreset, "custom">, [number, number][]> = {
    low:    [[2160, 5000], [1440, 3500], [1080, 2000], [720, 1200], [480, 700], [360, 450], [0, 300]],
    medium: [[2160, 10000], [1440, 7000], [1080, 4000], [720, 2400], [480, 1400], [360, 900], [0, 600]],
    high:   [[2160, 20000], [1440, 14000], [1080, 8000], [720, 4800], [480, 2800], [360, 1800], [0, 1200]],
}

// audio bitrate (kbps) per codec
const audioBitratePresets: Record<string, Record<Exclude<CompressPreset, "custom">, number>> = {
    aac:         { low: 64, medium: 128, high: 192 },
    libmp3lame:  { low: 96, medium: 160, high: 224 },
    libopus:     { low: 64, medium: 96, high: 128 },
    libvorbis:   { low: 96, medium: 160, high: 224 },
}

// image quality per codec. mjpeg's q:v is 2-31 (lower = better), webp's
// q:v is 0-100 (higher = better), avif's crf is higher = worse
export const imageQualityPresets: Record<string, Record<Exclude<CompressPreset, "custom">, number>> = {
    mjpeg:       { low: 25, medium: 15, high: 7 },
    libwebp:     { low: 50, medium: 70, high: 85 },
    "libaom-av1": { low: 45, medium: 38, high: 30 },
}

// quality bounds for the custom image encode-adjust loop, per codec.
// [worst, best] for the parameter that controls quality
export const imageQualityRange: Record<string, [number, number]> = {
    mjpeg:       [31, 2],   // q:v: lower = better
    libwebp:     [20, 95],  // q:v: higher = better
    "libaom-av1": [55, 20], // crf: lower = better
}

const videoContainerAudio: Record<string, string> = {
    mp4: "aac",
    m4v: "aac",
    mov: "aac",
    mkv: "libopus",
}

const audioCodecFor = (ext: string): { codec: string, maxBitrate: number } | undefined => {
    switch (ext) {
        case "mp3": return { codec: "libmp3lame", maxBitrate: 320 };
        case "m4a":
        case "m4b": return { codec: "aac", maxBitrate: 512 };
        case "opus": return { codec: "libopus", maxBitrate: 510 };
        case "ogg":
        case "oga": return { codec: "libvorbis", maxBitrate: 500 };
        case "weba": return { codec: "libopus", maxBitrate: 510 };
        default: return undefined;
    }
}

export const imageCodecFor = (ext: string): string | undefined => {
    switch (ext) {
        case "jpg": return "mjpeg";
        case "webp": return "libwebp";
        case "avif": return "libaom-av1";
        default: return undefined;
    }
}

const resolutionBitrate = (preset: Exclude<CompressPreset, "custom">, height?: number) => {
    const tiers = videoBitrateTiers[preset];
    for (const [maxHeight, bitrate] of tiers) {
        if (!height || height >= maxHeight) {
            return bitrate;
        }
    }
    return tiers[tiers.length - 1][1];
}

// never grow a stream: if the input bitrate is known, cap the target at
// 85% of it (the other 15% is the compression headroom)
const capAtInput = (bitrateKbps: number, inputBitrate?: number) => {
    if (inputBitrate && inputBitrate > 0) {
        return Math.min(bitrateKbps, Math.max(32, (inputBitrate / 1000) * 0.85));
    }
    return bitrateKbps;
}

// audio bitrate for a video's audio track (or a pure audio file):
// preset value, unless the input audio is already lower (then keep a
// slightly lower version of it instead of growing it)
const audioBitrateFor = (codec: string, preset: Exclude<CompressPreset, "custom">, inputBitrate?: number) => {
    const target = audioBitratePresets[codec]?.[preset] ?? 128;
    return Math.round(capAtInput(target, inputBitrate));
}

// ---------------------------------------------------------------------------
// ffmpeg argument builders
// ---------------------------------------------------------------------------

const metadataArgs = (strip: boolean) => strip ? ["-map_metadata", "-1"] : [];

export const buildVideoArgs = (probe: CompressProbe, options: CompressOptions): string[] => {
    const audioCodec = videoContainerAudio[options.outputExt] || "aac";
    const args = ["-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn"];

    let videoBitrateKbps: number;

    if (options.preset === "custom" && options.targetMb) {
        const duration = probe.duration;
        if (!duration || duration <= 0) {
            throw new Error("compress.no_duration");
        }

        const audioKbps = audioBitrateFor(audioCodec, "medium", probe.audioBitrate);
        const targetBytes = options.targetMb * 1024 * 1024;
        const audioBytes = (probe.hasAudio ? audioKbps * 1000 / 8 : 0) * duration;
        // 12% safety margin so the output lands under the target
        const videoBytes = Math.max(0, targetBytes - audioBytes) * 0.88;

        videoBitrateKbps = (videoBytes * 8) / duration / 1000;
        videoBitrateKbps = Math.min(videoBitrateKbps, options.targetMb * 1024 * 1024 * 8 / duration / 1000);
    } else {
        const preset = options.preset === "custom" ? "medium" : options.preset;
        videoBitrateKbps = resolutionBitrate(preset, probe.height);
    }

    videoBitrateKbps = Math.round(capAtInput(videoBitrateKbps, probe.videoBitrate));
    videoBitrateKbps = Math.max(100, Math.min(50000, videoBitrateKbps));

    args.push(
        "-c:v", "libopenh264",
        "-b:v", `${videoBitrateKbps}k`,
        "-maxrate", `${Math.round(videoBitrateKbps * 1.25)}k`,
        "-bufsize", `${Math.round(videoBitrateKbps * 2.5)}k`,
    );

    if (probe.hasAudio) {
        const audioKbps = options.preset === "custom"
            ? audioBitrateFor(audioCodec, "medium", probe.audioBitrate)
            : audioBitrateFor(audioCodec, options.preset, probe.audioBitrate);
        args.push("-c:a", audioCodec, "-b:a", `${Math.round(audioKbps)}k`);
    } else {
        args.push("-an");
    }

    args.push(...metadataArgs(options.stripMetadata));
    return args;
}

export const buildAudioArgs = (probe: CompressProbe, options: CompressOptions): string[] => {
    const info = audioCodecFor(options.outputExt);
    if (!info) {
        throw new Error("compress.no_encoder");
    }

    const args = ["-vn"];
    let bitrateKbps: number;

    if (options.preset === "custom" && options.targetMb) {
        const duration = probe.duration;
        if (!duration || duration <= 0) {
            throw new Error("compress.no_duration");
        }

        const targetBytes = options.targetMb * 1024 * 1024;
        bitrateKbps = (targetBytes * 8) / duration / 1000 * 0.88;
        bitrateKbps = Math.max(32, Math.min(info.maxBitrate, bitrateKbps));
        bitrateKbps = capAtInput(bitrateKbps, probe.audioBitrate);
    } else {
        const preset = options.preset === "custom" ? "medium" : options.preset;
        bitrateKbps = audioBitratePresets[info.codec]?.[preset] ?? 128;
        bitrateKbps = capAtInput(bitrateKbps, probe.audioBitrate);
    }

    args.push("-c:a", info.codec, "-b:a", `${Math.round(bitrateKbps)}k`);

    // libav can't pick a muxer from the .weba extension
    if (options.outputExt === "weba") {
        args.push("-f", "webm");
    }

    args.push(...metadataArgs(options.stripMetadata));
    return args;
}

// image args with an explicit quality parameter (used by the preset
// path and the custom encode-adjust loop). animated gif inputs become
// animated webp (no frame limit, -loop 0)
export const buildImageArgs = (
    options: CompressOptions,
    quality: number,
    animated: boolean,
): string[] => {
    const codec = imageCodecFor(options.outputExt);
    if (!codec) {
        throw new Error("compress.no_encoder");
    }

    const args = ["-an"];

    if (animated && options.outputExt === "webp") {
        args.push("-loop", "0");
    } else {
        args.push("-frames:v", "1");
    }

    args.push("-c:v", codec);

    if (codec === "libaom-av1") {
        args.push("-still-picture", "1", "-crf", String(quality));
    } else {
        args.push("-q:v", String(quality));
    }

    args.push(...metadataArgs(options.stripMetadata));
    return args;
}
