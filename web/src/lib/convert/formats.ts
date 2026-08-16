// output formats for the in-browser file converter, split by engine.
//
// - ffmpeg:  libav.js encode build (@imput/libav.js-encode-cli); video,
//            audio, and common image formats. only encoders/muxers actually
//            present in that build are listed, verified by running
//            `ffmpeg -encoders` / `-muxers` against it.
// - magick:  @imagemagick/magick-wasm; additional image formats (psd, jxl,
//            hdr, ...) plus vector/print outputs (svg, eps, pdf) and the
//            raster formats when the input needs magick to read it (psd,
//            raw camera files, ...). inputs needing external delegates
//            (inkscape for svg, ghostscript for pdf/eps) are unsupported.
// - pandoc:  pandoc.wasm (haskell compiled to wasi); document formats.
//            rtf output is not supported by that build.

export type ConvertCategory = "video" | "audio" | "image" | "document";
export type ConvertEngine = "ffmpeg" | "magick" | "pandoc";

export type ConvertFormat = {
    ext: string,
    mime: string,
    category: ConvertCategory,
    engine: ConvertEngine,
    // shown in the format picker, defaults to the extension in uppercase
    label?: string,
    // ffmpeg args passed before the output filename (the worker appends it)
    args?: string[],
    // args used when the input file is a video (e.g. animated gif needs a
    // palette filter instead of a frame grab)
    videoArgs?: string[],
    // args used when the input file is an image
    imageArgs?: string[],
    // magick-only: maximum output dimension (e.g. 256 for ico/cur)
    clampSize?: number,
    // magick-only: duplicates an ffmpeg raster output (png, jpg, ...).
    // only offered when the input needs magick to read it, so the picker
    // doesn't show two buttons for the same format
    core?: boolean,
}

const ffmpegVideoFormats: ConvertFormat[] = [
    {
        ext: "mp4",
        mime: "video/mp4",
        category: "video",
        engine: "ffmpeg",
        args: ["-c:v", "libopenh264", "-c:a", "aac"],
    },
    {
        ext: "mov",
        mime: "video/quicktime",
        category: "video",
        engine: "ffmpeg",
        args: ["-c:v", "libopenh264", "-c:a", "aac"],
    },
    {
        ext: "mkv",
        mime: "video/x-matroska",
        category: "video",
        engine: "ffmpeg",
        args: ["-c:v", "libopenh264", "-c:a", "libopus"],
    },
    {
        ext: "webm",
        mime: "video/webm",
        category: "video",
        engine: "ffmpeg",
        // no vp8/vp9 in the wasm build, so webm rides on AV1 (slow but works)
        args: ["-c:v", "libaom-av1", "-c:a", "libopus"],
    },
    {
        ext: "avi",
        mime: "video/x-msvideo",
        category: "video",
        engine: "ffmpeg",
        args: ["-c:v", "mjpeg", "-c:a", "pcm_s16le"],
    },
    {
        ext: "m4v",
        mime: "video/mp4",
        category: "video",
        engine: "ffmpeg",
        args: ["-c:v", "libopenh264", "-c:a", "aac"],
    },
    {
        ext: "mov",
        mime: "video/quicktime",
        category: "video",
        engine: "ffmpeg",
        label: "MOV (ProRes)",
        args: ["-c:v", "prores", "-c:a", "pcm_s16le"],
    },
];

const ffmpegAudioFormats: ConvertFormat[] = [
    {
        ext: "mp3",
        mime: "audio/mpeg",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "libmp3lame", "-q:a", "2"],
    },
    {
        ext: "m4a",
        mime: "audio/mp4",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "aac"],
    },
    {
        ext: "opus",
        mime: "audio/ogg",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "libopus"],
    },
    {
        ext: "ogg",
        mime: "audio/ogg",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "libvorbis"],
    },
    {
        ext: "flac",
        mime: "audio/flac",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "flac"],
    },
    {
        ext: "wav",
        mime: "audio/wav",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "pcm_s16le"],
    },
    {
        ext: "m4a",
        mime: "audio/mp4",
        category: "audio",
        engine: "ffmpeg",
        label: "M4A (ALAC)",
        args: ["-vn", "-c:a", "alac"],
    },
    {
        ext: "m4b",
        mime: "audio/mp4",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "aac"],
    },
    {
        ext: "weba",
        mime: "audio/webm",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "libopus"],
    },
    {
        ext: "oga",
        mime: "audio/ogg",
        category: "audio",
        engine: "ffmpeg",
        args: ["-vn", "-c:a", "libvorbis"],
    },
];

