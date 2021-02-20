<script context="module">
    let showDetailss = null;
    export function showFmolo(fmoloId, isHidden) {
        console.log("showFmolo", fmoloId, isHidden);
        showDetailss(fmoloId, isHidden);
    }
</script>

<script>
    import { fly, fade } from "svelte/transition";
    import QuillEditor from "./QuillEditor.svelte";
    import FmoloItem from "./FmoloItem.svelte";
    import ProgressLine from "./ProgressLine.svelte";
    import { detail } from "../request/fetchApi";

    import { onMount } from "svelte";
    let isLoding = true;
    let show = false;
    let showRight = false;
    let fmoloDetail = { children: [], _id: "" };

    onMount(() => {
        showDetailss = showDetail;
    });

    let _id = "";
    function showDetail(newFmoloId) {
        _id = newFmoloId;
        if (show != true) {
            showRight = true;
        }
        show = true;
        getDetail(_id);
    }
    function getDetail(_id) {
        isLoding = true;
        detail({ _id: _id })
            .then(async (respone) => {
                let re = await respone.json();
                fmoloDetail = re.body;

                console.log(fmoloDetail);
                isLoding = false;
            })
            .catch((reason) => {
                console.log(reason);
                isLoding = false;
            });
    }
    function hidden(params) {
        isLoding = false;
        show = false;
        showRight = false;
        fmoloDetail = { children: [], _id: "" };
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
            }}
        />
        {#if showRight}
            <div
                in:fly={{ x: 200, duration: 200 }}
                out:fly={{ x: 200, duration: 200 }}
                class="lt:w-8/12 w-10/12 2xl:w-4/12 float-right  shadow-sm bg-gray-100 h-full p-4 flex flex-col overflow-y-scroll"
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
                        <i class="ri-close-fill" />
                    </button>
                </div>

                <FmoloItem
                    _id={fmoloDetail._id}
                    created_at={fmoloDetail.created_at}
                    content={fmoloDetail.content}
                    parentId={fmoloDetail.parentId}
                    parent={fmoloDetail.parent}
                    images={fmoloDetail.images}
                />

                <div class=" pl-6 ">
                    {#each fmoloDetail.children as item (item._id)}
                        <!-- content here -->
                        <FmoloItem
                            {...item}
                            on:deleteOne={(event) => {
                                fmoloDetail.children = fmoloDetail.children.filter(
                                    (item) => {
                                        return item._id != event.detail._id;
                                    }
                                );
                            }}
                        />
                    {/each}
                </div>
                <QuillEditor
                    parentId={fmoloDetail._id}
                    on:update={(event) => {
                        fmoloDetail.children = [
                            ...fmoloDetail.children,
                            event.detail,
                        ];
                    }}
                />
            </div>
        {/if}
    </div>
{/if}
