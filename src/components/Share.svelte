<script context="module">
    let showShare = null;
    export function showShareView(
        _id,
        created_at,
        content,
        images,
        parent,
        parentId,
        children,
        searchContent,
        tags
    ) {
        showShare(_id, created_at, content, images, tags);
    }
</script>

<script>
    import {onMount, tick} from "svelte";
    import dayjs from "dayjs";
    import {renderContent} from "../lib/renderContent.js";
    import html2canvas from "html2canvas-pro";
    import {fade, scale} from "../lib/motion.js";
    import {getFileFromIndexedDB} from "../request/fetchApi";
    import {countStore} from "../store/store.js";
    import ShareCard from "./ShareCard.svelte";
    import ProgressLine from "./ProgressLine.svelte";

    const TEMPLATES = [
        {key: "paper", name: "纸笺", preview: "linear-gradient(170deg, #fdfaf3, #f0e7d6)"},
        {key: "aurora", name: "极光", preview: "linear-gradient(145deg, var(--primary-300), #ffffff 60%, var(--primary-200))"},
        {key: "night", name: "夜空", preview: "radial-gradient(circle at 25% 25%, var(--primary-500), #121418 70%)"},
    ];
    const TEMPLATE_KEY = "neno-share-template";

    let show = false;
    let created_at = "";
    let html = "";
    //卡片固定 400px 宽, 窄屏时按预览区域的宽度(去掉左右各 20px 内边距)整体缩小
    let previewArea = 0;
    $: previewZoom = previewArea ? Math.min(1, (previewArea - 40) / 400) : 1;
    let imageUrls = [];
    let template = "paper";
    let card;
    let busy = "";
    let message = "";
    let messageTimer = null;

    const canCopyImage = typeof window.ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
    //手机上优先使用系统分享面板(可以直接存到相册)
    const preferShareSheet = typeof navigator.canShare === "function" && window.matchMedia("(pointer: coarse)").matches;

    try {
        const saved = window.localStorage.getItem(TEMPLATE_KEY);
        if (TEMPLATES.some((item) => item.key === saved)) template = saved;
    } catch (e) {
        console.log(e);
    }

    onMount(() => {
        showShare = open;
    });

    async function open(_id, created, content, images, tags) {
        created_at = created;
        html = renderContent(content, {tags});
        imageUrls = [];
        message = "";
        show = true;
        imageUrls = await Promise.all((images || []).slice(0, 4).map(async ({key}) => (await getFileFromIndexedDB(key)).key));
    }

    function hidden() {
        show = false;
    }

    function chooseTemplate(key) {
        template = key;
        try {
            window.localStorage.setItem(TEMPLATE_KEY, key);
        } catch (e) {
            console.log(e);
        }
    }

    //按 3 倍分辨率导出, 圆角之外保持透明
    async function renderImage() {
        await tick();
        await Promise.all([...card.querySelectorAll("img")].map((img) => (img.complete ? null : img.decode().catch(() => null))));
        const rect = card.getBoundingClientRect();
        const canvas = await html2canvas(card, {
            scale: 3,
            //高度可能是小数, 向下取整, 避免最后一行像素半透明
            width: Math.floor(rect.width),
            height: Math.floor(rect.height),
            backgroundColor: null,
            allowTaint: true,
            useCORS: true,
            logging: false,
            //预览居中时卡片可能落在小数像素上, 导出的克隆固定到整数坐标, 避免图片边缘出现 1px 的透明缝
            onclone: (doc, element) => {
                Object.assign(element.style, {position: "fixed", left: "0px", top: "0px", margin: "0", zoom: "1"});
            },
        });
        return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    }

    function fileName() {
        return `neno-${dayjs(created_at).format("YYYYMMDD-HHmm")}.png`;
    }

    function flash(text) {
        message = text;
        clearTimeout(messageTimer);
        messageTimer = setTimeout(() => (message = ""), 2000);
    }

    async function run(kind, action) {
        if (busy) return;
        busy = kind;
        try {
            await action(await renderImage());
        } catch (error) {
            //用户取消系统分享面板时不算失败
            if (error && error.name === "AbortError") return;
            console.log(error);
            flash("生成图片失败, 请重试");
        } finally {
            busy = "";
        }
    }

    function save() {
        return run("save", async (blob) => {
            const file = new File([blob], fileName(), {type: "image/png"});
            if (preferShareSheet && navigator.canShare({files: [file]})) {
                await navigator.share({files: [file]});
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName();
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            flash("图片已保存");
        });
    }

    function copy() {
        return run("copy", async (blob) => {
            await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
            flash("已复制到剪贴板");
        });
    }

    function onKeydown(event) {
        if (show && event.key === "Escape") hidden();
    }
</script>

<svelte:window on:keydown={onKeydown}/>

{#if show}
    <div class="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
                class="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                in:fade={{ duration: 150 }}
                out:fade={{ duration: 150 }}
                on:click={() => hidden()}
                aria-hidden="true"
        ></div>
        <div
                in:scale={{ start: 0.96, duration: 200 }}
                class="relative flex max-h-[92vh] w-[460px] max-w-full flex-col overflow-hidden rounded-xl bg-surface shadow-pop"
                role="dialog"
                aria-modal="true"
                aria-label="分享卡片"
        >
            <header class="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
                <h2 class="text-[15px] font-semibold text-ink">分享卡片</h2>
                <button class="icon-btn -mr-2" aria-label="关闭" on:click={() => hidden()}>
                    <i class="ri-close-line"></i>
                </button>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto bg-surface-2 px-5 py-6" bind:clientWidth={previewArea}>
                <!-- 预览按容器宽度缩放, 导出时使用原始尺寸 -->
                <div class="share-preview mx-auto" style:zoom={previewZoom}>
                    <ShareCard
                            bind:card
                            {created_at}
                            {html}
                            {imageUrls}
                            {template}
                            noteCount={$countStore.nenoCount}
                            dayCount={$countStore.dayCount}
                    />
                </div>
            </div>

            <div class="shrink-0 border-t border-line px-5 pt-3 pb-4">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2" role="radiogroup" aria-label="卡片样式">
                        {#each TEMPLATES as item}
                            <button
                                    role="radio"
                                    aria-checked={template === item.key}
                                    class="group flex flex-col items-center gap-1"
                                    on:click={() => chooseTemplate(item.key)}
                            >
                                <span
                                        class="block size-9 rounded-lg border border-line ring-offset-2 ring-offset-surface transition-[box-shadow,transform] duration-150 group-hover:scale-105"
                                        class:ring-2={template === item.key}
                                        class:ring-primary-500={template === item.key}
                                        style="background:{item.preview}"
                                ></span>
                                <span class="text-[11px] text-ink-3 group-aria-checked:text-ink">{item.name}</span>
                            </button>
                        {/each}
                    </div>
                    <div class="flex items-center gap-2">
                        {#if canCopyImage && !preferShareSheet}
                            <button class="btn btn-secondary" disabled={!!busy} on:click={copy}>
                                {#if busy === "copy"}<ProgressLine/>{:else}<i class="ri-file-copy-line"></i>复制{/if}
                            </button>
                        {/if}
                        <button class="btn btn-primary min-w-24" disabled={!!busy} on:click={save}>
                            {#if busy === "save"}
                                <ProgressLine bgColor="white"/>
                            {:else if preferShareSheet}
                                <i class="ri-share-forward-line"></i>分享图片
                            {:else}
                                <i class="ri-download-2-line"></i>保存图片
                            {/if}
                        </button>
                    </div>
                </div>
                <div class="mt-2 h-4 text-right text-xs text-primary-600 dark:text-primary-300" aria-live="polite">{message}</div>
            </div>
        </div>
    </div>
{/if}

<style>
    .share-preview {
        width: 400px;
    }
</style>
