<script>
    import { createEventDispatcher} from "svelte";
    import TagExpand from "./TagExpand.svelte";
    import {slide} from "../lib/motion.js";
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
            class="nav-item group h-8 justify-between"
            class:nav-item-active={selectionTag === tag}
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
        <span class="flex min-w-0 items-center gap-2">
            {#if children.length !== 0}
                <button
                        class="flex size-4 shrink-0 items-center justify-center text-ink-3 hover:text-ink"
                        aria-label={showSub ? "收起子标签" : "展开子标签"}
                        aria-expanded={showSub}
                        on:click|stopPropagation={() => {
                            showSub = !showSub;
                        }}
                >
                    <i class="ri-arrow-right-s-line inline-block transition-transform duration-200" class:rotate-90={showSub}></i>
                </button>
            {:else}
                <span class="flex size-4 shrink-0 items-center justify-center"><i class="ri-hashtag text-[13px] text-ink-3"></i></span>
            {/if}
            <span class="truncate">{showTag.indexOf("#") === 0 ? showTag.substring(1) : showTag}</span>
        </span>
        <span class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
                    class="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
                    title="重命名" aria-label="重命名"
                    on:click|stopPropagation={() => {
                        isChangeTaging = !isChangeTaging;
                        selfTag = tag.substring(1);
                    }}
            >
                <i class="ri-edit-line text-[13px]"></i>
            </button>
            <button
                    class="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
                    title="置顶" aria-label="置顶"
                    on:click|stopPropagation={() => {
                        dispatch("pinTag", tag);
                    }}
            >
                <i class="ri-pushpin-line text-[13px]"></i>
            </button>
        </span>
    </div>
    {#if isChangeTaging}
        <div class="my-1 flex flex-col gap-2 rounded-lg bg-surface-2 p-2" transition:slide={{duration: 160}}>
            <div class="relative">
                <i class="ri-hashtag pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[13px] text-ink-3"></i>
                <input class="input h-8 pl-7" type="text" aria-label="新的标签名" bind:value={selfTag}/>
            </div>
            <div class="flex justify-end gap-1.5">
                <button
                        class="btn btn-sm btn-ghost"
                        on:click|stopPropagation={() => {
                            isChangeTaging = false;
                        }}>取消
                </button>
                <button
                        class="btn btn-sm btn-primary"
                        on:click|stopPropagation={() => {
                            dispatch("renameTag", {
                                oldTag: tag,
                                newTag: "#" + selfTag,
                            });
                            isChangeTaging = false;
                        }}>确定
                </button>
            </div>
        </div>
    {/if}
    {#if children.length !== 0 && showSub}
        <div class="ml-3 border-l border-line pl-1" transition:slide={{duration: 180}}>
            {#each children as item}
                <TagExpand
                        on:selectTag={(event) => {
                            dispatch("selectTag", event.detail);
                        }}
                        on:pinTag={(event) => {
                            dispatch("pinTag", event.detail);
                        }}
                        on:renameTag={(event) => {
                            dispatch("renameTag", event.detail);
                        }}
                        {...item}
                        {selectionTag}
                />
            {/each}
        </div>
    {/if}
</div>
