<script>
    import {onMount} from "svelte";
    import {fade} from "svelte/transition";
    import {githubStore, syncStatus} from "../store/store.js";
    import {
        GITHUB_URL,
        GITEE_URL,
        PLATFORMS,
        DEFAULT_REPO_NAME,
        buildSyncLink,
        createRepo,
        decodeNenoToken,
        describeError,
        encodeNenoToken,
        fetchAccount,
        listRepos,
    } from "../request/gitAccountApi.js";
    import QrCode from "./QrCode.svelte";
    import giteeIcon from "../assets/gittee.ico";

    $: configured = $githubStore.access_token !== "" && $githubStore.githubName !== "" && $githubStore.repoName !== "";

    // ---------- 未配置: 引导流程 ----------
    let gitUrl = $githubStore.gitUrl === GITEE_URL ? GITEE_URL : GITHUB_URL;
    let token = "";
    let showToken = false;
    let checking = false;
    let tokenError = "";
    let account = null;
    let scopeWarning = "";

    let repos = [];
    let repoMode = "create"; //create(新建仓库) | existing(已有仓库)
    let newRepoName = DEFAULT_REPO_NAME;
    let selectedRepo = "";
    let saving = false;
    let saveError = "";

    //重新填写 Token 时优先选中原来的仓库
    let preferredRepo = "";

    let importText = "";
    let importError = "";
    let importing = false;

    $: platform = PLATFORMS[gitUrl];

    function switchPlatform(url) {
        if (gitUrl === url) return;
        gitUrl = url;
        resetAccount();
    }

    function resetAccount() {
        account = null;
        repos = [];
        tokenError = "";
        scopeWarning = "";
        saveError = "";
    }

    async function verifyToken() {
        if (token.trim() === "" || checking) return;
        resetAccount();
        checking = true;
        try {
            account = await fetchAccount(gitUrl, token);
            if (account.scopes && !account.scopes.includes("repo")) {
                scopeWarning = "这个 Token 没有勾选 repo 权限, 将无法读写笔记仓库";
            }
            repos = await listRepos(gitUrl, token);
            //已有同名的笔记仓库时默认直接使用
            const existing = repos.find((repo) => repo.fullName === preferredRepo)
                || repos.find((repo) => repo.repo === DEFAULT_REPO_NAME || repo.repo === "neno");
            if (existing) {
                repoMode = "existing";
                selectedRepo = existing.fullName;
            } else {
                repoMode = "create";
                selectedRepo = repos.length > 0 ? repos[0].fullName : "";
            }
        } catch (error) {
            console.log(error);
            account = null;
            tokenError = describeError(error);
        }
        checking = false;
    }

    function onTokenPaste() {
        //粘贴后自动校验
        setTimeout(verifyToken, 0);
    }

    function saveConfig(config) {
        $githubStore = {
            ...$githubStore,
            ...config,
            lastCommitSha: "",
        };
        syncStatus.set({authError: false});
        window.localStorage.setItem("githubStore", JSON.stringify($githubStore));
        //重新加载以从仓库拉取数据并开始同步
        window.location.reload();
    }

    async function finishSetup() {
        saveError = "";
        saving = true;
        try {
            let target;
            if (repoMode === "create") {
                const name = newRepoName.trim();
                if (!/^[A-Za-z0-9._-]+$/.test(name)) {
                    throw {message: "仓库名只能包含字母, 数字, '.', '-' 和 '_'"};
                }
                target = await createRepo(gitUrl, token, name);
            } else {
                target = repos.find((repo) => repo.fullName === selectedRepo);
                if (!target) throw {message: "请选择一个仓库"};
            }
            saveConfig({
                access_token: token.trim(),
                githubName: target.owner,
                repoName: target.repo,
                gitUrl,
            });
        } catch (error) {
            console.log(error);
            saveError = error.status ? describeError(error) : error.message;
            saving = false;
        }
    }

    async function importConfig() {
        importError = "";
        let config;
        try {
            config = decodeNenoToken(importText);
        } catch (e) {
            importError = "无法识别, 请粘贴完整的 neno token 或同步链接";
            return;
        }
        importing = true;
        try {
            await fetchAccount(config.gitUrl, config.access_token);
            saveConfig(config);
        } catch (error) {
            importError = describeError(error);
            importing = false;
        }
    }

    // ---------- 已配置: 状态与多设备同步 ----------
    let currentAccount = null;
    let accountError = "";
    let showShare = false;
    let copiedWhat = "";

    $: repoFullName = `${$githubStore.githubName}/${$githubStore.repoName}`;
    $: repoUrl = configured ? PLATFORMS[$githubStore.gitUrl === GITEE_URL ? GITEE_URL : GITHUB_URL].repoUrl(repoFullName) : "";
    $: syncLink = configured && showShare ? buildSyncLink($githubStore) : "";

    onMount(async () => {
        if (!configured) return;
        try {
            currentAccount = await fetchAccount($githubStore.gitUrl, $githubStore.access_token);
        } catch (error) {
            accountError = describeError(error);
            if (error.status === 401) syncStatus.set({authError: true});
        }
    });

    async function copy(text, what) {
        try {
            await navigator.clipboard.writeText(text);
            copiedWhat = what;
            setTimeout(() => {
                copiedWhat = "";
            }, 1500);
        } catch (e) {
            console.log(e);
        }
    }

    function clearConfig() {
        if (!window.confirm("确定要退出登录吗? 本地笔记会保留, 但不再与仓库同步")) return;
        $githubStore.access_token = "";
        $githubStore.githubName = "";
        $githubStore.repoName = "";
        $githubStore.lastCommitSha = "";
        window.localStorage.removeItem("githubStore");
        window.localStorage.removeItem("notionStore");
        window.location.reload();
    }

    //Token 失效时保留仓库信息, 只重新填写 Token
    function reconfigure() {
        gitUrl = $githubStore.gitUrl === GITEE_URL ? GITEE_URL : GITHUB_URL;
        preferredRepo = repoFullName;
        $githubStore.access_token = "";
        token = "";
        resetAccount();
    }

    const inputClass = "w-full border-2 border-gray-200 dark:border-gray-500 rounded-sm p-2 text-black bg-white focus:outline-hidden focus:border-primary-500";
    const primaryButton = "rounded-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 focus:outline-hidden disabled:opacity-60";
    const secondaryButton = "rounded-sm border-2 border-gray-300 dark:border-gray-500 px-3 py-1 hover:border-primary-500 focus:outline-hidden";
