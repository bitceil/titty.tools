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

<section id="meowbalt">
<SectionHeading
    title={$t("general.meowbalt")}
    sectionId="meowbalt"
/>

мяубальт, это шустрый маскот кобальта, очень выразительный кот, который любит
быстрый интернет.

весь потрясающий арт мяубальта, который ты видишь в кобальте, был сделан
[GlitchyPSI](https://glitchypsi.xyz/). он ещё и оригинальный создатель этого
персонажа.

imput владеет юридическими правами на дизайн персонажа мяубальта, но не на
конкретные арты, которые были созданы GlitchyPSI.

мы любим мяубальта, поэтому мы вынуждены установить пару правил, чтобы его
защитить:
- ты не можешь использовать дизайн персонажа мяубальта ни в какой форме, кроме
  фанарта.
- ты не можешь использовать дизайн или арты мяубальта в коммерческих целях.
- ты не можешь использовать дизайн или арты мяубальта в своих проектах.
- ты не можешь использовать или изменять работы GlitchyPSI с мяубальтом ни в
  каком виде.

если ты нарисуешь фанарт мяубальта, не стесняйся делиться им в [нашем
дискорд-сервере](/about/community), мы с нетерпением ждём!
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
