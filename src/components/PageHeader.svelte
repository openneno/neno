<script>
    import {showSlide} from "../pages/SettingSlide.svelte";

    export let title = "";
    export let subtitle = "";
</script>

<div class="flex flex-row items-center justify-between pl-4 pr-4">
    <div class="flex flex-row items-center">
        <div class="font-bold dark:text-slate-300">{title}</div>
        <button
                class="focus:outline-hidden text-gray-600 sm:hidden md:hidden ml-2"
                aria-label="打开菜单"
                on:click={() => {
                showSlide();
            }}
        >
            <i class="ri-function-fill dark:text-slate-300"></i>
        </button>
        {#if subtitle}
            <div class="ml-3 text-sm text-gray-500 dark:text-slate-400">{subtitle}</div>
        {/if}
    </div>
    <div class="flex items-center space-x-2">
        <slot/>
    </div>
</div>
