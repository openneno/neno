const fetch = require('node-fetch');
const fs = require('fs');


let notionToken = process.env.NOTION_TOKEN
let notionDatabaseId = process.env.NOTION_DATABASEID

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
async function syncFromLocal(params) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    try {
        const data = fs.readdirSync('.', 'utf8')
        for (const filename of data) {
            const filet = fs.lstatSync(filename)
            if (filename.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) && filet.isDirectory()) {
                console.log(filename)
                const nenoitemGroupByDate = fs.readdirSync(filename, 'utf8')
                for (const nenoItemFileName of nenoitemGroupByDate) {
                    console.log(nenoItemFileName);
                    const nenoItemFile = fs.readFileSync(`${filename}/${nenoItemFileName}`, 'utf8')
                    console.log(JSON.parse(nenoItemFile));
                    let syncResult = await syncNenoItemToNotion(JSON.parse(nenoItemFile))
                    console.log(syncResult);
                    await delay(500)
                }


            }
        }

    } catch (err) {
        console.error(err)
    }
}


async function run() {

    //判断数据库结构是否创立
    let databaseStractureResult = await getDatabaseStracture()
    if (databaseStractureResult.properties.tags === undefined) {
        //先创建数据库结构
        let createNotionDatabasePropertyResult = await createNotionDatabaseProperty()
        console.log(createNotionDatabasePropertyResult);

    }
    await syncFromLocal()
    return
}
run()
