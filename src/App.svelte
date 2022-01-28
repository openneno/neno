<script>
    import HelloWorld from "./pages/HelloWorld.svelte";
    import Router from "./components/Router.svelte";
    import Tailwind from "./Tailwind.svelte";

    import {
        settingStore,
        paged,
        githubStore,
        commitToGithubTag,
        notionStore,
        reload,
        taskCountTag,
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
        getGithubBlob
    } from "./request/githubApi";
    import {
        insertToIndexedDB,
        deleteOneFromIndexedDB,
        insertCountDateToIndexedDB,
        insertPicToIndexedDB,
        insertPinTagsToIndexedDB,
        popTaskToIndexedDB,
        deleteTaskToIndexedDB, deletePicFromIndexedDB,
    } from "./request/fetchApi";
    import {is_empty} from "svelte/internal";

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/public/service-worker.js");
    }
    let tasking = false;
    onMount(() => {
        let setting = window.localStorage.getItem("settingStore");
        let github = window.localStorage.getItem("githubStore");
        let notion = window.localStorage.getItem("notionStore");

        if (setting == null) {
            $paged = "setting";
        } else {
            $settingStore = JSON.parse(setting);
        }
        github && ($githubStore = JSON.parse(github));
        notion && ($notionStore = JSON.parse(notion));

        //打开的时候进行同步
        trySyncGithub();
        let syncinterval = setInterval(async () => {
            // console.log(tasking);
            if ($githubStore.access_token != "" && $githubStore.repoName != "") {
                if (!tasking) {
                    tasking = true;
                    let taskData = (await popTaskToIndexedDB()).body;
                    taskCountTag.set({all: taskData.length, done: 0});
                    for (const item of taskData) {
                        await doTask(item.data);
                        await deleteTaskToIndexedDB(item._id);

                        taskCountTag.update((value) => {
                            return {all: value.all, done: value.done + 1};
                        });
                    }
                    taskCountTag.set({all: 0, done: 0});
                    tasking = false;
                }
            }
        }, 5000);
        return () => clearInterval(syncinterval);
    });
    githubStore.subscribe((value) => {
        if (value.access_token) {
            window.localStorage.setItem("githubStore", JSON.stringify($githubStore));
        }
    });

    async function trySyncGithub() {
        if ($githubStore.access_token !== "" && $githubStore.repoName !== "") {
            // 先检查老数据,第一次就获取所有的数据
            if ($githubStore.lastCommitSha === "") {
                await cloneGithubRepo("");
                reload.set({tag: Date.now(), action: "nenoCount"});
            }
            {
                var lastCommitData = await getLastCommitRecord();
                if (
                    $githubStore.lastCommitSha !== "" &&
                    lastCommitData.body.commit.sha !== $githubStore.lastCommitSha
                ) {
                    var compareResult = await compare2Commits({
                        base: $githubStore.lastCommitSha,
                        head: lastCommitData.body.commit.sha,
                    });
                    //两次提交之间的不同文件
                    const fileChange = compareResult.body.files;
                    for (let index = 0; index < fileChange.length; index++) {
                        const element = fileChange[index];
                        //如果是删除操作就执行删除
                        if (element.status === "removed") {
                            //判断是否是笔记文件
                            if (element.filename.indexOf(".json") === 35) {
                                await deleteOneFromIndexedDB({
                                    _id: element.filename.substring(11, 35),
                                });
                            } else if (element.filename.indexOf("picData") === 0) {
                                //判断是否是图片文件
                                await deletePicFromIndexedDB({
                                    key: element.filename.substring(8, element.filename.lastIndexOf(".")),
                                });
                            }
                        } else {
                            if (element.filename.indexOf("picData/") === 0) {
                                const picRaw = (
                                    await getGithubBlob({
                                        file_sha: element.sha,
                                    })
                                ).body;
                                let picData = {
                                    _id: element.filename.substring(
                                        element.filename.indexOf("/")+1,
                                        element.filename.indexOf(".")
                                    ),
                                    base64: "data:image/png;base64," + picRaw.content,
                                };
                                await insertPicToIndexedDB(picData);
                            } else {
                                const nenoBodyRaw = (
                                    await getGithubContent({
                                        path: encodeURI(element.filename),
                                        raw: element.filename.indexOf("picData/") === -1,
                                    })
                                ).body;
                                let nenoData = {};
                                if (element.filename.indexOf(".json") === 35) {
                                    try {
                                        nenoData = JSON.parse(nenoBodyRaw);
                                    } catch (error) {
                                    }
                                    if (!is_empty(nenoData)) await insertToIndexedDB(nenoData);
                                    reload.set({tag: Date.now(), action: "neno"});
                                } else if (element.filename === "countDate/countDate.json") {
                                    try {
                                        nenoData = JSON.parse(nenoBodyRaw);
                                    } catch (error) {
                                    }
                                    if (!is_empty(nenoData))
                                        await insertCountDateToIndexedDB(nenoData);
                                } else if (element.filename.indexOf("picData/") === 0) {

                                } else if (element.filename.indexOf("pinTags/") === 0) {
                                    try {
                                        nenoData = JSON.parse(nenoBodyRaw);
                                    } catch (error) {
                                    }
                                    if (!is_empty(nenoData)) await insertPinTagsToIndexedDB(nenoData);
                                }
                            }

                        }
                    }
                    reload.set({tag: Date.now(), action: "neno"});
                    reload.set({tag: Date.now(), action: "nenoCount"});
                }
                $githubStore.lastCommitSha = lastCommitData.body.commit.sha;
            }
        }
    }

    //执行日常的增删改查的任务
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
                        commitMessage: `${shadata.body.sha == "" ? "[ADD]" : "[MODIFY]"} ${
                            value.data.pureContent
                        }`,
                        encode: true,
                        sha: shadata.body.sha,
                    });
                    console.log("commitToGithubTagData", data);
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
                    console.log("countDateGithub", data);
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
                    console.log("countDateGithub", data);
                    break;
                }
                case "uploadPic": {
                    data = await pushToGithub({
                        branch: $githubStore.branch,
                        fileName: `${value.data.created_at.substring(0, 10)}/${
                            value.data._id
                        }.${value.data.suffixName}`,
                        content: value.data.base64File.substring(
                            value.data.base64File.indexOf(",") + 1
                        ),
                        commitMessage: "pic upload",
                        encode: false,
                        sha: shadata.body.sha,
                    });
                    console.log("uploadPicToGithub", data);
                    break;
                }
                case "delete": {
                    if (shadata.body.sha) {
                        data = await deleteContent({
                            fileName: `${value.data.created_at.substring(0, 10)}/${
                                value.data._id
                            }.json`,
                            sha: shadata.body.sha,
                        });
                        console.log(value.data)
                        //删除笔记的同时，删除笔记中携带的图片
                        for (const datum of value.data.images) {
                            let picShaDate = await getContentSha({
                                branch: $githubStore.branch,
                                fileName: encodeURI(
                                    `picData/${datum.key}.${datum.suffixName}`
                                ),
                            })
                            let dePicData = await deleteContent({
                                fileName: `picData/${
                                    datum.key
                                }.${datum.suffixName}`,
                                sha: picShaDate.body.sha,
                            });
                            console.log("deletePIC", dePicData);
                        }
                        console.log("deleteData", data);

                    } else {
                        data = {
                            body: {commit: {sha: ""}},
                        };
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
        if (value.timestmp !== 0 && $githubStore.access_token !== "") {
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

<Tailwind/>

<main class=" overflow-y-hidden f h-screen  ">
    <Router/>

    {#await sleep(50) then value}
        <HelloWorld/>
    {/await}
</main>