const ffmpegImageFormats: ConvertFormat[] = [
    {
        ext: "png",
        mime: "image/png",
        category: "image",
        engine: "ffmpeg",
        args: ["-an", "-frames:v", "1", "-c:v", "png"],
    },
    {
        ext: "jpg",
        mime: "image/jpeg",
        category: "image",
        engine: "ffmpeg",
        args: ["-an", "-frames:v", "1", "-c:v", "mjpeg", "-q:v", "2"],
    },
    {
        ext: "webp",
        mime: "image/webp",
        category: "image",
        engine: "ffmpeg",
        args: ["-an", "-frames:v", "1", "-c:v", "libwebp", "-q:v", "80"],
    },
    {
        ext: "bmp",
        mime: "image/bmp",
        category: "image",
        engine: "ffmpeg",
        args: ["-an", "-frames:v", "1", "-c:v", "bmp"],
    },
    {
        ext: "tiff",
        mime: "image/tiff",
        category: "image",
        engine: "ffmpeg",
        args: ["-an", "-frames:v", "1", "-c:v", "tiff"],
    },
    {
        ext: "avif",
        mime: "image/avif",
        category: "image",
        engine: "ffmpeg",
        args: ["-an", "-frames:v", "1", "-c:v", "libaom-av1", "-still-picture", "1"],
    },
    {
        ext: "gif",
        mime: "image/gif",
        category: "image",
        engine: "ffmpeg",
        // static gif from an image, animated palette gif from a video
        imageArgs: ["-an", "-frames:v", "1", "-c:v", "gif"],
        videoArgs: [
            "-vf",
            "fps=15,scale=-1:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
            "-loop", "0",
        ],
        args: ["-an", "-frames:v", "1", "-c:v", "gif"],
    },
];

// additional image formats handled by ImageMagick wasm, verified with the
// installed build. formats needing external delegates for *reading* (svg,
// pdf, eps) are output-only; ico/cur are clamped to 256x256 (the libav
// ico muxer can't write anything bigger either, so ico lives here).
const magickImageFormats: ConvertFormat[] = [
    {
        ext: "psd",
        mime: "image/vnd.adobe.photoshop",
        category: "image",
        engine: "magick",
    },
    {
        ext: "jxl",
        mime: "image/jxl",
        category: "image",
        engine: "magick",
    },
    {
        ext: "hdr",
        mime: "image/vnd.radiance",
        category: "image",
        engine: "magick",
    },
    {
        ext: "mat",
        mime: "application/x-matlab-data",
        category: "image",
        engine: "magick",
    },
    {
        ext: "pfm",
        mime: "image/x-portable-bitmap",
        category: "image",
        engine: "magick",
    },
    {
        ext: "pnm",
        mime: "image/x-portable-anymap",
        category: "image",
        engine: "magick",
    },
    {
        ext: "ppm",
        mime: "image/x-portable-pixmap",
        category: "image",
        engine: "magick",
    },
    {
        ext: "pgm",
        mime: "image/x-portable-graymap",
        category: "image",
        engine: "magick",
    },
    {
        ext: "pbm",
        mime: "image/x-portable-bitmap",
        category: "image",
        engine: "magick",
    },
    {
        ext: "svg",
        mime: "image/svg+xml",
        category: "image",
        engine: "magick",
        label: "SVG (vector)",
    },
    {
        ext: "eps",
        mime: "application/postscript",
        category: "image",
        engine: "magick",
    },
    {
        ext: "pdf",
        mime: "application/pdf",
        category: "image",
        engine: "magick",
        label: "PDF",
    },
    {
        ext: "ico",
        mime: "image/x-icon",
        category: "image",
        engine: "magick",
        clampSize: 256,
    },
    {
        ext: "cur",
        mime: "image/x-icon",
        category: "image",
        engine: "magick",
        clampSize: 256,
    },
];

// raster outputs magick offers when the input can't be read by ffmpeg
// (psd, raw camera files, jxl, ...). marked `core` so they're hidden when
// ffmpeg already covers the same output for the input.
const magickCoreImageFormats: ConvertFormat[] = [
    { ext: "png", mime: "image/png", category: "image", engine: "magick", core: true },
    { ext: "jpg", mime: "image/jpeg", category: "image", engine: "magick", core: true },
    { ext: "webp", mime: "image/webp", category: "image", engine: "magick", core: true },
    { ext: "gif", mime: "image/gif", category: "image", engine: "magick", core: true },
    { ext: "tiff", mime: "image/tiff", category: "image", engine: "magick", core: true },
    { ext: "bmp", mime: "image/bmp", category: "image", engine: "magick", core: true },
    { ext: "avif", mime: "image/avif", category: "image", engine: "magick", core: true },
];

// document formats handled by pandoc wasm (rtf output is unsupported)
const pandocDocumentFormats: ConvertFormat[] = [
    {
        ext: "md",
        mime: "text/markdown",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "html",
        mime: "text/html",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "csv",
        mime: "text/csv",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "tsv",
        mime: "text/tab-separated-values",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "json",
        mime: "application/json",
        category: "document",
        engine: "pandoc",
        label: "JSON (Pandoc AST)",
    },
    {
        ext: "rst",
        mime: "text/x-rst",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "epub",
        mime: "application/epub+zip",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "odt",
        mime: "application/vnd.oasis.opendocument.text",
        category: "document",
        engine: "pandoc",
    },
    {
        ext: "docbook",
        mime: "application/xml",
        category: "document",
        engine: "pandoc",
    },
];

