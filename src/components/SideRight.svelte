<script>
    import QuillEditor from "./QuillEditor.svelte";
    import FmoloItem from "./FmoloItem.svelte";
    import { onMount } from "svelte";
    import { getAllFmolo } from "../request/fetchApi";
    import ProgressLine from "./ProgressLine.svelte";
    import { fly } from "svelte/transition";

    let flowClient;
    let innerHeight = 0;
    let flowClientTop = 0;
    let scrollY = 0;
    let isLoding = false; //加载中状态
    let isLodingError = false; //加载错误
    let isEnd = false; //所有内容加载完毕

    let page = 0;
    $: {
        if (flowClient != undefined) {
            let flowClientBoundingClientRect = flowClient.getBoundingClientRect();
            flowClientTop = flowClientBoundingClientRect.top;
        }
    }

    let flomoItems = [
        // {
        //     createTime: "2021-02-01 11:12:24",
        //     content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
        //     images: [
        //         {
        //             url:
        //                 "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
        //         },
        //         {
        //             url:
        //                 "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
        //         },
        //         {
        //             url:
        //                 "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
        //         },
        //         {
        //             url:
        //                 "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
        //         },
        //     ],
        //     parent: { content: "<p>捡了一只黑色的小猫</p>" },
        //     children: [
        //         {
        //             content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
        //         },
        //     ],
        // },
        // {
        //     createTime: "2021-02-01 11:12:24",
        //     content: `<p>网页设计</p>`,
        //     images: [],
        //     parent: { content: "<p>捡了一只黑色的小猫</p>" },
        //     children: [
        //         {
        //             content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
        //         },
        //     ],
        // },
        // {
        //     createTime: "2021-02-01 11:12:24",
        //     content: `<p>网页设计</p>`,
        //     images: [],
        //     parent: { content: "<p>捡了一只黑色的小猫</p>" },
        //     children: [
        //         {
        //             content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
        //         },
        //     ],
        // },
    ];
    let isShowSideInRight = true;
    onMount(() => {
        load();
        flowClient.addEventListener("scroll", function () {
            if (
                flowClient.scrollTop ==
                    flowClient.scrollHeight - flowClient.clientHeight &&
                !isLoding &&
                !isEnd
            ) {
                page += 1;
                load();
            }
        });
    });
    function load() {
        isLoding = true;
        isLodingError = false;
        getAllFmolo({ page: page })
            .then(function (response) {
                if (response.ok) {
                    return response;
                }
                throw new Error("Network response was not ok.");
            })
            .then(async (respone) => {
                let re = await respone.json();
                if (re.body.length == 0) {
                    isEnd = true;
                }
                re.body.forEach((element) => {
                    flomoItems = [...flomoItems, element];
                });
                isLoding = false;
            })
            .catch((reason) => {
                console.log("reason", reason);
                isLodingError = true;
                isLoding = false;
            });
    }
</script>

<svelte:window bind:innerHeight />
<div class="  flex-1 flex flex-col justify-start  pt-4 pl-4 ">
    <div class="  flex flex-row items-center justify-between pr-4">
        <div>MEMO</div>

        <div class="bg-gray-200 rounded-lg h-8 p-2 flex items-center">
            <i class="ri-search-2-line text-gray-300" />
            <input class=" ml-2 bg-gray-200 focus:outline-none" type="text" />
        </div>
    </div>
    <div class="p-4">
        <QuillEditor
            on:update={(event) => {
                flomoItems = [event.detail, ...flomoItems];
            }}
        />
    </div>
    {#if isLoding}
        <div transition:fly={{ y: -20, duration: 1000 }} class="w-full ">
            <ProgressLine />
        </div>
    {/if}
    {#if isLodingError}
        <div class="w-full pl-4 pr-4">
            <button
                class=" w-full rounded focus:outline-none m-aut bg-red-400  text-white  p-2  "
                on:click={() => {
                    load();
                }}>重新获取</button
            >
        </div>
    {/if}
    <div
        bind:this={flowClient}
        class="flex flex-col overflow-y-scroll p-4 "
        style="height:{innerHeight - flowClientTop}px"
    >
        {#each flomoItems as item, index (index)}
            <FmoloItem
                {...item}
                on:deleteOne={(event) => {
                    flomoItems = flomoItems.filter((item) => {
                        return item._id != event.detail._id;
                    });
                }}
            />
        {/each}
    </div>
</div>

<style type="text/postcss">
</style>
