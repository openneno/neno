<script>
    import {count, getTagSettings, pin, pins, renameTag, setTagIcon, tags} from "../request/fetchApi";
    import {
        countStore,
        currentPage,
        reload,
        searchNenoByDate,
        searchNenoByTag,
        tagStore,
    } from "../store/store.js";
    import GreenMap from "../components/GreenMap.svelte";
    import TagExpand from "../components/TagExpand.svelte";
    import TagIcon from "../components/TagIcon.svelte";
    import TagIconPicker from "../components/TagIconPicker.svelte";

    import {onMount} from "svelte";
    import dayjs from "dayjs";
    import {isDarkTheme, toggleDarkMode} from "../lib/theme.js";

    let allTags = [];
    let pinTags = [];

    onMount(() => {
        countcount();
        getPins();
        reload.subscribe((value) => {
            if (value.tag && value.action === "nenoCount") {
                countcount();
                getPins();
            }
        });
    });

    function getTags() {
        tags()
            .then((respone) => {
                let tempTags = respone.body;
                $countStore.tagCount = tempTags.length;
                $tagStore.allTags = tempTags;
                allTags = filterTagtree(tempTags);
            })
            .catch((reason) => {
                console.log(reason);
            });
    }

    function filterTagtree(allTags) {
        let splitAllTags = [];

        allTags.forEach((element) => {
            splitAllTags = [...splitAllTags, element];
        });

        let tagP = [];
        for (let tagIndex in splitAllTags) {
            const tagSplit = splitAllTags[tagIndex].split("/");
            let subtag = "";
            for (let i in tagSplit) {
                const simpletag = tagSplit[i];
                const s = subtag ? subtag + "/" + simpletag : simpletag;
                tagP[s] = {
                    showTag: simpletag,
                    tag: s,
                    parentTag: subtag,
                    children: [],
                };
                subtag = s;
            }
        }

        let subtag;
        let tree = [];
        for (let index in tagP)
            (subtag = tagP[index]).parentTag
                ? tagP[subtag.parentTag].children.push(subtag)
                : tree.push(subtag);

        return tree;
    }

    function getPins() {
        pins()
            .then((respone) => {
                pinTags = respone.body;
                getTags();
            })
            .catch((reason) => {
                console.log(reason);
            });
        getTagSettings().then((settings) => {
            $tagStore.icons = settings.icons;
        });
    }

    //正在选择图标的置顶标签
    let iconPicking = "";

    async function changeIcon(tag, icon) {
        $tagStore.icons = await setTagIcon(tag, icon);
    }

    function pinNeno(tag, isPin) {
        if (isPin) {
            pinTags = [...pinTags, { _id: "", tag: tag }];
            allTags = allTags.filter((item) => {
                return item !== tag;
            });
        } else {
            pinTags = pinTags.filter((item) => {
                return item.tag !== tag;
            });
            allTags = [...allTags, tag];
        }

        pin({ tag: tag })
            .then((respone) => {
            })
            .catch((reason) => {
                console.log(reason);
            });
    }

    function countcount(params) {
        count()
            .then((respone) => {
                let re = respone;
                $countStore.nenoCount = re.body.count;
                delete re.body.countDate._id;

                $countStore.countDate = re.body.countDate;
                let dayCount = 0;
                if (Object.keys($countStore.countDate).length >= 1) {
                    dayCount = dayjs().diff(
                        Object.keys($countStore.countDate)[0],
                        "day"
                    );
                }
                $countStore.dayCount = dayCount;
            })
            .catch((reason) => {
                console.log(reason);
            });
    }

    function renameName(detail) {
        renameTag({ oldTag: detail.oldTag, newTag: detail.newTag })
            .then((respone) => {
                getPins();
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
</script>

<div class="flex h-screen w-full flex-col overflow-y-auto px-3 pb-8 [scrollbar-width:none]">
    <div class="flex h-14 shrink-0 items-center justify-between pl-1.5">
        <div class="flex items-center gap-2">
            <span class="flex size-6 items-center justify-center rounded-md bg-primary-500 text-[13px] text-white shadow-xs" aria-hidden="true">
                <i class="ri-quill-pen-fill"></i>
            </span>
            <span class="text-[15px] font-semibold tracking-wide text-ink">NENO</span>
        </div>
        <div class="flex items-center">
            <a class="icon-btn" href="https://github.com/Mran/neno" target="_blank" rel="noreferrer" title="GitHub" aria-label="GitHub">
                <i class="ri-github-line"></i>
            </a>
            <button
                    class="icon-btn"
                    title={$isDarkTheme ? "切换到浅色" : "切换到深色"}
                    aria-label={$isDarkTheme ? "切换到浅色" : "切换到深色"}
                    on:click={toggleDarkMode}
            >
                <i class={$isDarkTheme ? "ri-sun-line" : "ri-moon-line"}></i>
            </button>
            <button
                    class="icon-btn"
                    class:text-primary-600={$currentPage === "setting"}
                    title="设置"
                    aria-label="设置"
                    on:click={() => {
                        $currentPage = "setting";
                    }}
            >
                <i class="ri-settings-3-line"></i>
            </button>
        </div>
    </div>

    <div class="card p-3">
        <div class="mb-3 grid grid-cols-3">
            <div>
                <div class="text-lg leading-tight font-semibold text-ink tabular-nums">{$countStore.nenoCount}</div>
                <div class="text-xs text-ink-3">笔记</div>
            </div>
            <div>
                <div class="text-lg leading-tight font-semibold text-ink tabular-nums">{$countStore.tagCount}</div>
                <div class="text-xs text-ink-3">标签</div>
            </div>
            <div>
                <div class="text-lg leading-tight font-semibold text-ink tabular-nums">{$countStore.dayCount}</div>
                <div class="text-xs text-ink-3">天</div>
            </div>
        </div>
        <GreenMap
                countDate={$countStore.countDate}
                on:greenmapClick={(event) => {
                    $searchNenoByDate.date = event.detail;
                }}
        />
    </div>

    <nav class="mt-4 flex flex-col gap-0.5" aria-label="页面">
        <button
                class="nav-item"
                class:nav-item-active={$currentPage === "neno" && $searchNenoByTag.tag === ""}
                on:click={() => {
                    $currentPage = "neno";
                    $searchNenoByTag.tag = "";
                }}
        >
            <i class="ri-quill-pen-line"></i>全部笔记
        </button>
        <button
                class="nav-item"
                class:nav-item-active={$currentPage === "daily"}
                on:click={() => {
                    $currentPage = "daily";
                }}
        >
            <i class="ri-calendar-check-line"></i>每日回顾
        </button>
        <button
                class="nav-item"
                class:nav-item-active={$currentPage === "luck"}
                on:click={() => {
                    $currentPage = "luck";
                }}
        >
            <i class="ri-footprint-line"></i>随机漫步
        </button>
    </nav>

    {#if pinTags.length !== 0}
        <div class="section-label mt-6 mb-1">置顶</div>
        <div class="flex flex-col gap-0.5">
            {#each pinTags as { _id, tag } (tag)}
                <div
                        role="button"
                        tabindex="0"
                        class="nav-item group h-8 justify-between"
                        class:nav-item-active={$searchNenoByTag.tag === tag}
                        on:click={() => {
                            $currentPage = "neno";
                            $searchNenoByTag.tag = tag;
                        }}
                        on:keydown={(e) => {
                            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                $currentPage = "neno";
                                $searchNenoByTag.tag = tag;
                            }
                        }}
                >
                    <span class="flex min-w-0 items-center gap-2">
                        <span class="flex size-4 shrink-0 items-center justify-center"><TagIcon {tag} fallback="ri-pushpin-2-line"/></span>
                        <span class="truncate">{tag.indexOf("#") === 0 ? tag.substring(1) : tag}</span>
                    </span>
                    <span class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                                class="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
                                title="设置图标"
                                aria-label="设置图标"
                                aria-expanded={iconPicking === tag}
                                on:click|stopPropagation={() => {
                                    iconPicking = iconPicking === tag ? "" : tag;
                                }}
                        >
                            <i class="ri-emotion-line text-[13px]"></i>
                        </button>
                        <button
                                class="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
                                title="取消置顶"
                                aria-label="取消置顶"
                                on:click|stopPropagation={() => {
                                    pinNeno(tag, false);
                                }}
                        >
                            <i class="ri-unpin-line text-[13px]"></i>
                        </button>
                    </span>
                </div>
                {#if iconPicking === tag}
                    <TagIconPicker
                            icon={$tagStore.icons[tag] || ""}
                            on:pick={(event) => {
                                changeIcon(tag, event.detail);
                                iconPicking = "";
                            }}
                            on:close={() => (iconPicking = "")}
                    />
                {/if}
            {/each}
        </div>
    {/if}

    {#if allTags.length !== 0}
        <div class="section-label mt-6 mb-1">标签</div>
        <div class="flex flex-col gap-0.5">
            {#each allTags as tag}
                <TagExpand
                        {...tag}
                        selectionTag={$searchNenoByTag.tag}
                        on:selectTag={(event) => {
                            $currentPage = "neno";
                            $searchNenoByTag.tag = event.detail;
                        }}
                        on:pinTag={(event) => {
                            pinNeno(event.detail, true);
                        }}
                        on:renameTag={(event) => {
                            renameName(event.detail);
                        }}
                        on:changeIcon={(event) => {
                            changeIcon(event.detail.tag, event.detail.icon);
                        }}
                />
            {/each}
        </div>
    {/if}
</div>
