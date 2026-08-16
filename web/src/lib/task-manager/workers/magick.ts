import {
    initializeImageMagick,
    MagickImage,
    MagickFormat,
    MagickReadSettings,
} from "@imagemagick/magick-wasm";
import magickWasm from "@imagemagick/magick-wasm/magick.wasm?url";

import type { FileInfo } from "$lib/types/libav";

// MagickFormat members are PascalCase (Png, Svg, ...) with a few
// exceptions like jpg -> Jpeg and webp -> WebP
const formatKey = (ext: string) => {
    if (ext === "jpg" || ext === "jpeg") return "Jpeg";
    if (ext === "webp") return "WebP";
    return ext.charAt(0).toUpperCase() + ext.slice(1);
}

let initialized = false;

const init = async () => {
    if (initialized) return;

    const wasm = await fetch(magickWasm).then(r => r.arrayBuffer());
    await initializeImageMagick(wasm);
    initialized = true;
}

const convert = async (files: File[], from: string | undefined, output: FileInfo) => {
    if (!files?.[0] || !output?.format) {
        self.postMessage({ cobaltMagickWorker: { error: "queue.ffmpeg.no_args" } });
        return;
    }

    const error = (code: string) => {
        self.postMessage({ cobaltMagickWorker: { error: code } });
    }

    try {
        await init();

        const file = files[0];
        const bytes = new Uint8Array(await file.arrayBuffer());
        const format = MagickFormat[formatKey(output.format) as keyof typeof MagickFormat];

        if (!format) {
            return error("queue.ffmpeg.no_output_format");
        }

        // some formats (svg, psd, raw camera files) can't be reliably
        // detected from magic bytes, so hint the decoder when we know it
        const fromFormat = from
            ? MagickFormat[formatKey(from) as keyof typeof MagickFormat]
            : undefined;
        const settings = fromFormat
            ? new MagickReadSettings({ format: fromFormat })
            : undefined;

        const image = MagickImage.create(bytes, settings);

        // ico/cur can't exceed 256x256, so scale down first
        if ((output.format === "ico" || output.format === "cur")
            && (image.width > 256 || image.height > 256)) {
            const scale = 256 / Math.max(image.width, image.height);
            image.resize(
                Math.max(1, Math.round(image.width * scale)),
                Math.max(1, Math.round(image.height * scale)),
            );
        }

        // copy the bytes inside the callback: `data` is a view into the
        // wasm memory that gets reused as soon as write() returns
        const rendered = image.write(format, (data) => new Uint8Array(data));
        image.dispose();

        if (!rendered?.length) {
            return error("queue.ffmpeg.no_render");
        }

        const result = new File([new Uint8Array(rendered)], `output.${output.format}`, {
            type: output.type,
        });

        self.postMessage({ cobaltMagickWorker: { render: result } });
    } catch (e) {
        console.error("error from the magick worker:");
        console.error(e);
        return error("queue.ffmpeg.crashed");
    }
}

self.onmessage = async (event: MessageEvent) => {
    const ed = event.data.cobaltMagickWorker;
    if (ed?.files && ed?.output) {
        await convert(ed.files, ed.from, ed.output);
    }
}
