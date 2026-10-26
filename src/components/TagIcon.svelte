<script>
    //标签前面的图标: 设置了 emoji 时显示 emoji, 否则显示默认图标(# 或置顶图钉)
    import {tagStore} from "../store/store.js";

    export let tag = "";
    export let fallback = "ri-hashtag";
    export let iconClass = "text-[13px] text-ink-3";

    $: icon = ($tagStore.icons || {})[tag] || "";
</script>

{#if icon}
    <span class="tag-emoji" aria-hidden="true">{icon}</span>
{:else}
    <i class="{fallback} {iconClass}" aria-hidden="true"></i>
{/if}

<style>
    .tag-emoji {
        font-size: 14px;
        line-height: 1;
        font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    }
</style>
