<script>
    import { onMount } from "svelte";
    import Quill from "quill";
    import { getAllFmolo } from "../request/fetchApi";

    let editor = "";
    let toolbar = "";

    export let content = "";
    export let canCancle = false;

    let uploadimageNode = "";
    let uploadimagefiles = [];
    let imageFiles = [];
    $: imageFiles = joinFile(uploadimagefiles);
    function joinFile(uploadimagefiles) {
        let filelist = Array.from(uploadimagefiles);
        let indexcount = 0;
        console.log(uploadimagefiles);
        let tempfiles = imageFiles;
        filelist.forEach((element) => {
            tempfiles = [
                ...tempfiles,
                {
                    file: element,
                    percent_completed: 0,
                    index: indexcount,
                    uploadingstatus: "未上传", //"上传中","已上传"
                },
            ];
            indexcount++;
        });
        return tempfiles;
    }
    $: {
        for (let index = 0; index < imageFiles.length; index++) {
            const element = imageFiles[index];
            console.log(index, element);
            if (element.uploadingstatus == "未上传") {
                element.uploadingstatus = "上传中";
                uploadPic(element, index);
            }
        }
    }
    onMount(() => {
        var options = {
            // debug: "info",
            modules: {
                toolbar: toolbar,
            },
            placeholder: "现在的想法是...",
            // theme: "snow",
        };
        editor = new Quill(editor, options);
        const delta = editor.clipboard.convert(content);
        editor.setContents(delta, "silent");
        editor.focus();
    });
    function selectImages(params) {
        uploadimageNode.click();
    }
    function viewImage(params) {}
    function deleteImage(index) {
        imageFiles = imageFiles.filter((item) => {
            return item.index != index;
        });
    }
    function insertHashTag() {
        editor.insertText(0, "#", {
            color: "#000",
            italic: true,
        });
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
        getAllFmolo([])
            .then(async (respone) => {
                let re = await respone.json();
                console.log(re);
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
</script>

<div
    class="border-gray-200 border-solid border-4 rounded-lg mt-2 flex flex-col justify-start  pb-2 bg-white"
>
    <div bind:this={editor} id="editor" class="list-decimal list-inside" />
    <div class="flex flex-wrap flex-row  mt-4  pl-3">
        {#each imageFiles as { file, percent_completed, index } (file)}
            <div
                class="w-16 h-16 box-border  border-2 rounded mr-2 mb-2 relative overflow-hidden"
            >
                <div
                    class=" w-16 h-16  box-border absolute top-0 opacity-0 bg-black hover:opacity-75 focus:outline-none flex justify-around  "
                >
                    <button on:click={viewImage}>
                        <i class="m-auto ri-zoom-in-line ri-xl text-white" />
                    </button>
                    <button class=" " on:click={deleteImage(index)}>
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
                    src={getObjectURL(file)}
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
                    class="ri-list-ordered hover:bg-gray-200 p-1 focus:outline-none"
                /></button
            >

            <button
                class="ql-list hover:bg-gray-200 p-1 focus:outline-none"
                value="ordered"
                ><i
                    class="ri-list-check hover:bg-gray-200 p-1 focus:outline-none"
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
                    class="rounded-sm bg-green-500 text-white pl-2 pr-2 text-sm  focus:outline-none"
                    on:click={sendBiu}>取消</button
                >
            {/if}
            <button
                class="rounded-sm bg-green-500 text-white pl-2 pr-2 text-sm  focus:outline-none"
                on:click={sendBiu}>发送</button
            >
        </div>
    </div>
</div>

<style>
</style>
