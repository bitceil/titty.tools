import { get } from "svelte/store";

import settings from "$lib/state/settings";
import activeApiURL from "$lib/state/active-api";
import { getApiCandidates } from "$lib/api/api-url";

type ProbeResult = {
    origin: string,
    latency: number,
    cpuUsage: number,
}

// weight for cpu usage in the score: a fully loaded core costs roughly
// 100ms of latency, so both factors influence the choice comparably
const cpuWeight = 100;

const probeApi = async (origin: string): Promise<ProbeResult> => {
    const start = performance.now();

    const response = await fetch(`${origin}/healthz`, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
    });

    const latency = performance.now() - start;

    if (!response.ok) {
        throw new Error(`unreachable (${response.status})`);
    }

    const data = await response.json().catch(() => ({}));
    const load = data?.cpu?.load?.[0] ?? 0;
    const cores = data?.cpu?.cores ?? 1;

    return {
        origin,
        latency,
        cpuUsage: load / cores,
    };
}

const score = (result: ProbeResult) => result.latency + result.cpuUsage * cpuWeight;

// probes all candidate apis (default + fallbacks) and picks the best one
// based on latency and cpu usage. runs at most once per session: the
// selection is stored, and custom instances skip probing entirely.
export const selectApi = async () => {
    const processingSettings = get(settings).processing;
    if (processingSettings.enableCustomInstances && processingSettings.customInstanceURL.length > 0) {
        activeApiURL.set(undefined);
        return;
    }

    if (get(activeApiURL)) {
        return;
    }

    const candidates = getApiCandidates();
    if (candidates.length <= 1) {
        activeApiURL.set(candidates[0]);
        return;
    }

    const results = await Promise.allSettled(candidates.map(probeApi));

    const healthy = results
        .filter((r): r is PromiseFulfilledResult<ProbeResult> => r.status === "fulfilled")
        .map(r => r.value);

    if (healthy.length === 0) {
        // nothing reachable: stick with the primary instance
        activeApiURL.set(candidates[0]);
        return;
    }

    healthy.sort((a, b) => score(a) - score(b));
    activeApiURL.set(healthy[0].origin);
}
