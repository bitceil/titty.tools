import type { FileInfo } from "$lib/types/libav";
import type { UUID } from "./queue";

export const resultFileTypes = ["video", "audio", "image", "file"] as const;

export type CobaltPipelineResultFileType = typeof resultFileTypes[number];

export type CobaltWorkerProgress = {
    percentage?: number,
    speed?: number,
    size: number,
};

type CobaltFFmpegWorkerArgs = {
    files: File[],
    ffargs: string[],
    output: FileInfo,
};

type CobaltPipelineItemBase = {
    workerId: UUID,
    parentId: UUID,
    dependsOn?: UUID[],
};

type CobaltRemuxPipelineItem = CobaltPipelineItemBase & {
    worker: "remux",
    workerArgs: CobaltFFmpegWorkerArgs,
}

type CobaltEncodePipelineItem = CobaltPipelineItemBase & {
    worker: "encode",
    workerArgs: CobaltFFmpegWorkerArgs,
}

type CobaltFetchPipelineItem = CobaltPipelineItemBase & {
    worker: "fetch",
    workerArgs: { url: string },
}

type CobaltMagickWorkerArgs = {
    files: File[],
    // input file extension, used as a format hint (svg, psd, raws...)
    from?: string,
    output: FileInfo,
}

type CobaltPandocWorkerArgs = CobaltMagickWorkerArgs;

type CobaltXodWorkerArgs = {
    files: File[],
    // password for the encrypted xod parts (asked for when the format
    // button is clicked, stored here so the worker can derive the keys)
    password: string,
    output: FileInfo,
}

type CobaltMupdfWorkerArgs = CobaltMagickWorkerArgs;

type CobaltCompressWorkerArgs = {
    files: File[],
    options: import("$lib/compress").CompressOptions,
    output: FileInfo,
}

type CobaltMagickPipelineItem = CobaltPipelineItemBase & {
    worker: "magick",
    workerArgs: CobaltMagickWorkerArgs,
}

type CobaltPandocPipelineItem = CobaltPipelineItemBase & {
    worker: "pandoc",
    workerArgs: CobaltPandocWorkerArgs,
}

type CobaltXodPipelineItem = CobaltPipelineItemBase & {
    worker: "xod",
    workerArgs: CobaltXodWorkerArgs,
}

type CobaltMupdfPipelineItem = CobaltPipelineItemBase & {
    worker: "mupdf",
    workerArgs: CobaltMupdfWorkerArgs,
}

type CobaltCompressPipelineItem = CobaltPipelineItemBase & {
    worker: "compress",
    workerArgs: CobaltCompressWorkerArgs,
}

export type CobaltPipelineItem = CobaltEncodePipelineItem
                               | CobaltRemuxPipelineItem
                               | CobaltFetchPipelineItem
                               | CobaltMagickPipelineItem
                               | CobaltPandocPipelineItem
                               | CobaltXodPipelineItem
                               | CobaltMupdfPipelineItem
                               | CobaltCompressPipelineItem;
