<script context="module">
    let current;
</script>

<script>
    import {createEventDispatcher} from "svelte";
    import {fade, pop} from "../lib/motion.js";
    import {renderContent} from "../lib/renderContent.js";

    import dayjs from 'dayjs'
    import {showNeno} from "./NenoDetail.svelte";
    import QuillEditor from "./QuillEditor.svelte";
    import {showPictureView} from "./ViewPicture.svelte";
    import {deleteOne, getFileFromIndexedDB} from "../request/fetchApi";
    import {searchNenoByTag} from "../store/store.js";
    import {showShareView} from "./Share.svelte";
    import {confirmDialog} from "./ConfirmDialog.svelte";

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
    export let update_at = "";
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

    async function deleteNeno(_id) {
        const preview = plainContent(content).replace(/\s+/g, " ").trim();
        const confirmed = await confirmDialog({
            title: "删除这条笔记?",
            message: "删除后无法恢复, 同步后其他设备上的这条笔记也会被删除。",
            preview: preview.length > 120 ? `${preview.substring(0, 120)}...` : preview,
            confirmText: "删除",
            danger: true,
        });
        if (!confirmed) {
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

    async function getImageurl(key) {
        console.log(key)
        console.log(content)
        const url = await getFileFromIndexedDB(key);
        return url.key;
    }
</script>

<article
        bind:this={cardEl}
        class="card mb-3 px-5 pt-3.5 pb-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong"
>
    <header class="relative flex h-7 items-center justify-between">
        <div class="flex items-center gap-1.5 text-xs text-ink-3 tabular-nums">
            <time datetime={created_at}>{dayjs(created_at).format("YYYY-MM-DD HH:mm")}</time>
            {#if update_at}
                <span title="编辑于 {dayjs(update_at).format('YYYY-MM-DD HH:mm')}">· 已编辑</span>
            {/if}
            {#if copied}
                <span transition:fade={{ duration: 150 }} class="text-primary-600 dark:text-primary-300">· 已复制</span>
            {/if}
        </div>
        <button class="icon-btn -mr-2 size-7" aria-label="更多操作" aria-expanded={openMenu} on:click={() => toggleMenu(1)}>
            <i class="ri-more-fill"></i>
        </button>
        {#if openMenu === true}
            <div
                    use:action
                    tabindex="0"
                    role="menu"
                    on:blur|stopPropagation={() => {
                        setTimeout(() => {
                            toggleMenu();
                        }, 150);
                    }}
                    in:pop
                    out:fade={{ duration: 100 }}
                    bind:this={menuList}
                    class="absolute top-8 -right-1 z-20 flex w-32 flex-col rounded-lg border border-line bg-surface p-1 text-sm shadow-pop outline-none"
            >
                <button
                        class="menu-item"
                        role="menuitem"
                        on:click={() => {
                            showShareView(_id, created_at, content, images, parent, parentId, children, searchContent, tags);
                        }}
                >
                    <i class="ri-share-box-line"></i>分享
                </button>
                <button class="menu-item" role="menuitem" on:click={copyNeno}>
                    <i class="ri-file-copy-line"></i>复制
                </button>
                <button class="menu-item" role="menuitem" on:click={() => toggleEditMode()}>
                    <i class="ri-edit-line"></i>编辑
                </button>
                <button class="menu-item" role="menuitem" on:click={() => showNeno(_id, false)}>
                    <i class="ri-chat-quote-line"></i>批注
                </button>
                <div class="mx-1 my-1 h-px bg-line"></div>
                <button class="menu-item menu-item-danger" role="menuitem" on:click={() => deleteNeno(_id)}>
                    <i class="ri-delete-bin-line"></i>删除
                </button>
            </div>
        {/if}
    </header>

    {#if editMode}
        <div class="mt-1">
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
                        images = event.detail.images;
                        content = event.detail.content;
                        tags = event.detail.tags;
                    }}
            />
        </div>
    {:else}
        <div
                class="neno-content neno-fold relative mt-1 overflow-hidden"
                style="max-height:{canCollapse ? `${collapsed ? COLLAPSED_HEIGHT : fullHeight}px` : 'none'}"
        >
            <div use:measure>
                {@html renderContent(content, {tags, keyword: searchContent, clickableTags: true})}
            </div>
            {#if canCollapse}
                <div class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface transition-opacity duration-300"
                     class:opacity-0={!collapsed}></div>
            {/if}
        </div>
        {#if canCollapse}
            <button
                    class="mt-1.5 inline-flex items-center gap-0.5 text-[13px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
                    aria-expanded={expanded}
                    on:click={toggleExpanded}
            >
                {expanded ? "收起" : "展开全文"}
                <i class="ri-arrow-down-s-line inline-block transition-transform duration-300" class:rotate-180={expanded}></i>
            </button>
        {/if}
    {/if}

    {#if images.length > 0}
        <div class="mt-3 flex flex-wrap gap-2">
            {#each images as {key}, index (index)}
                {#await getImageurl(key) then value}
                    <button class="overflow-hidden rounded-lg border border-line" aria-label="查看图片" on:click={() => showPictureView(images, index)}>
                        <img
                                class="size-24 cursor-zoom-in object-cover transition-transform duration-200 hover:scale-[1.04] sm:size-28"
                                src={value}
                                alt=""
                        />
                    </button>
                {/await}
            {/each}
        </div>
    {/if}

    {#if (parent !== undefined && parent != null) || children.length > 0}
        <div class="mt-3 flex flex-col gap-1 border-l-2 border-line pl-3">
            {#if parent !== undefined && parent != null}
                <button
                        class="flex min-w-0 items-center gap-1.5 text-left text-[13px] text-ink-3 hover:text-ink-2"
                        title="查看原笔记"
                        on:click={() => {
                            showNeno(parent._id, false);
                        }}
                >
                    <i class="ri-corner-left-up-line shrink-0"></i>
                    <span class="min-w-0 truncate">{plainContent(parent.content)}</span>
                </button>
            {/if}
            {#each children as item}
                <button
                        class="flex min-w-0 items-center gap-1.5 text-left text-[13px] text-ink-3 hover:text-ink-2"
                        title="查看批注"
                        on:click={() => {
                            showNeno(item._id, false);
                        }}
                >
                    <i class="ri-chat-quote-line shrink-0"></i>
                    <span class="min-w-0 truncate">{plainContent(item.content)}</span>
                </button>
            {/each}
        </div>
    {/if}
</article>
