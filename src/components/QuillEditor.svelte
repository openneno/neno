<script>
    import { onMount } from "svelte";
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    import Quill from "quill";
    import * as qiniu from "qiniu-js";
    import { addFmolo, qiniuToken } from "../request/fetchApi";
    import { settingStrore, tagStrore } from "../store/store.js";

    import ProgressLine from "./ProgressLine.svelte";
    export let content = "";
    export let _id = "";
    export let parentId = "";
    export let images = [];

    export let canCancle = false;

    const dispatch = createEventDispatcher();

    let editor = "";
    let toolbar = "";

    let quillEditor;
    let showTip = false;
    let tagStartIndex = 0;
    let selectionIndex = 0;

    let tagTips = [];
    let tipLeft = 0;
    let tipTop = 0;
    let tipHeight = 0;

    let uploadimageNode = "";
    let uploadimagefiles = [];
    let imageFiles = [];
    let isContentEmpty = true;
    let isSending = false;

    onMount(() => {
        var options = {
            // debug: "info",
            modules: {
                toolbar: toolbar,
            },
            placeholder: "现在的想法是...",
        };
        quillEditor = new Quill(editor, options);
        const delta = quillEditor.clipboard.convert(content);
        quillEditor.setContents(delta, "silent");
        quillEditor.focus();
        if (content.length != 0) {
            isContentEmpty = false;
        }
        quillEditor.on("text-change", function (delta, oldDelta, source) {
            isContentEmpty = quillEditor.getText().length == 1;
            console.log(delta);
            if (delta.ops.length > 1 && delta.ops[1].insert == "\n") {
                tagTips = [];
                showTip = false;
            } else {
                toolTip();
            }
        });
        quillEditor.on("selection-change", function (range, oldRange, source) {
            if (range) {
                console.log(range);
                toolTip();
            } else {
                console.log("Cursor not in the editor");
            }
        });
        quillEditor.setSelection(quillEditor.getText().length);
        let tempfiles = [];
        images.forEach((element) => {
            tempfiles = [
                ...tempfiles,
                {
                    file: null,
                    percent_completed: 100,
                    uploadInfo: element,
                    timeStamp: Date.now() + Math.random(),
                    uploadingstatus: "已上传", //"上传中","已上传"
                },
            ];
        });
        imageFiles = tempfiles;
    });
    function toolTip() {
        let selection = quillEditor.getSelection();

        let cIndex = selection.index;
        var text = quillEditor.getText();
        let sIndex = text.lastIndexOf("#", cIndex);
        if (sIndex != -1) {
            let tagMay = text.substring(sIndex, cIndex);
            tagTips = [];
            for (let index = 0; index < $tagStrore.allTags.length; index++) {
                const element = $tagStrore.allTags[index];
                if (element.indexOf(tagMay) == 0) {
                    tagTips = [...tagTips, element];
                }
            }
            if (tagTips.length != 0) {
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
        quill.updateContents(
            new Delta()
                .retain(6) // Keep 'Hello '
                .delete(5) // 'World' is deleted
                .insert("Quill")
            // Apply bold to exclamation mark
        );
    }
    $: imageFiles = joinFile(uploadimagefiles);

    $: {
        for (let index = 0; index < imageFiles.length; index++) {
            const element = imageFiles[index];
            if (element.uploadingstatus == "未上传") {
                element.uploadingstatus = "上传中";
                // uploadPic(element, index);
                qiniuToken()
                    .then(async (respone) => {
                        let re = await respone.json();
                        if (re.errorMessage == undefined) {
                            uploadPicQiniu(element, index, re.body);
                        }
                    })
                    .catch((reason) => {
                        console.log(reason);
                    });
            }
        }
    }

    function joinFile(uploadimagefiles) {
        let filelist = Array.from(uploadimagefiles);
        let tempfiles = imageFiles;
        filelist.forEach((element) => {
            tempfiles = [
                ...tempfiles,
                {
                    file: element,
                    percent_completed: 0,
                    uploadInfo: {
                        platform: "",
                        url: "",
                        key: "",
                    },
                    timeStamp: Date.now() + Math.random(),
                    uploadingstatus: "未上传", //"上传中","已上传"
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
    function viewImage(params) {}
    function deleteImage(timeStamp) {
        imageFiles = imageFiles.filter((item) => {
            return item.timeStamp != timeStamp;
        });
    }
    function insertHashTag() {
        var range = quillEditor.getSelection(true);
        let index = 0;
        if (range) {
            if (range.length == 0) {
                index = range.index;
            } else {
                index = range.index + range.length;
            }
        }
        quillEditor.insertText(index, "#");
    }
    function getObjectURL(file) {
        var url = null;
        // 下面函数执行的效果是一样的，只是需要针对不同的浏览器执行不同的 js 函数而已
        if (window.createObjectURL != undefined) {
            // basic
            url = window.createObjectURL(file);
        } else if (window.URL != undefined) {
            // mozilla(firefox)
            url = window.URL.createObjectURL(file);
        } else if (window.webkitURL != undefined) {
            // webkit or chrome
            url = window.webkitURL.createObjectURL(file);
        }
        return url;
    }
    function uploadPicQiniu(imageFile, index, token) {
        console.log(imageFile, imageFile.name, token);
        const observable = qiniu.upload(
            imageFile.file,
            imageFile.file.name,
            token
        );

        const subscription = observable.subscribe(
            (response) => {
                let total = response.total;
                imageFiles[index].percent_completed = parseInt(
                    total.percent + ""
                );
                console.log(response, total);
            },
            (error) => {
                console.log(error, "错误");
            },
            (response) => {
                console.log(response, "已上传");
                imageFiles[index].uploadingstatus = "已上传";
                imageFiles[index].uploadInfo.key = response.key;
                imageFiles[index].uploadInfo.platform = "qiniu";
            }
        ); // 这样传参形式也可以
    }
    function uploadPic(imageFile, index) {
        var formData = new FormData();
        var fileField = imageFile.file;
        formData.append("file", fileField);

        let request = new XMLHttpRequest();
        request.open("POST", "http://127.0.0.1:8888/cat/uploadPic");

        // upload progress event
        request.upload.addEventListener("progress", function (e) {
            // upload progress as percentage
            let percent_completed = (e.loaded / e.total) * 100;
            imageFiles[index].percent_completed = parseInt(
                percent_completed + ""
            );
            if (percent_completed >= 100) {
                imageFiles[index].uploadingstatus = "已上传";
            }
            console.log(
                percent_completed,
                index,
                imageFiles[index].percent_completed
            );
        });

        // request finished event
        request.addEventListener("load", function (e) {
            // HTTP status message (200, 404 etc)
            console.log(request.status);

            // request.response holds response from the server
            console.log(request.response);
        });

        // send POST request to server
        request.send(formData);
    }
    function sendBiu() {
        let sContent = editor.childNodes[0].innerHTML;
        isSending = true;
        let cc = quillEditor.getContents();
        let tags = [];

        for (let index = 0; index < cc.ops.length; index++) {
            let item = cc.ops[index];
            let mt = item.insert.match(/#\S*/g);
            if (mt != null) {
                tags = [...tags, ...mt];
            }
        }
        let imagesInfo = [];
        for (let index = 0; index < imageFiles.length; index++) {
            const element = imageFiles[index];
            if (element.uploadingstatus != "已上传") {
                return;
            }
            imagesInfo = [
                ...imagesInfo,
                {
                    key: element.uploadInfo.key,
                    platform: $settingStrore.platform,
                    domain: $settingStrore.domain,
                    timeStamp: element.timeStamp,
                },
            ];
        }

        addFmolo({
            content: sContent,
            _id: _id,
            parentId: parentId,
            source: "web",
            tags: tags,
            images: imagesInfo,
        })
            .then(async (respone) => {
                let re = await respone.json();
                isSending = false;
                if (re.errorMessage == undefined) {
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
</script>

<div
    class="border-gray-200 border-solid border-4 rounded-lg mt-2 flex flex-col justify-start  pb-2 bg-white relative"
>
    <div bind:this={editor} id="editor" class="list-decimal list-inside" />
    {#if showTip}
        <!-- content here -->
        <div
            class="rounded bg-gray-800 text-sm text-white w-auto absolute font-bold"
            style="top:{tipTop + tipHeight}px;left:{tipLeft}px"
        >
            {#each tagTips as item}
                <div
                    class="hover:bg-gray-800 rounded-sm p-1"
                    tabindex="0"
                    on:click={() => {
                        tipTagInsert(item);
                    }}
                >
                    {item}
                </div>
            {/each}
        </div>
    {/if}

    <div class="flex flex-wrap flex-row  mt-4  pl-3">
        {#each imageFiles as { file, percent_completed, uploadInfo, timeStamp }}
            <div
                in:fly={{ y: -100, duration: 500, easing: cubicOut }}
                out:fly={{ y: -100, duration: 300 }}
                class="w-16 h-16 box-border  border-2 rounded mr-2 mb-2 relative overflow-hidden"
            >
                <div
                    class=" w-16 h-16  box-border absolute top-0 opacity-0 bg-black hover:opacity-75 focus:outline-none flex justify-around  "
                >
                    <button on:click={viewImage}>
                        <i class="m-auto ri-zoom-in-line ri-xl text-white" />
                    </button>
                    <button class=" " on:click={deleteImage(timeStamp)}>
                        <i class="m-auto ri-delete-bin-line ri-xl text-white" />
                    </button>
                </div>
                {#if percent_completed < 100 && percent_completed > 0}
                    <div
                        class=" w-full  h-full box-border absolute top-0 bg-black  bg-opacity-25 focus:outline-none flex justify-around  items-center "
                    >
                        <div class="m-auto text-white">
                            {percent_completed}%
                        </div>
                    </div>
                {/if}

                <img
                    class=" w-full h-full object-cover"
                    src={file == null
                        ? uploadInfo.domain + "/" + uploadInfo.key
                        : getObjectURL(file)}
                    alt=""
                />
                {#if percent_completed == 100}
                    <lable
                        class="block"
                        style="                position: absolute;
                right: -15px;
                top: -6px;
                width: 40px;
                height: 24px;
                background: #13ce66;
                text-align: center;
                transform: rotate(45deg);
                box-shadow: 0 0 1pc 1px rgb(0 0 0 / 20%);"
                    >
                        <div
                            for=""
                            style="    transform: rotate(-45deg); margin-top:2px"
                        >
                            <i class="ri-check-line text-white" />
                        </div>
                    </lable>
                {/if}
            </div>
        {/each}
    </div>
    <div class=" flex justify-between  pl-3 pr-3">
        <div id="toolbar" class="space-x-2" bind:this={toolbar}>
            <button
                class="rounded-sm hover:bg-gray-200 p-1 focus:outline-none"
                on:click={insertHashTag}><i class="ri-hashtag" /></button
            >
            <button class="ql-bold hover:bg-gray-200 p-1 focus:outline-none"
                ><i class="ri-bold" /></button
            >
            <button
                class="ql-list hover:bg-gray-200 p-1 focus:outline-none"
                value="bullet"
                ><i
                    class="ri-list-check hover:bg-gray-200 p-1 focus:outline-none"
                /></button
            >

            <button
                class="ql-list hover:bg-gray-200 p-1 focus:outline-none"
                value="ordered"
                ><i
                    class="ri-list-ordered  hover:bg-gray-200 p-1 focus:outline-none"
                /></button
            >

            <button
                class="ql-underline hover:bg-gray-200 p-1 focus:outline-none"
                ><i class="ri-underline" /></button
            >
            <button
                class="rounded-sm hover:bg-gray-200 p-1 focus:outline-none "
                on:click={selectImages}><i class="ri-image-2-line " /></button
            >
            <input
                bind:this={uploadimageNode}
                bind:files={uploadimagefiles}
                class="w-full  rounded-lg   p-2 bg-blue-400 text-white focus:outline-none"
                type="file"
                style="display:none"
                accept="image/png, image/jpeg, image/gif, image/jpg"
                multiple
            />
        </div>
        <div class="flex space-x-2">
            {#if canCancle}
                <button
                    class="rounded-sm bg-white border-black text-black pl-2 pr-2 text-sm  focus:outline-none hover:shadow-sm"
                    on:click={cancelInput}>取消</button
                >
            {/if}
            <button
                class="rounded-sm bg-green-500 text-white pl-2 pr-2 text-sm  focus:outline-none disabled:opacity-50 fle justify-center items-center w-16"
                disabled={isContentEmpty || isSending}
                on:click={() => {
                    sendBiu();
                }}
            >
                {#if isSending}
                    <ProgressLine dotSize={5} leftSize={6} bgColor={"white"} />
                {:else}
                    发送
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
</style>
