//DeepSeek 语音识别: https://api-docs.deepseek.com/guides/asr/
//POST multipart/form-data, 字段 file; 返回 {request_id, text, duration_ms}
//语言自动识别; 音频最长 120 秒, 最大 8 MiB

export const ASR_ENDPOINT = "https://api.deepseek.com/v1/tools/asr";
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

const ERROR_MESSAGES = {
    400: "音频格式不支持",
    401: "API Key 无效, 请在设置中检查",
    402: "DeepSeek 账户余额不足",
    408: "上传超时, 请重试",
    413: "录音文件太大(最大 8 MB)",
    429: "请求太多, 请稍后重试",
    503: "识别服务繁忙, 请稍后重试",
    504: "识别超时, 请重试",
};

export class AsrError extends Error {
    constructor(message, status = 0) {
        super(message);
        this.status = status;
    }
}

//返回识别出的文字(可能为空字符串, 例如录音里没有说话)
export async function transcribe(blob, apiKey, filename = "speech.wav") {
    if (!apiKey) throw new AsrError("请先在设置中填写 DeepSeek API Key");
    if (blob.size > MAX_AUDIO_BYTES) throw new AsrError(ERROR_MESSAGES[413], 413);
    const form = new FormData();
    form.append("file", blob, filename);
    let response;
    try {
        response = await fetch(ASR_ENDPOINT, {
            method: "POST",
            headers: {Authorization: `Bearer ${apiKey.trim()}`},
            body: form,
        });
    } catch (error) {
        throw new AsrError(navigator.onLine === false ? "当前离线, 联网后可以重新识别" : "网络错误, 请重试");
    }
    if (!response.ok) {
        let detail = "";
        try {
            const data = await response.json();
            detail = (data.error && data.error.message) || data.message || "";
        } catch (e) {
            //没有 JSON 错误信息
        }
        throw new AsrError(ERROR_MESSAGES[response.status] || detail || `识别失败(${response.status})`, response.status);
    }
    const data = await response.json();
    return typeof data.text === "string" ? data.text.trim() : "";
}
