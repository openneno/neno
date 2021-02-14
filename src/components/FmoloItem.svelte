<script context="module">
    let current;
</script>

<script>
    import { showFmolo } from "./SideInRight.svelte";
    import QuillEditor from "./QuillEditor.svelte";

    export let createTime = "2021-02-01 11:12:24";
    export let content = "";
    export let images = [];
    export let parent = null;
    export let children = [];
    function plainContent(content) {
        let aa = document.createElement("div");
        aa.insertAdjacentHTML("afterbegin", content);
        return aa.textContent;
    }
    let moreList;
    let openMore = false;
    let editMode = false;

    function toggleMoreWindow(node) {
        console.log("toggleMoreWindow", node);

        if (node == 2) {
            openMore = false;
        }
    }
    function action(params) {
        console.log(params);
        params.focus();
    }
    function toggleMore(node) {
        console.log("button", node);
        openMore = !openMore;
    }
    function toggleEditMode(params) {
        console.log("toggleEditMode", params);
        editMode = !editMode;
    }
</script>

<!-- <svelte:window on:click={() => toggleMoreWindow(2)} /> -->
<div class="w-full p-4 rounded-lg bg-white mb-4 shadow-sm  hover:shadow-lg">
    <div class="flex justify-between">
        <div class="text-sm text-gray-500">{createTime}</div>
        <div class="relative">
            <button on:click={() => toggleMore(1)} class="focus:outline-none ">
                <i class="ri-more-line" />
            </button>
            {#if openMore == true}
                <div
                    use:action
                    tabindex="0"
                    on:blur|stopPropagation={() => {
                        setTimeout(() => {
                            toggleMore();
                        }, 200);
                    }}
                    bind:this={moreList}
                    class=" absolute w-16  bg-white shadow-xl rounded-lg flex flex-col justify-center  border-gray-200  border-solid space-y-1 pt-2 pb-2 focus:outline-none"
                    style="left:-16px;border-width:1px"
                >
                    <button class="focus:outline-none hover:bg-gray-300 "
                        >分享</button
                    >
                    <button
                        class="focus:outline-none hover:bg-gray-300 "
                        on:click={() => {
                            toggleEditMode();
                        }}>编辑</button
                    >
                    <button class="focus:outline-none hover:bg-gray-300"
                        >批注</button
                    >
                    <button class="focus:outline-none hover:bg-gray-300"
                        >删除</button
                    >
                </div>
            {/if}
        </div>
    </div>
    {#if editMode}
        <QuillEditor {content} canCancle={true} />
    {:else}
        <div class="list-decimal text-sm text-red-300">
            <p>{@html content}</p>
        </div>
    {/if}

    <div class="flex flex-wrap flex-row  mt-4  pl-3">
        {#each images as { url }, index (index)}
            <img
                class="w-32 h-32 rounded-md mr-2 mb-2 object-cover"
                src={url}
                alt=""
            />
        {/each}
    </div>
    {#if parent != null}
        <button
            class="flex items-center space-x-1  hover:shadow-sm focus:outline-none"
            on:click={showFmolo}
        >
            <i
                class="ri-arrow-up-circle-fill transform  -rotate-45 text-gray-500"
            />
            <div
                class="text-gray-500 text-sm"
                style="-webkit-line-clamp: 1;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;"
            >
                {plainContent(parent.content)}
            </div>
        </button>
    {/if}

    {#each children as item}
        <button
            class="flex items-center  space-x-1   hover:shadow-sm focus:outline-none"
            on:click={showFmolo}
        >
            <i
                class="ri-arrow-down-circle-fill transform  -rotate-45 text-gray-500"
            />
            <div
                class="text-gray-500 text-sm"
                style="-webkit-line-clamp: 1;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            overflow: hidden;"
            >
                {plainContent(item.content)}
            </div>
        </button>
    {/each}
</div>

<!-- <svelte:window on:click={toggleMore} /> -->
<style type="text/postcss">
</style>
