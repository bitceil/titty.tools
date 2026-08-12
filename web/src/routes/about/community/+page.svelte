<script lang="ts">
    import { contacts } from "$lib/env";
    import { t } from "$lib/i18n/translations";

    import AboutSupport from "$components/about/AboutSupport.svelte";

    let buttonContainerWidth: number;
</script>

<div id="support-page">
    <div
        id="support-buttons"
        bind:offsetWidth={buttonContainerWidth}
        class="two"
        class:one={buttonContainerWidth < 500}
    >
        <AboutSupport
            platform="github"
            title={$t("about.support.title.original")}
            externalLink={contacts.github}
        />
        <AboutSupport
            platform="fork"
            title={$t("about.support.title.fork")}
            externalLink={contacts.fork}
        />
    </div>

    <div class="subtext support-note">
        {$t("about.support.description.best-effort")}
    </div>
</div>

<style>
    #support-page {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    #support-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        overflow-x: scroll;
        gap: var(--padding);
    }

    #support-buttons.two {
        grid-template-columns: 1fr 1fr;
    }

    #support-buttons.one {
        grid-template-columns: 1fr;
    }

    .support-note {
        text-align: start;
        padding: 0;
    }
</style>
