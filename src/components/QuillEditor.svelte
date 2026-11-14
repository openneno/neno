<script>
    import {onDestroy, onMount, tick} from "svelte";
    import {shortUrl} from "../lib/renderContent.js";
    import {highlightTags} from "../lib/tagHighlight.js";
    import {createEventDispatcher} from "svelte";
    import {fade, fly} from "../lib/motion.js";
    import {cubicOut} from "svelte/easing";

    import Quill from "quill";

    import {
        addNeno,
        uploadPicIndexedDB,
        getFileFromIndexedDB,
        getAudio,
        saveAudioIndexedDB,
        removeAudioIndexedDB,
    } from "../request/fetchApi";
    import {getObjectURL} from "../utils/process";
    import {showPictureView} from "./ViewPicture.svelte";
    import AudioClip from "./AudioClip.svelte";
    import {alertDialog} from "./ConfirmDialog.svelte";
    import {isRecordingSupported, MAX_DURATION_MS, startRecording} from "../lib/voice/recorder.js";
    import {transcribe} from "../lib/voice/asr.js";

    import {asrStore, tagStore} from "../store/store.js";

    import ProgressLine from "./ProgressLine.svelte";

    export let content = "";
    export let _id = "";
    export let parentId = "";
    export let images = [];
    //语音输入: [{key, suffixName, duration_ms, text}], text 是识别出的原文
    export let audios = [];

    export let canCancle = false;
    export let placeholder = "现在的想法是...";

    const dispatch = createEventDispatcher();

    let editor = "";
    let toolbar = "";

    let quillEditor;
    let stopTagHighlight = () => {};
    onDestroy(() => {
        stopTagHighlight();
        cancelRecording();
    });
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
                                if ((!isContentEmpty || audioClips.length > 0) && !isSending && !transcribing && !recorder) {
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
        audioClips = (audios || []).map((clip) => ({uid: Math.random(), clip: {...clip}, file: null, status: "", error: ""}));
    });

    // ---------- 语音输入 ----------
    //audioClips: [{uid, clip: {key, suffixName, duration_ms, text}, file: 新录的 Blob, status, error}]
    let audioClips = [];
    let recorder = null;
    let recordingStarting = false;
    let recordStart = 0;
    let recordMs = 0;
    let recordTimer = null;
    //最近的音量, 用于录音时的波形
    const LEVEL_COUNT = 32;
    let levels = new Array(LEVEL_COUNT).fill(0);
    //开始录音时光标的位置, 识别出的文字插入到这里
    let recordInsertIndex = null;

    $: transcribing = audioClips.some((item) => item.status === "transcribing");

    function formatMs(ms) {
        const total = Math.floor(ms / 1000);
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
    }

    async function toggleRecording() {
        if (recorder) {
            await finishRecording();
            return;
        }
        if (recordingStarting) return;
        if (!isRecordingSupported()) {
            alertDialog({title: "无法录音", message: "当前浏览器不支持录音, 请使用最新版的 Chrome, Edge, Safari 或 Firefox。", icon: "ri-mic-off-line"});
            return;
        }
        const range = quillEditor.getSelection();
        recordInsertIndex = range ? range.index + range.length : null;
        recordingStarting = true;
        try {
            recorder = await startRecording({
                onLevel: (level) => (levels = [...levels.slice(1), level]),
                onLimit: () => finishRecording(),
            });
            recordStart = Date.now();
            recordMs = 0;
            recordTimer = setInterval(() => (recordMs = Date.now() - recordStart), 200);
        } catch (error) {
            console.log("录音失败", error);
            const denied = error && (error.name === "NotAllowedError" || error.name === "SecurityError");
            alertDialog({
                title: "无法使用麦克风",
                message: denied ? "麦克风权限被拒绝, 请在浏览器的网站设置中允许使用麦克风。" : "没有找到可用的麦克风。",
                icon: "ri-mic-off-line",
            });
        } finally {
            recordingStarting = false;
        }
    }

    function stopTimer() {
        clearInterval(recordTimer);
        recordTimer = null;
        levels = levels.map(() => 0);
    }

    function cancelRecording() {
        if (!recorder) return;
        recorder.cancel();
        recorder = null;
        stopTimer();
    }

    async function finishRecording() {
        if (!recorder) return;
        const current = recorder;
        recorder = null;
        stopTimer();
        const {blob, durationMs} = await current.stop();
        if (durationMs < 500) {
            //误触, 不保存
            return;
        }
        const item = {uid: Math.random(), clip: {key: "", suffixName: "wav", duration_ms: durationMs, text: ""}, file: blob, status: "", error: ""};
        audioClips = [...audioClips, item];
        runTranscribe(item.uid, recordInsertIndex);
    }

    function updateClip(uid, patch) {
        audioClips = audioClips.map((item) => (item.uid === uid ? {...item, ...patch, clip: {...item.clip, ...(patch.clip || {})}} : item));
    }

    async function runTranscribe(uid, insertIndex = null) {
        const item = audioClips.find((value) => value.uid === uid);
        if (!item) return;
        if (!$asrStore.apiKey) {
            updateClip(uid, {status: "error", error: "录音已保留。在 设置 → 语音输入 中填写 DeepSeek API Key 后, 可以重新识别为文字"});
            return;
        }
        updateClip(uid, {status: "transcribing", error: ""});
        try {
            const blob = item.file || (await getAudio(item.clip.key))?.file;
            if (!blob) throw new Error("语音还没有同步到这台设备");
            const text = await transcribe(blob, $asrStore.apiKey, `speech.${item.clip.suffixName || "wav"}`);
            //识别期间录音可能已被移除
            if (!audioClips.some((value) => value.uid === uid)) return;
            updateClip(uid, {status: text ? "" : "error", error: text ? "" : "没有识别到文字", clip: {text}});
            if (text) insertTranscript(text, insertIndex);
        } catch (error) {
            console.log("语音识别失败", error);
            updateClip(uid, {status: "error", error: error.message || "识别失败"});
        }
    }

    function insertTranscript(text, index) {
        const length = quillEditor.getLength();
        const at = index === null || index === undefined || index > length - 1 ? length - 1 : index;
        //与前面的文字之间留一个空格, 避免和 #标签 连在一起
        const before = at > 0 ? quillEditor.getText(at - 1, 1) : "\n";
        const insert = /\s/.test(before) ? text : ` ${text}`;
        quillEditor.insertText(at, insert, "user");
        quillEditor.setSelection(at + insert.length, 0, "api");
    }

    function deleteClip(uid) {
        audioClips = audioClips.filter((item) => item.uid !== uid);
    }

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
        cancelRecording();
        imageFiles = [];
        audioClips = [];
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

        if (recorder) await finishRecording();
        const audiosInfo = [];
        for (const item of audioClips) {
            let key = item.clip.key;
            if (item.file) {
                key = (await saveAudioIndexedDB(item.file, item.clip.suffixName)).key;
            }
            audiosInfo.push({key, suffixName: item.clip.suffixName, duration_ms: item.clip.duration_ms, text: item.clip.text || ""});
        }
        //编辑时移除的语音
        for (const old of audios || []) {
            if (!audiosInfo.some((item) => item.key === old.key)) await removeAudioIndexedDB(old);
        }

        addNeno({
            content: sContent,
            pureContent: editor.childNodes[0].innerText,
            _id: _id,
            parentId: parentId,
            source: "web",
            tags: tags,
            images: imagesInfo,
            audios: audiosInfo,
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

    {#if audioClips.length > 0}
        <div class="flex flex-col gap-2 px-4 pt-1 pb-2">
            {#each audioClips as item (item.uid)}
                <div in:fly={{ y: 8, duration: 200, easing: cubicOut }}>
                    <AudioClip
                            clip={item.clip}
                            file={item.file}
                            status={item.status}
                            error={item.error}
                            editable={true}
                            on:retry={() => runTranscribe(item.uid)}
                            on:delete={() => deleteClip(item.uid)}
                    />
                </div>
            {/each}
        </div>
    {/if}

    <div class="flex items-center justify-between gap-2 border-t border-line px-2 py-1.5">
        {#if recorder}
            <!-- 录音时用一条安静的状态栏替换工具栏, 高度不变, 颜色跟随主题色 -->
            <div class="flex min-w-0 flex-1 items-center gap-2.5 pl-2" role="status" aria-label="正在录音" in:fade={{ duration: 150 }}>
                <span class="recording-dot size-2 shrink-0 rounded-full bg-primary-500"></span>
                <span class="w-9 shrink-0 text-[13px] text-ink-2 tabular-nums">{formatMs(recordMs)}</span>
                <span class="flex h-6 min-w-0 flex-1 items-center gap-[2px] overflow-hidden" aria-hidden="true">
                    {#each levels as level}
                        <span class="w-[2px] shrink-0 rounded-full bg-primary-500/60" style="height:{3 + level * 15}px"></span>
                    {/each}
                </span>
                {#if MAX_DURATION_MS - recordMs < 20000}
                    <span class="shrink-0 text-xs text-ink-3 tabular-nums">剩余 {formatMs(MAX_DURATION_MS - recordMs + 999)}</span>
                {/if}
            </div>
        {/if}
        <div id="toolbar" class="neno-toolbar flex items-center gap-0.5" bind:this={toolbar} style:display={recorder ? "none" : null}>
            <button class="editor-tool" title="插入标签" aria-label="插入标签" on:click={insertHashTag}><i class="ri-hashtag"></i></button>
            <button class="editor-tool ql-bold" title="加粗" aria-label="加粗"><i class="ri-bold"></i></button>
            <button class="editor-tool ql-list" value="bullet" title="无序列表" aria-label="无序列表"><i class="ri-list-unordered"></i></button>
            <button class="editor-tool ql-list" value="ordered" title="有序列表" aria-label="有序列表"><i class="ri-list-ordered"></i></button>
            <button class="editor-tool ql-underline" title="下划线" aria-label="下划线"><i class="ri-underline"></i></button>
            <button class="editor-tool ql-blockquote" title="引用" aria-label="引用"><i class="ri-double-quotes-l"></i></button>
            <button class="editor-tool ql-link" title="链接(先选中文字)" aria-label="链接"><i class="ri-link"></i></button>
            <button class="editor-tool" title="添加图片" aria-label="添加图片" on:click={selectImages}><i class="ri-image-line"></i></button>
            <button class="editor-tool" title="语音输入" aria-label="语音输入" on:click={toggleRecording}>
                <i class="ri-mic-line"></i>
            </button>
            <input
                    bind:this={uploadimageNode}
                    on:change={onImagesSelected}
                    type="file"
                    class="hidden"
                    accept="image/png, image/jpeg, image/gif, image/jpg"
                    multiple
            />
        </div>
        {#if recorder}
            <div class="flex shrink-0 items-center gap-1">
                <button class="btn btn-sm btn-ghost" on:click={cancelRecording}>取消</button>
                <button class="btn btn-sm btn-ghost text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200" on:click={finishRecording}>
                    <i class="ri-check-line"></i>完成
                </button>
            </div>
        {/if}
        <div class="flex items-center gap-2" style:display={recorder ? "none" : null}>
            <span class="hidden text-xs text-ink-3 sm:inline">{shortcutHint} 发送</span>
            {#if canCancle}
                <button class="btn btn-sm btn-ghost" on:click={cancelInput}>取消</button>
            {/if}
            <button
                    class="btn btn-sm btn-primary min-w-16"
                    disabled={(isContentEmpty && audioClips.length === 0) || isSending || transcribing || !!recorder}
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

<style>
    .recording-dot {
        animation: recording-breathe 1.6s ease-in-out infinite;
    }

    @keyframes recording-breathe {
        50% {
            opacity: 0.35;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .recording-dot {
            animation: none;
        }
    }
</style>
