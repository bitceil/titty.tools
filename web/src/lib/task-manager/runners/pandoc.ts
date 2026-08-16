import PandocWorker from "$lib/task-manager/workers/pandoc?worker";

import { killWorker } from "$lib/task-manager/run-worker";
import { pipelineTaskDone, itemError, queue } from "$lib/state/task-manager/queue";

import type { FileInfo } from "$lib/types/libav";
import type { CobaltQueue, UUID } from "$lib/types/queue";

export const runPandocWorker = async (
    workerId: UUID,
    parentId: UUID,
    file: File,
    from: string | undefined,
    output: FileInfo,
) => {
    const worker = new PandocWorker();

    const unsubscribe = queue.subscribe((queue: CobaltQueue) => {
        if (!queue[parentId]) {
            killWorker(worker, unsubscribe);
        }
    });

    worker.postMessage({
        cobaltPandocWorker: {
            files: [file],
            from,
            output,
        }
    });

    worker.onerror = (e) => {
        console.error("pandoc worker crashed:", e);
        killWorker(worker, unsubscribe);

        return itemError(parentId, workerId, "queue.generic_error");
    };

    worker.onmessage = (event) => {
        const eventData = event.data.cobaltPandocWorker;
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
