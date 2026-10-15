<script>
    import {settingStore} from "../store/store.js";
    import {THEME_COLORS, THEME_MODES, normalizeSetting, updateTheme} from "../lib/theme.js";
    import {scale} from "../lib/motion.js";

    $: setting = normalizeSetting($settingStore);
</script>

<div class="flex flex-col gap-5">
    <div>
        <div class="mb-2 text-[13px] font-medium text-ink-2">显示模式</div>
        <div class="segmented" role="radiogroup" aria-label="显示模式">
            {#each THEME_MODES as mode}
                <button role="radio" aria-checked={setting.themeMode === mode.key} on:click={() => updateTheme({themeMode: mode.key})}>
                    <i class={mode.icon}></i>{mode.name}
                </button>
            {/each}
        </div>
    </div>

    <div>
        <div class="mb-2 text-[13px] font-medium text-ink-2">主题色</div>
        <div class="flex flex-wrap gap-4" role="radiogroup" aria-label="主题色">
            {#each THEME_COLORS as color}
                <button
                        role="radio"
                        aria-checked={setting.themeColor === color.key}
                        title={color.name}
                        class="group flex flex-col items-center gap-1.5"
                        on:click={() => updateTheme({themeColor: color.key})}
                >
                    <span
                            class="flex size-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition-[box-shadow,transform] duration-150 group-hover:scale-110"
                            class:ring-2={setting.themeColor === color.key}
                            style="background:{color.swatch};--tw-ring-color:{color.swatch}"
                    >
                        {#if setting.themeColor === color.key}
                            <i class="ri-check-line" in:scale={{ start: 0.5, duration: 160 }}></i>
                        {/if}
                    </span>
                    <span class="text-xs text-ink-3 group-aria-checked:text-ink">{color.name}</span>
                </button>
            {/each}
        </div>
    </div>

    <div class="rounded-lg bg-surface-2 p-4">
        <div class="mb-2 text-xs text-ink-3">预览</div>
        <div class="neno-content">今天也要记录一下想法 <span class="neno-tag">#灵感</span></div>
        <div class="mt-3 flex justify-end">
            <span class="btn btn-sm btn-primary pointer-events-none">发送</span>
        </div>
    </div>
</div>
