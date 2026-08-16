<script lang="ts">
    import { get } from "svelte/store";
    import { t } from "$lib/i18n/translations";
    import { createConvertPipeline } from "$lib/task-manager/queue";
    import { queueVisible } from "$lib/state/queue-visibility";
    import { createDialog } from "$lib/state/dialogs";
    import { dialogInputValue } from "$lib/state/dialog-input";
    import { getSharedFormats, getFileCategory, convertFormats, type ConvertFormat } from "$lib/convert/formats";

    import DropReceiver from "$components/misc/DropReceiver.svelte";
    import FileReceiver from "$components/misc/FileReceiver.svelte";
    import BulletExplain from "$components/misc/BulletExplain.svelte";

    import IconArrowsExchange from "@tabler/icons-svelte/IconArrowsExchange.svelte";
    import IconDevices from "@tabler/icons-svelte/IconDevices.svelte";
    import IconInfoCircle from "@tabler/icons-svelte/IconInfoCircle.svelte";
    import IconPlus from "@tabler/icons-svelte/IconPlus.svelte";
    import IconFileImport from "@tabler/icons-svelte/IconFileImport.svelte";

    let draggedOver = false;
    let files: FileList | undefined;
    let formats: ConvertFormat[] = [];
    let formatsExpanded = false;

    // full supported-format list for the dropdown, deduplicated by
    // extension+label (magick's `core` formats duplicate ffmpeg's rasters,
    // so they're skipped). xod isn't an output format (it's the encrypted
    // input that decrypts to xps), so it's added as a chip manually.
    const formatChips: ConvertFormat[] = [...new Map(
        convertFormats
            .filter(f => !f.core)
            .map(f => [f.ext + (f.label ?? ""), f])
    ).values()];
    // sit it next to xps, since xod decrypts to an xps
    const xpsIdx = formatChips.findIndex(c => c.ext === "xps");
    const xodChip = {
        ext: "xod",
        mime: "application/octet-stream",
        category: "document",
        engine: "xod",
    } as ConvertFormat;
    if (xpsIdx >= 0) {
        formatChips.splice(xpsIdx, 0, xodChip);
    } else {
        formatChips.push(xodChip);
    }

    const onImport = async () => {
        // a new drop means the user wants to convert again, so hide the
        // queue popover that would otherwise cover the format buttons
        $queueVisible = false;

        if (!files?.length) {
            formats = [];
            return;
        }

        formats = getSharedFormats(Array.from(files));
    };

    const convert = async (format: ConvertFormat) => {
        if (!files) return;

        // xod files are password-encrypted, so ask for the password
        // before starting the conversion. that covers both the xps output
        // (xod engine) and pdf/png/jpg (mupdf engine chained through a
        // decrypted xps)
        const inputIsXod = Array.from(files).some(f =>
            f.name.toLowerCase().endsWith(".xod")
        );

        if (format.engine === "xod" || inputIsXod) {
            const currentFiles = Array.from(files);

            dialogInputValue.set("");
            createDialog({
                id: "xod-password",
                type: "small",
                title: $t("convert.xod.password_title"),
                bodyText: $t("convert.xod.password_body"),
                input: {
                    placeholder: $t("convert.xod.password_placeholder"),
                    type: "password",
                },
                buttons: [
                    {
                        text: $t("button.cancel"),
                        main: false,
                        action: () => {},
                    },
                    {
                        text: $t("convert.xod.password_submit"),
                        main: true,
                        action: () => {
                            const password = get(dialogInputValue);

                            for (const file of currentFiles) {
                                createConvertPipeline(file, format, password);
                            }

                            files = undefined;
                            formats = [];
                        },
                    },
                ],
            });
            return;
        }

        for (const file of Array.from(files)) {
            createConvertPipeline(file, format);
        }

        files = undefined;
        formats = [];
    };

    const reset = async () => {
        files = undefined;
        formats = [];
    };
</script>

<svelte:head>
    <title>{$t("tabs.convert")} ~ {$t("general.cobalt")}</title>
    <meta
        property="og:title"
        content="{$t('tabs.convert')} ~ {$t('general.cobalt')}"
    />
