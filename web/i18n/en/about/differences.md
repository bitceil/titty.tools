<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import { contacts } from "$lib/env";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="what-is-titty">
<SectionHeading
    title={$t("about.heading.differences_what")}
    sectionId="what-is-titty"
/>

titty.tools is a fork of [cobalt](https://github.com/imputnet/cobalt), the open source media downloader. it was made for public benefit: a free, private, and safe way to save media from the internet.

the original cobalt project is great, but its built-in extractors don't get updated that often, so some sites break or stop working for months. titty.tools fixes that by replacing the whole extraction backend with [yt-dlp](https://github.com/yt-dlp/yt-dlp), which is updated constantly and supports thousands of sites.
</section>

<section id="differences">
<SectionHeading
    title={$t("about.heading.differences")}
    sectionId="differences"
/>

## yt-dlp backend

instead of one hand-written scraper per site, titty.tools delegates extraction to yt-dlp. that means:

- thousands of supported sites out of the box, not just the big ones;
- sites that break get fixed upstream in yt-dlp, usually within days;
- the server updates its extractor automatically, so nothing stops working while you wait for a release.

## remuxing still happens in your browser

downloading a video often means fetching separate video and audio streams and merging them. titty.tools can do that merge locally, in your browser, using WebAssembly ffmpeg (libav). your media never touches the server after the initial link processing.

## file conversion happens in your browser too

the convert tab turns local files into other formats without uploading anything. drop a file, pick an output format, and it's converted on your device using ffmpeg, imagemagick, pandoc, and mupdf compiled to WebAssembly. video, audio, images, and documents are all covered (including encrypted pdftron xod files and xps/pdf/epub documents), and your files never leave your computer.

## compress files on your device

the compress tab shrinks video, audio, and images locally. pick a quality preset or a custom max file size, and your files are re-encoded on your device with ffmpeg: never uploaded, and always under your target size.

## what's the same

everything else is inherited from cobalt: the same clean interface, privacy-first defaults, no ads, no trackers, and no account required.
</section>

<section id="where-to-report">
<SectionHeading
    title={$t("about.heading.differences_report")}
    sectionId="where-to-report"
/>

if something doesn't work, please report it to the titty.tools repository, not the original cobalt one. the original developers don't maintain this fork's yt-dlp backend, so they can't fix its issues.

titty.tools repository: [bitceil/titty.tools]({contacts.fork})

original cobalt: [imputnet/cobalt]({contacts.github})
</section>
