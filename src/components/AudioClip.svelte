<script>
    //一段语音: 播放原始录音, 展开查看识别出的原文
    //平时不显示进度条: 播放进度画在播放按钮外的细圈上; 在语音条上左右拖动时才出现进度, 松开跳到对应位置
    //笔记中的语音条宽度随时长变化; 编辑器中铺满, 并显示识别状态, 可以重新识别或移除
    import {createEventDispatcher, onDestroy} from "svelte";
    import {getAudioURL} from "../request/fetchApi";
    import {getObjectURL} from "../utils/process";

    //{key, suffixName, duration_ms, text}
    export let clip;
    //还没有保存的录音
    export let file = null;
    //"" | "transcribing" | "error"
    export let status = "";
    export let error = "";
    export let editable = false;

    const dispatch = createEventDispatcher();

    let audio = null;
    let url = null;
    let ownUrl = false;
    let missing = false;
    let playing = false;
    let current = 0;
    let showText = false;

    //拖动中的目标位置(0~1), null 表示没有在拖动
    let scrub = null;
    let row;
    let drag = null;

    $: duration = (clip.duration_ms || 0) / 1000;
    $: progress = scrub ?? (duration > 0 ? Math.min(1, current / duration) : 0);
    $: shown = scrub !== null ? scrub * duration : playing || current > 0 ? current : duration;
    //笔记中: 宽度随时长变化(与安卓端一致)
    //展开原文时铺满, 让文字有足够的横向空间
    $: width = editable || showText ? "100%" : `min(100%, ${150 + duration * 2.4}px)`;
    $: text = clip.text || "";

    function format(seconds) {
        const total = Math.max(0, Math.round(seconds));
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
    }

    async function ensureAudio() {
        if (audio) return audio;
        if (file) {
            url = getObjectURL(file);
            ownUrl = true;
        } else {
            url = await getAudioURL(clip.key);
            ownUrl = !!url;
        }
        if (!url) {
            //其他设备录的语音还没有同步到本机
            missing = true;
            return null;
        }
        audio = new Audio(url);
        audio.addEventListener("timeupdate", () => (current = audio.currentTime));
        audio.addEventListener("play", () => (playing = true));
        audio.addEventListener("pause", () => (playing = false));
        audio.addEventListener("ended", () => {
            playing = false;
            current = 0;
        });
        return audio;
    }

    async function toggle() {
        const player = await ensureAudio();
        if (!player) return;
        if (player.paused) {
            //同一时间只播放一段语音
            window.dispatchEvent(new CustomEvent("neno-audio-play", {detail: player}));
            player.play();
        } else {
            player.pause();
        }
    }

    function fractionAt(clientX) {
        const rect = row.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    //按下后横向移动超过几个像素才开始拖动, 点击按钮不受影响
    function onPointerDown(event) {
        if (duration <= 0 || event.button !== 0 || event.target.closest("button")) return;
        drag = {id: event.pointerId, x: event.clientX, started: false};
    }

    async function onPointerMove(event) {
        if (!drag || drag.id !== event.pointerId) return;
        if (!drag.started) {
            if (Math.abs(event.clientX - drag.x) < 5) return;
            drag.started = true;
            row.setPointerCapture(event.pointerId);
            if (!(await ensureAudio())) {
                drag = null;
                return;
            }
        }
        scrub = fractionAt(event.clientX);
    }

    function onPointerUp(event) {
        if (!drag || drag.id !== event.pointerId) return;
        if (drag.started && scrub !== null && audio) {
            audio.currentTime = scrub * duration;
            current = audio.currentTime;
        }
        drag = null;
        scrub = null;
    }

    //键盘: 左右方向键前后跳 5 秒
    async function onKeydown(event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        const player = await ensureAudio();
        if (!player) return;
        event.preventDefault();
        player.currentTime = Math.max(0, Math.min(duration, player.currentTime + (event.key === "ArrowRight" ? 5 : -5)));
        current = player.currentTime;
    }

    const onOtherPlay = (event) => {
        if (audio && event.detail !== audio) audio.pause();
    };
    window.addEventListener("neno-audio-play", onOtherPlay);

    onDestroy(() => {
        window.removeEventListener("neno-audio-play", onOtherPlay);
        if (audio) audio.pause();
        if (url && ownUrl) URL.revokeObjectURL(url);
    });
</script>

<div class="audio-clip overflow-hidden rounded-xl border border-line bg-surface-2/60 transition-[width] duration-200 ease-out" style:width={width}>
    <div
            bind:this={row}
            class="relative flex h-10 cursor-ew-resize touch-pan-y items-center gap-2.5 pr-1.5 pl-1.5 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
            role="slider"
            tabindex="0"
            aria-label="播放进度, 左右拖动或方向键调整"
            title="左右拖动调整进度"
            aria-valuemin="0"
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shown)}
            on:pointerdown={onPointerDown}
            on:pointermove={onPointerMove}
            on:pointerup={onPointerUp}
            on:pointercancel={onPointerUp}
            on:keydown={onKeydown}
    >
        <!-- 只在拖动时出现的进度 -->
        <div
                class="pointer-events-none absolute inset-y-0 left-0 bg-primary-500/14 transition-opacity duration-150"
                class:opacity-0={scrub === null}
                style="width:{progress * 100}%"
        ></div>
        <button
                class="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary-700 disabled:opacity-50 dark:text-primary-300"
                aria-label={playing ? "暂停" : "播放语音"}
                title={missing ? "语音还没有同步到这台设备" : ""}
                disabled={missing}
                on:click={toggle}
        >
            <svg class="absolute inset-0 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="13" class="fill-primary-500/12 transition-colors hover:fill-primary-500/20"/>
                {#if progress > 0}
                    <circle cx="16" cy="16" r="14.5" fill="none" stroke-width="2" stroke-linecap="round"
                            class="stroke-primary-500" stroke-dasharray="{progress * 2 * Math.PI * 14.5} {2 * Math.PI * 14.5}"/>
                {/if}
            </svg>
            <i class="relative {playing ? 'ri-pause-fill' : 'ri-play-fill'}"></i>
        </button>
        <span class="relative shrink-0 text-[13px] tabular-nums {scrub !== null ? 'text-primary-700 dark:text-primary-300' : 'text-ink-3'}">
            {format(shown)}
        </span>
        <span class="flex-1"></span>

        {#if status === "transcribing"}
            <span class="relative flex shrink-0 items-center gap-1 text-xs text-ink-3">
                <i class="ri-loader-4-line animate-spin"></i>识别中
            </span>
        {:else if text}
            <!-- 原文: 只用图标表示, 展开时高亮 -->
            <button
                    class="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[17px] transition-colors {showText ? 'bg-primary-500/12 text-primary-700 dark:text-primary-300' : 'text-ink-3 hover:bg-surface-3 hover:text-ink'}"
                    aria-expanded={showText}
                    aria-label={showText ? "收起原文" : "展开原文"}
                    title={showText ? "收起原文" : "展开原文"}
                    on:click={() => (showText = !showText)}
            >
                <i class="ri-align-left"></i>
            </button>
        {/if}

        {#if editable}
            {#if status === "error" || (status !== "transcribing" && !text)}
                <button class="icon-btn relative size-7 text-[15px]" title="重新识别" aria-label="重新识别" on:click={() => dispatch("retry")}>
                    <i class="ri-refresh-line"></i>
                </button>
            {/if}
            <button class="icon-btn relative size-7 text-[15px]" title="移除语音" aria-label="移除语音" on:click={() => dispatch("delete")}>
                <i class="ri-close-line"></i>
            </button>
        {/if}
    </div>

    {#if status === "error" && error}
        <p class="border-t border-line px-3 py-1.5 text-xs text-ink-3">
            <i class="ri-information-line"></i> {error}
        </p>
    {:else if showText && text}
        <p class="border-t border-line px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-ink-2 select-text">{text}</p>
    {/if}
</div>