</svelte:head>

<DropReceiver bind:files bind:draggedOver onDrop={onImport} id="convert-container">
    {#if !files?.length}
        <div id="convert-open" tabindex="-1" data-first-focus>
            <div id="convert-receiver">
                <FileReceiver
                    bind:draggedOver
                    bind:files
                    onImport={onImport}
                    subtext={$t("convert.receiver.hint")}
                    acceptTypes={[
                        "video/*",
                        "audio/*",
                        "image/*",
                        // documents (pandoc + mupdf engines); xod has no
                        // standard mime type, so it's matched by extension
                        "text/markdown",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/msword",
                        "text/html",
                        "text/csv",
                        "text/tab-separated-values",
                        "application/json",
                        "text/x-rst",
                        "application/vnd.oasis.opendocument.text",
                        "application/xml",
                        "application/rtf",
                        "application/oxps",
                        "application/pdf",
                        "application/epub+zip",
                        "application/x-mobipocket-ebook",
                        "application/x-fictionbook+xml",
                        "application/vnd.comicbook+zip",
                        "text/plain",
                        ".xod",
                    ]}
                    acceptExtensions={[
                        // video
                        "mp4",
                        "m4v",
                        "mkv",
                        "webm",
                        "mov",
                        "avi",
                        // audio
                        "mp3",
                        "m4a",
                        "m4b",
                        "opus",
                        "ogg",
                        "oga",
                        "weba",
                        "flac",
                        "wav",
                        // images (ffmpeg + imagemagick)
                        "png",
                        "jpg",
                        "webp",
                        "bmp",
                        "tiff",
                        "avif",
                        "gif",
                        "ico",
                        "cur",
                        "svg",
                        "psd",
                        "jxl",
                        "hdr",
                        "mat",
                        "pfm",
                        "pnm",
                        "ppm",
                        "pgm",
                        "pbm",
                        "eps",
                        "dng",
                        "cr2",
                        "cr3",
                        "nef",
                        "arw",
                        "rw2",
                        "orf",
                        "raf",
                        "pef",
                        "srw",
                        "raw",
                        "heic",
                        "heif",
                        "xcf",
                        // documents (pandoc)
                        "md",
                        "markdown",
                        "docx",
                        "doc",
                        "html",
                        "csv",
                        "tsv",
                        "json",
                        "rst",
                        "epub",
                        "odt",
                        "docbook",
                        "rtf",
                        // encrypted documents (pdftron xod)
                        "xod",
                        // documents read by the mupdf engine
                        "xps",
                        "pdf",
                        "mobi",
                        "fb2",
                        "cbz",
                        "txt",
                    ]}
                />
            </div>

            <div id="convert-bullets">
                <BulletExplain
                    title={$t("convert.bullet.purpose.title")}
                    description={$t("convert.bullet.purpose.description")}
                    icon={IconArrowsExchange}
                />

                <BulletExplain
                    title={$t("convert.bullet.formats.title")}
                    description={$t("convert.bullet.formats.description")}
                    icon={IconInfoCircle}
                />

                <div id="convert-formats" class:expanded={formatsExpanded}>
                    <button
                        id="formats-button"
                        class="button"
                        onclick={() => formatsExpanded = !formatsExpanded}
                        aria-label={$t(`convert.formats.title_${formatsExpanded ? "hide" : "show"}`)}
                    >
                        <div class="expand-icon">
                            <IconPlus />
                        </div>
                        <span>{$t("convert.formats.title")}</span>
                    </button>

                    {#if formatsExpanded}
                        <div id="formats-list">
                            {#each formatChips as format (format.ext + (format.label ?? ""))}
                                <span class="format-chip">
                                    {format.label || format.ext.toUpperCase()}
                                </span>
                            {/each}
                        </div>
                    {/if}
                </div>

                <BulletExplain
                    title={$t("convert.bullet.privacy.title")}
                    description={$t("convert.bullet.privacy.description")}
                    icon={IconDevices}
                />
            </div>
        </div>
    {:else}
        <div id="convert-picker" tabindex="-1" data-first-focus>
            <div class="picker-title">
                <div class="picker-title-icon">
                    <IconFileImport />
                </div>
                <span>{$t("convert.picker.title")}</span>
            </div>

            <div class="picker-files">
                {#each Array.from(files) as file, i (file.name + i)}
                    <span class="picker-file">{file.name}</span>
                {/each}
            </div>

            {#if formats.length}
                {#if Array.from(files).some(f => getFileCategory(f) === "video")}
                    <div class="picker-warning">{$t("convert.picker.video_warning")}</div>
                {/if}

                <div class="picker-formats" role="group" aria-label={$t("convert.picker.formats")}>
                    {#each formats as format (format.ext + (format.label ?? ""))}
                        <button
                            class="button format-button"
                            onclick={() => convert(format)}
                        >
                            {format.label || format.ext.toUpperCase()}
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="picker-error">{$t("convert.picker.no_formats")}</div>
            {/if}

            <button class="button picker-reset" onclick={reset}>
                {$t("convert.picker.reset")}
            </button>
        </div>
    {/if}
</DropReceiver>

<style>
    :global(#convert-container) {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
    }

    #convert-open,
    #convert-picker {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        text-align: center;
        gap: 48px;
    }

    #convert-receiver {
        max-width: 450px;
        display: flex;
        flex-direction: column;
        gap: var(--padding);
    }

    #convert-bullets {
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-width: 450px;
    }

    #convert-formats {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }

    #formats-button {
        gap: 9px;
        padding: 7px 13px 7px 10px;
        justify-content: flex-start;
        border-radius: 18px;
        display: flex;
        flex-direction: row;
        font-size: 13px;
        font-weight: 500;
        background: none;
        transition:
            background 0.2s,
            box-shadow 0.1s;
    }

    #formats-button:not(:active) {
        box-shadow: none;
    }

    .expand-icon {
        height: 22px;
        width: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 18px;
        background: var(--button-elevated);
        padding: 0;
        box-shadow: none;
        transition:
            background 0.2s,
            transform 0.2s;
    }

    #formats-button:active {
        background: var(--button-hover-transparent);
    }

    @media (hover: hover) {
        #formats-button:hover {
            background: var(--button-hover-transparent);
        }

        #formats-button:active {
            background: var(--button-press-transparent);
        }

        #formats-button:hover .expand-icon {
            background: var(--button-elevated-hover);
        }
    }

    @media (hover: none) {
        #formats-button:active {
            box-shadow: none;
        }
    }

    #formats-button:active .expand-icon {
        background: var(--button-elevated-press);
    }

    .expand-icon :global(svg) {
        height: 18px;
        width: 18px;
        stroke-width: 2px;
        color: var(--secondary);
        will-change: transform;
    }

    .expanded .expand-icon {
        transform: rotate(45deg);
    }

    #formats-list {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 4px;
        width: 100%;
        padding: 0 6px;
    }

    .format-chip {
        display: flex;
        padding: 4px 8px;
        border-radius: calc(var(--border-radius) / 2);
        background: var(--button-elevated);
        font-size: 12.5px;
        font-weight: 500;
        color: var(--secondary);
    }

    @media screen and (max-width: 535px) {
        .expand-icon {
            height: 21px;
            width: 21px;
        }

        .expand-icon :global(svg) {
            height: 16px;
            width: 16px;
        }
    }

    #convert-picker {
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

    .picker-formats {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
    }

    .format-button {
        min-width: 76px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
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
        #convert-open {
            flex-direction: column;
            gap: var(--padding);
        }

        #convert-bullets {
            padding: var(--padding);
        }
    }

    @media screen and (max-width: 535px) {
        #convert-bullets {
            gap: var(--padding);
        }
    }

    @media screen and (max-height: 750px) and (max-width: 535px) {
        :global(#convert-container:not(.processing)) {
            justify-content: start;
            align-items: start;
            padding-top: var(--padding);
        }
    }
</style>
