import {githubStore, reload} from "../store/store.js";
import {request} from "../utils/githubtool/index";
import {Base64} from 'js-base64';
import {
    insertCountDateToIndexedDB, insertPicToIndexedDB, insertPinTagsToIndexedDB, insertToIndexedDB
} from "./fetchApi";
import {is_empty} from "svelte/internal";

let gitubToken = ""
let repoName = ""
let githubName = ""
let gitUrl = ""


githubStore.subscribe(value => {
    gitubToken = value.access_token
    repoName = value.repoName
    githubName = value.githubName
    gitUrl = value.gitUrl

});

function gitConfig() {
    return {
        baseUrl: gitUrl,
        headers: {
            authorization: `token ${gitubToken}`,
        },
    }
}

export const pushToGithub = async (data) => {
    try {

        const re = await request(`${gitUrl==="https://api.github.com"||data.sha?"PUT" : 'POST'} /repos/{owner}/{repo}/contents/{path}`, Object.assign(gitConfig(), {

            owner: githubName,
            repo: repoName,
            path: data.fileName,
            message: data.commitMessage,
            content: data.encode ? Base64.encode(data.content) : data.content,
            sha: data.sha
        }));
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        if (error.status === 401) {
            if (error.message === "Bad credentials") {
                return await pushToGithub(data)
            }
        }
        console.log("error", error);
    }
}
export const getGithubContent = async (data) => {
    try {
        const re = await request('GET /repos/{owner}/{repo}/contents/{path}', Object.assign(gitConfig(), {
            owner: githubName,
            repo: repoName,
            path: data.path

        }));
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})

        })
    } catch (error) {
        console.log("getContentShaerror", error);

        //HttpError: This repository is empty.
        if (error.message.indexOf("empty") !== -1) {
            return new Promise(async (resolve, rej) => {
                return resolve({body: {}})

            })
        }
    }
}
export const getGithubBlob = async (data) => {
    try {

        const re = await request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', Object.assign(gitConfig(), {

            owner: githubName,
            repo: repoName,
            file_sha: data.file_sha

        }));
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})

        })
    } catch (error) {
        console.log("getContentShaerror", error);

        //HttpError: This repository is empty.
        if (error.message.indexOf("empty") !== -1) {
            return new Promise(async (resolve, rej) => {
                return resolve({body: {}})

            })
        }
    }
}
export const getLastCommitRecord = async (data) => {
    try {
        const re = await request('GET /repos/{owner}/{repo}/branches', Object.assign(gitConfig(), {
            owner: githubName,
            repo: repoName,
        }));
        console.log(re);
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data[0]})
        })
    } catch (error) {
        console.log("getContentShaerror", error);

    }
}
export const compare2Commits = async (data) => {
    try {

        const re = await request('GET /repos/{owner}/{repo}/compare/{basehead}', Object.assign(gitConfig(), {
            owner: githubName,
            repo: repoName,
            basehead: `${data.base}...${data.head}`
        }));
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        console.log("getContentShaerror", error);

    }
}
export const getContentSha = async (data) => {
    try {
        const re = await request('GET /repos/{owner}/{repo}/contents/{path}', Object.assign(gitConfig(), {
            owner: githubName,
            repo: repoName,
            path: data.fileName,
        }));
        console.log(re);
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        console.log("getContentShaerror", error);
        if (error.status === 401) {
            if (error.message === "Bad credentials") {
                return await getContentSha(data)
            }
        }
        if (error.status === 404) {
            return new Promise(async (resolve, rej) => {
                return resolve({body: {sha: ""}})
            })
        }

    }

}
export const deleteContent = async (data) => {
    try {
        const re = await request('DELETE /repos/{owner}/{repo}/contents/{path}', Object.assign(gitConfig(), {
            owner: githubName,
            repo: repoName,
            path: data.fileName,
            message: "delete",
            sha: data.sha
        }));
        console.log(re);
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        console.log("getContentShaerror", error);

        if (error.status === 404) {
            return new Promise(async (resolve, rej) => {
                return resolve({body: {commit: {sha: ""}}})
            })
        }

    }

}

export const cloneGithubRepo = async (contentPath) => {
    let nenoBodyRaw;
    console.log("contentPath", contentPath);
    const contentData = (await getGithubContent({path: encodeURI(contentPath), raw: true})).body;
    if (is_empty(contentData)) {
        return;
    }
    for (let index = 0; index < contentData.length; index++) {
        const element = contentData[index];
        if (element.type === "dir") {
            await cloneGithubRepo(element.path);
        } else if (element.type === "file") {
            let nenoData = {};

            if (element.name.lastIndexOf(".json") === 24) {
                nenoBodyRaw = (await getGithubContent({path: encodeURI(element.path), raw: true})).body;
                try {
                    nenoData = JSON.parse(Base64.decode(nenoBodyRaw.content));
                } catch (error) {
                }
                if (!is_empty(nenoData)) insertToIndexedDB(nenoData);
            } else if (element.name === "countDate.json") {
                nenoBodyRaw = (await getGithubContent({path: encodeURI(element.path), raw: true})).body;
                try {
                    nenoData = JSON.parse(Base64.decode(nenoBodyRaw.content));
                } catch (error) {
                }
                if (!is_empty(nenoData)) await insertCountDateToIndexedDB(nenoData);
            } else if (element.name === "pinTags.json") {
                nenoBodyRaw = (await getGithubContent({path: encodeURI(element.path), raw: true})).body;
                try {
                    nenoData = JSON.parse(Base64.decode(nenoBodyRaw.content));
                } catch (error) {
                }
                if (!is_empty(nenoData)) await insertPinTagsToIndexedDB(nenoData);
            } else if (element.path.indexOf("picData/") === 0) {
                const picRaw = (await getGithubBlob({
                    file_sha: element.sha,
                })).body;
                let picData = {
                    _id: element.path.substring(element.path.indexOf("/") + 1, element.path.indexOf(".")),
                    base64: "data:image/png;base64," + picRaw.content,
                };
                await insertPicToIndexedDB(picData);
            }
            reload.set({tag: Date.now(), action: "neno"})

        }
    }
}
