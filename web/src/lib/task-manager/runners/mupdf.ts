// like the other engines, the worker is a separate iife chunk that's only
// loaded when a mupdf conversion actually starts (it then dynamically
// imports mupdf.js from static/_mupdf, keeping the ~10mb wasm out of the
// page load entirely)
import MupdfWorker from "$lib/task-manager/workers/mupdf?worker";

import { killWorker } from "$lib/task-manager/run-worker";
import { pipelineTaskDone, itemError, queue } from "$lib/state/task-manager/queue";

import type { FileInfo } from "$lib/types/libav";
import type { CobaltQueue, UUID } from "$lib/types/queue";

export const runMupdfWorker = async (
    workerId: UUID,
    parentId: UUID,
    file: File,
    from: string | undefined,
    output: FileInfo,
) => {
    const worker = new MupdfWorker();

    const unsubscribe = queue.subscribe((queue: CobaltQueue) => {
        if (!queue[parentId]) {
            killWorker(worker, unsubscribe);
        }
    });

    worker.postMessage({
        cobaltMupdfWorker: {
            files: [file],
            from,
            output,
        }
    });

    worker.onerror = (e) => {
        console.error("mupdf worker crashed:", e);
        killWorker(worker, unsubscribe);

        return itemError(parentId, workerId, "queue.generic_error");
    };

    worker.onmessage = (event) => {
        const eventData = event.data.cobaltMupdfWorker;
        if (!eventData) return;

        if (eventData.render) {
            killWorker(worker, unsubscribe);
            return pipelineTaskDone(
                parentId,
                workerId,
                eventData.render,
            );
        }

        if (eventData.error) {
            killWorker(worker, unsubscribe);
            return itemError(parentId, workerId, eventData.error);
        }
    };
}
