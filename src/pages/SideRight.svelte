<script>
    import {onMount, tick} from "svelte";
    import {fly, noteEnter, noteLeave} from "../lib/motion.js";
    import {searchNenoByTag, searchNenoByDate, reload, taskCountTag} from "../store/store.js";

    import QuillEditor from "../components/QuillEditor.svelte";
    import NenoItem from "../components/NenoItem.svelte";

    import {getAllNeno, search} from "../request/fetchApi";
    import {applyNoteChange, onNoteChange} from "../lib/noteEvents.js";
    import ProgressLine from "../components/ProgressLine.svelte";
    import PageHeader from "../components/PageHeader.svelte";
    import TagIcon from "../components/TagIcon.svelte";

    let flowClient;
    let innerHeight = 0;
    let flowClientTop = 0;
    let isLoding = false; //加载中状态
    let isLodingError = false; //加载错误
    let isEnd = false; //所有内容加载完毕
    let searchText = "";
    let changeTag = "";
    const PAGE_SIZE = 20;
    //已加载的最后一条笔记的 _id, 下一页从它之后开始
    let lastId = null;
    //每次重新加载时递增, 丢弃过期请求的结果
    let loadToken = 0;
    let sentinel;
    $: {
        if (flowClient !== undefined) {
            let flowClientBoundingClientRect = flowClient.getBoundingClientRect();
            flowClientTop = flowClientBoundingClientRect.top;
        }
    }

    let nenoItems = [];
    let searchItems = [];
    //是否处于搜索/筛选状态; 没有结果时显示提示, 而不是退回到全部笔记
    let searching = false;
    let searchDateText = "";
    const freshIds = new Set();
    const removingIds = new Set();

    onMount(() => {
        //新增(包括批注), 修改, 删除都在这里统一更新主列表和搜索结果
        //按顺序处理, 避免连续的改动互相覆盖
        let queue = Promise.resolve();
        const offNoteChange = onNoteChange((change) => {
            //只有这次新增/删除的笔记播放进出动画
            if (change.type === "add") freshIds.add(change.note._id);
            if (change.type === "delete") removingIds.add(change.note._id);
            queue = queue.then(async () => {
                nenoItems = await applyNoteChange(nenoItems, change, {addToList: true, appendIfOlder: isEnd});
                searchItems = await applyNoteChange(searchItems, change);
            }).catch((reason) => console.log(reason));
        });
        load();
        const offDate = searchNenoByDate.subscribe((value) => {
            console.log("searchNenoByDate", value);
            if (value.date === "refresh") {
                load(true);
            } else if (value.date !== "") {
                searchNeno("", value.date, "");
            } else {
                clearSearch();
            }
        });
        const offTag = searchNenoByTag.subscribe((value) => {
            console.log("searchNenoByTag", value);
            changeTag = value.tag.substring(1);

            if (value.tag !== "") {
                searchNeno("", "", value.tag);
            } else {
                clearSearch();
            }
        });
        const offReload = reload.subscribe((value) => {
            if (value.tag && value.action === "neno") {
                load(true);
            }
        })
        //列表底部的哨兵进入视野(提前 600px)时加载下一页, 不依赖精确的滚动位置
        const observer = new IntersectionObserver((entries) => {
            if (!searching && entries.some((entry) => entry.isIntersecting)) load();
        }, {root: flowClient, rootMargin: "0px 0px 600px 0px"});
        observer.observe(sentinel);
        //切换页面时组件会被销毁, 取消订阅
        return () => {
            offNoteChange();
            offDate();
            offTag();
            offReload();
            observer.disconnect();
        };
    });

    //reset: 从头重新加载(同步完成, 导入数据等)
    async function load(reset = false) {
        if (reset) {
            lastId = null;
            isEnd = false;
            nenoItems = [];
        } else if (isLoding || isEnd || isLodingError) {
            return;
        }
        const token = ++loadToken;
        isLoding = true;
        isLodingError = false;
        try {
            const re = await getAllNeno({before: lastId, limit: PAGE_SIZE});
            if (token !== loadToken) return;
            //已经在列表中的笔记(例如刚刚新建的)不再重复添加
            const known = new Set(nenoItems.map((item) => item._id));
            nenoItems = [...nenoItems, ...re.body.filter((item) => !known.has(item._id))];
            if (re.body.length > 0) lastId = re.body[re.body.length - 1]._id;
            isEnd = !re.hasMore;
        } catch (reason) {
            console.log("reason", reason);
            if (token === loadToken) isLodingError = true;
        } finally {
            if (token === loadToken) isLoding = false;
        }
        if (token === loadToken) await maybeLoadMore();
    }

    //内容还没有填满屏幕时哨兵一直可见, IntersectionObserver 不会再次触发, 这里主动继续加载
    async function maybeLoadMore() {
        await tick();
        if (searching || isLoding || isEnd || isLodingError) return;
        const rect = sentinel?.getBoundingClientRect();
        const box = flowClient?.getBoundingClientRect();
        if (rect && box && rect.top < box.bottom + 600) load();
    }

    function searchNeno(searchText = "", searchDate = "", searchTag = "") {
        if (
            searchText.length !== 0 ||
            searchDate.length !== 0 ||
            searchTag.length !== 0
        ) {
            isLoding = true;
            searching = true;
            searchDateText = searchDate;
            search({
                content: searchText,
                created_at: searchDate,
                tag: searchTag,
            })
                .then(async (respone) => {
                    isLoding = false;
                    searchItems = respone.body;
                })

                .catch((reason) => {
                    console.log("reason", reason);
                    isLoding = false;
                });
        } else {
            clearSearch();
            if (nenoItems.length === 0) {
                load();
            }
        }
    }

    function clearSearch() {
        searching = false;
        searchItems = [];
        searchDateText = "";
        //回到全部笔记时, 如果列表没有填满屏幕就继续加载
        maybeLoadMore();
    }
