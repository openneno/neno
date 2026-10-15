<script>
    import dayjs from "dayjs";

    //分享卡片本身, 只负责展示; 导出图片由 Share.svelte 完成
    export let created_at = "";
    export let html = "";
    export let imageUrls = [];
    export let template = "paper";
    export let noteCount = 0;
    export let dayCount = 0;
    export let card = null;

    const WEEK_DAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

    $: date = dayjs(created_at);
    $: daysAgo = Math.max(0, dayjs().startOf("day").diff(date.startOf("day"), "day"));
    //让旧笔记更有故事感
    $: yearsAgo = dayjs().year() - date.year();
    $: sameDay = date.format("MM-DD") === dayjs().format("MM-DD");
    $: ageText = daysAgo === 0 ? "今天的想法"
        : daysAgo === 1 ? "昨天的想法"
            : sameDay && yearsAgo > 0 ? `${yearsAgo} 年前的今天`
                : `${daysAgo} 天前的想法`;
</script>

<!-- light-scope: 卡片有自己的配色, 不受页面深色模式影响 -->
<div bind:this={card} class="share-card light-scope t-{template}">
    {#if template === "night"}
        <div class="glow" aria-hidden="true"></div>
    {/if}

    <div class="inner">
        <header class="head">
            <div class="date">
                <span class="day">{date.format("DD")}</span>
                <span class="meta">
                    <span>{date.format("YYYY.MM")}</span>
                    <span>{WEEK_DAYS[date.day()]} · {date.format("HH:mm")}</span>
                </span>
            </div>
            <span class="age">{ageText}</span>
        </header>

        <div class="body">
            <span class="quote" aria-hidden="true">“</span>
            <div class="neno-content text">
                {@html html}
            </div>
        </div>

        {#if imageUrls.length > 0}
            <div class="images" class:single={imageUrls.length === 1}>
                {#each imageUrls.slice(0, 4) as url}
                    <img src={url} alt=""/>
                {/each}
            </div>
        {/if}

        <footer class="foot">
            <span class="brand">
                <span class="mark"><i class="ri-quill-pen-fill"></i></span>
                <span>NENO</span>
            </span>
            <span class="stats">记录的第 {dayCount} 天 · 共 {noteCount} 条笔记</span>
        </footer>
    </div>
</div>

<style>
    .share-card {
        position: relative;
        width: 400px;
        overflow: hidden;
        border-radius: 20px;
        /* 每套模板通过这些变量配色 */
        --sc-ink: #2a2723;
        --sc-ink-2: #6f685e;
        --sc-line: rgba(42, 39, 35, 0.12);
        --sc-accent: var(--primary-600);
        --sc-tag-bg: var(--primary-100);
        --sc-tag-ink: var(--primary-700);
    }

    /* 纸笺: 温暖的纸面, 宋体正文 */
    .t-paper {
        background: linear-gradient(170deg, #fdfaf3 0%, #f5eee1 100%);
    }
    .t-paper .text {
        font-family: "Songti SC", "Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", serif;
    }

    /* 极光: 主题色渐变, 内容放在半透明的白色面板上 */
    .t-aurora {
        --sc-ink: #1f2328;
        --sc-ink-2: #5d636c;
        --sc-line: rgba(31, 35, 40, 0.1);
        background: linear-gradient(145deg, var(--primary-300) 0%, var(--primary-100) 38%, #ffffff 62%, var(--primary-200) 100%);
        padding: 14px;
    }
    .t-aurora .inner {
        background: rgba(255, 255, 255, 0.82);
        border-radius: 14px;
    }

    /* 夜空: 深色背景加一束主题色的光 */
    .t-night {
        --sc-ink: #eceef1;
        --sc-ink-2: #9aa1aa;
        --sc-line: rgba(255, 255, 255, 0.1);
        --sc-accent: var(--primary-300);
        --sc-tag-bg: rgba(255, 255, 255, 0.08);
        --sc-tag-ink: var(--primary-300);
        background: #121418;
    }
    .glow {
        position: absolute;
        top: -140px;
        left: -120px;
        width: 420px;
        height: 420px;
        border-radius: 50%;
        background: radial-gradient(circle, var(--primary-500) 0%, rgba(0, 0, 0, 0) 68%);
        opacity: 0.38;
    }

    .inner {
        position: relative;
        padding: 30px 30px 22px;
        color: var(--sc-ink);
    }

    .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
    }
    .date {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .day {
        font-size: 44px;
        line-height: 1;
        font-weight: 600;
        letter-spacing: -0.02em;
        color: var(--sc-accent);
        font-variant-numeric: tabular-nums;
    }
    .meta {
        display: flex;
        flex-direction: column;
        font-size: 12px;
        line-height: 1.5;
        color: var(--sc-ink-2);
        font-variant-numeric: tabular-nums;
    }
    .age {
        margin-top: 4px;
        padding: 3px 10px;
        border-radius: 999px;
        border: 1px solid var(--sc-line);
        font-size: 12px;
        color: var(--sc-ink-2);
        white-space: nowrap;
    }

    .body {
        position: relative;
        margin-top: 26px;
    }
    .quote {
        position: absolute;
        top: -30px;
        left: -6px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 72px;
        line-height: 1;
        color: var(--sc-accent);
        opacity: 0.22;
    }
    .text {
        position: relative;
        color: var(--sc-ink);
        font-size: 16px;
        line-height: 1.9;
        letter-spacing: 0.02em;
    }
    .share-card .text :global(.neno-tag) {
        background: var(--sc-tag-bg);
        color: var(--sc-tag-ink);
    }
    .share-card .text :global(a) {
        color: var(--sc-accent);
    }
    .text :global(li::marker) {
        color: var(--sc-ink-2);
    }

    .images {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 18px;
    }
    .images img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 10px;
    }
    .images.single {
        grid-template-columns: 1fr;
    }
    .images.single img {
        aspect-ratio: auto;
        max-height: 320px;
    }

    .foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 28px;
        padding-top: 14px;
        border-top: 1px solid var(--sc-line);
        font-size: 12px;
        color: var(--sc-ink-2);
    }
    .brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        letter-spacing: 0.08em;
        color: var(--sc-ink);
    }
    .mark {
        display: flex;
        width: 18px;
        height: 18px;
        align-items: center;
        justify-content: center;
        border-radius: 5px;
        background: var(--primary-500);
        color: #fff;
        font-size: 11px;
    }
    .stats {
        font-variant-numeric: tabular-nums;
    }
</style>
