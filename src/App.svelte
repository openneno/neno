<script>
    import HelloWorld from "./components/HelloWorld.svelte";
    import Router from "./components/Router.svelte";
    import {
        settingStore,
        pagedd,
        githubStore,
        commitToGithubTag,
        searchNenoByDate,
        reload, taskCountTag
    } from "./store/store.js";
    import {onMount} from "svelte";
    import {
        pushToGithub,
        getContentSha,
        cloneGithubRepo,
        compare2Commits,
        getLastCommitRecord,
        getGithubContent,
        deleteContent,

    } from "./request/githubApi";
    import {
        insertToIndexedDB,
        deleteOneFromIndexedDB,
        insertCountDateToIndexedDB,
        insertPicToIndexedDB,
        insertPinTagsToIndexedDB,
        popTaskToIndexedDB, deleteTaskToIndexedDB
    } from "./request/fetchApi";
    import {is_empty} from "svelte/internal";

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js");
    }
    let tasking = false
    onMount(() => {
        let setting = window.localStorage.getItem("settingStore");
        let github = window.localStorage.getItem("githubStore");

        if (setting == null) {
            $pagedd = "setting";
        } else {
            $settingStore = JSON.parse(setting);
        }
        github && ($githubStore = JSON.parse(github));
        //打开的时候进行同步
        trySyncGithub();
        let index = 0
        setInterval(async () => {
            console.log(tasking)
            if ($githubStore.access_token != "" && $githubStore.repoName != "") {

                if (!tasking) {
                    tasking = true
                    let taskData = (await popTaskToIndexedDB()).body
                    console.log(taskData)
                    taskCountTag.set({all: taskData.length, done: 0})
                    for (const item of taskData) {
                        await doTask(item.data)
                        await deleteTaskToIndexedDB(item._id)

                        taskCountTag.update((value) => {

                            return {all: value.all, done: value.done + 1}
                        });
                    }
                    taskCountTag.set({all: 0, done: 0})

                    tasking = false

                }
            }


        }, 5000)
    });
    githubStore.subscribe((value) => {
        if (value.access_token) {
            window.localStorage.setItem(
                "githubStore",
                JSON.stringify($githubStore)
            );
        }
    });


    async function trySyncGithub() {
        if ($githubStore.access_token != "" && $githubStore.repoName != "") {
            // 先检查老数据,第一次就获取所有的数据

            if ($githubStore.lastCommitSha == "") {
                await cloneGithubRepo("");
                reload.set({tag: Date.now(), action: "nenoCount"})

            }
            {
                var lastCommitData = await getLastCommitRecord();
                if (
                    $githubStore.lastCommitSha != "" &&
                    lastCommitData.body.commit.sha != $githubStore.lastCommitSha
                ) {
                    var comparResult = await compare2Commits({
                        base: $githubStore.lastCommitSha,
                        head: lastCommitData.body.commit.sha,
                    });
                    var fileChange = comparResult.body.files;
                    for (let index = 0; index < fileChange.length; index++) {
                        const element = fileChange[index];
                        var nenoBodyRaw = (
                            await getGithubContent({
                                path: encodeURI(element.filename),
                                raw: element.filename.indexOf("picData/") !== -1 ? false : true
                            })
                        ).body;
                        var nenoData = {};
                        if (element.filename.indexOf(".json") == 35) {
                            if (element.status != "removed") {
                                try {
                                    nenoData = JSON.parse(nenoBodyRaw);
                                } catch (error) {
                                }
                                if (!is_empty(nenoData)) await insertToIndexedDB(nenoData);
                            } else {
                                await deleteOneFromIndexedDB({
                                    _id: element.filename.substring(11, 35),
                                });
                            }
                            reload.set({tag: Date.now(), action: "neno"})

                        } else if (element.filename == "countDate/countDate.json") {
                            try {
                                nenoData = JSON.parse(nenoBodyRaw);
                            } catch (error) {
                            }
                            if (!is_empty(nenoData)) await insertCountDateToIndexedDB(nenoData);
                        } else if (element.filename.indexOf("picData/") === 0) {
                            nenoData = {
                                _id: nenoBodyRaw.name.substring(0, nenoBodyRaw.name.indexOf(".")),
                                base64: "data:image/png;base64," + nenoBodyRaw.content
                            }
                            if (!is_empty(nenoData)) await insertPicToIndexedDB(nenoData);
                        } else if (element.filename.indexOf("pinTags/") === 0) {
                            try {
                                nenoData = JSON.parse(nenoBodyRaw);
                            } catch (error) {
                            }
                            if (!is_empty(nenoData)) await insertPinTagsToIndexedDB(nenoData);
                        }

                    }
                    reload.set({tag: Date.now(), action: "neno"})
                    reload.set({tag: Date.now(), action: "nenoCount"})

                }
                $githubStore.lastCommitSha = lastCommitData.body.commit.sha;
            }
        }
    }

    async function doTask(value) {
        await getContentSha({
            branch: $githubStore.branch,
            fileName: encodeURI(
                `${value.data.created_at.substring(0, 10)}/${value.data._id}.json`
            ),
        }).then(async (shadata) => {
            let data;
            switch (value.action) {
                case "push": {
                    data = await pushToGithub({
                        branch: $githubStore.branch,
                        fileName: `${value.data.created_at.substring(0, 10)}/${
                            value.data._id
                        }.json`,
                        content: JSON.stringify(value.data, null, "\t"),
                        commitMessage: value.data.pureContent,
                        encode: true,
                        sha: shadata.body.sha,
                    });
                    console.log("commitToGithubTagdata", data);
                    break;
                }
                case "countDate": {

                    data = await pushToGithub({
                        branch: $githubStore.branch,
                        fileName: `${value.data.created_at.substring(0, 10)}/${
                            value.data._id
                        }.json`,

                        content: JSON.stringify(value.data, null, "\t"),
                        commitMessage: "countDate update",
                        encode: true,
                        sha: shadata.body.sha,
                    });
                    console.log("countDategithub", data);
                    break;
                }
                case "pinTags": {

                    data = await pushToGithub({
                        branch: $githubStore.branch,
                        fileName: `${value.data.created_at.substring(0, 10)}/${
                            value.data._id
                        }.json`,

                        content: JSON.stringify(value.data, null, "\t"),
                        commitMessage: "pinTags update",
                        encode: true,
                        sha: shadata.body.sha,
                    });
                    console.log("countDategithub", data);
                    break;
                }
                case  "uploadPic": {
                    data = await pushToGithub({
                        branch: $githubStore.branch,
                        fileName: `${value.data.created_at.substring(0, 10)}/${
                            value.data._id
                        }.${value.data.suffixName}`,
                        content: value.data.base64File.substring(value.data.base64File.indexOf(",") + 1),
                        commitMessage: "pic upload",
                        encode: false,
                        sha: shadata.body.sha,
                    });
                    console.log("uploadPicgithub", data);
                    break
                }
                case "delete": {
                    if (shadata.body.sha) {
                        data = await deleteContent({
                            fileName: `${value.data.created_at.substring(0, 10)}/${
                                value.data._id
                            }.json`,
                            sha: shadata.body.sha,
                        });
                        console.log("deletedata", data);
                    } else {
                        data = {
                            body: {commit: {sha: ""}}
                        }
                    }

                }
            }
            if (data.body.commit.sha) {
                console.log("lastCommitSha", data, data.body.commit.sha);

                $githubStore.lastCommitSha = data.body.commit.sha;
            }

        });
    }

    commitToGithubTag.subscribe(async (value) => {
        if (value.timestmp != 0 && $githubStore.access_token != "") {

        }
    });

    async function test() {
        await sleep(1000);
        sleep(1000).then((value) => {
        });
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    test();
</script>

<main class="overflow-y-hidden f h-screen">
    <Router/>

    {#await sleep(50) then value}
        <HelloWorld/>
    {/await}
</main>

<style lang="postcss"></style>
