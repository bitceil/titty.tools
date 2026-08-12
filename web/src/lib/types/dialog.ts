import type { CobaltFileUrlType } from "$lib/types/api";
import type { TitEmotions } from "$lib/types/tit";

export type DialogButton = {
    text: string,
    color?: "red",
    main: boolean,
    timeout?: number, // milliseconds
    action: () => unknown | Promise<unknown>,
    link?: string
}

export type SmallDialogIcons = "warn-red";

export type DialogPickerItem = {
    type?: 'photo' | 'video' | 'gif',
    url: string,
    thumb?: string,
}

type Dialog = {
    id: string,
    dismissable?: boolean,
};

type SmallDialog = Dialog & {
    type: "small",
    mascot?: TitEmotions,
    icon?: SmallDialogIcons,
    title?: string,
    bodyText?: string,
    bodySubText?: string,
    buttons?: DialogButton[],
    leftAligned?: boolean,
};

type PickerDialog = Dialog & {
    type: "picker",
    items?: DialogPickerItem[],
    buttons?: DialogButton[],
};

type SavingDialog = Dialog & {
    type: "saving",
    bodyText?: string,
    url?: string,
    file?: File,
    urlType?: CobaltFileUrlType,
};

export type DialogInfo = SmallDialog | PickerDialog | SavingDialog;
