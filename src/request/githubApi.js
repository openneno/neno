import {settingStore, githubStore, reload} from "../store/store.js";
import {request} from "../utils/githubtool/index";
import {Base64} from 'js-base64';
import {
    insertCountDateToIndexedDB,
    insertPicToIndexedDB,
    insertPinTagsToIndexedDB,
    insertToIndexedDB
} from "./fetchApi";
import {is_empty} from "svelte/internal";
import {get} from 'svelte/store';

let baseurl = ""
let gitubToken = ""
let repoName = ""
let githubName = ""

settingStore.subscribe(value => {
    // baseurl = "http://127.0.0.1:3000"
    baseurl = value.domain;

});
githubStore.subscribe(value => {
    gitubToken = value.access_token
    repoName = value.repoName
    githubName = value.githubName
});

function genergeParams(data) {
    return {
        body: JSON.stringify(data),
        method: "post",
        headers: {
            'content-type': 'application/json'
        },
        mode: "cors",
    }

}

export const loginWithGithub = async (data) => {
    return await (await fetch(`${baseurl}/githubLogin`, genergeParams(data))).json()

}
export const refreshTokenWithGithub = async (data) => {
    var respone = await (await fetch(`${baseurl}/githubRefreshToken`, genergeParams(data))).json()
    const oldvalue = get(githubStore);

    if (respone.access_token) {
        githubStore.set({
            githubName: respone.githubName,
            access_token: respone.access_token,
            refresh_token: respone.refresh_token,
            repoName: oldvalue.repoName,
            lastCommitSha: oldvalue.lastCommitSha,
            expires_in: respone.expires_in * 1000 + Date.now(),
            refresh_token_expires_in: respone.refresh_token_expires_in * 1000 + Date.now()
        })
        return new Promise(async (resolve, rej) => {
            return resolve({body: respone})
        })
    } else {
        githubStore.set({
            githubName: "",
            access_token: "",
            refresh_token: "",
            repoName: oldvalue.repoName,
            lastCommitSha: "",
            expires_in: respone.expires_in * 1000 + Date.now(),
            refresh_token_expires_in: respone.refresh_token_expires_in * 1000 + Date.now()

        })
        window.location.replace(
            "https://github.com/login/oauth/authorize?response_type=code&client_id=Iv1.a9367867a9a251d8"
        );
        return new Promise(async (resolve, rej) => {
            return resolve({body: {}})
        })
    }


}

export const pushToGithub = async (data) => {
    try {
        var re = await request('PUT /repos/{owner}/{repo}/contents/{path}', {
            headers: {
                authorization: `token ${gitubToken}`,
            },
            owner: githubName,
            repo: repoName,
            path: data.fileName,
            message: data.commitMessage,
            content: data.encode ? Base64.encode(data.content) : data.content,
            sha: data.sha
        })
        console.log(re);
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        if (error.status == 401) {
            if (error.message == "Bad credentials") {
                await refreshTokenWithGithub()
                return await pushToGithub(data)
            }
        }
        console.log("error", error);
    }
}
export const getGithubContent = async (data) => {
    try {

        var re = await request('GET /repos/{owner}/{repo}/contents/{path}', {
            headers: {
                authorization: `token ${gitubToken}`,
                accept: `application/vnd.github.v3${data.raw ? ".raw" : ""}+json`
            },
            owner: githubName,
            repo: repoName,
            path: data.path

        })
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})

        })
    } catch (error) {
        console.log("getContentShaerror", error);
        if (error.status == 401) {
            if (error.message == "Bad credentials") {
                await refreshTokenWithGithub()
                return await getGithubContent(data)
            }

        }
        //HttpError: This repository is empty.
        if (error.message.indexOf("empty") != -1) {
            return new Promise(async (resolve, rej) => {
                return resolve({body: {}})

            })
        }


    }
}
export const getLastCommitRecord = async (data) => {
    try {
        var re = await request('GET /repos/{owner}/{repo}/branches', {
            headers: {
                authorization: `token ${gitubToken}`,
            },
            owner: githubName,
            repo: repoName,
        })
        console.log(re);
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data[0]})
        })
    } catch (error) {
        console.log("getContentShaerror", error);
        if (error.status == 401) {
            if (error.message == "Bad credentials") {
                await refreshTokenWithGithub()
                return await getLastCommitRecord(data)
            }
        }
    }
}
export const compare2Commits = async (data) => {
    try {

        var re = await request('GET /repos/{owner}/{repo}/compare/{basehead}', {
            headers: {
                authorization: `token ${gitubToken}`,
            },
            owner: githubName,
            repo: repoName,
            basehead: `${data.base}...${data.head}`
        })
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        console.log("getContentShaerror", error);
        if (error.status == 401) {
            if (error.message == "Bad credentials") {
                await refreshTokenWithGithub()
                return await compare2Commits(data)
            }
        }
    }
}
export const getContentSha = async (data) => {
    try {
        var re = await request('GET /repos/{owner}/{repo}/contents/{path}', {
            headers: {
                authorization: `token ${gitubToken}`,
            },
            owner: githubName,
            repo: repoName,
            path: data.fileName,
        })
        console.log(re);
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        console.log("getContentShaerror", error);
        if (error.status == 401) {
            if (error.message == "Bad credentials") {
                await refreshTokenWithGithub()
                return await getContentSha(data)
            }
        }
        if (error.status == 404) {
            return new Promise(async (resolve, rej) => {
                return resolve({body: {sha: ""}})
            })
        }

    }

}
export const deleteContent = async (data) => {
    try {
        var re = await request('DELETE /repos/{owner}/{repo}/contents/{path}', {
            headers: {
                authorization: `token ${gitubToken}`,
            },
            owner: githubName,
            repo: repoName,
            path: data.fileName,
            message: "delete",
            sha: data.sha
        })
        console.log(re);
        return new Promise(async (resolve, rej) => {
            return resolve({body: re.data})
        })
    } catch (error) {
        console.log("getContentShaerror", error);
        if (error.status == 401) {
            if (error.message == "Bad credentials") {
                await refreshTokenWithGithub()
                return await getContentSha(data)
            }
        }
        if (error.status == 404) {
            return new Promise(async (resolve, rej) => {
                return resolve({body: {sha: ""}})
            })
        }

    }

}

