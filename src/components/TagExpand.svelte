<script>
    import { createEventDispatcher} from "svelte";
    import TagExpand from "./TagExpand.svelte";
    export let tag = "";
    export let selectionTag = "";
    export let parentTag = "";
    export let showTag = "";

    export let children = [];
    let showSub = false;
    let selfTag = "";

    let isChangeTaging = false;

    const dispatch = createEventDispatcher();

</script>

<div>
    <div
        role="button"
        tabindex="0"
        class="rounded-r  group p-4 pt-2 pb-2  focus:outline-hidden w-full hover:text-white hover:bg-primary-400 flex justify-between text-sm   dark:text-slate-300 cursor-pointer"
        class:bg-primary-500={selectionTag === tag}
        class:text-slate-800={selectionTag !== tag}
        class:text-white={selectionTag === tag}
        on:mouseenter={()=>{
            console.log("selectTag", tag,selectionTag)

        }}
        on:click={() => {
            dispatch("selectTag", tag);
        }}
        on:keydown={(e) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                dispatch("selectTag", tag);
            }
        }}
    >
        <div class="flex">
            <div class=""><i class="ri-hashtag"></i></div>
            <div class="ml-1">
                {showTag.indexOf("#") === 0 ? showTag.substring(1) : showTag}
            </div>
        </div>
        <div>
            <button
                class="focus:outline-hidden group-hover:opacity-100 opacity-0   pr-1"
                on:click|stopPropagation={() => {
                    isChangeTaging = !isChangeTaging;
                    selfTag = tag.substring(1);
                }}
            >
                <i class="ri-edit-fill"></i>
            </button>
            <button
                class="focus:outline-hidden group-hover:opacity-100 opacity-0   pr-1"
                on:click|stopPropagation={() => {
                    dispatch("pinTag", tag);
                }}
            >
                <i class="ri-pushpin-fill"></i>
            </button>

            {#if children.length !== 0}
                <button
                    class="focus:outline-hidden group-hover:opacity-100 opacity-0  pr-1"
                    on:click|stopPropagation={() => {
                        showSub = !showSub;
                    }}
                >
                    {#if showSub}
                        <i class="ri-arrow-right-s-line"></i>
                    {:else}
                        <i class="ri-arrow-down-s-line"></i>
                    {/if}
                </button>
            {/if}
        </div>
    </div>
    {#if isChangeTaging}
        <div class="pl-2">
            <div
                class="flex items-center bg-gray-200 rounded-lg border-solid border-4  "
            >
                <div class=""><i class="ri-hashtag"></i></div>
                <input
                    class="focus:outline-hidden  h-8 p-2 pl-1 rounded-xs w-full text-gray-700"
                    type="text"
                    bind:value={selfTag}
                />
            </div>

            <div class="flex justify-between  w-full mt-2 ">
                <button
                    class="w-5/12 text-gray-700 bg-white rounded-xs border-solid border-4 "
                    on:click|stopPropagation={() => {
                        isChangeTaging = false;
                    }}>取消</button
                >
                <button
                    class="w-5/12 bg-primary-500 rounded-xs text-white"
                    on:click|stopPropagation={() => {
                        dispatch("renameTag", {
                            oldTag: tag,
                            newTag: "#" + selfTag,
                        });
                        console.log("确定renameTag", {
                            oldTag: tag,
                            newTag: "#" + selfTag,
                        });

                        isChangeTaging = false;
                    }}>确定</button
                >
            </div>
        </div>
    {/if}
    {#if children.length !== 0 && showSub}
        {#each children as item}
            <div class="ml-2">
                <TagExpand
                    on:selectTag={(event) => {
                        console.log("selectTag", event.detail);

                        dispatch("selectTag", event.detail);
                    }}
                    on:pinTag={(event) => {
                        console.log("pinTag", event.detail);
                        dispatch("pinTag", event.detail);
                    }}
                    on:renameTag={(event) => {
                        console.log("renameTag", event.detail);
                        dispatch("renameTag", event.detail);
                    }}
                    {...item}
                    {selectionTag}
                />
            </div>
        {/each}
    {/if}
</div>
