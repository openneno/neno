<script>
    //标签图标选择: 常用 emoji, 也可以输入任意 emoji 或单个字符; 选择后立即生效
    import {createEventDispatcher, onMount} from "svelte";
    import {slide} from "../lib/motion.js";

    export let icon = "";

    const dispatch = createEventDispatcher();
    const EMOJIS = [
        "📚", "📖", "✍️", "💡", "🎯", "📝", "🧠", "🔖",
        "💼", "📈", "💰", "🛠️", "💻", "📅", "✅", "📌",
        "🌱", "🌿", "🌸", "🌙", "☀️", "🌊", "⛰️", "🍂",
        "❤️", "😊", "🎵", "🎬", "📷", "🎨", "🎮", "☕",
        "🍜", "✈️", "🏃", "🏠", "🐱", "🎁", "⭐", "🔥",
    ];
    const isMac = /Mac|iPhone|iPad/i.test(navigator.platform);
    const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter() : null;

    let custom = "";
    let panel;

    //只取第一个字形(一个 emoji 可能由多个码位组成, 例如 ❤️ 或 👨‍👩‍👧)
    function firstGrapheme(text) {
        const value = text.trim();
        if (!value) return "";
        if (segmenter) return segmenter.segment(value)[Symbol.iterator]().next().value.segment;
        return Array.from(value)[0];
    }

    function pick(value) {
        dispatch("pick", value);
    }

    function applyCustom() {
        const value = firstGrapheme(custom);
        if (value) pick(value);
    }

    onMount(() => {
        panel && panel.querySelector("button[aria-pressed='true'], button")?.focus({preventScroll: true});
    });
</script>

<div
        bind:this={panel}
        class="my-1 rounded-lg bg-surface-2 p-2"
        transition:slide={{duration: 160}}
        role="dialog"
        aria-label="选择标签图标"
        on:click|stopPropagation
        on:keydown|stopPropagation={(event) => event.key === "Escape" && dispatch("close")}
>
    <div class="grid grid-cols-8 gap-0.5">
        {#each EMOJIS as emoji}
            <button
                    class="flex aspect-square items-center justify-center rounded-md text-[17px] leading-none transition-[background-color,transform] duration-100 hover:scale-110 hover:bg-surface-3"
                    class:ring-2={icon === emoji}
                    class:ring-primary-500={icon === emoji}
                    class:bg-surface={icon === emoji}
                    aria-pressed={icon === emoji}
                    aria-label={emoji}
                    on:click={() => pick(emoji)}
            >{emoji}</button>
        {/each}
    </div>
    <div class="mt-2 flex items-center gap-1.5">
        <input
                class="input h-8 min-w-0 flex-1 text-center"
                placeholder="其他 emoji"
                title={isMac ? "按 ⌃⌘空格 打开表情面板" : "按 Win + . 打开表情面板"}
                aria-label="输入任意 emoji"
                bind:value={custom}
                on:keydown={(event) => {
                    if (event.key === "Enter" && !event.isComposing) applyCustom();
                }}
        />
        <button class="btn btn-sm btn-primary" disabled={!custom.trim()} on:click={applyCustom}>使用</button>
        {#if icon}
            <button class="btn btn-sm btn-ghost" title="恢复为 #" on:click={() => pick("")}>移除</button>
        {/if}
    </div>
</div>
