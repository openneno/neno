<script>
    import dayjs from "dayjs";
    import { createEventDispatcher } from "svelte";
    import { fade } from "../lib/motion.js";
    export let countDate = {};
    const dispatch = createEventDispatcher();
    let weekCount = 12;
    let weekDay = 7;
    let gmap = [];
    let toDay = dayjs().format("YYYY-MM-DD");

    $: {
        if (countDate !== undefined) {
            name(countDate);
        }
    }
    function name(countDate) {
        let tmap = [];
        let startDay = weekCount * weekDay - (weekDay - dayjs().day() + 1);
        for (let week = 0; week < weekCount; week++) {
            let dmap = [];
            for (let day = 0; day < weekDay; day++) {
                let count = 0;
                let date = dayjs()
                    .subtract(startDay, "day")
                    .format("YYYY-MM-DD");
                count = countDate[date];
                if (count === undefined) {
                    count = 0;
                }
                dmap = [
                    ...dmap,
                    {
                        date: date,
                        count: count,
                        hover: false,
                    },
                ];
                startDay--;
            }
            tmap = [...tmap, dmap];
        }
        gmap = tmap;
    }
</script>

<div class="w-full flex justify-between pl-1  overflow-visible">
    {#each gmap as week}
        <div class=" space-y-1 ">
            {#each week as day}
                <div class="  relative flex justify-center items-center ">
                    <div
                            on:click={() => {
                            dispatch(
                                "greenmapClick",
                                day.date === toDay ? "" : day.date
                            );
                        }}
                            class="rounded-xs w-4 h-4 overflow-visible cursor-pointer transition-transform duration-150 hover:scale-125"
                            class:border-primary-500={day.date === toDay}
                            class:border-soild={day.date === toDay}
                            class:bg-gray-300={day.count === 0}
                            class:bg-primary-300={day.count > 0 && day.count <= 3}
                            class:bg-primary-400={day.count > 3 && day.count <= 8}
                            class:bg-primary-600={day.count > 8}
                            class:border-2={day.date === toDay}
                            on:mouseenter={() => {
                            day.hover = true;
                        }}
                            on:mouseleave={() => {
                            day.hover = false;
                        }}></div>
                    {#if day.hover}
                        <div
                            transition:fade={{ duration: 120 }}
                            class="absolute  bg-gray-800 text-white text-sm rounded-xs pl-2 pr-2 pt-1 pb-1 z-50 w-48 flex justify-center items-center"
                            style="top:-2rem;z-index: 9999; overflow: visible;"
                        >
                            {day.count} nenos on {day.date}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/each}
    <div
        class="border-soild bg-gray-300 bg-primary-300  bg-primary-400 border-primary-500 bg-primary-600 border-primary-500 border-2 bg-gray-400 invisible"></div>
    <div></div>
</div>
