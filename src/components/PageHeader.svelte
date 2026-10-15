<script>
    import {showSlide} from "../pages/SettingSlide.svelte";

    export let title = "";
    export let subtitle = "";
</script>

<header class="flex h-14 shrink-0 items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-1.5">
        <button class="icon-btn -ml-1.5 sm:hidden" aria-label="打开菜单" on:click={() => showSlide()}>
            <i class="ri-menu-line"></i>
        </button>
        {#if title}
            <h1 class="truncate text-[17px] font-semibold text-ink">{title}</h1>
        {/if}
        {#if subtitle}
            <span class="ml-1.5 truncate text-[13px] text-ink-3 tabular-nums">{subtitle}</span>
        {/if}
        <slot name="title"/>
    </div>
    <div class="flex shrink-0 items-center gap-2">
        <slot/>
    </div>
</header>
