import * as wasiShim from "@bjorn3/browser_wasi_shim";
import { makeZip } from "client-zip";

import type { FileInfo } from "$lib/types/libav";

type PandocEntries = Map<string, PandocFsEntry>;

interface PandocFile {
    data: Uint8Array;
    type: "file";
}

interface PandocFolder {
    entries: PandocEntries;
    type: "folder";
}

type PandocFsEntry = PandocFile | PandocFolder;

let wasm: ArrayBuffer | undefined;

const load = async () => {
    if (wasm) return;
    wasm = await fetch("/pandoc.wasm").then(r => r.arrayBuffer());
}

const pandocFormat = (ext: string) => {
    switch (ext) {
        case "md":
        case "markdown":
            return "markdown";
        case "doc":
        case "docx":
            return "docx";
        case "csv":
            return "csv";
        case "tsv":
            return "tsv";
        case "json":
            return "json";
        case "rst":
            return "rst";
        case "epub":
            return "epub";
        case "odt":
            return "odt";
        case "rtf":
            return "rtf";
        case "docbook":
            return "docbook";
        case "html":
            return "html";
    }

    return undefined;
}

const convert = async (file: File, from: string | undefined, output: FileInfo) => {
    if (!output?.format) {
        self.postMessage({ cobaltPandocWorker: { error: "queue.ffmpeg.no_args" } });
        return;
    }

    const error = (code: string) => {
        self.postMessage({ cobaltPandocWorker: { error: code } });
    }

    try {
        await load();

        const to = pandocFormat(output.format);
        const fromFmt = from ? pandocFormat(from) : "markdown";

        if (!to || !fromFmt) {
            return error("queue.ffmpeg.no_output_format");
        }

        // rtf output isn't supported by the pandoc wasm build
        if (to === "rtf") {
            return error("queue.ffmpeg.crashed");
        }

        const buf = new Uint8Array(await file.arrayBuffer());
        const args = `-f ${fromFmt} -t ${to} --extract-media=.`;

        const [result, media] = await runPandoc(args, buf, to);

        let finalBytes = result;
        if (media.size) {
            const files = [...media.entries()].map(([name, entry]) => {
        if (entry.type === "folder") {
            return pandocToZipFiles(entry.entries, name);
        }
        return new File([new Uint8Array(entry.data)], name);
            }).flat();

            const zip = makeZip(files, "output.zip");
            const reader = zip.getReader();
            const chunks: Uint8Array[] = [];
            let done = false;
            while (!done) {
                const { done: d, value } = await reader.read();
                if (value) chunks.push(value);
                done = d;
            }
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            finalBytes = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                finalBytes.set(chunk, offset);
                offset += chunk.length;
            }
        }

        if (!finalBytes?.length) {
            return error("queue.ffmpeg.no_render");
        }

        const resultFile = new File([new Uint8Array(finalBytes)], `output.${output.format}`, {
            type: output.type,
        });

        self.postMessage({ cobaltPandocWorker: { render: resultFile } });
    } catch (e) {
        console.error("error from the pandoc worker:");
        console.error(e);
        return error("queue.ffmpeg.crashed");
    }
}

