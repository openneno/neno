<script context="module">
    let showDetailss;

    export function showNeno(nenoId, isHidden) {
        console.log("showNeno", nenoId, isHidden);
        showDetailss(nenoId, isHidden);
    }
</script>

<script>
    import { fly, fade } from "svelte/transition";
    import QuillEditor from "./QuillEditor.svelte";
    import NenoItem from "./NenoItem.svelte";
    import ProgressLine from "./ProgressLine.svelte";
    import { detail } from "../request/fetchApi";

    import { onMount } from "svelte";
    let isLoding = true;
    let show = false;
    let showRight = false;
    let nenoDetail = { children: [], _id: "" };

    onMount(() => {

        showDetailss = showDetail;

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
    function getDetail(_id) {
        isLoding = true;
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
    <div
        class="w-screen bg-black bg-opacity-50 fixed top-0 z-20 h-screen "
        in:fade={{ duration: 100 }}
        out:fade={{ duration: 100 }}
    >
        <div
            class="lt:w-4/12 w-2/12 2xl:w-8/12 float-left   h-full "
            on:click={() => {
                hidden();
            }}></div>
        {#if showRight}
            <div
                in:fly={{ x: 200, duration: 200 }}
                out:fly={{ x: 200, duration: 200 }}
                class="lt:w-8/12 w-10/12 2xl:w-4/12 float-right  shadow-sm bg-gray-100 dark:bg-gray-900 h-full p-4 flex flex-col overflow-y-scroll"
            >
                {#if isLoding}
                    <div transition:fly={{ y: -20, duration: 1000 }}>
                        <ProgressLine />
                    </div>
                {/if}

                <div>
                    <button
                        class="focus:outline-none w-10 float-left"
                        on:click={() => {
                            hidden();
                        }}
                    >
                        <i class="ri-close-fill"></i>
                    </button>
                </div>

                <NenoItem
                    _id={nenoDetail._id}
                    created_at={nenoDetail.created_at}
                    content={nenoDetail.content}
                    parentId={nenoDetail.parentId}
                    parent={nenoDetail.parent}
                    images={nenoDetail.images}
                    tags={nenoDetail.tags}
                />

                <div class=" pl-6 ">
                    {#each nenoDetail.children as item (item._id)}
                        <!-- content here -->
                        <NenoItem
                            {...item}
                            on:deleteOne={(event) => {
                                nenoDetail.children = nenoDetail.children.filter(
                                    (item) => {
                                        return item._id !== event.detail._id;
                                    }
                                );
                            }}
                        />
                    {/each}
                </div>
                <QuillEditor
                    parentId={nenoDetail._id}
                    on:update={(event) => {
                        nenoDetail.children = [
                            ...nenoDetail.children,
                            event.detail,
                        ];
                    }}
                />
            </div>
        {/if}
    </div>
{/if}
