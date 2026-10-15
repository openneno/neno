<script>
    import {settingStore} from "../store/store.js";
    import {THEME_COLORS, THEME_MODES, normalizeSetting, updateTheme} from "../lib/theme.js";

    $: setting = normalizeSetting($settingStore);
</script>

<div class="flex flex-col space-y-4">
    <div>
        <div class="text-sm text-gray-500 dark:text-slate-300 mb-2">外观</div>
        <div class="inline-flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1" role="radiogroup" aria-label="外观">
            {#each THEME_MODES as mode}
                <button
                        role="radio"
                        aria-checked={setting.themeMode === mode.key}
                        class="flex items-center px-3 py-1 rounded-md text-sm focus:outline-hidden transition-colors"
                        class:bg-white={setting.themeMode === mode.key}
                        class:dark:bg-gray-500={setting.themeMode === mode.key}
                        class:shadow-xs={setting.themeMode === mode.key}
                        class:text-primary-600={setting.themeMode === mode.key}
                        on:click={() => updateTheme({themeMode: mode.key})}
                >
                    <i class="{mode.icon} mr-1"></i>{mode.name}
                </button>
            {/each}
        </div>
    </div>

    <div>
        <div class="text-sm text-gray-500 dark:text-slate-300 mb-2">主题色</div>
        <div class="flex flex-wrap gap-3" role="radiogroup" aria-label="主题色">
            {#each THEME_COLORS as color}
                <button
                        role="radio"
                        aria-checked={setting.themeColor === color.key}
                        title={color.name}
                        class="flex flex-col items-center focus:outline-hidden group"
                        on:click={() => updateTheme({themeColor: color.key})}
                >
                    <span
                            class="w-9 h-9 rounded-full flex items-center justify-center text-white ring-offset-2 ring-offset-gray-100 dark:ring-offset-black transition-shadow group-hover:ring-2 ring-gray-300"
                            class:ring-2={setting.themeColor === color.key}
                            style="background:{color.swatch};{setting.themeColor === color.key ? `--tw-ring-color:${color.swatch}` : ''}"
                    >
                        {#if setting.themeColor === color.key}
                            <i class="ri-check-line ri-lg"></i>
                        {/if}
                    </span>
                    <span class="text-xs mt-1 text-gray-600 dark:text-slate-300">{color.name}</span>
                </button>
            {/each}
        </div>
    </div>

    <div class="rounded-lg bg-white dark:bg-gray-600 p-3 max-w-md shadow-xs">
        <div class="text-xs text-gray-500 dark:text-slate-300 mb-1">预览</div>
        <div class="text-sm dark:text-slate-100">
            今天也要记录一下想法
            <span class="rounded-xs bg-primary-500 text-white text-sm px-1 ml-1">#灵感</span>
        </div>
        <div class="flex justify-end mt-2">
            <span class="rounded-sm bg-primary-500 text-white text-sm px-3 py-1">发送</span>
        </div>
    </div>
</div>
