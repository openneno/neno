<script>
    import {onDestroy, onMount, tick} from "svelte";
    import {shortUrl} from "../lib/renderContent.js";
    import {highlightTags} from "../lib/tagHighlight.js";
    import {htmlToMarkdown, markdownToHtml} from "../lib/markdown.js";
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

    // ---------- Markdown 模式 ----------
    //笔记仍以 html 保存: 切换模式和发送时在 Markdown 与编辑器内容之间转换; 模式只记在本机
    const MODE_KEY = "neno.editorMode";
    let mdMode = readMode();
    let mdText = "";
    let mdArea;

    function readMode() {
        try {
            return localStorage.getItem(MODE_KEY) === "markdown";
        } catch (e) {
            return false;
        }
    }

    function quillHtml() {
        // quill 2 的 root.innerHTML 会把无序列表输出为 <ol><li data-list="bullet">,
        // 使用 getSemanticHTML 得到标准的 <ul>/<ol>, 并还原 quill 2 转换出的 &nbsp; 以保持 tag 的解析
        return quillEditor.getSemanticHTML().replaceAll("&nbsp;", " ");
    }

    //把 Markdown 写回编辑器, 由 quill 统一生成保存用的 html
    function markdownToQuill() {
        quillEditor.setContents(quillEditor.clipboard.convert({html: markdownToHtml(mdText)}), "silent");
        isContentEmpty = quillEditor.getText().trim().length === 0;
    }

    async function toggleMarkdown() {
        showTip = false;
        linkPop = null;
        if (mdMode) {
            markdownToQuill();
            mdMode = false;
            await tick();
            quillEditor.focus();
            quillEditor.setSelection(quillEditor.getLength(), 0, "api");
        } else {
            mdText = quillEditor.getText().trim() ? htmlToMarkdown(quillHtml()) : "";
            mdMode = true;
            await tick();
            focusMarkdown(mdText.length);
        }
        try {
            localStorage.setItem(MODE_KEY, mdMode ? "markdown" : "rich");
        } catch (e) {
            //无痕模式等无法保存时, 只在本次生效
        }
    }

    function focusMarkdown(index) {
        if (!mdArea) return;
        autosize();
        mdArea.focus();
        mdArea.setSelectionRange(index, index);
    }

    function autosize() {
        if (!mdArea) return;
        mdArea.style.height = "auto";
        mdArea.style.height = `${mdArea.scrollHeight + 2}px`;
    }

    $: if (mdMode) isContentEmpty = mdText.trim().length === 0;

    //在 Markdown 中替换 [start, end) 并把光标放到 caret
    async function mdReplace(start, end, insert, caretStart, caretEnd = caretStart) {
        mdText = mdText.slice(0, start) + insert + mdText.slice(end);
        await tick();
        autosize();
        mdArea.focus();
        mdArea.setSelectionRange(caretStart, caretEnd);
    }

    //工具栏: 用 Markdown 语法包裹选中的文字
    function mdWrap(before, after = before) {
        const {selectionStart: start, selectionEnd: end} = mdArea;
        const selected = mdText.slice(start, end);
        mdReplace(start, end, before + selected + after, start + before.length, start + before.length + selected.length);
    }

    //工具栏: 给光标所在(或选中)的每一行加上行首标记, 已有时去掉
    function mdPrefix(kind) {
        const {selectionStart: start, selectionEnd: end} = mdArea;
        const lineStart = mdText.lastIndexOf("\n", start - 1) + 1;
        let lineEnd = mdText.indexOf("\n", end);
        if (lineEnd === -1) lineEnd = mdText.length;
        const lines = mdText.slice(lineStart, lineEnd).split("\n");
        const marks = {bullet: /^- /, ordered: /^\d+\. /, quote: /^> ?/};
        const all = lines.every((line) => marks[kind].test(line));
        const next = lines
            .map((line, i) => {
                const bare = line.replace(/^(- |\d+\. |> ?)/, "");
                if (all) return bare;
                return (kind === "bullet" ? "- " : kind === "ordered" ? `${i + 1}. ` : "> ") + bare;
            })
            .join("\n");
        mdReplace(lineStart, lineEnd, next, lineStart + next.length);
    }

    function mdLink() {
        const {selectionStart: start, selectionEnd: end} = mdArea;
        const selected = mdText.slice(start, end);
        if (/^(https?:\/\/|www\.)\S+$/i.test(selected)) {
            mdReplace(start, end, `[](${selected})`, start + 1);
        } else {
            const insert = `[${selected}](https://)`;
            const urlAt = start + selected.length + 3;
            mdReplace(start, end, insert, urlAt, urlAt + "https://".length);
        }
    }

    function onMarkdownKeydown(event) {
        if (event.isComposing) return;
        if (tagTips.length > 0 && showTip && ["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)) {
            event.preventDefault();
            if (event.key === "ArrowUp" && tagTipsFocusIndex > 0) tagTipsFocusIndex--;
            if (event.key === "ArrowDown" && tagTipsFocusIndex < tagTips.length - 1) tagTipsFocusIndex++;
            if (event.key === "Enter") tipTagInsert(tagTips[tagTipsFocusIndex]);
            if (event.key === "Enter" || event.key === "Escape") showTip = false;
            return;
        }
        const shortKey = event.metaKey || event.ctrlKey;
        if (event.key === "Enter" && shortKey) {
            event.preventDefault();
            if ((!isContentEmpty || audioClips.length > 0) && !isSending && !transcribing && !recorder) sendBiu();
        } else if (shortKey && event.key.toLowerCase() === "b") {
            event.preventDefault();
            mdWrap("**");
        } else if (shortKey && event.key.toLowerCase() === "k") {
            event.preventDefault();
            mdLink();
        } else if (event.key === "Enter" && !event.shiftKey) {
            continueList(event);
        }
    }

    //列表/引用中回车自动续上标记, 空的一项回车结束列表
    function continueList(event) {
        const {selectionStart: start, selectionEnd: end} = mdArea;
        if (start !== end) return;
        const lineStart = mdText.lastIndexOf("\n", start - 1) + 1;
        const line = mdText.slice(lineStart, start);
        const match = line.match(/^(\s*)([-*+]|\d+\.|>) (.*)$/);
        if (!match) return;
        event.preventDefault();
        if (!match[3].trim()) {
            mdReplace(lineStart, start, "", lineStart);
            return;
        }
        const marker = /\d/.test(match[2]) ? `${parseInt(match[2]) + 1}.` : match[2];
        const insert = `\n${match[1]}${marker} `;
        mdReplace(start, start, insert, start + insert.length);
    }

    //textarea 中某个位置的坐标(相对卡片), 用于显示标签提示
    function textareaBounds(index) {
        const style = getComputedStyle(mdArea);
        const mirror = document.createElement("div");
        for (const prop of ["boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderLeftWidth", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing", "tabSize"]) {
            mirror.style[prop] = style[prop];
        }
        Object.assign(mirror.style, {position: "absolute", visibility: "hidden", top: "0", left: "0", whiteSpace: "pre-wrap", overflowWrap: "anywhere"});
        mirror.textContent = mdText.slice(0, index);
        const marker = document.createElement("span");
        marker.textContent = "​";
        mirror.append(marker);
        mdArea.parentElement.append(mirror);
        const bounds = {
            left: mdArea.offsetLeft + marker.offsetLeft,
            top: mdArea.offsetTop + marker.offsetTop - mdArea.scrollTop,
            height: marker.offsetHeight,
        };
        mirror.remove();
        return bounds;
    }

    function onMarkdownPaste(evt) {
        const files = evt.clipboardData && evt.clipboardData.files;
        if (!files || !files.length) return;
        evt.preventDefault();
        [].forEach.call(files, (file) => {
            if (file.type.match(/^image\/(gif|jpe?g|a?png|bmp)/i)) imageFiles = joinFile([file]);
        });
    }

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
        if (mdMode) {
            mdText = content.length !== 0 ? htmlToMarkdown(content) : "";
            tick().then(() => focusMarkdown(mdText.length));
        } else {
            quillEditor.focus();
        }
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
        if (!mdMode) quillEditor.setSelection(quillEditor.getText().length);
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
        if (mdMode) {
            recordInsertIndex = mdArea && document.activeElement === mdArea ? mdArea.selectionEnd : null;
        } else {
            const range = quillEditor.getSelection();
            recordInsertIndex = range ? range.index + range.length : null;
        }
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
        if (mdMode) {
            const at = index === null || index === undefined || index > mdText.length ? mdText.length : index;
            const before = at > 0 ? mdText.charAt(at - 1) : "\n";
            const insert = /\s/.test(before) ? text : ` ${text}`;
            mdReplace(at, at, insert, at + insert.length);
            return;
        }
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
        let cIndex;
        let text;
        if (mdMode) {
            if (!mdArea || document.activeElement !== mdArea || mdArea.selectionStart !== mdArea.selectionEnd) {
                showTip = false;
                return;
            }
            cIndex = mdArea.selectionStart;
            text = mdText + "\n";
        } else {
            let selection = quillEditor.getSelection();
            if (selection == null) {
                showTip = false;
                return;
            }
            cIndex = selection.index;
            text = quillEditor.getText();
        }
        // console.log(text.length);
        if (text.length === 1) {
            showTip = false;
            return;
        }
        let sIndex = text.lastIndexOf("#", cIndex);
        if (sIndex !== -1 && !(mdMode && /\s/.test(text.substring(sIndex, cIndex)))) {
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
                let getBounds = mdMode ? textareaBounds(sIndex) : quillEditor.getBounds(sIndex);
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
        if (mdMode) {
            const after = mdText.charAt(selectionIndex);
            const insert = !after || /\s/.test(after) ? tag : `${tag} `;
            mdReplace(tagStartIndex, selectionIndex, insert, tagStartIndex + insert.length);
            showTip = false;
            return;
        }
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
        if (mdMode) {
            mdReplace(mdArea.selectionStart, mdArea.selectionEnd, "#", mdArea.selectionStart + 1);
            return;
        }
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
        if (mdMode) markdownToQuill();
        let sContent = quillHtml();
        isSending = true;
        let tags = [];
        //Markdown 模式下编辑器是隐藏的, 隐藏元素的 innerText 没有换行, 改用 quill 的纯文本
        const pureContent = mdMode ? quillEditor.getText().replace(/\n$/, "") : editor.childNodes[0].innerText;

        let mt = pureContent.match(/#\S*/g);
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
            pureContent: pureContent,
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
                    mdText = "";
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
    <div bind:this={editor} id="editor" class="neno-editor" style:display={mdMode ? "none" : null}></div>
    {#if mdMode}
        <textarea
                bind:this={mdArea}
                bind:value={mdText}
                class="md-editor"
                {placeholder}
                rows="3"
                spellcheck="false"
                aria-label="Markdown 编辑"
                on:input={() => {
                    autosize();
                    toolTip();
                }}
                on:keydown={onMarkdownKeydown}
                on:click={toolTip}
                on:keyup={(event) => !["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key) && toolTip()}
                on:blur={() => setTimeout(() => document.activeElement !== mdArea && (showTip = false), 150)}
                on:paste={onMarkdownPaste}
        ></textarea>
    {/if}
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
        <div id="toolbar" class="neno-toolbar flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]" bind:this={toolbar} style:display={recorder ? "none" : null}>
            <button class="editor-tool" title="插入标签" aria-label="插入标签" on:click={insertHashTag}><i class="ri-hashtag"></i></button>
            <!-- 富文本模式的格式按钮由 quill 接管; Markdown 模式下换成插入 Markdown 语法的按钮 -->
            <span class="contents" style:display={mdMode ? "none" : null}>
                <button class="editor-tool ql-bold" title="加粗" aria-label="加粗"><i class="ri-bold"></i></button>
                <button class="editor-tool ql-list" value="bullet" title="无序列表" aria-label="无序列表"><i class="ri-list-unordered"></i></button>
                <button class="editor-tool ql-list" value="ordered" title="有序列表" aria-label="有序列表"><i class="ri-list-ordered"></i></button>
                <button class="editor-tool ql-underline" title="下划线" aria-label="下划线"><i class="ri-underline"></i></button>
                <button class="editor-tool ql-blockquote" title="引用" aria-label="引用"><i class="ri-double-quotes-l"></i></button>
                <button class="editor-tool ql-link" title="链接(先选中文字)" aria-label="链接"><i class="ri-link"></i></button>
            </span>
            {#if mdMode}
                <button class="editor-tool" title="加粗 **文字**" aria-label="加粗" on:click={() => mdWrap("**")}><i class="ri-bold"></i></button>
                <button class="editor-tool" title="无序列表 - " aria-label="无序列表" on:click={() => mdPrefix("bullet")}><i class="ri-list-unordered"></i></button>
                <button class="editor-tool" title="有序列表 1. " aria-label="有序列表" on:click={() => mdPrefix("ordered")}><i class="ri-list-ordered"></i></button>
                <button class="editor-tool" title="代码 `代码`" aria-label="行内代码" on:click={() => mdWrap("`")}><i class="ri-code-line"></i></button>
                <button class="editor-tool" title="引用 > " aria-label="引用" on:click={() => mdPrefix("quote")}><i class="ri-double-quotes-l"></i></button>
                <button class="editor-tool" title="链接 [文字](网址)" aria-label="链接" on:click={mdLink}><i class="ri-link"></i></button>
            {/if}
            <button class="editor-tool" title="添加图片" aria-label="添加图片" on:click={selectImages}><i class="ri-image-line"></i></button>
            <button class="editor-tool" title="语音输入" aria-label="语音输入" on:click={toggleRecording}>
                <i class="ri-mic-line"></i>
            </button>
            <span class="mx-0.5 h-4 w-px shrink-0 bg-line-strong" aria-hidden="true"></span>
            <button
                    class="editor-tool"
                    class:ql-active={mdMode}
                    title={mdMode ? "切换到富文本模式" : "切换到 Markdown 模式"}
                    aria-label="Markdown 模式"
                    aria-pressed={mdMode}
                    on:click={toggleMarkdown}
            >
                <i class="ri-markdown-line"></i>
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
        <div class="flex shrink-0 items-center gap-2" style:display={recorder ? "none" : null}>
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
