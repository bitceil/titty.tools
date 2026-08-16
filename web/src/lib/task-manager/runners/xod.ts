import XodWorker from "$lib/task-manager/workers/xod?worker";

import { killWorker } from "$lib/task-manager/run-worker";
import { pipelineTaskDone, itemError, queue } from "$lib/state/task-manager/queue";

import type { FileInfo } from "$lib/types/libav";
import type { CobaltQueue, UUID } from "$lib/types/queue";

export const runXodWorker = async (
    workerId: UUID,
    parentId: UUID,
    file: File,
    password: string,
    output: FileInfo,
) => {
    const worker = new XodWorker();

    const unsubscribe = queue.subscribe((queue: CobaltQueue) => {
        if (!queue[parentId]) {
            killWorker(worker, unsubscribe);
        }
    });

    worker.postMessage({
        cobaltXodWorker: {
            files: [file],
            password,
            output,
        }
    });

    worker.onerror = (e) => {
        console.error("xod worker crashed:", e);
        killWorker(worker, unsubscribe);

        return itemError(parentId, workerId, "queue.generic_error");
    };

    worker.onmessage = (event) => {
        const eventData = event.data.cobaltXodWorker;
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
