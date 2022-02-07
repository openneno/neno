<script>
    import {onMount} from "svelte";
    import {createEventDispatcher} from "svelte";
    import {fly} from "svelte/transition";
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
        const options = {
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

    $:{
        imageFiles = joinFile(uploadimagefiles);
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
        uploadimagefiles = []
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
        let sContent = editor.childNodes[0].innerHTML;
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
        class="border-gray-200 border-solid dark:border-gray-500 border-4 rounded-lg mt-2 flex flex-col justify-start  pb-2 bg-white dark:bg-gray-600 dark:text-slate-100 relative"
>
    <div bind:this={editor} id="editor" class="list-decimal list-inside"></div>
    {#if tagTips.length > 0 && showTip}
        <div
                bind:this={tipClient}
                class="rounded bg-gray-800 text-sm text-white w-auto absolute font-bold p-1 z-10"
                style="top:{tipTop + tipHeight}px;left:{tipLeft}px"
        >
            {#each tagTips as item, index}
                <div
                        class="hover:bg-gray-400 rounded-sm p-1 bg"
                        class:bg-gray-400={index === tagTipsFocusIndex}
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
        {#each imageFiles as {file, uploadInfo, timeStamp}, index}
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
                        <i class="m-auto ri-zoom-in-line ri-xl text-white"></i>
                    </button>
                    <button class=" " on:click={()=>{deleteImage(timeStamp)}}>
                        <i class="m-auto ri-delete-bin-line ri-xl text-white"></i>
                    </button>
                </div>

                {#await getPIcUrl(file, uploadInfo) then value}
                    <img
                            class=" w-full h-full object-cover"
                            src={value}
                            alt=""
                    />
                {/await}


            </div>
        {/each}
    </div>
    <div
            class=" flex justify-between flex-col  sm:flex-row md:flex-row  pl-3 pr-3"
    >
        <div id="toolbar" class="space-x-1" bind:this={toolbar}>
            <button
                    class="rounded-sm  hover:bg-gray-200 p-1 focus:outline-none"
                    on:click={insertHashTag}><i class="ri-hashtag"></i></button
            >
            <button
                    class=" rounded-sm ql-bold hover:bg-gray-200 p-1 focus:outline-none"
            ><i class="ri-bold"></i></button
            >
            <button
                    class=" rounded-sm ql-list hover:bg-gray-200 p-1 focus:outline-none"
                    value="bullet"
            ><i
                    class="ri-list-check hover:bg-gray-200 p-1 focus:outline-none"></i></button
            >

            <button
                    class="rounded-sm ql-list hover:bg-gray-200 p-1 focus:outline-none"
                    value="ordered"
            ><i
                    class="ri-list-ordered  hover:bg-gray-200 p-1 focus:outline-none"></i></button
            >

            <button
                    class=" rounded-sm ql-underline hover:bg-gray-200 p-1 focus:outline-none"
            ><i class="ri-underline"></i></button
            >
            <button
                    class="rounded-sm hover:bg-gray-200 p-1 focus:outline-none "
                    on:click={selectImages}><i class="ri-image-2-line "></i></button
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
                        class="rounded-sm bg-white dark:bg-neutral-700 dark:text-gray-200 border-black text-black pl-2 pr-2 text-sm  focus:outline-none hover:shadow-sm"
                        on:click={cancelInput}>取消
                </button
                >
            {/if}
            <button
                    class="rounded-sm bg-green-500 text-white md:pl-2 md:pr-2 pl-1 pr-1 text-sm  focus:outline-none disabled:opacity-70 fle justify-center items-center w-16"
                    disabled={isContentEmpty || isSending}
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

</style>
