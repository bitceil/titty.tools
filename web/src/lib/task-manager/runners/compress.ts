import CompressWorker from "$lib/task-manager/workers/compress?worker";

import { killWorker } from "$lib/task-manager/run-worker";
import { updateWorkerProgress } from "$lib/state/task-manager/current-tasks";
import { pipelineTaskDone, itemError, queue } from "$lib/state/task-manager/queue";

import type { FileInfo } from "$lib/types/libav";
import type { CobaltQueue } from "$lib/types/queue";
import type { CompressOptions } from "$lib/compress";

let startAttempts = 0;

export const runCompressWorker = async (
    workerId: string,
    parentId: string,
    files: File[],
    options: CompressOptions,
    output: FileInfo,
    resetStartCounter = false,
) => {
    const worker = new CompressWorker();

    // same libav startup retry dance as the ffmpeg runner
    if (resetStartCounter) startAttempts = 0;

    let bumpAttempts = 0;
    const startCheck = setInterval(async () => {
        bumpAttempts++;

        if (bumpAttempts === 10) {
            startAttempts++;
            if (startAttempts <= 10) {
                killWorker(worker, unsubscribe, startCheck);
                return await runCompressWorker(
                    workerId, parentId,
                    files, options, output
                );
            } else {
                killWorker(worker, unsubscribe, startCheck);
                return itemError(parentId, workerId, "queue.worker_didnt_start");
            }
        }
    }, 500);

    const unsubscribe = queue.subscribe((queue: CobaltQueue) => {
        if (!queue[parentId]) {
            killWorker(worker, unsubscribe, startCheck);
        }
    });

    worker.postMessage({
        cobaltCompressWorker: {
            files,
            options,
            output,
        }
    });

    worker.onerror = (e) => {
        console.error("compress worker crashed:", e);
        killWorker(worker, unsubscribe, startCheck);

        return itemError(parentId, workerId, "queue.generic_error");
    };

    let totalDuration: number | null = null;

    worker.onmessage = (event) => {
        const eventData = event.data.cobaltCompressWorker;
        if (!eventData) return;

        clearInterval(startCheck);

        if (eventData.progress) {
            if (eventData.progress.duration) {
                totalDuration = eventData.progress.duration;
            }

            updateWorkerProgress(workerId, {
                percentage: totalDuration ? (eventData.progress.durationProcessed / totalDuration) * 100 : 0,
                size: eventData.progress.size,
            })
        }

        if (eventData.render) {
            killWorker(worker, unsubscribe, startCheck);
            return pipelineTaskDone(
                parentId,
                workerId,
                eventData.render,
            );
        }

        if (eventData.error) {
            killWorker(worker, unsubscribe, startCheck);
            return itemError(parentId, workerId, eventData.error);
        }
    };
}
