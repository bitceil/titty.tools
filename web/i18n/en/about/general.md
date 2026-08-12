<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import { contacts } from "$lib/env";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="summary">
<SectionHeading
    title={$t("about.heading.summary")}
    sectionId="summary"
/>

titty.tools helps you save anything from your favorite websites: video, audio, photos or gifs. just paste the link and you're ready to rock!

no ads, trackers, paywalls, or other nonsense. just a convenient web app that works anywhere, whenever you need it.
</section>

<section id="motivation">
<SectionHeading
    title={$t("about.heading.motivation")}
    sectionId="motivation"
/>

titty.tools was made for public benefit, to give everyone a free, private, and safe way to save media from the internet, without ads, malware, or tracking.

it started as a fork of [cobalt](https://cobalt.tools/), an amazing open source project that we love and respect. sadly, cobalt doesn't get updated very often anymore, which means support for some platforms slowly falls behind, and that kinda sucks for those platforms.

that's why we replaced the backend with [yt-dlp](https://github.com/yt-dlp/yt-dlp): it's actively maintained, supports thousands of sites, and keeps everything working as the internet keeps changing.
</section>

<section id="privacy-efficiency">
<SectionHeading
    title={$t("about.heading.privacy_efficiency")}
    sectionId="privacy-efficiency"
/>

all requests to the backend are anonymous and all information about potential file tunnels is encrypted.
we have a strict zero log policy and don't store or track *anything* about individual people.

if a request requires additional processing, such as remuxing or transcoding, titty.tools processes media
directly on your device. this ensures best efficiency and privacy.

if your device doesn't support local processing, then server-based live processing is used instead.
in this scenario, processed media is streamed directly to client, without ever being stored on server's disk.

you can [enable forced tunneling](/settings/privacy#tunnel) to boost privacy even further.
when enabled, titty.tools will tunnel all downloaded files, not just those that require it.
no one will know where you download something from, even your network provider.
all they'll see is that you're using a titty.tools instance.
</section>

<section id="community">
<SectionHeading
    title={$t("about.heading.community")}
    sectionId="community"
/>

titty.tools is used by countless artists, educators, and content creators to do what they love.

we believe that the future of the internet is open, which is why titty.tools is built on the [source first](https://sourcefirst.com/) cobalt project.
you can check out the original source code and contribute [on github]({contacts.github}) at any time. we welcome all contributions and suggestions!
</section>
