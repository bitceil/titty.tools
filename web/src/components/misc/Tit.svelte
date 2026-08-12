<script lang="ts">
    import type { TitEmotions } from "$lib/types/tit";

    type Props = {
        emotion: TitEmotions;
        forceLoaded?: boolean;
    };

    const { emotion, forceLoaded }: Props = $props();

    let loaded = $state(false);
</script>

<img
    class="tit {emotion}"
    class:loaded={loaded || forceLoaded}
    onload={() => (loaded = true)}
    src="/tit/{emotion}.png"
    height="152"
    alt=""
    aria-hidden="true"
/>

<style>
    .tit {
        display: block;
        margin: 0;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.15s;
    }

    .tit.loaded {
        opacity: 1;
    }

    .error {
        height: 160px;
    }

    .question {
        height: 140px;
    }

    .error {
        margin-left: 25px;
    }
</style>
