<script context="module">
    let opener = null;

    //确认对话框, 返回 Promise<boolean>; 组件未挂载时退回到系统对话框
    //options: {title, message, preview, confirmText, cancelText, danger, icon}
    export function confirmDialog(options) {
        if (!opener) return Promise.resolve(window.confirm(options.message || options.title));
        return opener({cancelText: "取消", confirmText: "确定", ...options, alert: false});
    }

    //提示对话框, 只有一个按钮
    export function alertDialog(options) {
        if (!opener) {
            window.alert(options.message || options.title);
            return Promise.resolve(true);
        }
        return opener({confirmText: "知道了", ...options, alert: true});
    }
</script>

<script>
    import {onMount, tick} from "svelte";
    import {fade, scale} from "../lib/motion.js";

    let open = false;
    let options = {};
    let resolver = null;
    let dialogEl;
    let cancelEl;
    let confirmEl;
    let returnFocus = null;

    onMount(() => {
        opener = (value) => {
            //上一个对话框还没关闭时视为取消
            if (resolver) resolver(false);
            options = value;
            returnFocus = document.activeElement;
            open = true;
            tick().then(() => {
                //危险操作默认聚焦"取消", 避免误按回车删除
                (options.danger && cancelEl ? cancelEl : confirmEl)?.focus();
            });
            return new Promise((resolve) => {
                resolver = resolve;
            });
        };
        return () => {
            opener = null;
        };
    });

    function close(result) {
        if (!open) return;
        open = false;
        const resolve = resolver;
        resolver = null;
        resolve?.(result);
        if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
    }

    function onKeydown(event) {
        if (!open) return;
        if (event.key === "Escape") {
            event.preventDefault();
            close(false);
        } else if (event.key === "Tab") {
            //焦点只在对话框的按钮之间循环
            const buttons = [cancelEl, confirmEl].filter(Boolean);
            const index = buttons.indexOf(document.activeElement);
            event.preventDefault();
            const next = event.shiftKey ? index - 1 : index + 1;
            buttons[(next + buttons.length) % buttons.length]?.focus();
        }
    }

    $: iconClass = options.icon || (options.danger ? "ri-delete-bin-line" : options.alert ? "ri-information-line" : "ri-question-line");
</script>

<svelte:window on:keydown={onKeydown}/>

{#if open}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
                class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                in:fade={{ duration: 150 }}
                out:fade={{ duration: 120 }}
                on:click={() => close(false)}
                aria-hidden="true"
        ></div>
        <div
                bind:this={dialogEl}
                class="relative w-full max-w-[400px] rounded-xl border border-line bg-surface p-5 shadow-pop"
                in:scale={{ start: 0.96, duration: 180 }}
                out:scale={{ start: 0.98, duration: 120 }}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={options.message ? "confirm-dialog-message" : undefined}
        >
            <div class="flex gap-3.5">
                <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-full text-lg"
                        class:bg-red-50={options.danger}
                        class:text-red-600={options.danger}
                        class:dark:text-red-400={options.danger}
                        class:danger-icon={options.danger}
                        class:text-primary-600={!options.danger}
                        class:normal-icon={!options.danger}
                        aria-hidden="true"
                >
                    <i class={iconClass}></i>
                </div>
                <div class="min-w-0 flex-1 pt-0.5">
                    <h2 id="confirm-dialog-title" class="text-[15px] font-semibold text-ink">{options.title}</h2>
                    {#if options.message}
                        <p id="confirm-dialog-message" class="mt-1 text-[13px] leading-relaxed text-ink-2">{options.message}</p>
                    {/if}
                    {#if options.preview}
                        <blockquote class="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink-2">
                            <span class="line-clamp-2">{options.preview}</span>
                        </blockquote>
                    {/if}
                </div>
            </div>
            <div class="mt-5 flex justify-end gap-2">
                {#if !options.alert}
                    <button bind:this={cancelEl} class="btn btn-secondary" on:click={() => close(false)}>
                        {options.cancelText}
                    </button>
                {/if}
                <button
                        bind:this={confirmEl}
                        class="btn"
                        class:btn-primary={!options.danger}
                        class:btn-destructive={options.danger}
                        on:click={() => close(true)}
                >
                    {options.confirmText}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* 图标底色: 危险操作用浅红, 其他用主题色浅底 */
    :global(.dark) .danger-icon {
        background-color: rgb(239 68 68 / 0.12);
    }
    .normal-icon {
        background-color: color-mix(in oklab, var(--primary-500) 12%, transparent);
    }
    :global(.dark) .normal-icon {
        color: var(--primary-300);
    }
</style>
