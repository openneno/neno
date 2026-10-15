<script context="module">
    let showDetailss;

    export function showNeno(nenoId, isHidden) {
        console.log("showNeno", nenoId, isHidden);
        showDetailss(nenoId, isHidden);
    }
</script>

<script>
    import { fly, fade, noteEnter, noteLeave } from "../lib/motion.js";
    import QuillEditor from "./QuillEditor.svelte";
    import NenoItem from "./NenoItem.svelte";
    import ProgressLine from "./ProgressLine.svelte";
    import { detail } from "../request/fetchApi";
    import { onNoteChange } from "../lib/noteEvents.js";

    import { onMount } from "svelte";
    let isLoding = true;
    let show = false;
    let showRight = false;
    let nenoDetail = { children: [], _id: "" };

    onMount(() => {

        showDetailss = showDetail;

        //面板中的笔记或其批注发生变化时重新读取, 删除了当前笔记时关闭面板
        return onNoteChange(({ type, note }) => {
            if (!show || nenoDetail._id === "") return;
            if (type === "delete" && note._id === nenoDetail._id) {
                hidden();
                return;
            }
            const related = note._id === nenoDetail._id
                || note.parentId === nenoDetail._id
                || nenoDetail.children.some((item) => item._id === note._id || item._id === note.parentId);
            if (related) getDetail(nenoDetail._id, true);
        });
    });

    let _id = "";
    function showDetail(newNenoId) {
        _id = newNenoId;
        if (show !== true) {
            showRight = true;
        }
        show = true;
        getDetail(_id);
    }
    function getDetail(_id, quiet = false) {
        isLoding = !quiet;
        detail({ _id: _id })
            .then((respone) => {
                nenoDetail = respone.body;

                console.log(nenoDetail);
                isLoding = false;
            })
            .catch((reason) => {
                console.log(reason);
                isLoding = false;
            });
    }
    function hidden() {
        isLoding = false;
        show = false;
        showRight = false;
        nenoDetail = { children: [], _id: "" };
    }
</script>

{#if show}
    <div class="fixed inset-0 z-30">
        <div
                class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                in:fade={{ duration: 150 }}
                out:fade={{ duration: 150 }}
                on:click={() => hidden()}
                aria-hidden="true"
        ></div>
        {#if showRight}
            <div
                    in:fly={{ x: 40, duration: 220 }}
                    out:fly={{ x: 40, duration: 180 }}
                    class="absolute inset-y-0 right-0 flex w-full flex-col bg-canvas shadow-pop sm:w-[540px] sm:border-l sm:border-line"
                    role="dialog"
                    aria-modal="true"
                    aria-label="笔记详情"
            >
                <header class="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
                    <h2 class="text-[15px] font-semibold text-ink">笔记详情</h2>
                    <button class="icon-btn -mr-2" aria-label="关闭" on:click={() => hidden()}>
                        <i class="ri-close-line"></i>
                    </button>
                </header>

                <div class="flex-1 overflow-y-auto px-5 pt-4 pb-10">
                    {#if isLoding}
                        <div class="mb-3"><ProgressLine /></div>
                    {/if}

                    <NenoItem
                            _id={nenoDetail._id}
                            created_at={nenoDetail.created_at}
                            update_at={nenoDetail.update_at}
                            content={nenoDetail.content}
                            parentId={nenoDetail.parentId}
                            parent={nenoDetail.parent}
                            images={nenoDetail.images}
                            tags={nenoDetail.tags}
                            collapsible={false}
                    />

                    <div class="mt-6 mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                        <i class="ri-chat-quote-line text-ink-3"></i>批注
                        {#if nenoDetail.children.length > 0}
                            <span class="font-normal text-ink-3 tabular-nums">{nenoDetail.children.length}</span>
                        {/if}
                    </div>
                    <div class="border-l-2 border-line pl-4">
                        {#each nenoDetail.children as item (item._id)}
                            <div class="flow-root" in:noteEnter={{active: true}} out:noteLeave={{active: true}}>
                                <NenoItem {...item}/>
                            </div>
                        {/each}
                        <QuillEditor parentId={nenoDetail._id} placeholder="写下你的批注..."/>
                    </div>
                </div>
            </div>
        {/if}
    </div>
{/if}