</script>

<svelte:window bind:innerHeight/>
<div class="flex h-screen min-w-0 flex-1 flex-col">
    <div class="mx-auto w-full max-w-[720px] px-4 sm:px-6">
        <PageHeader title={changeTag === "" ? "全部笔记" : ""}>
            <svelte:fragment slot="title">
                {#if changeTag !== ""}
                    <span class="inline-flex h-7 min-w-0 items-center gap-1 rounded-lg bg-primary-500/10 pr-1 pl-2.5 text-[15px] font-semibold text-primary-700 dark:text-primary-300">
                        <TagIcon tag={$searchNenoByTag.tag} iconClass="text-[13px]"/>
                        <span class="truncate">{changeTag}</span>
                        <button
                                class="flex size-5 items-center justify-center rounded-md hover:bg-primary-500/15"
                                aria-label="取消筛选"
                                on:click={() => {
                                    $searchNenoByTag.tag = "";
                                }}
                        >
                            <i class="ri-close-line"></i>
                        </button>
                    </span>
                {/if}
                {#if $taskCountTag.all !== 0}
                    <span class="ml-2 inline-flex items-center gap-1 text-xs text-ink-3 tabular-nums" title="正在同步">
                        <i class="ri-loader-4-line animate-spin"></i>{$taskCountTag.done}/{$taskCountTag.all}
                    </span>
                {/if}
            </svelte:fragment>
            <label class="relative block w-36 sm:w-60">
                <i class="ri-search-line pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-3"></i>
                <input
                        class="input h-8 border-transparent bg-surface-2 pr-7 pl-8 focus:bg-surface"
                        type="search"
                        placeholder="搜索笔记"
                        aria-label="搜索笔记"
                        on:keydown={(event) => {
                            if (event.code === "Enter" || event.key === "Enter") {
                                searchNeno(searchText, "");
                            }
                        }}
                        bind:value={searchText}
                />
                {#if searchText !== ""}
                    <button
                            class="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
                            aria-label="清除搜索"
                            on:click={() => {
                                searchText = "";
                                clearSearch();
                            }}
                    >
                        <i class="ri-close-line"></i>
                    </button>
                {/if}
            </label>
        </PageHeader>

        <QuillEditor/>

        {#if isLoding && (searching || nenoItems.length === 0)}
            <div transition:fly={{ y: -8, duration: 200 }} class="mt-3">
                <ProgressLine/>
            </div>
        {/if}
        {#if isLodingError && nenoItems.length === 0}
            <div class="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                读取笔记失败
                <button class="btn btn-sm btn-ghost" on:click={() => load(true)}>重新获取</button>
            </div>
        {/if}
    </div>
    <div
            bind:this={flowClient}
            class="overflow-y-auto"
            style="height:{innerHeight - flowClientTop}px"
    >
        <div class="mx-auto w-full max-w-[720px] px-4 pt-4 pb-16 sm:px-6">
            {#if searching}
                {#if searchDateText !== ""}
                    <div class="mb-3 flex items-center justify-between text-[13px] text-ink-3">
                        <span class="tabular-nums">{searchDateText} 的笔记 · {searchItems.length} 条</span>
                        <button class="btn btn-sm btn-ghost" on:click={() => ($searchNenoByDate.date = "")}>查看全部</button>
                    </div>
                {/if}
                {#each searchItems as item (item._id)}
                    <div class="flow-root" out:noteLeave={{active: removingIds.has(item._id)}}>
                        <NenoItem {...item} searchContent={searchText}/>
                    </div>
                {/each}
                {#if !isLoding && searchItems.length === 0}
                    <div class="py-16 text-center text-sm text-ink-3">
                        <i class="ri-search-eye-line mb-2 block text-3xl text-ink-3/60"></i>
                        没有找到相关笔记
                    </div>
                {/if}
            {:else}
                {#each nenoItems as item (item._id)}
                    <div class="flow-root" in:noteEnter={{active: freshIds.has(item._id)}} out:noteLeave={{active: removingIds.has(item._id)}}>
                        <NenoItem {...item}/>
                    </div>
                {/each}
                {#if !isLoding && !isLodingError && nenoItems.length === 0}
                    <div class="py-16 text-center text-sm text-ink-3">
                        <i class="ri-quill-pen-line mb-2 block text-3xl text-ink-3/60"></i>
                        还没有笔记, 在上面写下第一条想法吧
                    </div>
                {:else if nenoItems.length > 0}
                    <div class="flex h-12 items-center justify-center text-xs text-ink-3">
                        {#if isLodingError}
                            <button class="btn btn-sm btn-ghost" on:click={() => { isLodingError = false; load(); }}>加载失败, 点击重试</button>
                        {:else if isLoding}
                            <ProgressLine/>
                        {:else if isEnd}
                            已经到底了 · 共 {nenoItems.length} 条
                        {/if}
                    </div>
                {/if}
            {/if}
            <!-- 滚动到这里附近时加载下一页 -->
            <div bind:this={sentinel} class="h-px" aria-hidden="true"></div>
        </div>
    </div>
</div>
