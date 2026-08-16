import { get } from "svelte/store";
import { device } from "$lib/device";
import { queue, itemError } from "$lib/state/task-manager/queue";

import { runFFmpegWorker } from "$lib/task-manager/runners/ffmpeg";
import { runFetchWorker } from "$lib/task-manager/runners/fetch";
import { runMagickWorker } from "$lib/task-manager/runners/magick";
import { runPandocWorker } from "$lib/task-manager/runners/pandoc";
import { runXodWorker } from "$lib/task-manager/runners/xod";
import { runMupdfWorker } from "$lib/task-manager/runners/mupdf";

import type { CobaltPipelineItem } from "$lib/types/workers";

export const killWorker = (worker: Worker, unsubscribe: () => void, interval?: NodeJS.Timeout) => {
    unsubscribe();
    worker.terminate();
    if (interval) clearInterval(interval);
}

export const startWorker = async ({ worker, workerId, dependsOn, parentId, workerArgs }: CobaltPipelineItem) => {
    let files: File[] = [];

    switch (worker) {
        case "remux":
        case "encode": {
            if (workerArgs.files) {
                files = workerArgs.files;
            }

            const parent = get(queue)[parentId];
            if (parent?.state === "running" && dependsOn) {
                for (const workerId of dependsOn) {
                    const file = parent.pipelineResults[workerId];
                    if (!file) {
                        return itemError(parentId, workerId, "queue.ffmpeg.no_args");
                    }

                    files.push(file);
                }
            }

            if (files.length > 0 && workerArgs.ffargs && workerArgs.output) {
                await runFFmpegWorker(
                    workerId,
                    parentId,
                    files,
                    workerArgs.ffargs,
                    workerArgs.output,
                    worker,
                    device.supports.multithreading,
                    /*resetStartCounter=*/true,
                );
            } else {
                itemError(parentId, workerId, "queue.ffmpeg.no_args");
            }
            break;
        }

        case "fetch":
            await runFetchWorker(workerId, parentId, workerArgs.url);
            break;

        case "magick":
        case "pandoc": {
            if (workerArgs.files) {
                files = [...workerArgs.files];
            }

            const parent = get(queue)[parentId];
            if (parent?.state === "running" && dependsOn) {
                for (const workerId of dependsOn) {
                    const file = parent.pipelineResults[workerId];
                    if (!file) {
                        return itemError(parentId, workerId, "queue.ffmpeg.no_args");
                    }

                    files.push(file);
                }
            }

            if (files[0] && workerArgs.output) {
                if (worker === "magick") {
                    await runMagickWorker(
                        workerId,
                        parentId,
                        files[0],
                        workerArgs.from,
                        workerArgs.output,
                    );
                } else {
                    await runPandocWorker(
                        workerId,
                        parentId,
                        files[0],
                        workerArgs.from,
                        workerArgs.output,
                    );
                }
            } else {
                itemError(parentId, workerId, "queue.ffmpeg.no_args");
            }
            break;
        }

        case "xod": {
            if (workerArgs.files) {
                files = [...workerArgs.files];
            }

            if (files[0] && workerArgs.output) {
                await runXodWorker(
                    workerId,
                    parentId,
                    files[0],
                    workerArgs.password,
                    workerArgs.output,
                );
            } else {
                itemError(parentId, workerId, "queue.ffmpeg.no_args");
            }
            break;
        }

        case "mupdf": {
            if (workerArgs.files) {
                files = [...workerArgs.files];
            }

            const parent = get(queue)[parentId];
            if (parent?.state === "running" && dependsOn) {
                for (const workerId of dependsOn) {
                    const file = parent.pipelineResults[workerId];
                    if (!file) {
                        return itemError(parentId, workerId, "queue.ffmpeg.no_args");
                    }

                    files.push(file);
                }
            }

            if (files[0] && workerArgs.output) {
                await runMupdfWorker(
                    workerId,
                    parentId,
                    files[0],
                    workerArgs.from,
                    workerArgs.output,
                );
            } else {
                itemError(parentId, workerId, "queue.ffmpeg.no_args");
            }
            break;
        }
    }
}
