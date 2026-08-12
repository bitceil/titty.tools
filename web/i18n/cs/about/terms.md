<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="general">
<SectionHeading
    title={$t("about.heading.general")}
    sectionId="general"
/>

tyto podmínky platí pouze při používání oficiální instance titty.tools.
v ostatních případech můžeš kontaktovat provozovatele instance pro přesné informace.
</section>

<section id="saving">
<SectionHeading
    title={$t("about.heading.saving")}
    sectionId="saving"
/>

funkce ukládání zjednodušuje stahování obsahu z internetu
a nepřebíráme žádnou odpovědnost za to, k čemu je stažený obsah použit.

zpracovatelské servery fungují jako pokročilé proxy a nikdy nezapisují žádný vyžádaný obsah na disk.
vše je zpracováváno v RAM a trvale vymazáno po dokončení tunelu.
nemáme žádné logy stahování a nemůžeme nikoho identifikovat.

více o tom, jak tunely fungují, se dozvíš v [zásadách ochrany soukromí](/about/privacy).
</section>

<section id="responsibility">
<SectionHeading
    title={$t("about.heading.responsibility")}
    sectionId="responsibility"
/>

ty (koncový uživatel) jsi zodpovědný za to, co s našimi nástroji děláš, jak používáš a distribuuješ výsledný obsah.
buď prosím ohleduplný při používání cizího obsahu a vždy uváděj původní tvůrce.
ujisti se, že neporušuješ žádné podmínky ani licence.

při použití pro vzdělávací účely vždy cituj zdroje a uváděj původní tvůrce.

fair use a uvádění zdrojů prospívají všem.
</section>

<section id="abuse">
<SectionHeading
    title={$t("about.heading.abuse")}
    sectionId="abuse"
/>

nemáme způsob, jak automaticky odhalovat zneužívání, protože titty.tools je plně anonymní.
takové aktivity nám ale můžeš nahlásit e-mailem a my uděláme maximum pro ruční vyřízení.

pokud máš problémy, můžeš kontaktovat podporu jakoukoli preferovanou metodou na [stránce komunity](/about/community).
</section>
