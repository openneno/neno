<script context="module">
    let showDetailss = null;
    export function showPictureView(imageFiles, showIndex) {
        console.log("showSlide");
        showDetailss(imageFiles, showIndex);
    }
</script>

<script>
    import { fade, scale } from "../lib/motion.js";
    import { getObjectURL } from "../utils/process";
    import { getFileFromIndexedDB } from "../request/fetchApi";

    import { onMount } from "svelte";
    let show = false;
    let imageFilesIn = [];
    let showIndexIn = 0;
    let showImageInfo = {};

    onMount(() => {
        showDetailss = showDetail;
    });

    function showDetail(imageFiles, showIndex) {
        show = !show;
        imageFilesIn = imageFiles;
        showImageInfo = imageFiles[showIndex];
        showIndexIn = showIndex;
    }

    function hidden() {
        show = false;
    }
    async function getPIcUrl(showImageInfo) {
        let url;
        if (showImageInfo.file == null) {
            if (showImageInfo.uploadInfo === undefined) {
                url = await getFileFromIndexedDB(showImageInfo.key);
                return url.key;
            } else {
                url = await getFileFromIndexedDB(showImageInfo.uploadInfo.key);
                return url.key;
            }
        } else {
            return getObjectURL(showImageInfo.file); //预览模式未上传
        }
    }
</script>

{#if show}
    <div
            class="fixed inset-0 z-40 flex flex-col items-center"
            in:fade={{ duration: 150 }}
            out:fade={{ duration: 150 }}
            role="dialog"
            tabindex="-1"
            aria-modal="true"
            aria-label="查看图片"
    >
        <!-- 点击图片以外的区域关闭 -->
        <div class="absolute inset-0 bg-black/85 backdrop-blur-sm" on:click={() => hidden()} aria-hidden="true"></div>
        <button class="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20" aria-label="关闭" on:click={() => hidden()}>
            <i class="ri-close-line"></i>
        </button>
        <div class="pointer-events-none relative flex min-h-0 w-full flex-1 items-center justify-center p-6 sm:p-12">
            {#await getPIcUrl(showImageInfo) then value}
                {#key showImageInfo}
                    <img
                            in:scale={{ start: 0.96, duration: 200 }}
                            class="pointer-events-auto max-h-full max-w-full rounded-lg object-contain shadow-pop"
                            src={value}
                            alt=""
                    />
                {/key}
            {/await}
        </div>
        {#if imageFilesIn.length > 1}
            <div class="relative flex shrink-0 gap-2 pb-8">
                {#each imageFilesIn as item, index}
                    <button
                            class="size-14 overflow-hidden rounded-lg opacity-60 ring-2 ring-transparent transition-[opacity,box-shadow,transform] duration-150 hover:scale-105 hover:opacity-100"
                            class:opacity-100={showImageInfo === item}
                            class:ring-white={showImageInfo === item}
                            aria-label="第 {index + 1} 张"
                            on:click={() => {
                                showImageInfo = imageFilesIn[index];
                            }}
                    >
                        {#await getPIcUrl(item) then value}
                            <img class="size-full object-cover" src={value} alt=""/>
                        {/await}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
{/if}
