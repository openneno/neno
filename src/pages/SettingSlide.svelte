<script context="module">
    let showDetailss = null;
    export function showSlide() {
        console.log("showSlide");
        showDetailss();
    }
</script>

<script>
    import { fly, fade } from "../lib/motion.js";
    import SideLeft from "./SideLeft.svelte";
    import {currentPage} from "../store/store.js";

    import { onMount } from "svelte";
    let show = false;
    let showLeft = false;

    onMount(() => {
        showDetailss = showDetail;
        //在抽屉里切换页面后自动收起
        let lastPage;
        return currentPage.subscribe((page) => {
            if (lastPage !== undefined && page !== lastPage) {
                hidden();
            }
            lastPage = page;
        });
    });

    function showDetail() {
        show = !show;
        showLeft = !showLeft;
    }

    function hidden() {
        show = false;
        showLeft = false;
    }
</script>

{#if show}
    <div class="fixed inset-0 z-30 sm:hidden">
        <div
                class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                in:fade={{ duration: 150 }}
                out:fade={{ duration: 150 }}
                on:click={() => hidden()}
                aria-hidden="true"
        ></div>
        {#if showLeft}
            <div
                    in:fly={{ x: -40, duration: 220 }}
                    out:fly={{ x: -40, duration: 180 }}
                    class="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] bg-canvas shadow-pop"
                    role="dialog"
                    aria-modal="true"
                    aria-label="菜单"
            >
                <SideLeft />
            </div>
        {/if}
    </div>
{/if}
