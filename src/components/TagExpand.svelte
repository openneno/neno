<script>
    import { createEventDispatcher, onMount } from "svelte";
    export let tag = "";
    export let selectionTag = "";
    export let parentTag = "";

    let showTag = "";
    let subTag = "";
    let showSub = false;

    const dispatch = createEventDispatcher();
    $: {
        let index = tag.indexOf("/");
        if (index == -1) {
            showTag = tag;
        } else {
            showTag = tag.substring(0, index);
            subTag = tag.substring(index + 1);
        }
    }
</script>

<div>
    <button
        class="rounded-r  group p-4 pt-2 pb-2  focus:outline-none w-full hover:text-white hover:bg-green-400 flex justify-between text-sm"
        class:bg-green-500={selectionTag == tag}
        class:text-white={selectionTag == tag}
        on:click={() => {
            dispatch("selectTag", parentTag + showTag);
        }}
    >
        {showTag}
        <button
            class="focus:outline-none group-hover:opacity-100 opacity-0  pl-2 pr-2"
            on:click|stopPropagation={() => {
                dispatch("pinTag", parentTag + showTag);
            }}
        >
            <i class="ri-pushpin-fill" />
        </button>
        {#if subTag.length != 0}
            <button
                class="focus:outline-none group-hover:opacity-100 opacity-0  pl-2 pr-2"
                on:click|stopPropagation={() => {
                    showSub = !showSub;
                }}
            >
                {#if showSub}
                    <i class="ri-arrow-right-s-line" />
                {:else}
                    <i class="ri-arrow-down-s-line" />
                {/if}
            </button>
        {/if}
    </button>
    {#if subTag.length != 0 && showSub}
        <div class="ml-2">
            <svelte:self
                on:selectTag={(event) => {
                    console.log("selectTag", event.detail);

                    dispatch("selectTag", event.detail);
                }}
                on:pinTag={(event) => {
                    console.log("pinTag", event.detail);
                    dispatch("pinTag", event.detail);
                }}
                tag={subTag}
                {selectionTag}
                parentTag={parentTag + showTag + "/"}
            />
        </div>
    {/if}
</div>
