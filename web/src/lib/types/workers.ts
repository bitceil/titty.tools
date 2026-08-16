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

type CobaltMagickPipelineItem = CobaltPipelineItemBase & {
    worker: "magick",
    workerArgs: CobaltMagickWorkerArgs,
}

type CobaltPandocPipelineItem = CobaltPipelineItemBase & {
    worker: "pandoc",
    workerArgs: CobaltPandocWorkerArgs,
}

export type CobaltPipelineItem = CobaltEncodePipelineItem
                               | CobaltRemuxPipelineItem
                               | CobaltFetchPipelineItem
                               | CobaltMagickPipelineItem
                               | CobaltPandocPipelineItem;
