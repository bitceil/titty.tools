<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import { createCompressPipeline } from "$lib/task-manager/queue";
    import { queueVisible } from "$lib/state/queue-visibility";
    import {
        compressAcceptExtensions,
        compressAcceptTypes,
        compressFormatFor,
        compressKindFor,
        isCompressible,
        type CompressPreset,
    } from "$lib/compress";

    import DropReceiver from "$components/misc/DropReceiver.svelte";
    import FileReceiver from "$components/misc/FileReceiver.svelte";
    import BulletExplain from "$components/misc/BulletExplain.svelte";
    import Toggle from "$components/misc/Toggle.svelte";

    import IconMinimize from "@tabler/icons-svelte/IconMinimize.svelte";
    import IconInfoCircle from "@tabler/icons-svelte/IconInfoCircle.svelte";
    import IconDevices from "@tabler/icons-svelte/IconDevices.svelte";
    import IconFileImport from "@tabler/icons-svelte/IconFileImport.svelte";

    let draggedOver = false;
    let files: FileList | undefined;

    // per-file output format, decided by the same-format policy
    let outputs: { ext: string, mime: string }[] = [];
    let preset: CompressPreset = "medium";
    let targetMbText = "";
    let stripMetadata = false;

    // whole numbers between 1 and 2048 only; anything else (empty,
    // non-numeric, out of range) keeps the compress button disabled
    const parseTarget = (text: string): number | undefined => {
        if (!/^\d+$/.test(text)) return undefined;
        const n = Number(text);
        if (n < 1 || n > 2048) return undefined;
        return n;
    };

    $: targetMb = parseTarget(targetMbText);

    const stepTarget = (delta: number) => {
        const current = targetMb ?? 1;
        const next = Math.max(1, Math.min(2048, current + delta));
        targetMbText = String(next);
    };

    const onImport = async () => {
        // a new drop means the user wants to compress again, so hide the
        // queue popover that would otherwise cover the picker
        $queueVisible = false;

        if (!files?.length) {
            outputs = [];
            return;
        }

        outputs = Array.from(files)
            .filter(isCompressible)
            .map(compressFormatFor)
            .filter((f): f is { ext: string, mime: string } => !!f);
    };

    const outputExts = [...new Set(outputs.map(f => f.ext))];

    const compress = async () => {
        if (!files) return;

        const compressible = Array.from(files).filter(isCompressible);

        for (let i = 0; i < compressible.length; i++) {
            const fmt = compressFormatFor(compressible[i]);
            if (!fmt) continue;

            createCompressPipeline(compressible[i], {
                preset,
                targetMb,
                stripMetadata,
                outputExt: fmt.ext,
                outputMime: fmt.mime,
            });
        }

        files = undefined;
        outputs = [];
        preset = "medium";
        targetMbText = "";
        stripMetadata = false;
    };

    const reset = async () => {
        files = undefined;
        outputs = [];
    };

    const customInvalid = () => preset === "custom" && !targetMb;
</script>

<svelte:head>
    <title>{$t("tabs.compress")} ~ {$t("general.cobalt")}</title>
    <meta
        property="og:title"
        content="{$t('tabs.compress')} ~ {$t('general.cobalt')}"
    />
</svelte:head>