</script>

{#if configured}
    <div class="flex flex-col space-y-3 max-w-xl">
        {#if $syncStatus.authError || accountError}
            <div class="rounded-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 p-3 text-sm flex items-start justify-between">
                <div>
                    <i class="ri-error-warning-line mr-1"></i>
                    {$syncStatus.authError ? "Token 已失效, 同步已暂停, 本地笔记不受影响" : accountError}
                </div>
                {#if $syncStatus.authError}
                    <button class="underline ml-2 shrink-0 focus:outline-hidden" on:click={reconfigure}>重新填写 Token</button>
                {/if}
            </div>
        {/if}

        <div class="flex items-center rounded-lg bg-white dark:bg-gray-600 p-3 shadow-xs">
            {#if currentAccount}
                <img src={currentAccount.avatar} alt="" class="w-10 h-10 rounded-full mr-3"/>
            {:else}
                <i class="ri-user-line ri-xl w-10 h-10 rounded-full mr-3 bg-gray-200 dark:bg-gray-500 flex items-center justify-center"></i>
            {/if}
            <div class="flex-1 min-w-0">
                <div class="font-bold truncate">
                    {currentAccount ? currentAccount.name : $githubStore.githubName}
                    <span class="ml-1 text-xs font-normal rounded-xs bg-gray-200 dark:bg-gray-500 px-1">
                        {$githubStore.gitUrl === GITEE_URL ? "Gitee" : "GitHub"}
                    </span>
                </div>
                <a class="text-sm text-primary-600 dark:text-primary-300 truncate block" href={repoUrl} target="_blank" rel="noreferrer">
                    <i class="ri-git-repository-line"></i> {repoFullName}
                </a>
            </div>
        </div>

        <div class="flex flex-wrap gap-2">
            <button class={secondaryButton} on:click={() => (showShare = !showShare)}>
                <i class="ri-qr-code-line mr-1"></i>同步到其他设备
            </button>
            <button class="{secondaryButton} text-red-500" on:click={clearConfig}>
                <i class="ri-logout-box-r-line mr-1"></i>退出登录
            </button>
        </div>

        {#if showShare}
            <div transition:fade={{duration: 150}} class="rounded-lg bg-white dark:bg-gray-600 p-4 shadow-xs flex flex-col sm:flex-row gap-4">
                <QrCode text={syncLink}/>
                <div class="flex flex-col space-y-2 text-sm">
                    <div>在另一台设备上扫码, 或打开同步链接, 即可自动导入配置。</div>
                    <button class={secondaryButton} on:click={() => copy(syncLink, "link")}>
                        {copiedWhat === "link" ? "已复制" : "复制同步链接"}
                    </button>
                    <button class={secondaryButton} on:click={() => copy(encodeNenoToken($githubStore), "token")}>
                        {copiedWhat === "token" ? "已复制" : "复制 neno token"}
                    </button>
                    <div class="text-xs text-gray-500 dark:text-slate-300">neno token 可用于 utools, CLI, 浏览器插件等扩展工具</div>
                    <div class="text-xs text-yellow-600 dark:text-yellow-400">
                        <i class="ri-alert-line"></i> 二维码和链接中包含你的 Token, 请勿分享给他人
                    </div>
                </div>
            </div>
        {/if}
    </div>
{:else}
    <div class="flex flex-col space-y-5 max-w-xl">
        <div class="inline-flex self-start rounded-lg bg-gray-200 dark:bg-gray-700 p-1" role="radiogroup" aria-label="存储平台">
            {#each [GITHUB_URL, GITEE_URL] as url}
                <button
                        role="radio"
                        aria-checked={gitUrl === url}
                        class="flex items-center px-3 py-1 rounded-md text-sm focus:outline-hidden"
                        class:bg-white={gitUrl === url}
                        class:dark:bg-gray-500={gitUrl === url}
                        class:shadow-xs={gitUrl === url}
                        on:click={() => switchPlatform(url)}
                >
                    {#if url === GITHUB_URL}
                        <i class="ri-github-fill mr-1"></i>
                    {:else}
                        <img src={giteeIcon} alt="" class="w-4 h-4 mr-1"/>
                    {/if}
                    {PLATFORMS[url].name}
                </button>
            {/each}
        </div>

        <div class="flex">
            <div class="w-6 h-6 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center shrink-0 mr-3">1</div>
            <div class="flex-1">
                <div class="font-bold">生成访问 Token</div>
                <div class="text-sm text-gray-500 dark:text-slate-300 mt-1">
                    {#if gitUrl === GITHUB_URL}
                        已为你预先勾选所需权限(repo, workflow), 打开后滑到页面底部点击 "Generate token" 并复制。
                    {:else}
                        打开后勾选 user_info 和 projects 权限, 提交后复制生成的 Token。
                    {/if}
                </div>
                <a class="{primaryButton} inline-block mt-2 text-sm" href={platform.tokenUrl} target="_blank" rel="noreferrer">
                    前往 {platform.name} 生成 Token <i class="ri-external-link-line"></i>
                </a>
                {#if gitUrl === GITHUB_URL}
                    <details class="text-xs text-gray-500 dark:text-slate-300 mt-2">
                        <summary class="cursor-pointer">想要更安全? 使用只能访问笔记仓库的细粒度 Token</summary>
                        <div class="mt-1 leading-5">
                            先在 GitHub 上创建好笔记仓库, 再打开
                            <a class="text-primary-600 dark:text-primary-300 underline" href={platform.fineGrainedTokenUrl} target="_blank" rel="noreferrer">细粒度 Token 页面</a>:
                            Repository access 选择 "Only select repositories" 并选中笔记仓库,
                            Permissions 中把 Contents 设为 Read and write(使用 notion 同步还需要 Workflows: Read and write)。
                            细粒度 Token 有有效期, 过期后在这里重新填写即可。
                        </div>
                    </details>
                {/if}
            </div>
        </div>

        <div class="flex">
            <div class="w-6 h-6 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center shrink-0 mr-3">2</div>
            <div class="flex-1">
                <label class="font-bold" for="sync-token">粘贴 Token</label>
                <div class="flex mt-2 space-x-2">
                    <div class="relative flex-1">
                        <input
                                id="sync-token"
                                type={showToken ? "text" : "password"}
                                autocomplete="off"
                                spellcheck="false"
                                class="{inputClass} pr-9"
                                placeholder={gitUrl === GITHUB_URL ? "ghp_... 或 github_pat_..." : "Gitee 私人令牌"}
                                bind:value={token}
                                on:paste={onTokenPaste}
                                on:input={resetAccount}
                                on:keydown={(event) => event.key === "Enter" && verifyToken()}
                        />
                        <button
                                class="absolute right-2 top-2 text-gray-500 focus:outline-hidden"
                                aria-label={showToken ? "隐藏 Token" : "显示 Token"}
                                on:click={() => (showToken = !showToken)}
                        >
                            <i class={showToken ? "ri-eye-off-line" : "ri-eye-line"}></i>
                        </button>
                    </div>
                    <button class={primaryButton} disabled={token.trim() === "" || checking} on:click={verifyToken}>
                        {checking ? "验证中..." : "验证"}
                    </button>
                </div>
                {#if tokenError}
                    <div class="text-sm text-red-500 mt-2"><i class="ri-close-circle-line"></i> {tokenError}</div>
                {/if}
                {#if account}
                    <div class="flex items-center text-sm mt-2">
                        <img src={account.avatar} alt="" class="w-6 h-6 rounded-full mr-2"/>
                        <span class="text-primary-600 dark:text-primary-300"><i class="ri-checkbox-circle-line"></i> 已验证: {account.name} (@{account.login})</span>
                    </div>
                {/if}
                {#if scopeWarning}
                    <div class="text-sm text-yellow-600 dark:text-yellow-400 mt-1"><i class="ri-alert-line"></i> {scopeWarning}</div>
                {/if}
            </div>
        </div>

        <div class="flex" class:opacity-50={!account}>
            <div class="w-6 h-6 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center shrink-0 mr-3">3</div>
            <div class="flex-1">
                <div class="font-bold">选择笔记仓库</div>
                {#if account}
                    <div class="flex flex-col space-y-3 mt-2 text-sm" role="radiogroup" aria-label="笔记仓库">
                        <label class="flex items-start">
                            <input type="radio" class="mt-1 mr-2 accent-primary-500" bind:group={repoMode} value="create"/>
                            <div class="flex-1">
                                <div>新建一个私有仓库(推荐)</div>
                                {#if repoMode === "create"}
                                    <input class="{inputClass} mt-1" bind:value={newRepoName} aria-label="新仓库名"/>
                                {/if}
                            </div>
                        </label>
                        <label class="flex items-start" class:opacity-50={repos.length === 0}>
                            <input type="radio" class="mt-1 mr-2 accent-primary-500" bind:group={repoMode} value="existing"
                                   disabled={repos.length === 0}/>
                            <div class="flex-1">
                                <div>使用已有仓库{repos.length === 0 ? " (没有可写入的仓库)" : ""}</div>
                                {#if repoMode === "existing"}
                                    <select class="{inputClass} mt-1" bind:value={selectedRepo} aria-label="已有仓库">
                                        {#each repos as repo}
                                            <option value={repo.fullName}>{repo.fullName}{repo.private ? " 🔒" : ""}</option>
                                        {/each}
                                    </select>
                                    <div class="text-xs text-gray-500 dark:text-slate-300 mt-1">
                                        已有的 neno 数据会自动同步到本地; 请不要选择存放其他内容的仓库
                                    </div>
                                {/if}
                            </div>
                        </label>
                    </div>
                    {#if saveError}
                        <div class="text-sm text-red-500 mt-2"><i class="ri-close-circle-line"></i> {saveError}</div>
                    {/if}
                    <button class="{primaryButton} mt-3" disabled={saving} on:click={finishSetup}>
                        {saving ? "正在配置..." : "完成并开始同步"}
                    </button>
                {:else}
                    <div class="text-sm text-gray-500 dark:text-slate-300 mt-1">验证 Token 后选择或新建仓库</div>
                {/if}
            </div>
        </div>

        <details class="rounded-lg bg-white dark:bg-gray-600 p-3 shadow-xs text-sm">
            <summary class="cursor-pointer font-bold">已经在其他设备上使用 NENO?</summary>
            <div class="mt-2 text-gray-500 dark:text-slate-300">
                在已配置的设备上打开 设置 → 同步到其他设备, 扫码即可; 也可以在这里粘贴 neno token 或同步链接。
            </div>
            <div class="flex mt-2 space-x-2">
                <input class={inputClass} placeholder="neno token 或同步链接" bind:value={importText} aria-label="neno token 或同步链接"/>
                <button class={primaryButton} disabled={importText.trim() === "" || importing} on:click={importConfig}>
                    {importing ? "导入中..." : "导入"}
                </button>
            </div>
            {#if importError}
                <div class="text-sm text-red-500 mt-2"><i class="ri-close-circle-line"></i> {importError}</div>
            {/if}
        </details>
    </div>
{/if}
