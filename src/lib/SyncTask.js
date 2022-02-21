import {
    cloneGithubRepo,
    compare2Commits,
    deleteContent,
    getContentSha, getGithubBlob, getGithubContent,
    getLastCommitRecord,
    pushToGithub
} from "../request/githubApi";
import {githubStore, reload} from "../store/store.js";


let githubStorelocal = ""
githubStore.subscribe(value => {
    githubStorelocal = value

});
import {
    deleteOneFromIndexedDB,
    deletePicFromIndexedDB, insertCountDateToIndexedDB,
    insertPicToIndexedDB, insertPinTagsToIndexedDB,
    insertToIndexedDB
} from "../request/fetchApi";
import {is_empty} from "svelte/internal";
import {Base64} from "js-base64";

//执行日常的增删改查的任务
export async function doTask(value) {
    await getContentSha({
        branch: githubStorelocal.branch,
        fileName: encodeURI(`${value.data.created_at.substring(0, 10)}/${value.data._id}.json`),
    }).then(async (shadata) => {
        let data;
        switch (value.action) {
            case "push": {
                data = await pushToGithub({
                    branch: githubStorelocal.branch,
                    fileName: `${value.data.created_at.substring(0, 10)}/${value.data._id}.json`,
                    content: JSON.stringify(value.data, null, "\t"),
                    commitMessage: `${shadata.body.sha === "" ? "[ADD]" : "[MODIFY]"} ${value.data.pureContent}`,
                    encode: true,
                    sha: shadata.body.sha,
                });
                console.log("commitToGithubTagData", data);
                break;
            }
            case "countDate": {
                data = await pushToGithub({
                    branch: githubStorelocal.branch,
                    fileName: `${value.data.created_at.substring(0, 10)}/${value.data._id}.json`,

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
                    branch: githubStorelocal.branch,
                    fileName: `${value.data.created_at.substring(0, 10)}/${value.data._id}.json`,

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
                    branch: githubStorelocal.branch,
                    fileName: `${value.data.created_at.substring(0, 10)}/${value.data._id}.${value.data.suffixName}`,
                    content: value.data.base64File.substring(value.data.base64File.indexOf(",") + 1),
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
                        fileName: `${value.data.created_at.substring(0, 10)}/${value.data._id}.json`,
                        sha: shadata.body.sha,
                    });
                    console.log(value.data)
                    //删除笔记的同时，删除笔记中携带的图片
                    for (const datum of value.data.images) {
                        let picShaDate = await getContentSha({
                            branch: githubStorelocal.branch,
                            fileName: encodeURI(`picData/${datum.key}.${datum.suffixName}`),
                        })
                        let dePicData = await deleteContent({
                            fileName: `picData/${datum.key}.${datum.suffixName}`, sha: picShaDate.body.sha,
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
            githubStorelocal.lastCommitSha = data.body.commit.sha;
            githubStore.set(githubStorelocal);

        }
    });
}

export async function trySyncGithub() {
    if (githubStorelocal.access_token !== "" && githubStorelocal.repoName !== ""&& githubStorelocal.githubName !== "") {
        // 先检查老数据,第一次就获取所有的数据
        if (githubStorelocal.lastCommitSha === "") {
            await cloneGithubRepo("");
            reload.set({tag: Date.now(), action: "nenoCount"});
        }

        // 再检查新数据
        {
            const lastCommitData = await getLastCommitRecord();
            if (
                githubStorelocal.lastCommitSha !== "" &&
                lastCommitData.body.commit.sha !== githubStorelocal.lastCommitSha
            ) {
                const compareResult = await compare2Commits({
                    base: githubStorelocal.lastCommitSha,
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
                    } else if (element.filename.indexOf("picData/") === 0) {
                        const picRaw = (
                            await getGithubBlob({
                                file_sha: element.sha,
                            })
                        ).body;
                        let picData = {
                            _id: element.filename.substring(
                                element.filename.indexOf("/") + 1,
                                element.filename.indexOf(".")
                            ),
                            base64: "data:image/png;base64," + picRaw.content,
                        };
                        await insertPicToIndexedDB(picData);
                    } else {
                        const nenoBodyRaw = (
                            await getGithubContent({
                                path: encodeURI(element.filename),
                            })
                        ).body;
                        let nenoData = {};
                        try {
                            nenoData = JSON.parse(Base64.decode(nenoBodyRaw.content));
                        } catch (error) {
                            console.log("error", error);
                        }
                        if (element.filename.indexOf(".json") === 35) {

                            if (!is_empty(nenoData)) await insertToIndexedDB(nenoData);
                            // reload.set({tag: Date.now(), action: "neno"});
                        } else if (element.filename === "countDate/countDate.json") {

                            if (!is_empty(nenoData))
                                await insertCountDateToIndexedDB(nenoData);
                        }  else if (element.filename.indexOf("pinTags/") === 0) {

                            if (!is_empty(nenoData)) await insertPinTagsToIndexedDB(nenoData);
                        }
                    }
                }
                reload.set({tag: Date.now(), action: "neno"});
                reload.set({tag: Date.now(), action: "nenoCount"});
            }
            githubStorelocal.lastCommitSha = lastCommitData.body.commit.sha;
            githubStore.set(githubStorelocal);
        }
    }
}