const runPandoc = async (
    argsStr: string,
    inData: Uint8Array,
    outExt: string,
): Promise<[Uint8Array, PandocEntries]> => {
    const inFile = new wasiShim.File(inData, { readonly: true });
    const outFile = new wasiShim.File(new Uint8Array(), { readonly: false });
    const map = new Map<string, wasiShim.File>([
        ["in", inFile],
        ["out", outFile],
    ]);
    const root = new wasiShim.PreopenDirectory("/", map);

    const fds = [
        new wasiShim.OpenFile(new wasiShim.File(new Uint8Array(), { readonly: true })),
        wasiShim.ConsoleStdout.lineBuffered(() => {}),
        wasiShim.ConsoleStdout.lineBuffered(() => {}),
        root,
        new wasiShim.PreopenDirectory("/tmp", new Map()),
    ];

    const wasi = new wasiShim.WASI(
        ["pandoc.wasm", "+RTS", "-H64m", "-RTS"],
        [],
        fds,
        { debug: false },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { instance }: { instance: any } = await WebAssembly.instantiate(wasm as ArrayBuffer, {
        wasi_snapshot_preview1: wasi.wasiImport,
    });

    wasi.initialize(instance);
    instance.exports.__wasm_call_ctors();

    const memoryView = () => new DataView(instance.exports.memory.buffer);

    // args: pandoc.wasm +RTS -H64m -RTS
    const args = ["pandoc.wasm", "+RTS", "-H64m", "-RTS"];
    const argcPtr = instance.exports.malloc(4);
    memoryView().setUint32(argcPtr, args.length, true);
    const argv = instance.exports.malloc(4 * (args.length + 1));
    for (let i = 0; i < args.length; ++i) {
        const arg = instance.exports.malloc(args[i].length + 1);
        new TextEncoder().encodeInto(args[i], new Uint8Array(instance.exports.memory.buffer, arg, args[i].length));
        memoryView().setUint8(arg + args[i].length, 0);
        memoryView().setUint32(argv + 4 * i, arg, true);
    }
    memoryView().setUint32(argv + 4 * args.length, 0, true);
    const argvPtr = instance.exports.malloc(4);
    memoryView().setUint32(argvPtr, argv, true);

    instance.exports.hs_init_with_rtsopts(argcPtr, argvPtr);

    const argsPtr = instance.exports.malloc(argsStr.length);
    new TextEncoder().encodeInto(argsStr, new Uint8Array(instance.exports.memory.buffer, argsPtr, argsStr.length));

    instance.exports.wasm_main(argsPtr, argsStr.length);

    // collect everything written to the virtual filesystem
    // (pandoc writes the output to /out and extracted media to folders)
    const openedPath = (root.dir as unknown as { path_open: (a: number, b: bigint, c: number) => { fd_obj: wasiShim.Fd } }).path_open(0, BigInt(0), 0).fd_obj;
    const dirRet = openedPath.path_lookup(".", 0);
    const dir = dirRet.inode_obj;
    const media = new Map<string, PandocFsEntry>();

    if (dir) {
        const opened = (dir as unknown as { path_open: (a: number, b: bigint, c: number) => { fd_obj: wasiShim.Fd } }).path_open(0, BigInt(0), 0).fd_obj;
        if (opened) {
            const fs = readRecursive(opened);
            for (const [name, entry] of fs) {
                if (name !== "in" && name !== "out") {
                    media.set(name, entry);
                }
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void outExt;

    return [outFile.data, media];
}

const readRecursive = (fd: wasiShim.Fd): PandocEntries => {
    const entries = new Map<string, PandocFsEntry>();
    const stat = fd.fd_filestat_get().filestat;
    if (!stat) return entries;

    const dir = (fd.path_lookup(".", 0).inode_obj as unknown as {
        contents: Map<string, wasiShim.File | wasiShim.Directory>;
    });
    if (!dir) return entries;

    for (const [name, entry] of readRecursiveInternal(dir.contents)) {
        entries.set(name, entry);
    }

    return entries;
}

const readRecursiveInternal = (
    contents: Map<string, wasiShim.File | wasiShim.Directory>,
): PandocEntries => {
    const entries = new Map<string, PandocFsEntry>();
    for (const [name, entry] of contents) {
        if (entry instanceof wasiShim.File) {
            entries.set(name, { data: new Uint8Array(entry.data), type: "file" });
        } else {
            const folder = entry as unknown as { contents: Map<string, wasiShim.File | wasiShim.Directory> };
            entries.set(name, {
                entries: readRecursiveInternal(folder.contents),
                type: "folder",
            });
        }
    }
    return entries;
}

const pandocToZipFiles = (entries: PandocEntries, parent = ""): File[] => {
    const flattened: File[] = [];

    for (const [name, entry] of entries) {
        const fullPath = parent ? `${parent}/${name}` : name;

        if (entry.type === "folder") {
            flattened.push(...pandocToZipFiles(entry.entries, fullPath));
        } else {
            flattened.push(new File([new Uint8Array(entry.data)], fullPath));
        }
    }

    return flattened;
}

self.onmessage = async (event: MessageEvent) => {
    const ed = event.data.cobaltPandocWorker;
    if (ed?.files && ed?.output) {
        await convert(ed.files[0], ed.from, ed.output);
    }
}
