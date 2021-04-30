<script>
    import { onMount } from "svelte";
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    import Quill from "quill";

    import * as qiniu from "qiniu-js";
    import {
        addFmolo,
        qiniuToken,
        uploadPicIndexedDB,
        getFileFromIndexedDB,
    } from "../request/fetchApi";
    import { getObjectURL } from "../utils/process";
    import { showPictureView } from "./ViewPicture.svelte";

    import {settingStore, tagStore} from "../store/store.js";

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
    let tipClient = "";

    let tagStartIndex = 0;
    let selectionIndex = 0;

    let tagTips = [];
    let tagTipsFocusIndex = 0;

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
        editor.onkeydown = function (event) {
            if (
                (event.code == "ArrowUp" ||
                    event.code == "ArrowDown" ||
                    event.keyCode == 13) &&
                tagTips.length > 0
            ) {
                if (event.code == "ArrowUp" && tagTipsFocusIndex > 0) {
                    tagTipsFocusIndex--;
                }
                if (
                    event.code == "ArrowDown" &&
                    tagTipsFocusIndex < tagTips.length - 1
                ) {
                    tagTipsFocusIndex++;
                }
                if (event.code == "Enter") {
                    tipTagInsert(tagTips[tagTipsFocusIndex]);
                    showTip = false;
                }

                return false;
            }
        };
        quillEditor.on("text-change", function (delta, oldDelta, source) {
            isContentEmpty = quillEditor.getText().length == 1;

            toolTip();
        });
        quillEditor.root.addEventListener('paste', evt => {
            if (evt.clipboardData && evt.clipboardData.files && evt.clipboardData.files.length) {
                evt.preventDefault();
                [].forEach.call(evt.clipboardData.files, file => {
                    if (!file.type.match(/^image\/(gif|jpe?g|a?png|bmp)/i)) {
                        return;
                    }
                    imageFiles = joinFile([file])
                    console.log(file)
                });
            }
        }, false);
        quillEditor.on("selection-change", function (range, oldRange, source) {
            if (range) {
                toolTip();
            }
        });
        quillEditor.setSelection(quillEditor.getText().length);
        quillEditor.clipboard.addMatcher('IMG', (node, delta) => {
            const Delta = Quill.import('delta')
            return new Delta().insert('')
        })
        quillEditor.clipboard.addMatcher('PICTURE', (node, delta) => {
            const Delta = Quill.import('delta')
            return new Delta().insert('')
        })
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
        if (selection == null) {
            return;
        }
        selection;
        let cIndex = selection.index;
        var text = quillEditor.getText();
        let sIndex = text.lastIndexOf("#", cIndex);
        if (sIndex != -1) {
            let tagMay = text.substring(sIndex, cIndex);

            tagTips = [];
            for (let index = 0; index < $tagStore.allTags.length; index++) {
                const element = $tagStore.allTags[index];
                if (element.indexOf(tagMay) == 0) {
                    tagTips = [...tagTips, element];
                }
            }
            tagTips = tagTips.sort((a, b) => {
                return b.length - a.length;
            });

            if (tagTips.length != 0) {
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
        if (tagStartIndex != 0) {
            updateContents.ops = [{ retain: tagStartIndex }];
        }
        updateContents.ops = [
            ...updateContents.ops,
            { delete: deletelength },
            { insert: tag },
            { delete: 1 },
        ];
        quillEditor.updateContents(updateContents);
        quillEditor.focus();
        quillEditor.setSelection(tagStartIndex + tag.length, 0, "api");
    }

    $: imageFiles = joinFile(uploadimagefiles);

    $: {
        for (let index = 0; index < imageFiles.length; index++) {
            const element = imageFiles[index];
            if (element.uploadingstatus == "未上传") {
                element.uploadingstatus = "上传中";
                // uploadPic(element, index);
                if ($settingStore.useMode == "github") {
                    uploadPicLocal(element, index);
                } else {
                    qiniuToken()
                        .then(async (respone) => {
                            let re = await respone.json();
                            if (re.errorMessage == undefined) {
                                {
                                    uploadPicQiniu(element, index, re.body);
                                }
                            }
                        })
                        .catch((reason) => {
                            console.log(reason);
                        });
                }
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
    function viewImage(index) {
        showPictureView(imageFiles, index);
    }
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
    async function uploadPicLocal(imageFile, index) {
        console.log(imageFile);

        var response = await uploadPicIndexedDB(imageFile.file);
        imageFiles[index].uploadingstatus = "已上传";
        imageFiles[index].uploadInfo.key = response.key;
        imageFiles[index].uploadInfo.platform = "indexedDB";
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
                    platform: element.uploadInfo.platform,
                    imgDomain: $settingStore.imgDomain,
                    timeStamp: element.timeStamp,
                },
            ];
        }

        addFmolo({
            content: sContent,
            pureContent:editor.childNodes[0].innerText,
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
    async function getPIcUrl(file, uploadInfo) {
        if (file == null) {
            if (uploadInfo.platform == "indexedDB") {
                return (await getFileFromIndexedDB(uploadInfo.key)).key;
            } else {
                return uploadInfo.imgDomain + "/" + uploadInfo.key;
            }
        } else {
            return getObjectURL(file);
        }
    }
</script>

<div
    class="border-gray-200 border-solid border-4 rounded-lg mt-2 flex flex-col justify-start  pb-2 bg-white relative"
>
    <div bind:this={editor} id="editor" class="list-decimal list-inside" />
    {#if tagTips.length > 0}
        <div
            bind:this={tipClient}
            class="rounded bg-gray-800 text-sm text-white w-auto absolute font-bold p-1"
            style="top:{tipTop + tipHeight}px;left:{tipLeft}px"
        >
            {#each tagTips as item, index}
                <div
                    class="hover:bg-gray-400 rounded-sm p-1 bg"
                    class:bg-gray-400={index == tagTipsFocusIndex}
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
        {#each imageFiles as { file, percent_completed, uploadInfo, timeStamp }, index}
            <div
                in:fly={{ y: -100, duration: 500, easing: cubicOut }}
                out:fly={{ y: -100, duration: 300 }}
                class="w-16 h-16 box-border  border-2 rounded mr-2 mb-2 relative overflow-hidden"
            >
                <div
                    class=" w-16 h-16  box-border absolute top-0 opacity-0 bg-black hover:opacity-75 focus:outline-none flex justify-around  "
                >
                    <button
                        on:click={() => {
                            viewImage(index);
                        }}
                    >
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
                {#await getPIcUrl(file, uploadInfo) then value}
                    <img
                        class=" w-full h-full object-cover"
                        src={value}
                        alt=""
                    />
                {/await}

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
                box-shadow: 0 0 1px 1px rgba(0, 0 ,0 , 0.2);"
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
    <div
        class=" flex justify-between flex-col  sm:flex-row md:flex-row  pl-3 pr-3"
    >
        <div id="toolbar" class="space-x-1" bind:this={toolbar}>
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
        <div class="flex space-x-2 justify-end">
            {#if canCancle}
                <button
                    class="rounded-sm bg-white border-black text-black pl-2 pr-2 text-sm  focus:outline-none hover:shadow-sm"
                    on:click={cancelInput}>取消</button
                >
            {/if}
            <button
                class="rounded-sm bg-green-500 text-white md:pl-2 md:pr-2 pl-1 pr-1 text-sm  focus:outline-none disabled:opacity-50 fle justify-center items-center w-16"
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
