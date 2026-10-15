<script context="module">
    let current;
</script>

<script>
    import {createEventDispatcher} from "svelte";
    import {fade, pop} from "../lib/motion.js";

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
    //内容过长时折叠, 详情面板中的主笔记会关闭折叠
    export let collapsible = true;

    //折叠后显示的最大高度(约 10 行), 只超出一点时不折叠
    const COLLAPSED_HEIGHT = 240;
    const COLLAPSE_TOLERANCE = 60;
    let overflowing = false;
    let fullHeight = 0;
    let expanded = false;
    let cardEl;

    //搜索时展开全文, 避免匹配的内容被折叠
    $: canCollapse = collapsible && overflowing && searchContent.trim() === "";
    $: collapsed = canCollapse && !expanded;

    //内容高度会随编辑, 窗口宽度变化, 用 ResizeObserver 持续判断是否需要折叠
    function measure(node) {
        const update = () => {
            fullHeight = node.scrollHeight;
            overflowing = fullHeight > COLLAPSED_HEIGHT + COLLAPSE_TOLERANCE;
        };
        const observer = new ResizeObserver(update);
        observer.observe(node);
        update();
        return {destroy: () => observer.disconnect()};
    }

    function toggleExpanded() {
        expanded = !expanded;
        //收起时如果卡片顶部已经滚出视野, 滚回卡片位置
        if (!expanded && cardEl && cardEl.getBoundingClientRect().top < 0) {
            cardEl.scrollIntoView({block: "start"});
        }
    }

    function plainContent(content) {
        let aa = document.createElement("div");
        aa.insertAdjacentHTML("afterbegin", content);
        return aa.textContent;
    }

    let menuList;
    let openMenu = false;
    let editMode = false;
    let copied = false;

    function action(params) {
        params.focus();
    }

    function toggleMenu(node) {
        openMenu = !openMenu;
    }

    function toggleEditMode(params) {
        editMode = !editMode;
    }

    function copyNeno() {
        const text = plainContent(content).trim();
        navigator.clipboard.writeText(text).then(() => {
            copied = true;
            setTimeout(() => {
                copied = false;
            }, 1500);
        }).catch((reason) => {
            console.log(reason);
        });
    }

    function deleteNeno(_id) {
        if (!window.confirm("确定要删除这条笔记吗?")) {
            return;
        }
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
                pContent += `<span  style="padding:2px" class="neno-tag transition-colors duration-150 leading-6 mr-1 cursor-pointer rounded-xs bg-primary-500 text-white text-sm  hover:bg-primary-600" id="tagtag" onclick="tagClick(this)">
	${rawtag}
	</span>`;
                rawContent = rawContent.substring(breakIndex + rawtag.length);
                pIndex += breakIndex + rawtag.length;
            }
        }
        pContent += copyRawContent.substring(pIndex);
        const keyword = searchContent.trim();
        if (keyword.length !== 0) {
            //忽略大小写高亮, 且只替换标签之外的文本, 避免破坏 html 结构
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            pContent = pContent.replace(
                new RegExp(`(${escaped})(?![^<]*>)`, "gi"),
                `<span class="bg-yellow-300 rounded-xs">$1</span>`
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
        bind:this={cardEl}
        class="w-full p-4 rounded-lg bg-white dark:bg-gray-600    mb-4 shadow-xs  transition-shadow duration-200 ease-out hover:shadow-md "
>
    <div class="flex justify-between relative ">
        <div class="text-sm text-gray-500 dark:text-slate-300">
            {dayjs(created_at).format("YYYY-MM-DD HH:mm")}
            {#if copied}
                <span transition:fade={{ duration: 150 }} class="ml-2 text-primary-600 dark:text-primary-400">已复制</span>
            {/if}
        </div>
        <div class=" relative z-auto ">
            <button on:click={() => toggleMenu(1)} class="focus:outline-hidden ">
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
                        in:pop
                        out:fade={{ duration: 100 }}
                        bind:this={menuList}
                        class=" absolute w-16  z-10 bg-white dark:bg-gray-900 dark:text-white shadow-xl rounded-lg flex flex-col justify-center   border-solid space-y-1 pt-2 pb-2 focus:outline-hidden"
                        style="left:-32px;"
                >
                    <button
                            class="dark:hover:bg-gray-500 focus:outline-hidden hover:bg-gray-300 "
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
                            class="dark:hover:bg-gray-500 focus:outline-hidden hover:bg-gray-300"
                            on:click={copyNeno}>复制
                    </button
                    >
                    <button
                            class="dark:hover:bg-gray-500 focus:outline-hidden hover:bg-gray-300   "
                            on:click={() => {
                            toggleEditMode();
                        }}>编辑
                    </button
                    >
                    <button
                            class="dark:hover:bg-gray-500 focus:outline-hidden hover:bg-gray-300"
                            on:click={() => {
                            showNeno(_id, false);
                        }}>批注
                    </button
                    >
                    <button
                            class="  dark:hover:bg-gray-500 focus:outline-hidden hover:bg-gray-300"
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
                class="neno-content list-decimal text-sm text-red-300 relative overflow-hidden neno-fold"
                style="max-height:{canCollapse ? `${collapsed ? COLLAPSED_HEIGHT : fullHeight}px` : 'none'}"
        >
            <div use:measure>
                {@html praseTag(content, tags)}
            </div>
            {#if canCollapse}
                <div class="absolute inset-x-0 bottom-0 h-16 pointer-events-none bg-linear-to-t from-white dark:from-gray-600 transition-opacity duration-300"
                     class:opacity-0={!collapsed}></div>
            {/if}
        </div>
        {#if canCollapse}
            <button
                    class="mt-1 text-sm text-primary-600 dark:text-primary-300 hover:underline focus:outline-hidden flex items-center"
                    aria-expanded={expanded}
                    on:click={toggleExpanded}
            >
                {expanded ? "收起" : "展开全文"}
                <i class="ri-arrow-down-s-line inline-block transition-transform duration-300" class:rotate-180={expanded}></i>
            </button>
        {/if}
    {/if}

    <div class="flex flex-wrap flex-row  mt-4  pl-3">
        {#each images as {key}, index (index)}
            {#await getImageurl(key) then value}
                <img
                        on:click={() => {
                        showPictureView(images, index);
                    }}
                        class="w-32 h-32 rounded-md mr-2 mb-2 object-cover cursor-zoom-in transition-transform duration-200 hover:scale-[1.03]"
                        src={value}
                        alt=""
                />
            {/await}
        {/each}
    </div>
    {#if parent !== undefined && parent != null}
        <button
                class="flex items-center space-x-1 max-w-full min-w-0 text-left hover:shadow-xs focus:outline-hidden"
                on:click={() => {
                showNeno(parent._id, false);
            }}
        >
            <i
                    class="ri-arrow-up-circle-fill transform -rotate-45 text-gray-500 shrink-0"></i>
            <div
                    class="text-gray-500 text-sm min-w-0 break-all"
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
                class="flex items-center space-x-1 max-w-full min-w-0 text-left hover:shadow-xs focus:outline-hidden"
                on:click={() => {
                showNeno(item._id, false);
            }}
        >
            <i
                    class="ri-arrow-down-circle-fill transform -rotate-45 text-gray-500 shrink-0"></i>
            <div
                    class="text-gray-500 text-sm min-w-0 break-all"
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

