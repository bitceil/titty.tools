import { writable } from "svelte/store";

// value of the text input in the currently shown dialog (used by the xod
// password prompt). dialog buttons read it via get(dialogInputValue), and
// the caller resets it before opening the dialog.
export const dialogInputValue = writable("");
