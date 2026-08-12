<script lang="ts">
    import { contacts, docs } from "$lib/env";
    import { t } from "$lib/i18n/translations";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="imput">
<SectionHeading
    title="based on cobalt"
    sectionId="imput"
/>

titty.tools is based on [cobalt](https://cobalt.tools/), an open source project made with love and care by [imput](https://imput.net/) ❤️

we're grateful for the years of work that went into making cobalt what it is today. titty.tools wouldn't exist without it.
</section>

<section id="meowbalt">
<SectionHeading
    title={$t("general.meowbalt")}
    sectionId="meowbalt"
/>

meowbalt is cobalt's speedy mascot, a very expressive cat who loves fast internet.

all amazing art of meowbalt that you see in cobalt
was made by [GlitchyPSI](https://glitchypsi.xyz/).
he's also the original creator of the character.

imput holds legal rights to meowbalt's character design,
but not specific artworks that were created by GlitchyPSI.

we love meowbalt, so we have to set a few rules in place to protect him:
- you cannot use meowbalt's character design in any form that isn't fan art.
- you cannot use meowbalt's design or artworks commercially.
- you cannot use meowbalt's design or artworks in your own projects.
- you cannot use or modify GlitchyPSI's artworks of meowbalt in any form.

if you create fan art of meowbalt, please share it in
[our discord server](/about/community), we'd love to see it!
</section>

<section id="licenses">
<SectionHeading
    title={$t("about.heading.licenses")}
    sectionId="licenses"
/>

titty.tools inherits its licensing from cobalt:

cobalt api (processing server) code is open source and licensed under [AGPL-3.0]({docs.apiLicense}).

cobalt frontend code is [source first](https://sourcefirst.com/) and is licensed under [CC-BY-NC-SA 4.0]({docs.webLicense}).

we rely on many open source libraries, and we're especially thankful for [yt-dlp](https://github.com/yt-dlp/yt-dlp),
which powers the backend of titty.tools. you can see the full list of cobalt's dependencies on [github]({contacts.github}).
</section>
