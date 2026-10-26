<script>
    import {onDestroy, onMount, tick} from "svelte";
    import {shortUrl} from "../lib/renderContent.js";
    import {highlightTags} from "../lib/tagHighlight.js";
    import {createEventDispatcher} from "svelte";
    import {fly} from "../lib/motion.js";
    import {cubicOut} from "svelte/easing";

    import Quill from "quill";

    import {
        addNeno,
        uploadPicIndexedDB,
        getFileFromIndexedDB,
    } from "../request/fetchApi";
    import {getObjectURL} from "../utils/process";
    import {showPictureView} from "./ViewPicture.svelte";

    import {tagStore} from "../store/store.js";

    import ProgressLine from "./ProgressLine.svelte";

    export let content = "";
    export let _id = "";
    export let parentId = "";
    export let images = [];

    export let canCancle = false;
    export let placeholder = "现在的想法是...";

    const dispatch = createEventDispatcher();

    let editor = "";
    let toolbar = "";

    let quillEditor;
    let stopTagHighlight = () => {};
    onDestroy(() => stopTagHighlight());
    let showTip = false;
    let tipClient = "";

    let tagStartIndex = 0;
    let selectionIndex = 0;

    let tagTips = [];
    let tagTipsFocusIndex = 0;

    let tipLeft = 0;
    let tipTop = 0;
    let tipHeight = 0;

    let uploadimageNode = "";
    let imageFiles = [];
    let isContentEmpty = true;
    let isSending = false;
    const shortcutHint = /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘ ↵" : "Ctrl ↵";

    onMount(() => {
        const options = {
            // debug: "info",
            modules: {
                toolbar: {
                    container: toolbar,
                    handlers: {link: () => editLink()},
                },
                keyboard: {
                    //Ctrl/Cmd + Enter 快速发送, 必须通过配置注册, 否则会被 quill 默认的 Enter 绑定拦截
                    bindings: {
                        link: {
                            key: "k",
                            shortKey: true,
                            handler: () => {
                                editLink();
                                return false;
                            },
                        },
                        quickSend: {
                            key: "Enter",
                            shortKey: true,
                            handler: () => {
                                if (!isContentEmpty && !isSending) {
                                    sendBiu();
                                }
                                return false;
                            },
                        },
                    },
                },
            },
            placeholder: placeholder,
        };
        quillEditor = new Quill(editor, options);
        const delta = quillEditor.clipboard.convert({html: content});
        quillEditor.setContents(delta, "silent");
        stopTagHighlight = highlightTags(quillEditor);
        quillEditor.focus();
        if (content.length !== 0) {
            isContentEmpty = false;
        }
        editor.onkeydown = function (event) {
            if (
                (event.code === "ArrowUp" ||
                    event.code === "ArrowDown" ||
                    event.keyCode === 13) &&
                tagTips.length > 0
            ) {
                if (event.code === "ArrowUp" && tagTipsFocusIndex > 0) {
                    tagTipsFocusIndex--;
                }
                if (
                    event.code === "ArrowDown" &&
                    tagTipsFocusIndex < tagTips.length - 1
                ) {
                    tagTipsFocusIndex++;
                }
                if (event.code === "Enter") {
                    tipTagInsert(tagTips[tagTipsFocusIndex]);
                    showTip = false;
                }

                return false;
            }
        };
        quillEditor.on("text-change", function (delta, oldDelta, source) {
            isContentEmpty = quillEditor.getText().length === 1;
            // console.log("text-change", delta, oldDelta, source);

            toolTip();
            updateLink();
        });
        quillEditor.root.addEventListener(
            "paste",
            (evt) => {
                if (
                    evt.clipboardData &&
                    evt.clipboardData.files &&
                    evt.clipboardData.files.length
                ) {
                    evt.preventDefault();
                    [].forEach.call(evt.clipboardData.files, (file) => {
                        if (
                            !file.type.match(/^image\/(gif|jpe?g|a?png|bmp)/i)
                        ) {
                            return;
                        }
                        imageFiles = joinFile([file]);
                        console.log(file);
                    });
                }
            },
            false
        );
        quillEditor.on("selection-change", function (range, oldRange, source) {
            if (range) {
                toolTip();
            }
            updateLink();
        });
        quillEditor.setSelection(quillEditor.getText().length);
        quillEditor.clipboard.addMatcher("IMG", (node, delta) => {
            const Delta = Quill.import("delta");
            return new Delta().insert("");
        });
        quillEditor.clipboard.addMatcher("PICTURE", (node, delta) => {
            const Delta = Quill.import("delta");
            return new Delta().insert("");
        });
        let tempfiles = [];
        images.forEach((element) => {
            tempfiles = [
                ...tempfiles,
                {
                    file: null,
                    uploadInfo: element,
                    timeStamp: Date.now() + Math.random(),
                },
            ];
        });
        imageFiles = tempfiles;
    });

    function toolTip() {
        let selection = quillEditor.getSelection();
        if (selection == null) {
            showTip = false;
            return;
        }

        let cIndex = selection.index;
        const text = quillEditor.getText();
        // console.log(text.length);
        if (text.length === 1) {
            showTip = false;
            return;
        }
        let sIndex = text.lastIndexOf("#", cIndex);
        if (sIndex !== -1) {
            let tagMay = text.substring(sIndex, cIndex);

            tagTips = [];
            for (let index = 0; index < $tagStore.allTags.length; index++) {
                const element = $tagStore.allTags[index];
                if (element.indexOf(tagMay) === 0) {
                    tagTips = [...tagTips, element];
                }
            }
            tagTips = tagTips.sort((a, b) => {
                return b.length - a.length;
            });

            if (tagTips.length !== 0) {
                if (tagTips.length <= tagTipsFocusIndex) {
                    tagTipsFocusIndex = tagTips.length - 1;
                }
                let getBounds = quillEditor.getBounds(sIndex);
                selectionIndex = cIndex;
                tagStartIndex = sIndex;
                showTip = true;
                tipLeft = getBounds.left;
                tipTop = getBounds.top;
                tipHeight = getBounds.height;
            }
        } else {
            showTip = false;
        }
    }

    function tipTagInsert(tag) {
        let deletelength = selectionIndex - tagStartIndex;

        let updateContents = {
            ops: [],
        };
        if (tagStartIndex !== 0) {
            updateContents.ops = [{retain: tagStartIndex}];
        }
        updateContents.ops = [
            ...updateContents.ops,
            {delete: deletelength},
            {insert: tag},
            {delete: 1},
        ];
        quillEditor.updateContents(updateContents);
        quillEditor.focus();
        quillEditor.setSelection(tagStartIndex + tag.length, 0, "api");
    }

    // svelte 5 的 bind:files 只接受 FileList, 改为监听 change 事件
    function onImagesSelected(event) {
        imageFiles = joinFile(event.currentTarget.files);
        // 清空 input, 以便再次选择同一张图片
        event.currentTarget.value = "";
    }


    function joinFile(uploadimagefilesa) {
        let filelist = Array.from(uploadimagefilesa);
        let tempfiles = imageFiles;
        filelist.forEach((element) => {
            tempfiles = [
                ...tempfiles,
                {
                    file: element,
                    uploadInfo: {
                        key: "",
                    },
                    timeStamp: Date.now() + Math.random(),
                },
            ];
        });
        return tempfiles;
    }

    function cancelInput() {
        imageFiles = [];
        dispatch("cancle", {});
    }

    function selectImages(params) {
        uploadimageNode.click();
    }

    function viewImage(index) {
        showPictureView(imageFiles, index);
    }

    function deleteImage(timeStamp) {
        imageFiles = imageFiles.filter((item) => {
            return item.timeStamp !== timeStamp;
        });
    }

    //链接浮层: 光标在链接上时显示网址(可打开/修改/移除); 编辑时输入网址
    //linkPop: {index, length, href, editing, top, left}
    let linkPop = null;
    let linkValue = "";
    let linkInput;

    function linkAt(index) {
        const [leaf] = quillEditor.getLeaf(index);
        let blot = leaf;
        while (blot && blot.statics.blotName !== "link" && blot !== quillEditor.scroll) blot = blot.parent;
        if (!blot || blot.statics.blotName !== "link") return null;
        return {index: quillEditor.getIndex(blot), length: blot.length(), href: blot.domNode.getAttribute("href") || ""};
    }

    function placeLink(target, editing) {
        const bounds = quillEditor.getBounds(target.index, target.length || 0);
        const width = editor.clientWidth;
        linkPop = {
            ...target,
            editing,
            top: bounds.bottom + 6,
            left: Math.max(8, Math.min(bounds.left, width - 300)),
        };
    }

    function updateLink() {
        if (!quillEditor || (linkPop && linkPop.editing)) return;
        const range = quillEditor.getSelection();
        if (!range) {
            linkPop = null;
            return;
        }
        //光标在链接中间或末尾时都显示
        const link = linkAt(range.index) || (range.index > 0 && range.length === 0 ? linkAt(range.index - 1) : null);
        linkPop = null;
        if (link) placeLink(link, false);
    }

    async function editLink() {
        const range = quillEditor.getSelection(true);
        const link = linkAt(range.index) || (range.index > 0 && range.length === 0 ? linkAt(range.index - 1) : null);
        const target = link || {index: range.index, length: range.length, href: ""};
        linkValue = target.href;
        placeLink(target, true);
        await tick();
        linkInput && linkInput.focus();
        linkInput && linkInput.select();
    }

    function normalizeHref(value) {
        const text = value.trim();
        if (!text) return "";
        return /^(https?:|mailto:)/i.test(text) ? text : `https://${text}`;
    }

    function saveLink() {
        const href = normalizeHref(linkValue);
        const {index, length} = linkPop;
        linkPop = null;
        if (!href) {
            if (length > 0) quillEditor.formatText(index, length, "link", false, "user");
        } else if (length > 0) {
            quillEditor.formatText(index, length, "link", href, "user");
        } else {
            //没有选中文字时插入网址本身
            quillEditor.insertText(index, href, {link: href}, "user");
            quillEditor.insertText(index + href.length, " ", {link: false}, "user");
        }
        quillEditor.focus();
        quillEditor.setSelection(index + (length || href.length + 1), 0, "api");
    }

    function removeLink() {
        const {index, length} = linkPop;
        quillEditor.formatText(index, length, "link", false, "user");
        linkPop = null;
        quillEditor.focus();
    }

    function cancelLink() {
        linkPop = null;
        quillEditor.focus();
    }

    function insertHashTag() {
        const range = quillEditor.getSelection(true);
        let index = 0;
        if (range) {
            if (range.length === 0) {
                index = range.index;
            } else {
                index = range.index + range.length;
            }
        }
        quillEditor.insertText(index, "#");
    }


    async function sendBiu() {
        // quill 2 的 root.innerHTML 会把无序列表输出为 <ol><li data-list="bullet">,
        // 使用 getSemanticHTML 得到标准的 <ul>/<ol>, 并还原 quill 2 转换出的 &nbsp; 以保持 tag 的解析
        let sContent = quillEditor.getSemanticHTML().replaceAll("&nbsp;", " ");
        isSending = true;
        let cc = quillEditor.getContents();
        let tags = [];

        let mt = editor.childNodes[0].innerText.match(/#\S*/g);
        if (mt != null) {
            tags = [...tags, ...mt];
        }

        let imagesInfo = [];
        for (let index = 0; index < imageFiles.length; index++) {
            const element = imageFiles[index];
            if (element.file != null) {
                const response = await uploadPicIndexedDB(element.file);
                imagesInfo = [
                    ...imagesInfo,
                    {
                        suffixName: response.suffixName,
                        key: response.key,
                        timeStamp: element.timeStamp,
                    },
                ];
            }else {
                imagesInfo = [
                    ...imagesInfo,
                    {
                        suffixName: element.uploadInfo.suffixName,
                        key: element.uploadInfo.key,
                        timeStamp: element.timeStamp,
                    },
                ];
            }

        }

        addNeno({
            content: sContent,
            pureContent: editor.childNodes[0].innerText,
            _id: _id,
            parentId: parentId,
            source: "web",
            tags: tags,
            images: imagesInfo,
        })
            .then((respone) => {
                console.log(respone);
                let re = respone;
                isSending = false;
                if (re.errorMessage === undefined) {
                    quillEditor.setContents([]);
                    dispatch("update", re.body);
                    cancelInput();
                }
            })
            .catch((reason) => {
                isSending = false;
                console.log(reason);
            });
    }

    async function getPIcUrl(file, uploadInfo) {
        if (file == null) {
            return (await getFileFromIndexedDB(uploadInfo.key)).key;
        } else {
            return getObjectURL(file);
        }
    }
</script>

<div
        class="card relative flex flex-col transition-[border-color,box-shadow] duration-200 focus-within:border-primary-400/60 focus-within:ring-3 focus-within:ring-primary-500/10"
>
    <div bind:this={editor} id="editor"></div>
    {#if linkPop}
        <div
                class="link-pop absolute z-20 flex items-center gap-0.5 rounded-lg border border-line bg-surface p-1 text-sm shadow-pop"
                style="top:{linkPop.top}px;left:{linkPop.left}px"
                on:mousedown={(event) => event.target !== linkInput && event.preventDefault()}
                role="dialog"
                aria-label="链接"
        >
            {#if linkPop.editing}
                <input
                        bind:this={linkInput}
                        bind:value={linkValue}
                        class="h-7 w-56 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink outline-none focus:border-primary-500"
                        placeholder="粘贴或输入网址"
                        spellcheck="false"
                        on:keydown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                saveLink();
                            } else if (event.key === "Escape") {
                                event.preventDefault();
                                cancelLink();
                            }
                        }}
                        on:blur={() => setTimeout(() => linkPop && linkPop.editing && document.activeElement !== linkInput && (linkPop = null), 150)}
                />
                <button class="link-action text-primary-600 dark:text-primary-300" on:click={saveLink}>{linkPop.length > 0 || linkPop.href ? "保存" : "插入"}</button>
            {:else}
                <a class="link-url" href={linkPop.href} target="_blank" rel="noopener noreferrer" title={linkPop.href}>
                    <i class="ri-external-link-line"></i>{shortUrl(linkPop.href, 36)}
                </a>
                <span class="mx-0.5 h-4 w-px bg-line-strong"></span>
                <button class="link-action" on:click={editLink}>修改</button>
                <button class="link-action" on:click={removeLink}>移除</button>
            {/if}
        </div>
    {/if}
    {#if tagTips.length > 0 && showTip}
        <div
                bind:this={tipClient}
                class="absolute z-20 max-h-56 min-w-36 overflow-y-auto rounded-lg border border-line bg-surface p-1 text-sm shadow-pop"
                style="top:{tipTop + tipHeight}px;left:{tipLeft}px"
                role="listbox"
        >
            {#each tagTips as item, index}
                <div
                        role="option"
                        tabindex="-1"
                        aria-selected={index === tagTipsFocusIndex}
                        class="cursor-pointer rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink"
                        class:bg-surface-2={index === tagTipsFocusIndex}
                        class:text-ink={index === tagTipsFocusIndex}
                        on:click={() => {
                            tipTagInsert(item);
                        }}
                        on:keydown={() => {}}
                >
                    {item}
                </div>
            {/each}
        </div>
    {/if}

    {#if imageFiles.length > 0}
        <div class="flex flex-wrap gap-2 px-4 pt-1 pb-2">
            {#each imageFiles as {file, uploadInfo, timeStamp}, index}
                <div
                        in:fly={{ y: 8, duration: 200, easing: cubicOut }}
                        out:fly={{ y: 8, duration: 150 }}
                        class="group relative size-16 overflow-hidden rounded-lg border border-line"
                >
                    {#await getPIcUrl(file, uploadInfo) then value}
                        <img class="size-full object-cover" src={value} alt=""/>
                    {/await}
                    <div class="absolute inset-0 flex items-center justify-center gap-1 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button class="flex size-7 items-center justify-center rounded-md text-white hover:bg-white/15" aria-label="查看图片" on:click={() => viewImage(index)}>
                            <i class="ri-zoom-in-line"></i>
                        </button>
                        <button class="flex size-7 items-center justify-center rounded-md text-white hover:bg-white/15" aria-label="移除图片" on:click={() => deleteImage(timeStamp)}>
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <div class="flex items-center justify-between gap-2 border-t border-line px-2 py-1.5">
        <div id="toolbar" class="neno-toolbar flex items-center gap-0.5" bind:this={toolbar}>
            <button class="editor-tool" title="插入标签" aria-label="插入标签" on:click={insertHashTag}><i class="ri-hashtag"></i></button>
            <button class="editor-tool ql-bold" title="加粗" aria-label="加粗"><i class="ri-bold"></i></button>
            <button class="editor-tool ql-list" value="bullet" title="无序列表" aria-label="无序列表"><i class="ri-list-unordered"></i></button>
            <button class="editor-tool ql-list" value="ordered" title="有序列表" aria-label="有序列表"><i class="ri-list-ordered"></i></button>
            <button class="editor-tool ql-underline" title="下划线" aria-label="下划线"><i class="ri-underline"></i></button>
            <button class="editor-tool ql-blockquote" title="引用" aria-label="引用"><i class="ri-double-quotes-l"></i></button>
            <button class="editor-tool ql-link" title="链接(先选中文字)" aria-label="链接"><i class="ri-link"></i></button>
            <button class="editor-tool" title="添加图片" aria-label="添加图片" on:click={selectImages}><i class="ri-image-line"></i></button>
            <input
                    bind:this={uploadimageNode}
                    on:change={onImagesSelected}
                    type="file"
                    class="hidden"
                    accept="image/png, image/jpeg, image/gif, image/jpg"
                    multiple
            />
        </div>
        <div class="flex items-center gap-2">
            <span class="hidden text-xs text-ink-3 sm:inline">{shortcutHint} 发送</span>
            {#if canCancle}
                <button class="btn btn-sm btn-ghost" on:click={cancelInput}>取消</button>
            {/if}
            <button
                    class="btn btn-sm btn-primary min-w-16"
                    disabled={isContentEmpty || isSending}
                    title="发送 ({shortcutHint})"
                    on:click={() => {
                        sendBiu();
                    }}
            >
                {#if isSending}
                    <ProgressLine dotSize={5} leftSize={6} bgColor={"white"}/>
                {:else}
                    发送
                {/if}
            </button>
        </div>
    </div>
</div>
