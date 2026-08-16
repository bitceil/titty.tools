import { writable } from "svelte/store";

// the api instance selected by probing, or undefined before selection
// (or when a custom instance is in use)
export default writable<string | undefined>();
