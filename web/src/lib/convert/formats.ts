// output formats for the in-browser file converter.
// only formats whose encoders/muxers are actually present in the libav.js
// encode build (@imput/libav.js-encode-cli) are listed here, verified by
// running `ffmpeg -encoders` / `-muxers` against that build.

export type ConvertCategory = "video" | "audio" | "image";

export type ConvertFormat = {
    ext: string,
    mime: string,
    category: ConvertCategory,
    // shown in the format picker, defaults to the extension in uppercase
    label?: string,
    // ffmpeg args passed before the output filename (the worker appends it)
    args: string[],
    // args used when the input file is a video (e.g. animated gif needs a
    // palette filter instead of a frame grab)
    videoArgs?: string[],
    // args used when the input file is an image
    imageArgs?: string[],
}

const videoFormats: ConvertFormat[] = [
    {
        ext: "mp4",
        mime: "video/mp4",
        category: "video",
        args: ["-c:v", "libopenh264", "-c:a", "aac"],
    },
    {
        ext: "mov",
        mime: "video/quicktime",
        category: "video",
        args: ["-c:v", "libopenh264", "-c:a", "aac"],
    },
    {
        ext: "mkv",
        mime: "video/x-matroska",
        category: "video",
        args: ["-c:v", "libopenh264", "-c:a", "libopus"],
    },
    {
        ext: "webm",
        mime: "video/webm",
        category: "video",
        // no vp8/vp9 in the wasm build, so webm rides on AV1 (slow but works)
        args: ["-c:v", "libaom-av1", "-c:a", "libopus"],
    },
    {
        ext: "avi",
        mime: "video/x-msvideo",
        category: "video",
        args: ["-c:v", "mjpeg", "-c:a", "pcm_s16le"],
    },
    {
        ext: "m4v",
        mime: "video/mp4",
        category: "video",
        args: ["-c:v", "libopenh264", "-c:a", "aac"],
    },
    {
        ext: "mov",
        mime: "video/quicktime",
        category: "video",
        label: "MOV (ProRes)",
        args: ["-c:v", "prores", "-c:a", "pcm_s16le"],
    },
];

const audioFormats: ConvertFormat[] = [
    {
        ext: "mp3",
        mime: "audio/mpeg",
        category: "audio",
        args: ["-vn", "-c:a", "libmp3lame", "-q:a", "2"],
    },
    {
        ext: "m4a",
        mime: "audio/mp4",
        category: "audio",
        args: ["-vn", "-c:a", "aac"],
    },
    {
        ext: "opus",
        mime: "audio/ogg",
        category: "audio",
        args: ["-vn", "-c:a", "libopus"],
    },
    {
        ext: "ogg",
        mime: "audio/ogg",
        category: "audio",
        args: ["-vn", "-c:a", "libvorbis"],
    },
    {
        ext: "flac",
        mime: "audio/flac",
        category: "audio",
        args: ["-vn", "-c:a", "flac"],
    },
    {
        ext: "wav",
        mime: "audio/wav",
        category: "audio",
        args: ["-vn", "-c:a", "pcm_s16le"],
    },
    {
        ext: "m4a",
        mime: "audio/mp4",
        category: "audio",
        label: "M4A (ALAC)",
        args: ["-vn", "-c:a", "alac"],
    },
    {
        ext: "m4b",
        mime: "audio/mp4",
        category: "audio",
        args: ["-vn", "-c:a", "aac"],
    },
    {
        ext: "weba",
        mime: "audio/webm",
        category: "audio",
        args: ["-vn", "-c:a", "libopus"],
    },
    {
        ext: "oga",
        mime: "audio/ogg",
        category: "audio",
        args: ["-vn", "-c:a", "libvorbis"],
    },
];

