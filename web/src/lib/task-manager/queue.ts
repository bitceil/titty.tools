import { get } from "svelte/store";
import { t } from "$lib/i18n/translations";
import { ffmpegMetadataArgs } from "$lib/util";
import { createDialog } from "$lib/state/dialogs";
import { addItem } from "$lib/state/task-manager/queue";
import { openQueuePopover } from "$lib/state/queue-visibility";
import { uuid } from "$lib/util";

import { getConvertArgs, getFileCategory, isFFmpegReadableImage, type ConvertFormat } from "$lib/convert/formats";

import type { CobaltQueueItem } from "$lib/types/queue";
import type { CobaltCurrentTasks } from "$lib/types/task-manager";
import { resultFileTypes, type CobaltPipelineItem, type CobaltPipelineResultFileType } from "$lib/types/workers";
import type { CobaltLocalProcessingResponse, CobaltSaveRequestBody } from "$lib/types/api";

export const getMediaType = (type: string) => {
    const kind = type.split('/')[0] as CobaltPipelineResultFileType;

    if (resultFileTypes.includes(kind)) {
        return kind;
    }
}

export const createConvertPipeline = (file: File, format: ConvertFormat, password?: string) => {
    const parentId = uuid();
    const baseName = file.name.replace(/\.[^./]+$/, "") || "converted";
    const inputExt = file.name.split(".").pop()?.toLowerCase();
    const inputCategory = getFileCategory(file);

    const output = {
        type: format.mime,
        format: format.ext,
    };

    let pipeline: CobaltPipelineItem[];

    if (format.engine === "xod") {
        // xod is an encrypted xps: decrypt it with the password the user
        // entered in the prompt, output the plain xps
        pipeline = [{
            worker: "xod",
            workerId: uuid(),
            parentId,
            workerArgs: {
                files: [file],
                password: password || "",
                output,
            },
        }];
    } else if (format.engine === "pandoc") {
        pipeline = [{
            worker: "pandoc",
            workerId: uuid(),
            parentId,
            workerArgs: {
                files: [file],
                from: inputExt,
                output,
            },
        }];
    } else if (format.engine === "magick") {
        if (inputCategory === "image") {
            // magick reads the image directly
            pipeline = [{
                worker: "magick",
                workerId: uuid(),
                parentId,
                workerArgs: {
                    files: [file],
                    from: inputExt,
                    output,
                },
            }];
        } else {
            // video/audio input: ffmpeg extracts a frame as png, then
            // magick converts that frame to the target format
            const extract = {
                worker: "encode" as const,
                workerId: uuid(),
                parentId,
                workerArgs: {
                    files: [file],
                    ffargs: ["-an", "-frames:v", "1", "-c:v", "png"],
                    output: { type: "image/png", format: "png" },
                },
            };

            pipeline = [
                extract,
                {
                    worker: "magick",
                    workerId: uuid(),
                    parentId,
                    dependsOn: [extract.workerId],
                    workerArgs: {
                        files: [],
                        from: "png",
                        output,
                    },
                },
            ];
        }
    } else {
        if (inputCategory === "image" && !isFFmpegReadableImage(file)) {
            // magick-only image (psd, raw, ...): magick rasterizes to png,
            // then ffmpeg encodes the video
            const rasterize = {
                worker: "magick" as const,
                workerId: uuid(),
                parentId,
                workerArgs: {
                    files: [file],
                    from: inputExt,
                    output: { type: "image/png", format: "png" },
                },
            };

            pipeline = [
                rasterize,
                {
                    worker: "encode",
                    workerId: uuid(),
                    parentId,
                    dependsOn: [rasterize.workerId],
                    workerArgs: {
                        files: [],
                        ffargs: getConvertArgs(format, inputCategory || "video"),
                        output,
                    },
                },
            ];
        } else {
            pipeline = [{
                worker: "encode",
                workerId: uuid(),
                parentId,
                workerArgs: {
                    files: [file],
                    ffargs: getConvertArgs(format, inputCategory || "video"),
                    output,
                },
            }];
        }
    }

    addItem({
        id: parentId,
        state: "waiting",
        pipeline,
        filename: `${baseName}.${format.ext}`,
        mimeType: format.mime,
        mediaType: getMediaType(format.mime) || "file",
    });

    openQueuePopover();
}

export const createRemuxPipeline = (file: File) => {
    const parentId = uuid();
    const mediaType = getMediaType(file.type);

    const pipeline: CobaltPipelineItem[] = [{
        worker: "remux",
        workerId: uuid(),
        parentId,
        workerArgs: {
            files: [file],
            ffargs: [
                "-c", "copy",
                "-map", "0"
            ],
            output: {
                type: file.type,
                format: file.name.split(".").pop(),
            },
        },
    }];

    if (mediaType) {
        addItem({
            id: parentId,
            state: "waiting",
            pipeline,
            filename: file.name,
            mimeType: file.type,
            mediaType,
        });

        openQueuePopover();
    }
}

