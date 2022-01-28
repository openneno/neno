<script context="module">
    let showDetailss = null;
    export function showSlide() {
        console.log("showSlide");
        showDetailss();
    }
</script>

<script>
    import { fly, fade } from "svelte/transition";
    import SideLeft from "./SideLeft.svelte";

    import { onMount } from "svelte";
    let show = false;
    let showLeft = false;

    onMount(() => {
        showDetailss = showDetail;
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
    <div
        class="w-screen bg-black bg-opacity-50 fixed top-0 z-20 h-screen "
        in:fade={{ duration: 190 }}
        out:fade={{ duration: 210 }}
    >
        {#if showLeft}
            <div
                in:fly={{ x: -200, duration: 200 }}
                out:fly={{ x: -200, duration: 200 }}
                class="dark:bg-black lt:w-8/12 w-10/12 2xl:w-4/12 float-left  shadow-sm bg-gray-100 h-full p-4 flex flex-col overflow-y-scroll"
            >
                <SideLeft />
            </div>
        {/if}
        <div
            class="lt:w-4/12 w-2/12 2xl:w-8/12 float-right   h-full "
            on:click={() => {
                hidden();
            }}
        />
    </div>
{/if}
