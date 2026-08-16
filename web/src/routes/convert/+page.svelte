<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import { createConvertPipeline } from "$lib/task-manager/queue";
    import { getSharedFormats, type ConvertFormat } from "$lib/convert/formats";

    import DropReceiver from "$components/misc/DropReceiver.svelte";
    import FileReceiver from "$components/misc/FileReceiver.svelte";
    import BulletExplain from "$components/misc/BulletExplain.svelte";

    import IconArrowsExchange from "@tabler/icons-svelte/IconArrowsExchange.svelte";
    import IconDevices from "@tabler/icons-svelte/IconDevices.svelte";
    import IconInfoCircle from "@tabler/icons-svelte/IconInfoCircle.svelte";
    import IconFileImport from "@tabler/icons-svelte/IconFileImport.svelte";

    let draggedOver = false;
    let files: FileList | undefined;
    let formats: ConvertFormat[] = [];

    const onImport = async () => {
        if (!files?.length) {
            formats = [];
            return;
        }

        formats = getSharedFormats(Array.from(files));
    };

    const convert = async (format: ConvertFormat) => {
        if (!files) return;

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
                    acceptTypes={["video/*", "audio/*", "image/*"]}
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
                {#each ["ffmpeg", "magick", "pandoc"] as engine (engine)}
                    {@const engineFormats = formats.filter(f => f.engine === engine)}
                    {#if engineFormats.length}
                        <div class="picker-engine">
                            <div class="picker-engine-name">
                                {#if engine === "magick"}
                                    {$t("convert.engine.imagemagick")}
                                {:else if engine === "pandoc"}
                                    {$t("convert.engine.pandoc")}
                                {:else}
                                    {$t("convert.engine.ffmpeg")}
                                {/if}
                            </div>
                            <div class="picker-formats" role="group" aria-label={$t("convert.picker.formats")}>
                                {#each engineFormats as format (format.ext + (format.label ?? ""))}
                                    <button
                                        class="button format-button"
                                        onclick={() => convert(format)}
                                    >
                                        {format.label || format.ext.toUpperCase()}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/each}
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

    .picker-engine {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .picker-engine-name {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--gray);
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
