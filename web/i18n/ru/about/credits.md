<script lang="ts">
    import { contacts, docs } from "$lib/env";
    import { t } from "$lib/i18n/translations";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="imput">
<SectionHeading
    title="на основе cobalt"
    sectionId="imput"
/>

titty.tools основан на [cobalt](https://cobalt.tools/), проекте с открытым
исходным кодом, сделанном с любовью и заботой руками [imput](https://imput.net/) ❤️

мы благодарны за годы работы, которые были вложены в cobalt: без него titty.tools
не существовало бы.
</section>


<section id="licenses">
<SectionHeading
    title={$t("about.heading.licenses")}
    sectionId="licenses"
/>

titty.tools наследует свои лицензии от cobalt:

код api (сервера обработки) кобальта: open source и распространяется по
лицензии [AGPL-3.0]({docs.apiLicense}).

код фронтенда кобальта: [source first](https://sourcefirst.com/) и
распространяется по лицензии [CC-BY-NC-SA 4.0]({docs.webLicense}).

мы используем много опенсорсных библиотек, и мы особенно благодарны
[yt-dlp](https://github.com/yt-dlp/yt-dlp), который питает бэкенд titty.tools.
полный список зависимостей cobalt можно посмотреть на
[github]({contacts.github})!
</section>
