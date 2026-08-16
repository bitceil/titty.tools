import env from "$lib/env";
import { get } from "svelte/store";
import settings from "$lib/state/settings";
import activeApiURL from "$lib/state/active-api";

const isCustomInstance = () => {
    const processingSettings = get(settings).processing;
    return processingSettings.enableCustomInstances && processingSettings.customInstanceURL.length > 0;
}

// returns every api instance this frontend is allowed to use,
// primary first, then fallbacks (deduplicated)
export const getApiCandidates = () => {
    if (isCustomInstance()) {
        return [new URL(get(settings).processing.customInstanceURL).origin];
    }

    const primary = new URL(env.DEFAULT_API!).origin;
    const fallbacks = env.FALLBACK_APIS
        .map(u => new URL(u).origin)
        .filter(origin => origin !== primary);

    return [primary, ...fallbacks];
}

export const currentApiURL = () => {
    if (isCustomInstance()) {
        return new URL(get(settings).processing.customInstanceURL).origin;
    }

    return get(activeApiURL) ?? new URL(env.DEFAULT_API!).origin;
}
