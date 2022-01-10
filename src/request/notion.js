import { settingStore, commitToGithubTag, reload } from "../store/store.js";
export const createNotionDatabaseProperty = async (data) => {
    var myHeaders = new Headers();
    myHeaders.append("Notion-Version", "2021-05-13");
    myHeaders.append("Authorization", "Bearer secret_E8SgjJRHNruBYuMBI1cT7gtXY3Ut6FfdVlZ66Gwz8Qo");
    myHeaders.append("User-Agent", "apifox/1.0.0 (https://www.apifox.cn)");
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "parent": {
            "type": "database_id",
            "database_id": "c99c94e6e6264fd48a044942724ed4b3"
        },
        "properties": {
            "content": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": "content1111"
                        }
                    }
                ]
            },
            "tags": {
                "type": "multi_select",
                "multi_select": {
                    "options": []
                }
            }
        }
    });

    var requestOptions = {
        method: 'PATCH',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch("https://api.notion.com/v1/databases/c99c94e6e6264fd48a044942724ed4b3", requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
}