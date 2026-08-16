import type { FileInfo } from "$lib/types/libav";

// mupdf engine: reads xps, pdf, epub, mobi, fb2, cbz and txt.
//
// everything runs through tt-mupdf, a custom build of mupdf proper compiled
// to wasm with two exports: convert-to-pdf (a real vector pdf, text stays
// selectable and fonts embedded) and render-page (png/jpg). using mupdf
// proper instead of the stock mupdf.js wasm matters for xps: the stock
// build drops xps vector content entirely (images only, no text) and counts
// PDFTron's embedded thumbnails as pages.
//
// the wasm can't be bundled by vite (its loader uses top-level await and
// code splitting, and the project's workers are iife), so the files live in
// static/_mupdf and are imported at runtime on first use. that also keeps
// the ~10mb wasm out of the page load entirely: nothing downloads until an
// actual mupdf conversion starts.

type TtMupdfModule = {
    _malloc: (bytes: number) => number;
    _free: (ptr: number) => void;
    _tt_convert_to_pdf: (input: number, len: number, outLenPtr: number) => number;
    _tt_render_page: (input: number, len: number, page: number, scale: number, format: number, outLenPtr: number) => number;
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

// copy input into the wasm heap, run fn(inPtr, inLen, outLenPtr), then
// copy the result out and free everything
const runConvert = async (
    m: TtMupdfModule,
    data: Uint8Array,
    fn: (inPtr: number, inLen: number, outLenPtr: number) => number,
): Promise<Uint8Array<ArrayBuffer> | null> => {
    const lenPtr = m._malloc(8);
    const inPtr = m._malloc(data.length);
    m.HEAPU8.set(data, inPtr);

    try {
        const outPtr = fn(inPtr, data.length, lenPtr);
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

// 300dpi keeps rasterized text crisp (150dpi looked soft)
const RENDER_SCALE = 300 / 72;

const convert = async (file: File, output: FileInfo) => {
    if (!output?.format) {
        self.postMessage({ cobaltMupdfWorker: { error: "queue.ffmpeg.no_args" } });
        return;
    }

    const error = (code: string) => {
        self.postMessage({ cobaltMupdfWorker: { error: code } });
    }

    try {
        const m = await getTtModule();
        const data = new Uint8Array(await file.arrayBuffer());

        let bytes: Uint8Array<ArrayBuffer> | null = null;

        if (output.format === "pdf") {
            bytes = await runConvert(m, data, (inPtr, inLen, lenPtr) =>
                m._tt_convert_to_pdf(inPtr, inLen, lenPtr));
        } else if (output.format === "png" || output.format === "jpg") {
            const format = output.format === "png" ? 0 : 1;
            bytes = await runConvert(m, data, (inPtr, inLen, lenPtr) =>
                m._tt_render_page(inPtr, inLen, 0, RENDER_SCALE, format, lenPtr));
        } else {
            return error("queue.ffmpeg.no_output_format");
        }

        if (!bytes?.length) {
            return error("queue.ffmpeg.no_render");
        }

        const result = new File([bytes], `output.${output.format}`, {
            type: output.type,
        });
        self.postMessage({ cobaltMupdfWorker: { render: result } });
    } catch (e) {
        console.error("error from the mupdf worker:");
        console.error(e);
        return error("queue.mupdf.failed");
    }
}

self.onmessage = async (event: MessageEvent) => {
    const ed = event.data.cobaltMupdfWorker;
    if (ed?.files && ed?.output) {
        await convert(ed.files[0], ed.output);
    }
}
