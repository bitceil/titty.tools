import { type CobaltSettingsV6 } from "$lib/types/settings/v6";
import { fontOptions } from "$lib/types/settings/v2";

export type CobaltSettingsV7 = Omit<CobaltSettingsV6, 'schemaVersion' | 'appearance'> & {
    schemaVersion: 7,
    appearance: CobaltSettingsV6['appearance'] & {
        font: typeof fontOptions[number],
    },
};
