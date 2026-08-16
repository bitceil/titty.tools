import type * as Mupdf from "mupdf";

import type { FileInfo } from "$lib/types/libav";

// mupdf engine: reads xps, pdf, epub, mobi, fb2, cbz and txt.
//
// two wasm builds are used:
//   - pdf output goes through tt-mupdf, a custom build of mupdf proper
//     compiled to wasm with a single convert-to-pdf export. it produces a
//     real vector pdf (text stays selectable, fonts embedded) for every
//     input mupdf reads, and correctly renders xps text -- the stock
//     mupdf.js wasm drops xps vector content entirely (images only) and
//     counts PDFTron's embedded thumbnails as pages.
//   - png/jpg page renders stay on mupdf.js.
//
// neither build can be bundled by vite (the wasm loaders use top-level
// await and code splitting, and the project's workers are iife), so the
// files live in static/_mupdf and are imported at runtime on first use.
// that also keeps the ~10mb wasm out of the page load entirely: nothing
// downloads until an actual mupdf conversion starts.

// --- tt-mupdf: real mupdf wasm, converts any readable document to pdf ---

type TtMupdfModule = {
    _malloc: (bytes: number) => number;
    _free: (ptr: number) => void;
    _tt_convert_to_pdf: (input: number, len: number, outLenPtr: number) => number;
    _tt_free: (ptr: number) => void;
    HEAPU8: Uint8Array<ArrayBuffer>;
    HEAPU32: Uint32Array;
};

type TtMupdfFactory = () => Promise<TtMupdfModule>;

let ttFactory: TtMupdfFactory | undefined;
let ttModule: Promise<TtMupdfModule> | undefined;

const getTtModule = (): Promise<TtMupdfModule> => {
    if (!ttModule) {
        ttModule = (async () => {
            if (!ttFactory) {
                const url = "/_mupdf/tt-mupdf.js";
                ttFactory = (await import(/* @vite-ignore */ url)).default as TtMupdfFactory;
            }
            return ttFactory();
        })();
    }
    return ttModule;
}

const convertToPdf = async (file: File): Promise<Uint8Array<ArrayBuffer> | null> => {
    const m = await getTtModule();
    const data = new Uint8Array(await file.arrayBuffer());

    const lenPtr = m._malloc(8);
    const inPtr = m._malloc(data.length);
    m.HEAPU8.set(data, inPtr);

    try {
        const outPtr = m._tt_convert_to_pdf(inPtr, data.length, lenPtr);
        const outLen = m.HEAPU32[lenPtr >> 2];
        if (!outPtr || !outLen) return null;

        // copy: heap bytes type as ArrayBufferLike, which BlobPart rejects
        const result = new Uint8Array(m.HEAPU8.slice(outPtr, outPtr + outLen));
        m._tt_free(outPtr);
        return result;
    } finally {
        m._free(lenPtr);
        m._free(inPtr);
    }
}

// --- mupdf.js: page renders (png/jpg) ---

let mupdf: typeof Mupdf | undefined;

const load = async (): Promise<typeof Mupdf> => {
    if (!mupdf) {
        const url = "/_mupdf/mupdf.js";
        mupdf = await import(/* @vite-ignore */ url) as typeof Mupdf;
    }
    return mupdf;
}

// 300dpi keeps rasterized text crisp (150dpi looked soft)
const RENDER_SCALE = 300 / 72;

const renderPage = (m: typeof Mupdf, page: Mupdf.Page, format: "png" | "jpg") => {
    const pm = page.toPixmap(
        m.Matrix.scale(RENDER_SCALE, RENDER_SCALE),
        m.ColorSpace.DeviceRGB,
    );

    // copy: pixmap bytes type as ArrayBufferLike, which BlobPart rejects
    const bytes = new Uint8Array(format === "png" ? pm.asPNG() : pm.asJPEG(90));
    pm.destroy();
    return bytes;
}

const convert = async (file: File, from: string | undefined, output: FileInfo) => {
    if (!output?.format) {
        self.postMessage({ cobaltMupdfWorker: { error: "queue.ffmpeg.no_args" } });
        return;
    }

    const error = (code: string) => {
        self.postMessage({ cobaltMupdfWorker: { error: code } });
    }

    try {
        if (output.format === "pdf") {
            const pdf = await convertToPdf(file);
            if (!pdf?.length) {
                return error("queue.ffmpeg.no_render");
            }

            const result = new File([pdf], `output.${output.format}`, {
                type: output.type,
            });
            self.postMessage({ cobaltMupdfWorker: { render: result } });
            return;
        }

        if (output.format === "png" || output.format === "jpg") {
            const m = await load();
            const buf = new Uint8Array(await file.arrayBuffer());
            const doc = m.Document.openDocument(buf, from);
            try {
                const page = doc.loadPage(0);
                const bytes = renderPage(m, page, output.format);
                page.destroy();

                const result = new File([bytes], `output.${output.format}`, {
                    type: output.type,
                });
                self.postMessage({ cobaltMupdfWorker: { render: result } });
            } finally {
                doc.destroy();
            }
            return;
        }

        return error("queue.ffmpeg.no_output_format");
    } catch (e) {
        console.error("error from the mupdf worker:");
        console.error(e);
        return error("queue.mupdf.failed");
    }
}

self.onmessage = async (event: MessageEvent) => {
    const ed = event.data.cobaltMupdfWorker;
    if (ed?.files && ed?.output) {
        await convert(ed.files[0], ed.from, ed.output);
    }
}