export const checkGithubAppInstalled = async (data) => {
    return await (await fetch(`https://api.github.com/user/installations`, {
        method: "get",
        headers: {
            'content-type': 'application/json',
            "Authorization": `token ${gitubToken}`
        },
        mode: "cors",
    })).json()

}
export const cloneGithubRepo = async (contentPath) => {
    let nenoBodyRaw;
    console.log("contentPath", contentPath);
    var contentData = (await getGithubContent({path: encodeURI(contentPath), raw: true}))
        .body;
    if (is_empty(contentData)) {
        return;
    }
    for (let index = 0; index < contentData.length; index++) {
        const element = contentData[index];
        if (element.type == "dir") {
            await cloneGithubRepo(element.path);
        } else if (element.type == "file") {
            let nenoData = {};

            if (element.name.lastIndexOf(".json") == 24) {
                nenoBodyRaw = (
                    await getGithubContent({path: encodeURI(element.path), raw: true})
                ).body;
                try {
                    nenoData = JSON.parse(nenoBodyRaw);
                } catch (error) {
                }
                if (!is_empty(nenoData)) insertToIndexedDB(nenoData);
            } else if (element.name == "countDate.json") {
                nenoBodyRaw = (
                    await getGithubContent({path: encodeURI(element.path), raw: true})
                ).body;
                try {
                    nenoData = JSON.parse(nenoBodyRaw);
                } catch (error) {
                }
                if (!is_empty(nenoData)) await insertCountDateToIndexedDB(nenoData);
            } else if (element.name == "pinTags.json") {
                nenoBodyRaw = (
                    await getGithubContent({path: encodeURI(element.path), raw: true})
                ).body;
                try {
                    nenoData = JSON.parse(nenoBodyRaw);
                } catch (error) {
                }
                if (!is_empty(nenoData)) await insertPinTagsToIndexedDB(nenoData);
            } else if (element.path.indexOf("picData/") === 0) {
                nenoBodyRaw = (
                    await getGithubContent({path: encodeURI(element.path), raw: false})
                ).body;
                nenoData = {
                    _id: nenoBodyRaw.name.substring(0, nenoBodyRaw.name.indexOf(".")),
                    base64: "data:image/png;base64," + nenoBodyRaw.content
                }
                if (!is_empty(nenoData)) await insertPicToIndexedDB(nenoData);
            }
            reload.set({tag: Date.now(), action: "neno"})

        }
    }
}