export const convertFormats: ConvertFormat[] = [
    ...ffmpegVideoFormats,
    ...ffmpegAudioFormats,
    ...ffmpegImageFormats,
    ...magickImageFormats,
    ...magickCoreImageFormats,
    ...pandocDocumentFormats,
];

// image extensions libav.js can decode; everything else with an image
// category is magick-only and gets the full magick output set
const ffmpegReadableImageExts = new Set([
    "png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "avif", "gif",
]);

// extensions commonly used for files that don't carry a mime type,
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
    cur: "image", psd: "image", jxl: "image", hdr: "image",
    mat: "image", pfm: "image", pnm: "image", ppm: "image", pgm: "image",
    pbm: "image",
    // raw camera + misc formats that magick can read but not write.
    // svg/pdf/eps are deliberately absent: reading them needs inkscape /
    // ghostscript, which aren't in the wasm build.
    dng: "image", cr2: "image", cr3: "image", nef: "image", arw: "image",
    rw2: "image", orf: "image", raf: "image", pef: "image", srw: "image",
    raw: "image", dcr: "image", crw: "image", erf: "image", mrw: "image",
    mef: "image", nrw: "image", mos: "image", heic: "image", heif: "image",
    xcf: "image",

    md: "document", markdown: "document", docx: "document", doc: "document",
    html: "document", csv: "document", tsv: "document", json: "document",
    rst: "document", epub: "document", odt: "document", docbook: "document",
    rtf: "document",
};

// figure out what a file is, using the mime type when available and
// falling back to the file extension
export const getFileCategory = (file: File): ConvertCategory | undefined => {
    // svg/pdf/eps need inkscape/ghostscript, which aren't in the wasm
    // build, so no engine can read them; leave them unsupported
    if (["image/svg+xml", "application/pdf", "application/postscript"].includes(file.type)) {
        return undefined;
    }

    const mimeCategory = file.type.split("/")[0];
    if (["video", "audio", "image"].includes(mimeCategory)) {
        return mimeCategory as ConvertCategory;
    }

    // pandoc reads markdown
    if (file.type === "text/markdown") {
        return "document";
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext) {
        return extCategories[ext];
    }
}

// what a file can be converted into depends on what it is:
// videos can become other videos, audio tracks, or still images;
// audio stays audio; images stay images (plus print/vector outputs);
// documents become other documents
const getFormatsForCategory = (category: ConvertCategory): ConvertFormat[] => {
    switch (category) {
        case "video":
            return convertFormats.filter(f =>
                f.engine === "ffmpeg"
                && ["video", "audio", "image"].includes(f.category)
            );
        case "audio":
            return convertFormats.filter(f =>
                f.engine === "ffmpeg" && f.category === "audio"
            );
        case "document":
            return convertFormats.filter(f =>
                f.engine === "pandoc" && f.category === "document"
            );
        case "image":
            // ffmpeg-readable inputs get ffmpeg's raster outputs plus
            // magick's unique ones; magick-only inputs (psd, raws, ...)
            // get the full magick set including the common rasters
            return convertFormats.filter(f => {
                if (f.category !== "image") return false;
                if (f.engine === "magick") return !f.core;
                return true;
            });
    }
}

const getFormatsForImage = (file: File): ConvertFormat[] => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const ffmpegReadable = ffmpegReadableImageExts.has(ext)
        || ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/tiff", "image/gif", "image/avif"].includes(file.type);

    return convertFormats.filter(f => {
        if (f.category !== "image") return false;
        if (f.engine === "magick") return ffmpegReadable ? !f.core : true;
        return ffmpegReadable;
    });
}

export const getFormatsForInput = (file: File): ConvertFormat[] => {
    const category = getFileCategory(file);
    if (!category) return [];

    if (category === "image") {
        return getFormatsForImage(file);
    }

    return getFormatsForCategory(category);
}

// formats that every one of the given files can be converted to
// (the intersection of each file's applicable formats)
export const getSharedFormats = (files: File[]) => {
    const formatSets = files
        .map(getFormatsForInput)
        .filter(set => set.length);

    if (!formatSets.length) {
        return [];
    }

    return convertFormats.filter(f =>
        formatSets.every(set => set.includes(f))
    );
}

// ffmpeg args for a conversion, taking the input file's category into
// account (e.g. animated vs static gif). only meaningful for ffmpeg
// formats; magick/pandoc build their own arguments from the extension.
export const getConvertArgs = (format: ConvertFormat, inputCategory: ConvertCategory) => {
    if (inputCategory === "video" && format.videoArgs) {
        return format.videoArgs;
    }
    if (inputCategory === "image" && format.imageArgs) {
        return format.imageArgs;
    }
    return format.args || [];
}