const imageFormats: ConvertFormat[] = [
    {
        ext: "png",
        mime: "image/png",
        category: "image",
        args: ["-an", "-frames:v", "1", "-c:v", "png"],
    },
    {
        ext: "jpg",
        mime: "image/jpeg",
        category: "image",
        args: ["-an", "-frames:v", "1", "-c:v", "mjpeg", "-q:v", "2"],
    },
    {
        ext: "webp",
        mime: "image/webp",
        category: "image",
        args: ["-an", "-frames:v", "1", "-c:v", "libwebp", "-q:v", "80"],
    },
    {
        ext: "bmp",
        mime: "image/bmp",
        category: "image",
        args: ["-an", "-frames:v", "1", "-c:v", "bmp"],
    },
    {
        ext: "tiff",
        mime: "image/tiff",
        category: "image",
        args: ["-an", "-frames:v", "1", "-c:v", "tiff"],
    },
    {
        ext: "avif",
        mime: "image/avif",
        category: "image",
        args: ["-an", "-frames:v", "1", "-c:v", "libaom-av1", "-still-picture", "1"],
    },
    {
        ext: "gif",
        mime: "image/gif",
        category: "image",
        // static gif from an image, animated palette gif from a video
        imageArgs: ["-an", "-frames:v", "1", "-c:v", "gif"],
        videoArgs: [
            "-vf",
            "fps=15,scale=-1:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
            "-loop", "0",
        ],
        args: ["-an", "-frames:v", "1", "-c:v", "gif"],
    },
    {
        ext: "ico",
        mime: "image/x-icon",
        category: "image",
        args: ["-an", "-frames:v", "1", "-c:v", "png"],
    },
];

export const convertFormats: ConvertFormat[] = [
    ...videoFormats,
    ...audioFormats,
    ...imageFormats,
];

// extensions commonly used for media files that don't carry a mime type,
// mapped to the category they belong to
const extCategories: Record<string, ConvertCategory> = {
    mp4: "video", m4v: "video", mov: "video", mkv: "video", webm: "video",
    avi: "video", ts: "video", m2ts: "video", flv: "video", wmv: "video",
    mpg: "video", mpeg: "video", "3gp": "video", ogv: "video",

    mp3: "audio", m4a: "audio", m4b: "audio", aac: "audio", opus: "audio",
    ogg: "audio", oga: "audio", weba: "audio", flac: "audio", wav: "audio",
    alac: "audio", wma: "audio", aiff: "audio", aif: "audio",

    png: "image", jpg: "image", jpeg: "image", webp: "image", bmp: "image",
    tiff: "image", tif: "image", avif: "image", gif: "image", ico: "image",
    svg: "image",
};

// figure out what a file is, using the mime type when available and
// falling back to the file extension
export const getFileCategory = (file: File): ConvertCategory | undefined => {
    const mimeCategory = file.type.split("/")[0];
    if (["video", "audio", "image"].includes(mimeCategory)) {
        return mimeCategory as ConvertCategory;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext) {
        return extCategories[ext];
    }
}

// what a file can be converted into depends on what it is:
// videos can become other videos, audio tracks, or still images;
// audio and image files stay within their own category
const outputCategoriesForInput: Record<ConvertCategory, ConvertCategory[]> = {
    video: ["video", "audio", "image"],
    audio: ["audio"],
    image: ["image"],
};

export const getFormatsForInputCategory = (category: ConvertCategory) =>
    convertFormats.filter(f =>
        outputCategoriesForInput[category].includes(f.category)
    );

// formats that every one of the given files can be converted to
// (the intersection of each file's applicable formats)
export const getSharedFormats = (files: File[]) => {
    const categories = files
        .map(getFileCategory)
        .filter((c): c is ConvertCategory => !!c);

    if (!categories.length) {
        return [];
    }

    const formatSets = categories.map(c => getFormatsForInputCategory(c));
    return convertFormats.filter(f =>
        formatSets.every(set => set.includes(f))
    );
}

// ffmpeg args for a conversion, taking the input file's category into
// account (e.g. animated vs static gif)
export const getConvertArgs = (format: ConvertFormat, inputCategory: ConvertCategory) => {
    if (inputCategory === "video" && format.videoArgs) {
        return format.videoArgs;
    }
    if (inputCategory === "image" && format.imageArgs) {
        return format.imageArgs;
    }
    return format.args;
}
