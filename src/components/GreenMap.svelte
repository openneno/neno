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

<!-- 12 列 x 7 行的网格: 格子随宽度等比缩放, 横竖间距相同, 手机抽屉(更宽)中也能对齐 -->
<div class="grid w-full grid-flow-col grid-rows-7 gap-[3px]" style="grid-template-columns: repeat({weekCount}, minmax(0, 1fr))">
    {#each gmap as week, weekIndex}
        {#each week as day}
            <div class="relative">
                <button
                        class="block aspect-square w-full rounded-[3px] transition-transform duration-150 hover:scale-125"
                        class:bg-surface-3={day.count === 0}
                        class:bg-primary-200={day.count > 0 && day.count <= 2}
                        class:dark:bg-primary-900={day.count > 0 && day.count <= 2}
                        class:bg-primary-400={day.count > 2 && day.count <= 5}
                        class:dark:bg-primary-700={day.count > 2 && day.count <= 5}
                        class:bg-primary-600={day.count > 5}
                        class:dark:bg-primary-500={day.count > 5}
                        class:today={day.date === toDay}
                        aria-label="{day.date} {day.count} 条笔记"
                        on:click={() => {
                            dispatch("greenmapClick", day.date === toDay ? "" : day.date);
                        }}
                        on:mouseenter={() => {
                            day.hover = true;
                        }}
                        on:mouseleave={() => {
                            day.hover = false;
                        }}
                ></button>
                {#if day.hover}
                    <!-- 靠边的几列提示框贴边对齐, 不会超出卡片 -->
                    <div
                            transition:fade={{ duration: 120 }}
                            class="pointer-events-none absolute bottom-full z-50 mb-1.5 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-surface shadow-pop tabular-nums {weekIndex < 3
                                ? 'left-0'
                                : weekIndex >= weekCount - 3
                                  ? 'right-0'
                                  : 'left-1/2 -translate-x-1/2'}"
                    >
                        {day.date} · {day.count} 条笔记
                    </div>
                {/if}
            </div>
        {/each}
    {/each}
</div>

<style>
    /* 今天: 主题色描边 */
    .today {
        outline: 1.5px solid var(--primary-500);
        outline-offset: 1px;
    }
    button:active {
        transform: none;
    }
</style>
