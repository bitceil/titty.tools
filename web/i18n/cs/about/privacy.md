<script lang="ts">
    import env from "$lib/env";
    import { t } from "$lib/i18n/translations";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="general">
<SectionHeading
    title={$t("about.heading.general")}
    sectionId="general"
/>

zásady ochrany soukromí titty.tools jsou jednoduché: nic o tobě neshromažďujeme ani neukládáme.
to, co děláš, je výhradně tvoje věc, ne naše ani nikoho jiného.

tyto podmínky platí pouze při používání oficiální instance titty.tools.
v ostatních případech můžeš kontaktovat provozovatele instance pro přesné informace.
</section>

<section id="local">
<SectionHeading
    title={$t("about.heading.local")}
    sectionId="local"
/>

nástroje, které používají zpracování na zařízení, fungují offline, lokálně,
a nikdy neposílají žádná zpracovaná data nikam.
jsou takto označeny vždy, kdy je to možné.
</section>

<section id="saving">
<SectionHeading
    title={$t("about.heading.saving")}
    sectionId="saving"
/>

při používání funkce ukládání může titty.tools potřebovat proxy nebo remux/překódovat soubory.
pokud ano, vytvoří se pro tento účel dočasný tunel
a minimální potřebné informace o médiu se uloží na 90 sekund.

na neupravené a oficiální instanci titty.tools
**jsou všechna data tunelu šifrována klíčem, ke kterému má přístup pouze koncový uživatel**.

šifrovaná data tunelu mohou zahrnovat:
- název původní služby.
- původní URL adresy mediálních souborů.
- interní argumenty potřebné k rozlišení typů zpracování.
- minimální metadata souboru (generovaný název, název, autor, rok vytvoření, informace o autorských právech).
- minimální informace o původním požadavku, které mohou být použity v případě selhání URL během tunelování.

tato data jsou nevratně vymazána z RAM serveru po 90 sekundách.
nikdo nemá přístup k datům tunelu v mezipaměti, ani provozovatelé instancí,
pokud není zdrojový kód titty.tools upraven.

mediální data z tunelů nejsou nikdy nikde uložena/kešována.
vše je zpracováváno živě, i během remuxování a překódování.
tunely titty.tools fungují jako anonymní proxy.

aby bylo jasné, jak ukládání funguje: mediální soubory nejsou nikdy zapsány na disk serveru.
extrakce pouze načítá metadata a přímé mediální odkazy ze zdroje
a soubory pak streamují přímo ze zdroje do tvého zařízení, jako proxy.
jediné soubory, které se na serveru kdy vytvoří, jsou dočasné cookie soubory,
a ty jsou smazány okamžitě po extrakci, i když se stahování nezdaří.

pokud tvé zařízení podporuje lokální zpracování,
pak šifrované informace o tunelu obsahují mnohem méně dat, protože se vracejí klientovi.

podívej se na [související zdrojový kód na githubu](https://github.com/bitceil/titty.tools/tree/main/api/src/stream),
abys pochopil, jak to funguje.
</section>

<section id="encryption">
<SectionHeading
    title={$t("about.heading.encryption")}
    sectionId="encryption"
/>

dočasně uložená data tunelu jsou šifrována standardem AES-256.
dešifrovací klíče jsou obsaženy pouze v přístupovém odkazu a nikdy nejsou logovány/kešovány/ukládány.
přístup k odkazu a šifrovacím klíčům má pouze koncový uživatel.
klíče jsou generovány jedinečně pro každý vyžádaný tunel.
</section>

{#if env.PLAUSIBLE_ENABLED}
<section id="plausible">
<SectionHeading
    title={$t("about.heading.plausible")}
    sectionId="plausible"
/>

používáme [plausible](https://plausible.io/) k získání přibližného počtu
aktivních uživatelů titty.tools, plně anonymně. žádné identifikovatelné informace o
tobě nebo tvých požadavcích nejsou nikdy ukládány. všechna data jsou anonymizována a agregována.
vlastníme a provozujeme [plausible instanci](https://{env.PLAUSIBLE_HOST}/), kterou titty.tools používá.

plausible nepoužívá cookies a je plně v souladu s GDPR, CCPA a PECR.

pokud se chceš odhlásit z anonymní analýzy, můžeš tak učinit v [nastavení soukromí](/settings/privacy#analytics).
pokud se odhlásíš, plausible skript se vůbec nenačte.

[zjisti více o závazku plausible k soukromí](https://plausible.io/privacy-focused-web-analytics).
</section>
{/if}

<section id="cloudflare">
<SectionHeading
    title={$t("about.heading.cloudflare")}
    sectionId="cloudflare"
/>

používáme služby cloudflare pro:
- ochranu proti ddos a zneužití.
- ochranu proti botům (cloudflare turnstile).
- hostování a nasazování staticky renderované webové aplikace (cloudflare workers).

všechny tyto služby jsou nutné k tomu, abychom všem poskytli nejlepší zážitek.
cloudflare je nejprivátnější a nejspolehlivější poskytovatel pro všechna zmíněná řešení, o kterém víme.

cloudflare je plně v souladu s GDPR a HIPAA.

[zjisti více o závazku cloudflare k soukromí](https://www.cloudflare.com/trust-hub/privacy-and-data-protection/).
</section>
