<script>
    import QuillEditor from "./QuillEditor.svelte";
    import FmoloItem from "./FmoloItem.svelte";

    let flowClient;
    let innerHeight = 0;
    let flowClientTop = 0;
    let scrollY = 0;

    $: {
        if (flowClient != undefined) {
            let flowClientBoundingClientRect = flowClient.getBoundingClientRect();
            flowClientTop = flowClientBoundingClientRect.top;
        }
    }
    let flomoItems = [
        {
            createTime: "2021-02-01 11:12:24",
            content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
            images: [
                {
                    url:
                        "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
                },
                {
                    url:
                        "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
                },
                {
                    url:
                        "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
                },
                {
                    url:
                        "https://flomo.oss-cn-shanghai.aliyuncs.com/file/2021-01-31/31298/a629f857ed3793e97d8d81783d6c5553.jpeg",
                },
            ],
            parent: { content: "<p>捡了一只黑色的小猫</p>" },
            children: [
                {
                    content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
                },
            ],
        },
        {
            createTime: "2021-02-01 11:12:24",
            content: `<p>网页设计</p>`,
            images: [],
            parent: { content: "<p>捡了一只黑色的小猫</p>" },
            children: [
                {
                    content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
                },
            ],
        },
        {
            createTime: "2021-02-01 11:12:24",
            content: `<p>网页设计</p>`,
            images: [],
            parent: { content: "<p>捡了一只黑色的小猫</p>" },
            children: [
                {
                    content: `<p>网页设计</p><ol class="list-decimal pl-6"><li><p>首页随机显示一个物种</p></li><li><p>设计一个搜索框,可以直接上传图片进行搜索,名字就叫小亮讲过的生物</p></li><li><p>可以查看更多,跳转到列表页</p></li></ol>`,
                },
            ],
        },
    ];
    let isShowSideInRight = true;
</script>

<svelte:window bind:scrollY bind:innerHeight />
<div class="  flex-1 flex flex-col justify-start  pt-4 pl-4 ">
    <div class="  flex flex-row items-center justify-between pr-4">
        <div>MEMO</div>

        <div class="bg-gray-200 rounded-lg h-8 p-2 flex items-center">
            <i class="ri-search-2-line text-gray-300" />
            <input class=" ml-2 bg-gray-200 focus:outline-none" type="text" />
        </div>
    </div>
    <div class="p-4">
        <QuillEditor />
    </div>
    <div
        bind:this={flowClient}
        class="flex flex-col overflow-y-scroll p-4 "
        style="height:{innerHeight - flowClientTop}px"
    >
        {#each flomoItems as item, index (index)}
            <!-- content here -->
            <FmoloItem {...item} />
        {/each}
    </div>
</div>

<style type="text/postcss">
</style>
