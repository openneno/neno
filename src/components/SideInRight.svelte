<script context="module">
    let doShowParent = null;

    export function showFmolo(fmoloId, isHidden) {
        doShowParent(fmoloId, isHidden);
    }
</script>

<script>
    import QuillEditor from "./QuillEditor.svelte";
    import FmoloItem from "./FmoloItem.svelte";
    import { onMount } from "svelte";
    let isLoding = true;
    let show = false;

    function loading(params) {
        setTimeout(() => {}, 2000);
    }

    onMount(() => {
        doShowParent = showParent;
        return doShowParent;
    });
    let flomoItems = [];

    let fmoloId = "";
    function showParent(newFmoloId) {
        fmoloId = newFmoloId;
        show = !show;
        setTimeout(() => {
            isLoding = false;
            flomoItems = [
                {
                    createTime: "2021-02-01 11:12:24",
                    content: `<p>网页设计</p>`,
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
        }, 2000);
    }
    function hidden(params) {
        isLoding = false;
        show = false;
        flomoItems = [];
    }
</script>

{#if show}
    <div class="w-screen bg-black bg-opacity-50 fixed top-0 z-20 h-screen">
        <div
            class="lt:w-4/12 w-2/12 2xl:w-8/12 float-left   h-full "
            on:click={() => {
                hidden();
            }}
        />
        <div
            class="lt:w-8/12 w-10/12 2xl:w-4/12 float-right  shadow-sm bg-white h-full p-4"
        >
            {#if isLoding}
                <div>loading</div>
            {/if}
            <button
                class="focus:outline-none"
                on:click={() => {
                    hidden();
                }}
            >
                <i class="ri-close-fill" />
            </button>
            {#each flomoItems as item}
                <!-- content here -->
                <FmoloItem {...item} />
            {/each}

            <QuillEditor />
        </div>
    </div>
{/if}