<DropReceiver bind:files bind:draggedOver onDrop={onImport} id="compress-container">
    {#if !files?.length}
        <div id="compress-open" tabindex="-1" data-first-focus>
            <div id="compress-receiver">
                <FileReceiver
                    bind:draggedOver
                    bind:files
                    onImport={onImport}
                    subtext={$t("compress.receiver.hint")}
                    acceptTypes={compressAcceptTypes}
                    acceptExtensions={compressAcceptExtensions}
                />
            </div>

            <div id="compress-bullets">
                <BulletExplain
                    title={$t("compress.bullet.purpose.title")}
                    description={$t("compress.bullet.purpose.description")}
                    icon={IconMinimize}
                />

                <BulletExplain
                    title={$t("compress.bullet.explainer.title")}
                    description={$t("compress.bullet.explainer.description")}
                    icon={IconInfoCircle}
                />

                <BulletExplain
                    title={$t("compress.bullet.privacy.title")}
                    description={$t("compress.bullet.privacy.description")}
                    icon={IconDevices}
                />
            </div>
        </div>
    {:else}
        <div id="compress-picker" tabindex="-1" data-first-focus>
            <div class="picker-title">
                <div class="picker-title-icon">
                    <IconMinimize />
                </div>
                <span>{$t("compress.picker.title")}</span>
            </div>

            <div class="picker-files">
                {#each Array.from(files) as file, i (file.name + i)}
                    <span class="picker-file">
                        {file.name}
                        {#if !isCompressible(file)}
                            <span class="picker-file-unsupported">{$t("compress.picker.unsupported")}</span>
                        {/if}
                    </span>
                {/each}
            </div>

            {#if outputs.length}
                {#if Array.from(files).some(f => compressKindFor(f) === "video")}
                    <div class="picker-warning">{$t("compress.picker.video_warning")}</div>
                {/if}

                <div class="picker-options">
                    <div class="option-group" role="group" aria-label={$t("compress.picker.quality")}>
                        <span class="option-label">{$t("compress.picker.quality")}</span>

                        <div class="preset-row">
                            {#each ["low", "medium", "high"] as const as p (p)}
                                <button
                                    class="button preset-button"
                                    class:active={preset === p}
                                    onclick={() => preset = p}
                                >
                                    {$t(`compress.picker.preset.${p}`)}
                                </button>
                            {/each}
                            <button
                                class="button preset-button"
                                class:active={preset === "custom"}
                                onclick={() => preset = "custom"}
                            >
                                {$t("compress.picker.preset.custom")}
                            </button>
                        </div>

                        {#if preset === "custom"}
                            <div class="custom-target">
                                <button
                                    class="button target-step"
                                    aria-label={$t("compress.picker.target_minus")}
                                    onclick={() => stepTarget(-1)}
                                >-</button>
                                <input
                                    class="target-input"
                                    type="text"
                                    inputmode="numeric"
                                    pattern="[0-9]*"
                                    autocomplete="off"
                                    spellcheck="false"
                                    placeholder={$t("compress.picker.target_placeholder")}
                                    bind:value={targetMbText}
                                />
                                <button
                                    class="button target-step"
                                    aria-label={$t("compress.picker.target_plus")}
                                    onclick={() => stepTarget(1)}
                                >+</button>
                            </div>
                            <span class="target-hint">{$t("compress.picker.target_hint")}</span>
                        {/if}
                    </div>

                    <button
                        class="strip-option"
                        role="switch"
                        aria-checked={stripMetadata}
                        onclick={() => stripMetadata = !stripMetadata}
                    >
                        <span>{$t("compress.picker.strip")}</span>
                        <Toggle enabled={stripMetadata} />
                    </button>

                    <div class="picker-output">
                        <span class="option-label">{$t("compress.picker.output")}</span>
                        <span class="output-formats">{outputExts.join(", ").toUpperCase()}</span>
                    </div>
                </div>

                <button
                    class="button compress-button"
                    onclick={compress}
                    disabled={customInvalid()}
                >
                    <IconMinimize />
                    <span>{$t("compress.picker.compress")}</span>
                </button>

                <button class="button picker-reset" onclick={reset}>
                    {$t("compress.picker.reset")}
                </button>
            {:else}
                <div class="picker-error">{$t("compress.picker.no_supported")}</div>

                <button class="button picker-reset" onclick={reset}>
                    {$t("compress.picker.reset")}
                </button>
            {/if}
        </div>
    {/if}
</DropReceiver>

<style>
    :global(#compress-container) {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
    }

    #compress-open,
    #compress-picker {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        text-align: center;
        gap: 48px;
    }

    #compress-receiver {
        max-width: 450px;
        display: flex;
        flex-direction: column;
        gap: var(--padding);
    }

    #compress-bullets {
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-width: 450px;
    }

    #compress-picker {
        flex-direction: column;
        gap: 20px;
        max-width: 560px;
        padding: var(--padding);
    }

    .picker-title {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 600;
    }

    .picker-title-icon :global(svg) {
        width: 26px;
        height: 26px;
        stroke-width: 1.8px;
    }

    .picker-files {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 100%;
    }

    .picker-file {
        font-size: 13px;
        color: var(--gray);
        line-break: anywhere;
    }

    .picker-file-unsupported {
        color: var(--medium-red);
    }

    .picker-options {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        width: 100%;
    }

    .option-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .option-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--gray);
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }

    .preset-row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
    }

    .preset-button {
        min-width: 76px;
        padding: 9px 15px;
        font-size: 13.5px;
        font-weight: 600;
    }

    .preset-button.active {
        color: var(--button-text);
        background: var(--button-active);
        box-shadow: 0 0 0 1px var(--button-stroke) inset;
    }

    .custom-target {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .target-step {
        min-width: 36px;
        height: 36px;
        padding: 0;
        font-size: 17px;
        font-weight: 600;
        border-radius: calc(var(--border-radius) - 2px);
    }

    .target-input {
        width: 96px;
        padding: 9px 10px;
        border: none;
        border-radius: calc(var(--border-radius) - 2px);
        background: var(--button);
        box-shadow: var(--button-box-shadow);
        color: var(--secondary);
        font-size: 14px;
        font-weight: 500;
        text-align: center;
    }

    .target-input::placeholder {
        color: var(--gray);
    }

    .target-hint {
        font-size: 12px;
        color: var(--gray);
        max-width: 280px;
    }

    .strip-option {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border: none;
        border-radius: var(--border-radius);
        background: none;
        box-shadow: none;
        color: var(--secondary);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
    }

    @media (hover: hover) {
        .strip-option:hover {
            background: var(--button-hover-transparent);
        }
    }

    .strip-option:active {
        background: var(--button-press-transparent);
    }

    .picker-output {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .output-formats {
        font-size: 14px;
        font-weight: 600;
    }

    .compress-button {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        min-width: 160px;
        padding: 11px 20px;
        font-size: 14.5px;
        font-weight: 600;
    }

    .compress-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .compress-button :global(svg) {
        width: 18px;
        height: 18px;
        stroke-width: 2px;
    }

    .picker-error {
        font-size: 14px;
        color: var(--medium-red);
    }

    .picker-warning {
        font-size: 13px;
        color: var(--orange);
        line-height: 1.5;
        max-width: 420px;
    }

    .picker-reset {
        padding: 8px 14px;
        font-size: 13px;
    }

    @media screen and (max-width: 920px) {
        #compress-open {
            flex-direction: column;
            gap: var(--padding);
        }

        #compress-bullets {
            padding: var(--padding);
        }
    }

    @media screen and (max-width: 535px) {
        #compress-bullets {
            gap: var(--padding);
        }
    }

    @media screen and (max-height: 750px) and (max-width: 535px) {
        :global(#compress-container:not(.processing)) {
            justify-content: start;
            align-items: start;
            padding-top: var(--padding);
        }
    }
</style>
