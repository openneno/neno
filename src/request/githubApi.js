import { settingStrore, githubStrore } from "../store/store.js";
import { request } from "../utils/githubtool/index";
import { Base64 } from 'js-base64';
import { insertToIndexedDB } from "./fetchApi";
import { is_empty } from "svelte/internal";
let baseurl = ""
let gitubToken = ""
let repoName = ""
let githubName = ""

settingStrore.subscribe(value => {
    baseurl = "http://127.0.0.1:3000"
    // baseurl = value.domain;

});
githubStrore.subscribe(value => {
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
    return await (await fetch(`${baseurl}/githubRefreshToken`, genergeParams(data))).json()

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
            return resolve({ body: re.data })
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
                accept: "application/vnd.github.v3.raw+json"
            },
            owner: githubName,
            repo: repoName,
            path: data.path

        })
        return new Promise(async (resolve, rej) => {
            return resolve({ body: re.data })

        })
    }
    catch (error) {
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
                return resolve({ body: {} })

            })
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
            return resolve({ body: re.data })
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
                return resolve({ body: { sha: "" } })
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
    console.log("contentPath", contentPath);
    var contentData = (await getGithubContent({ path: encodeURI(contentPath) }))
        .body;
    if (is_empty(contentData)) {
        return;
    }
    for (let index = 0; index < contentData.length; index++) {
        const element = contentData[index];
        if (element.type == "dir") {
            await cloneGithubRepo(element.path);
        } else if (element.type == "file") {
            if (element.name.lastIndexOf(".json") == 24) {
                var nenoBodyRaw = (
                    await getGithubContent({ path: encodeURI(element.path) })
                ).body;
                var nenoData = {};
                try {
                    nenoData = JSON.parse(nenoBodyRaw);
                } catch (error) { }
                if (!is_empty(nenoData)) insertToIndexedDB(nenoData);
            }
        }
    }
}