const makeRemuxArgs = (info: CobaltLocalProcessingResponse) => {
    const ffargs = ["-c:v", "copy"];

    if (["merge", "remux"].includes(info.type)) {
        ffargs.push("-c:a", "copy");
    } else if (info.type === "mute") {
        ffargs.push("-an");
    }

    if (info.output.subtitles) {
        ffargs.push(
            "-c:s",
            info.output.filename.endsWith(".mp4") ? "mov_text" : "webvtt"
        );
    }

    ffargs.push(
        ...(info.output.metadata ? ffmpegMetadataArgs(info.output.metadata) : [])
    );

    return ffargs;
}

const makeAudioArgs = (info: CobaltLocalProcessingResponse) => {
    if (!info.audio) {
        return;
    }

    const ffargs = [];

    if (info.audio.cover && info.audio.format === "mp3") {
        ffargs.push(
            "-map", "0",
            "-map", "1",
            ...(info.audio.cropCover ? [
                "-c:v", "mjpeg",
                "-vf", "scale=-1:720,crop=720:720",
            ] : [
                "-c:v", "copy",
            ]),
        );
    } else {
        ffargs.push("-vn");
    }

    ffargs.push(
        ...(info.audio.copy ? ["-c:a", "copy"] : ["-b:a", `${info.audio.bitrate}k`]),
        ...(info.output.metadata ? ffmpegMetadataArgs(info.output.metadata) : [])
    );

    if (info.audio.format === "mp3" && info.audio.bitrate === "8") {
        ffargs.push("-ar", "12000");
    }

    if (info.audio.format === "opus") {
        ffargs.push("-vbr", "off")
    }

    const outFormat = info.audio.format === "m4a" ? "ipod" : info.audio.format;

    ffargs.push('-f', outFormat);
    return ffargs;
}

const makeGifArgs = () => {
    return [
        "-vf",
        "scale=-1:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        "-loop", "0",
        "-f", "gif"
    ];
}

const showError = (errorCode: string) => {
    return createDialog({
        id: "pipeline-error",
        type: "small",
        mascot: "error",
        buttons: [
            {
                text: get(t)("button.gotit"),
                main: true,
                action: () => {},
            },
        ],
        bodyText: get(t)(`error.${errorCode}`),
    });
}

export const createSavePipeline = (
    info: CobaltLocalProcessingResponse,
    request: CobaltSaveRequestBody,
    oldTaskId?: string
) => {
    // this is a pre-queue part of processing,
    // so errors have to be returned via a regular dialog

    if (!info.output?.filename || !info.output?.type) {
        return showError("pipeline.missing_response_data");
    }

    const parentId = oldTaskId || uuid();
    const pipeline: CobaltPipelineItem[] = [];

    // reverse is needed for audio (second item) to be downloaded first
    const tunnels = info.tunnel.reverse();

    for (const tunnel of tunnels) {
        pipeline.push({
            worker: "fetch",
            workerId: uuid(),
            parentId,
            workerArgs: {
                url: tunnel,
            },
        });
    }

    if (info.type !== "proxy") {
        let ffargs: string[];
        let workerType: 'encode' | 'remux';

        if (["merge", "mute", "remux"].includes(info.type)) {
            workerType = "remux";
            ffargs = makeRemuxArgs(info);
        } else if (info.type === "audio") {
            const args = makeAudioArgs(info);

            if (!args) {
                return showError("pipeline.missing_response_data");
            }

            workerType = "encode";
            ffargs = args;
        } else if (info.type === "gif") {
            workerType = "encode";
            ffargs = makeGifArgs();
        } else {
            console.error("unknown work type: " + info.type);
            return showError("pipeline.missing_response_data");
        }

        pipeline.push({
            worker: workerType,
            workerId: uuid(),
            parentId,
            dependsOn: pipeline.map(w => w.workerId),
            workerArgs: {
                files: [],
                ffargs,
                output: {
                    type: info.output.type,
                    format: info.output.filename.split(".").pop(),
                },
            },
        });
    }

    addItem({
        id: parentId,
        state: "waiting",
        pipeline,
        canRetry: true,
        originalRequest: request,
        filename: info.output.filename,
        mimeType: info.output.type,
        mediaType: getMediaType(info.output.type) || "file",
    });

    openQueuePopover();
}

export const getProgress = (item: CobaltQueueItem, currentTasks: CobaltCurrentTasks): number => {
    if (item.state === 'done' || item.state === 'error') {
        return 1;
    } else if (item.state === 'waiting') {
        return 0;
    }

    let sum = 0;
    for (const worker of item.pipeline) {
        if (item.pipelineResults[worker.workerId]) {
            sum += 1;
        } else {
            const task = currentTasks[worker.workerId];
            sum += (task?.progress?.percentage || 0) / 100;
        }
    }

    return sum / item.pipeline.length;
}
