<script>
    import Tit from "$components/misc/Tit.svelte";

    export let pageName;
</script>

<div id="placeholder-container" class="center-column-container">
    <Tit emotion="smile" />
    <div tabindex="-1" data-first-focus>
        {`${pageName} page is not ready yet!`}
    </div>
</div>

<style>
    #placeholder-container {
        gap: calc(var(--padding) * 2);
        text-align: center;
    }
</style>
