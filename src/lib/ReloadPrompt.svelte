<script lang="ts">
    import { useRegisterSW } from 'virtual:pwa-register/svelte'
    import { fly } from './motion.js'

    // replaced dynamically
    const buildDate = '__DATE__'
    // replaced dyanmicaly
    const reloadSW = '__RELOAD_SW__'

    const {
        offlineReady,
        needRefresh,
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            if (reloadSW === 'true') {
                r && setInterval(() => {
                    console.log('Checking for sw update')
                    r.update()
                }, 20000 /* 20s for testing purposes */)
            }
            else {
                console.log(`SW Registered: ${r}`)
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    function close() {
        offlineReady.set(false)
        needRefresh.set(false)
    }

    $: toast = $offlineReady || $needRefresh;
</script>

{#if toast}
    <div
            class="card fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 p-3 pl-4 text-sm shadow-pop"
            role="alert"
            transition:fly={{ y: 20, duration: 200 }}
    >
        <i class="ri-download-cloud-2-line text-lg text-primary-600 dark:text-primary-400"></i>
        <div class="flex-1 text-ink-2">
            {#if $offlineReady}
                已可以离线使用
            {:else}
                有新版本可用, 刷新后生效
            {/if}
        </div>
        {#if $needRefresh}
            <button class="btn btn-sm btn-primary" on:click={() => updateServiceWorker(true)}>刷新</button>
        {/if}
        <button class="icon-btn size-7" aria-label="关闭" on:click={close}>
            <i class="ri-close-line"></i>
        </button>
    </div>
{/if}

<div class="pwa-date hidden">{buildDate}</div>
