<script context="module">
    let showShare = null;
    export function showShareView(
        _id,
        created_at,
        content,
        images,
        parent,
        parentId,
        children,
        searchContent,
        tags
    ) {
        showShare(
            _id,
            created_at,
            content,
            images,
            parent,
            parentId,
            children,
            searchContent,
            tags
        );
    }
</script>

<script>
    import { fly, fade } from "svelte/transition";
    import { getObjectURL } from "../utils/process";
    import { getFileFromIndexedDB } from "../request/fetchApi";
    import dayjs from 'dayjs'
    import html2canvas from "html2canvas";
    import {countStore, searchNenoByTag} from "../store/store.js";
    import {onMount} from "svelte";
    let show = false;
    onMount(() => {
        showShare = showDetail;
    });
    var _id;
    var created_at;
    var content = "";
    var images = [];
    var parent;
    var parentId;
    var children;
    var searchContent;
    var tags;
    var card;
    var cardcontainer;
    function showDetail(
        _id_t,
        created_at_t,
        content_t,
        images_t,
        parent_t,
        parentId_t,
        children_t,
        searchContent_t,
        tags_t
    ) {
        show = !show;

        _id = _id_t;
        created_at = created_at_t;
        content = content_t;
        images = images_t;
        parent = parent_t;
        parentId = parentId_t;
        children = children_t;
        searchContent = searchContent_t;
        tags = tags_t;
        console.log(
            "showShareView",

            _id,
            created_at,
            content,
            images,
            parent,
            parentId,
            children,
            searchContent
        );
    }

    function hidden() {
        show = false;
    }

    async function getImageurl( key, index) {
        const url = await getFileFromIndexedDB(key);
        if (index === images.length - 1) {
            setTimeout(() => {
                console.log(card);
                html2canvas(card, { allowTaint: true }).then((canvas) => {
                    let ac = card.children;
                    console.log(ac);
                    card.style.display = "none";

                    cardcontainer.appendChild(canvas);
                });
            }, 200);
        }
        return url.key;
    }
    function praseTag(rawContent, tags) {
        let pContent = "";
        let pIndex = 0;
        let copyRawContent = rawContent;
        if (tags != null) {
            for (let index = 0; index < tags.length; index++) {
                let rawtag = tags[index];
                let breakIndex = rawContent.indexOf(rawtag);
                //截取前段的字符
                pContent += rawContent.substring(0, breakIndex);
                //加上替换的内容
                pContent += `<span  style="padding:2px" class="whitespace-no-wrap leading-6 mr-1 cursor-pointer rounded-sm bg-green-500 text-white text-sm  hover:bg-green-600" id="tagtag" onclick="tagClick(this)">
	${rawtag}
	</span>`;
                rawContent = rawContent.substring(breakIndex + rawtag.length);
                pIndex += breakIndex + rawtag.length;
            }
        }
        pContent += copyRawContent.substring(pIndex);
        if (images.length == 0) {
            setTimeout(() => {
                html2canvas(card, { allowTaint: true }).then((canvas) => {
                    card.style.display = "none";

                    cardcontainer.appendChild(canvas);
                });
            }, 200);
        }
        return pContent;
    }
</script>

{#if show}
    <div
        class="w-screen  bg-black bg-opacity-50 fixed top-0 z-20 h-screen flex flex-col  items-center justify-center "
        in:fade={{ duration: 190 }}
        out:fade={{ duration: 210 }}
        on:click={() => {
            hidden();
        }}
    >
        <div
            class=" overflow-scroll bg-gray-100 rounded  shadow-lg"
            style="width:480px"
            bind:this={cardcontainer}
        >
            <div class="p-4 space-y-2 ">
                <div class="font-bold text-lg">卡片分享</div>
                <div class="text-sm">长按或者右键保存</div>
            </div>
            <div class="bg-white p-4" bind:this={card}>
                <div class="text-sm text-gray-500">
                    {dayjs(created_at).format("YYYY-MM-DD HH:mm:ss")}
                </div>
                <div
                    class="list-decimal text-sm text-red-300  ql-editor max-w-lg "
                >
                    <p class="whitespace-normal">
                        {@html praseTag(content, tags)}
                    </p>
                </div>
                <div>
                    {#each images as {  key }, index (index)}
                        {#await getImageurl( key, index) then value}
                            <img
                                class="w-full  rounded mr-2 mb-2 object-cover"
                                src={value}
                                alt=""
                            />
                        {/await}
                    {/each}
                </div>
                <div
                    class=" space-y-2 flex justify-between text-gray-500 text-sm"
                >
                    <div>
                        {`${$countStore.nenoCount} NENOS • ${$countStore.dayCount}DAYS `}
                    </div>

                    <div class="flex items-center space-x-2">
                        By Neno <i class="ri-github-fill ri-xl" />
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
