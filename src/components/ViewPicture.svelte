<script context="module">
    let showDetailss = null;
    export function showPictureView(imageFiles, showIndex) {
        console.log("showSlide");
        showDetailss(imageFiles, showIndex);
    }
</script>

<script>
    import { fly, fade } from "svelte/transition";
    import { getObjectURL } from "../utils/process";

    import { onMount, onDestroy } from "svelte";
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
        showLeft = false;
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
            <img
                class=" w-full max-h-full object-cover  shadow-lg"
                src={showImageInfo.file == null
                    ? showImageInfo.uploadInfo == undefined
                        ? showImageInfo.imgDomain + "/" + showImageInfo.key
                        : showImageInfo.uploadInfo.imgDomain +
                          "/" +
                          showImageInfo.uploadInfo.key
                    : getObjectURL(showImageInfo.file)}
                alt=""
            />
        </div>

        <div
            class="flex flex-row justify-center items-baseline"
            style="height:20vh"
        >
            {#each imageFilesIn as { file, uploadInfo, timeStamp, key, imgDomain }, index}
                <div
                    class="w-16 h-16 box-border  border-2 rounded mr-2 mb-2 relative overflow-hidden"
                    on:click|stopPropagation={() => {
                        showImageInfo = imageFilesIn[index];
                    }}
                >
                    <img
                        class=" w-full h-full object-cover"
                        src={file == null
                            ? uploadInfo == undefined
                                ? imgDomain + "/" + key
                                : uploadInfo.imgDomain + "/" + uploadInfo.key
                            : getObjectURL(file)}
                        alt=""
                    />
                </div>
            {/each}
        </div>
    </div>
{/if}
