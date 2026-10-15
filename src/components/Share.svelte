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
        showShare(
            _id,
            created_at,
            content,
            images,
            parent,
            parentId,
            children,
            searchContent,
            tags
        );
    }
</script>

<script>
    import { fly, fade, scale } from "../lib/motion.js";
    import { getObjectURL } from "../utils/process";
    import { getFileFromIndexedDB } from "../request/fetchApi";
    import dayjs from 'dayjs'
    import html2canvas from "html2canvas-pro";
    import {countStore, searchNenoByTag} from "../store/store.js";
    import {onMount} from "svelte";
    let show = false;
    onMount(() => {
        showShare = showDetail;
    });
    var _id;
    var created_at;
    var content = "";
    var images = [];
    var parent;
    var parentId;
    var children;
    var searchContent;
    var tags;
    var card;
    var cardcontainer;
    function showDetail(
        _id_t,
        created_at_t,
        content_t,
        images_t,
        parent_t,
        parentId_t,
        children_t,
        searchContent_t,
        tags_t
    ) {
        show = !show;

        _id = _id_t;
        created_at = created_at_t;
        content = content_t;
        images = images_t;
        parent = parent_t;
        parentId = parentId_t;
        children = children_t;
        searchContent = searchContent_t;
        tags = tags_t;
        console.log(
            "showShareView",

            _id,
            created_at,
            content,
            images,
            parent,
            parentId,
            children,
            searchContent
        );
    }

    function hidden() {
        show = false;
    }

    async function getImageurl( key, index) {
        const url = await getFileFromIndexedDB(key);
        if (index === images.length - 1) {
            setTimeout(() => {
                console.log(card);
                html2canvas(card, { allowTaint: true, scale: Math.max(2, window.devicePixelRatio || 1), backgroundColor: null }).then((canvas) => {
                    let ac = card.children;
                    console.log(ac);
                    card.style.display = "none";

                    cardcontainer.appendChild(canvas);
                });
            }, 200);
        }
        return url.key;
    }
    function praseTag(rawContent, tags) {
        let pContent = "";
        let pIndex = 0;
        let copyRawContent = rawContent;
        if (tags != null) {
            for (let index = 0; index < tags.length; index++) {
                let rawtag = tags[index];
                let breakIndex = rawContent.indexOf(rawtag);
                //截取前段的字符
                pContent += rawContent.substring(0, breakIndex);
                //加上替换的内容
                pContent += `<span class="neno-tag">${rawtag}</span>`;
                rawContent = rawContent.substring(breakIndex + rawtag.length);
                pIndex += breakIndex + rawtag.length;
            }
        }
        pContent += copyRawContent.substring(pIndex);
        if (images.length == 0) {
            setTimeout(() => {
                html2canvas(card, { allowTaint: true, scale: Math.max(2, window.devicePixelRatio || 1), backgroundColor: null }).then((canvas) => {
                    card.style.display = "none";

                    cardcontainer.appendChild(canvas);
                });
            }, 200);
        }
        return pContent;
    }
</script>

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
                class="relative flex max-h-[90vh] w-[480px] max-w-full flex-col overflow-hidden rounded-xl bg-surface shadow-pop"
                role="dialog"
                aria-modal="true"
                aria-label="分享卡片"
        >
            <header class="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
                <div>
                    <h2 class="text-[15px] font-semibold text-ink">分享卡片</h2>
                    <p class="text-xs text-ink-3">长按或右键保存图片</p>
                </div>
                <button class="icon-btn -mr-2" aria-label="关闭" on:click={() => hidden()}>
                    <i class="ri-close-line"></i>
                </button>
            </header>
            <div class="share-canvas overflow-y-auto px-5 pb-5" bind:this={cardcontainer}>
                <div class="light-scope rounded-xl border border-line bg-white px-7 pt-6 pb-5" bind:this={card}>
                    <div class="text-xs text-ink-3 tabular-nums">
                        {dayjs(created_at).format("YYYY年M月D日 HH:mm")}
                    </div>
                    <div class="neno-content mt-2">
                        <div>
                            {@html praseTag(content, tags)}
                        </div>
                    </div>
                    {#if images.length > 0}
                        <div class="mt-4 flex flex-col gap-2">
                            {#each images as {  key }, index (index)}
                                {#await getImageurl( key, index) then value}
                                    <img class="w-full rounded-lg object-cover" src={value} alt=""/>
                                {/await}
                            {/each}
                        </div>
                    {/if}
                    <div class="mt-6 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-3">
                        <span class="flex items-center gap-1.5 font-medium text-ink-2">
                            <span class="flex size-4 items-center justify-center rounded bg-primary-500 text-[10px] text-white"><i class="ri-quill-pen-fill"></i></span>
                            NENO
                        </span>
                        <span class="tabular-nums">{$countStore.nenoCount} 条笔记 · {$countStore.dayCount} 天</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* html2canvas 生成的图片替换卡片后, 按容器宽度显示 */
    .share-canvas :global(canvas) {
        display: block;
        width: 100% !important;
        height: auto !important;
        border-radius: 12px;
    }
</style>
