const fetch = require('node-fetch');
console.log(process.env.NOTION_TOKEN); // "development"
let sha = process.env.GITHUB_SHA
let githubToken = process.env.GITHUB_TOKEN
let notionToken = process.env.NOTION_TOKEN
let notionDatabaseId = process.env.NOTION_DATABASEID
//GitHub Action 自动提供当前仓库 owner/repo
let repository = process.env.GITHUB_REPOSITORY
console.log(sha, githubToken, notionToken, notionDatabaseId);
async function getTriggeredContent() {

    const requestOptions = {
        method: 'GET',
        headers: {
            "authorization": `token ${githubToken}`
        },
        redirect: 'follow'
    };

    let response = await fetch(`https://api.github.com/repos/${repository}/commits/${sha}`, requestOptions)
    return await response.json()

}
async function getCommitContent(contentUrl) {
    const requestOptions = {
        method: 'GET',
        headers: {
            "authorization": `token ${githubToken}`,
            "accept": "application/vnd.github.v3.raw+json"
        },
        redirect: 'follow'
    };

    let response = await fetch(contentUrl, requestOptions)


    return await response.json()


}
//创建符合neno笔记结构的数据结构
async function createNotionDatabaseProperty(params) {

    const raw = JSON.stringify({
        "parent": {
            "type": "database_id",
            "database_id": notionDatabaseId
        },
        "properties": {
            "content": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": ""
                        }
                    }
                ]
            },
            "_id": {
                "title": [
                    {
                        "type": "text",
                        "text": {
                            "content": ""
                        }
                    }
                ]
            },
            "createdTimeAt": {
                "date": {
                    "start": ""
                }
            },
            "tags": {
                "type": "multi_select",
                "multi_select": {
                    "options": []
                }
            }
        }
    });

    const requestOptions = {
        method: 'PATCH',
        headers: {
            "Notion-Version": "2021-05-13",
            "Authorization": `Bearer ${notionToken}`,
            "Content-Type": "application/json"
        },
        body: raw,
        redirect: 'follow'
    };

    return await (await fetch(`https://api.notion.com/v1/databases/${notionDatabaseId}`, requestOptions)).json()
}
//获取数据库结构
async function getDatabaseStracture(params) {

    const requestOptions = {
        method: 'GET',
        headers: {
            "Notion-Version": "2021-05-13",
            "Authorization": `Bearer ${notionToken}`,
            "Content-Type": "application/json"
        },
        redirect: 'follow'
    };

    return await (await fetch(`https://api.notion.com/v1/databases/${notionDatabaseId}`, requestOptions)).json()
}
//同步单个neno笔记到notion数据库
async function syncNenoItemToNotion(nenoItem) {


    let tags = new Set()
    for (const stag of nenoItem.tags) {
        let singleTag = stag.replaceAll("#", "").split("/")
        singleTag.forEach(element => {
            tags.add(element)

        });
    }

    let multi_select = []
    tags.forEach(element => {
        multi_select = [...multi_select, {
            "name": element
        }]
    });

    const raw = JSON.stringify({
        "parent": {
            "type": "database_id",
            "database_id": notionDatabaseId
        },
        "properties": {
            "content": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": nenoItem.pureContent
                        }
                    }
                ]
            },
            "_id": {
                "title": [
                    {
                        "type": "text",
                        "text": {
                            "content": nenoItem._id
                        }
                    }
                ]
            },
            "createdTimeAt": {
                "date": {
                    "start": nenoItem.created_at
                }
            },
            "tags": {
                "multi_select": multi_select
            }
        }
    });

    const requestOptions = {
        method: 'POST',
        headers: {
            "Notion-Version": "2021-05-13",
            "Authorization": `Bearer ${notionToken}`,
            "Content-Type": "application/json"

        },
        body: raw,
        redirect: 'follow'
    };

    return (await fetch("https://api.notion.com/v1/pages/", requestOptions)).json()

}
async function run() {
    //判断数据库结构是否创立
    let databaseStractureResult = await getDatabaseStracture()
    if (databaseStractureResult.properties.tags === undefined) {
        //先创建数据库结构
        let createNotionDatabasePropertyResult = await createNotionDatabaseProperty()
        console.log(createNotionDatabasePropertyResult);

    }
    //获取本次提交中新增的笔记, 一次提交可能包含多条笔记
    let result = await getTriggeredContent()
    const addedNenos = (result.files || []).filter((file) =>
        file.status === "added" && /^\d{4}-\d{2}-\d{2}\/[0-9a-zA-Z]+\.json$/.test(file.filename))
    for (const file of addedNenos) {
        let contentResult = await getCommitContent(file.contents_url)
        let syncResult = await syncNenoItemToNotion(contentResult)
        console.log(file.filename, syncResult);
    }
    return
}
run()
