<script lang="ts">
    import { contacts, docs } from "$lib/env";
    import { t } from "$lib/i18n/translations";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="imput">
<SectionHeading
    title="založeno na cobalt"
    sectionId="imput"
/>

titty.tools je založen na [cobalt](https://cobalt.tools/), open source projektu vytvořeném s láskou a péčí [imputem](https://imput.net/) ❤️

jsme vděční za roky práce, které šly do toho, aby cobalt byl tím, čím je dnes. titty.tools by bez něj neexistoval.
</section>


<section id="licenses">
<SectionHeading
    title={$t("about.heading.licenses")}
    sectionId="licenses"
/>

titty.tools dědí své licence z cobalt:

kód cobalt api (zpracovatelský server) je open source a licencovaný pod [AGPL-3.0]({docs.apiLicense}).

frontend cobalt je [source first](https://sourcefirst.com/) a je licencovaný pod [CC-BY-NC-SA 4.0]({docs.webLicense}).

spoléháme na mnoho open source knihoven a jsme obzvlášť vděční za [yt-dlp](https://github.com/yt-dlp/yt-dlp),
který pohání backend titty.tools. úplný seznam závislostí cobalt najdeš [na githubu]({contacts.github}).
</section>
