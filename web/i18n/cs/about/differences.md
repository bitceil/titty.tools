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

titty.tools je fork [cobaltu](https://github.com/imputnet/cobalt), open source stahováku médií. vznikl pro veřejné dobro: bezplatný, soukromý a bezpečný způsob ukládání médií z internetu.

původní cobalt je skvělý, ale jeho vestavěné extraktory se neaktualizují často, takže některé weby se rozbijí a nefungují měsíce. titty.tools to řeší náhradou celého backendu za [yt-dlp](https://github.com/yt-dlp/yt-dlp), který se aktualizuje neustále a podporuje tisíce webů.
</section>

<section id="differences">
<SectionHeading
    title={$t("about.heading.differences")}
    sectionId="differences"
/>

## backend yt-dlp

místo ručně psaného scraperu pro každý web titty.tools přenechává extrakci nástroji yt-dlp. to znamená:

- tisíce podporovaných webů hned po vybalení, nejen ty velké;
- rozbité weby se opravují v yt-dlp, obvykle do několika dní;
- server aktualizuje svůj extraktor automaticky, takže se nic nerozbije čekáním na vydání.

## remuxování stále probíhá ve vašem prohlížeči

stahování videa často znamená načtení oddělených video a audio proudů a jejich sloučení. titty.tools to umí sloučit lokálně, ve vašem prohlížeči, pomocí WebAssembly ffmpeg (libav). vaše média se po prvotním zpracování odkazu serveru vůbec nedotknou.

## převod souborů probíhá také ve vašem prohlížeči

karta převod mění místní soubory na jiné formáty, aniž byste cokoli nahrávali. přetáhněte soubor, vyberte výstupní formát a převod proběhne na vašem zařízení pomocí ffmpeg, imagemagick, pandoc a mupdf přeložených do WebAssembly. video, audio, obrázky i dokumenty jsou pokryté (včetně šifrovaných pdftron xod souborů a xps/pdf/epub dokumentů) a vaše soubory nikdy neopustí váš počítač.

## komprimujte soubory na svém zařízení

karta komprese zmenšuje video, audio a obrázky lokálně. vyberte předvolbu kvality nebo vlastní maximální velikost souboru a soubory se překódují na vašem zařízení pomocí ffmpeg: nikdy se nenahrávají a vždy zůstanou pod cílovou velikostí.

## co zůstává stejné

vše ostatní je zděděno z cobaltu: stejné čisté rozhraní, výchozí nastavení soukromí, žádné reklamy, žádné trackery a žádný účet.
</section>

<section id="where-to-report">
<SectionHeading
    title={$t("about.heading.differences_report")}
    sectionId="where-to-report"
/>

pokud něco nefunguje, nahlaste to prosím do repozitáře titty.tools, ne do původního cobaltu. vývojáři původního projektu nespravují backend yt-dlp tohoto forku, takže jeho problémy opravit nemohou.

repozitář titty.tools: [bitceil/titty.tools]({contacts.fork})

původní cobalt: [imputnet/cobalt]({contacts.github})
</section>
