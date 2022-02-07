<script context="module">
    let showDetailss = null;
    export function showPictureView(imageFiles, showIndex) {
        console.log("showSlide");
        showDetailss(imageFiles, showIndex);
    }
</script>

<script>
    import { fade } from "svelte/transition";
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
        class="w-screen bg-black bg-opacity-50 fixed top-0 z-20 h-screen flex flex-col justify-between items-center"
        in:fade={{ duration: 190 }}
        out:fade={{ duration: 210 }}
        on:click={() => {
            hidden();
        }}
    >
        <div
            style="height:80vh"
            class=" w-auto   rounded relative overflow-hidden flex justify-center items-center"
        >
            {#await getPIcUrl(showImageInfo) then value}
                <img
                    class=" w-full  max-h-full object-cover  shadow-lg"
                    src={value}
                    alt=""
                />
            {/await}
        </div>

        <div
            class="flex flex-row justify-center items-baseline"
            style="height:20vh"
        >
            {#each imageFilesIn as item, index}
                <div
                    class="w-16 h-16 box-border  border-2 rounded mr-2 mb-2 relative overflow-hidden"
                    on:click|stopPropagation={() => {
                        showImageInfo = imageFilesIn[index];
                    }}
                >
                    {#await getPIcUrl(item) then value}
                        <img
                            class=" w-full h-full object-cover"
                            src={value}
                            alt=""
                        />
                    {/await}
                </div>
            {/each}
        </div>
    </div>
{/if}
