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

titty.tools ti pomáhá ukládat cokoli z tvých oblíbených webů: video, audio, fotky nebo gify. stačí vložit odkaz a můžeš začít!

žádné reklamy, sledovače, paywally ani jiné nesmysly. jen pohodlná webová aplikace, která funguje kdekoli, kdykoli ji potřebuješ.
</section>

<section id="motivation">
<SectionHeading
    title={$t("about.heading.motivation")}
    sectionId="motivation"
/>

titty.tools byl vytvořen pro veřejné dobro, aby dal každému svobodný, soukromý a bezpečný způsob ukládání médií z internetu, bez reklam, malwaru a sledování.

začalo to jako fork [cobalt](https://cobalt.tools/), úžasného open source projektu, který milujeme a respektujeme. bohužel cobalt už není tak často aktualizovaný, což znamená, že podpora některých platforem pomalu zaostává, a to pro tyto platformy není ideální.

proto jsme vyměnili backend za [yt-dlp](https://github.com/yt-dlp/yt-dlp): je aktivně udržovaný, podporuje tisíce webů a všechno funguje, i když se internet neustále mění.
</section>

<section id="privacy-efficiency">
<SectionHeading
    title={$t("about.heading.privacy_efficiency")}
    sectionId="privacy-efficiency"
/>

všechny požadavky na backend jsou anonymní a všechny informace o potenciálních souborových tunelech jsou šifrované.
máme přísnou politiku nulových logů a neukládáme ani nesledujeme *nic* o jednotlivých lidech.

pokud požadavek vyžaduje další zpracování, jako je remuxování nebo překódování, titty.tools zpracovává média
přímo na tvém zařízení. to zajišťuje nejlepší efektivitu a soukromí.

pokud tvé zařízení nepodporuje lokální zpracování, použije se místo toho živé zpracování na serveru.
v tomto případě je zpracované médium streamováno přímo klientovi, aniž by bylo kdy uloženo na disk serveru.

můžeš [povolit vynucené tunelování](/settings/privacy#tunnel) pro ještě větší soukromí.
když je zapnuté, titty.tools bude tunelovat všechny stažené soubory, nejen ty, které to vyžadují.
nikdo nebude vědět, odkud něco stahuješ, ani tvůj poskytovatel sítě.
vše, co uvidí, je, že používáš instanci titty.tools.
</section>

<section id="community">
<SectionHeading
    title={$t("about.heading.community")}
    sectionId="community"
/>

titty.tools používají nespočet umělců, pedagogů a tvůrců obsahu, aby dělali to, co milují.

věříme, že budoucnost internetu je otevřená, proto je titty.tools postaven na projektu [source first](https://sourcefirst.com/) cobalt.
můžeš se podívat na původní zdrojový kód a přispět [na githubu]({contacts.github}) kdykoli. všechny příspěvky a návrhy vítáme!
</section>
