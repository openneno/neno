<script context="module">
    let current;
</script>

<script>
    import {createEventDispatcher} from "svelte";
    import {fade} from "svelte/transition";

    import dayjs from 'dayjs'
    import {showNeno} from "./NenoDetail.svelte";
    import QuillEditor from "./QuillEditor.svelte";
    import {showPictureView} from "./ViewPicture.svelte";
    import {deleteOne, getFileFromIndexedDB} from "../request/fetchApi";
    import {searchNenoByTag} from "../store/store.js";
    import {showShareView} from "./Share.svelte";

    const dispatch = createEventDispatcher();

    export let _id = "";
    export let created_at = "2021-02-01 11:12:24";
    export let content = "";
    export let images = [];
    export let parent = null;
    export let parentId = "";
    export let children = [];
    export let searchContent = "";
    export let tags = [];

    function plainContent(content) {
        let aa = document.createElement("div");
        aa.insertAdjacentHTML("afterbegin", content);
        return aa.textContent;
    }

    let menuList;
    let openMenu = false;
    let editMode = false;

    function action(params) {
        params.focus();
    }

    function toggleMenu(node) {
        openMenu = !openMenu;
    }

    function toggleEditMode(params) {
        editMode = !editMode;
    }

    function deleteNeno(_id) {
        deleteOne({_id: _id})
            .then((respone) => {
                let code = respone.code;
                if (code === 200) {
                    dispatch("deleteOne", {_id: _id});
                }
            })
            .catch((reason) => {
                console.log(reason);
            });
    }

    document.tagClick = (tag) => {
        $searchNenoByTag.tag = tag.innerText.trim();
        console.log("tagClick", tag.innerText);
    };

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
                pContent += `<span  style="padding:2px" class="  whitespace-no-wrap leading-6 mr-1 cursor-pointer rounded-sm bg-green-500 text-white text-sm  hover:bg-green-600" id="tagtag" onclick="tagClick(this)">
	${rawtag}
	</span>`;
                rawContent = rawContent.substring(breakIndex + rawtag.length);
                pIndex += breakIndex + rawtag.length;
            }
        }
        pContent += copyRawContent.substring(pIndex);
        if (searchContent.length !== 0) {
            pContent = pContent.replaceAll(
                searchContent,
                `<span class="bg-yellow-300 rounded-sm">${searchContent}</span>`
            );
        }
        pContent = pContent.replaceAll(
            /(https?:\/\/?[^\s<)）\]]*)/g,
            '<a href="$1" target="_blank">$1</a>'
        );
        return pContent;
    }

    async function getImageurl(key) {
        console.log(key)
        console.log(content)
        const url = await getFileFromIndexedDB(key);
        return url.key;
    }
</script>

<div
        class="w-full p-4 rounded-lg bg-white dark:bg-gray-600    mb-4 shadow-sm  transition-shadow duration-2000 ease-in-out   hover:shadow-lg "
>
    <div class="flex justify-between relative ">
        <div class="text-sm text-gray-500 dark:text-slate-300">
            {dayjs(created_at).format("YYYY-MM-DD HH:mm")}
        </div>
        <div class=" relative z-auto ">
            <button on:click={() => toggleMenu(1)} class="focus:outline-none ">
                <i class="ri-more-line dark:text-slate-300"></i>
            </button>
            {#if openMenu === true}
                <div
                        use:action
                        tabindex="0"
                        on:blur|stopPropagation={() => {
                        setTimeout(() => {
                            toggleMenu();
                        }, 150);
                    }}
                        in:fade={{ duration: 100 }}
                        out:fade={{ duration: 100 }}
                        bind:this={menuList}
                        class=" absolute w-16  z-10 bg-white dark:bg-gray-900 dark:text-white shadow-xl rounded-lg flex flex-col justify-center   border-solid space-y-1 pt-2 pb-2 focus:outline-none"
                        style="left:-32px;"
                >
                    <button
                            class="dark:hover:bg-gray-500 focus:outline-none hover:bg-gray-300 "
                            on:click={() => {
                            showShareView(
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
                        }}>分享
                    </button
                    >
                    <button
                            class="dark:hover:bg-gray-500 focus:outline-none hover:bg-gray-300   "
                            on:click={() => {
                            toggleEditMode();
                        }}>编辑
                    </button
                    >
                    <button
                            class="dark:hover:bg-gray-500 focus:outline-none hover:bg-gray-300"
                            on:click={() => {
                            showNeno(_id, false);
                        }}>批注
                    </button
                    >
                    <button
                            class="  dark:hover:bg-gray-500 focus:outline-none hover:bg-gray-300"
                            on:click={() => {
                            deleteNeno(_id);
                        }}>删除
                    </button
                    >
                </div>
            {/if}
        </div>
    </div>
    {#if editMode}
        <QuillEditor
                {content}
                {images}
                {_id}
                {parentId}
                canCancle={true}
                on:cancle={() => {
                editMode = false;
            }}
                on:update={(event) => {
                console.log(event.detail);
                images = event.detail.images;
                content = event.detail.content;
                tags = event.detail.tags;
            }}
        />
    {:else}
        <div
                class="list-decimal text-sm text-red-300  whitespace-no-wrap "
                style="height:revert"
        >
            <p class="whitespace-no-wrap ">
                {@html praseTag(content, tags)}
            </p>
        </div>
    {/if}

    <div class="flex flex-wrap flex-row  mt-4  pl-3">
        {#each images as {key}, index (index)}
            {#await getImageurl(key) then value}
                <img
                        on:click={() => {
                        showPictureView(images, index);
                    }}
                        class="w-32 h-32 rounded-md mr-2 mb-2 object-cover"
                        src={value}
                        alt=""
                />
            {/await}
        {/each}
    </div>
    {#if parent !== undefined && parent != null}
        <button
                class="flex items-center space-x-1  hover:shadow-sm focus:outline-none"
                on:click={() => {
                showNeno(parent._id, false);
            }}
        >
            <i
                    class="ri-arrow-up-circle-fill transform  -rotate-45 text-gray-500"></i>
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
                on:click={() => {
                showNeno(item._id, false);
            }}
        >
            <i
                    class="ri-arrow-down-circle-fill transform  -rotate-45 text-gray-500"></i>
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

