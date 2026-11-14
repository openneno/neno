//录音: 从麦克风读取 PCM, 降采样为 16kHz 单声道, 结束时编码为 16 位 PCM WAV
//DeepSeek 语音识别只接受 16 位 PCM WAV 或 Ogg Opus, 浏览器的 MediaRecorder 在各平台输出的格式不同,
//所以自己采集并编码 WAV, 保证 web 和 Android 保存的原始语音格式一致

export const SAMPLE_RATE = 16000;
//语音识别单次最长 120 秒
export const MAX_DURATION_MS = 120 * 1000;

//在音频线程中把采集到的数据转发到主线程
const WORKLET_SOURCE = `
class NenoCapture extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0];
        if (input && input[0]) this.port.postMessage(input[0].slice(0));
        return true;
    }
}
registerProcessor("neno-capture", NenoCapture);
`;

export function isRecordingSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));
}

//把麦克风的原始采样率降到 16kHz: 对每个输出采样覆盖的输入区间取平均(简单的低通 + 抽取)
class Downsampler {
    constructor(inputRate) {
        this.ratio = inputRate / SAMPLE_RATE;
        this.position = 0;
        this.sum = 0;
        this.count = 0;
    }

    push(input) {
        const out = new Float32Array(Math.ceil(input.length / this.ratio) + 1);
        let length = 0;
        for (let i = 0; i < input.length; i++) {
            this.sum += input[i];
            this.count++;
            this.position++;
            if (this.position >= this.ratio) {
                out[length++] = this.sum / this.count;
                this.position -= this.ratio;
                this.sum = 0;
                this.count = 0;
            }
        }
        return out.subarray(0, length);
    }
}

export function encodeWav(samples, sampleRate = SAMPLE_RATE) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, text) => {
        for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); //PCM
    view.setUint16(22, 1, true); //单声道
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const value = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    }
    return new Blob([buffer], {type: "audio/wav"});
}

//开始录音. onLevel(0~1) 用于显示音量, onLimit 在达到最长时长时调用(调用方应随后 stop)
//返回 {stop(): Promise<{blob, durationMs}>, cancel()}
export async function startRecording({onLevel = () => {}, onLimit = () => {}} = {}) {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true},
    });
    const Context = window.AudioContext || window.webkitAudioContext;
    const context = new Context();
    const source = context.createMediaStreamSource(stream);
    const downsampler = new Downsampler(context.sampleRate);
    const chunks = [];
    let total = 0;
    let limited = false;

    const handle = (input) => {
        if (limited) return;
        const samples = downsampler.push(input);
        let peak = 0;
        for (let i = 0; i < input.length; i++) peak = Math.max(peak, Math.abs(input[i]));
        onLevel(Math.min(1, peak * 1.6));
        chunks.push(samples);
        total += samples.length;
        if (total >= SAMPLE_RATE * MAX_DURATION_MS / 1000) {
            limited = true;
            onLimit();
        }
    };

    let node;
    let workletUrl = null;
    if (context.audioWorklet) {
        workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], {type: "application/javascript"}));
        await context.audioWorklet.addModule(workletUrl);
        node = new AudioWorkletNode(context, "neno-capture");
        node.port.onmessage = (event) => handle(event.data);
        source.connect(node);
    } else {
        //旧浏览器没有 AudioWorklet
        node = context.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = (event) => handle(event.inputBuffer.getChannelData(0));
        source.connect(node);
        node.connect(context.destination);
    }
    if (context.state === "suspended") await context.resume();

    const release = () => {
        try {
            source.disconnect();
            node.disconnect();
        } catch (e) {
            //已经断开
        }
        stream.getTracks().forEach((track) => track.stop());
        context.close();
        if (workletUrl) URL.revokeObjectURL(workletUrl);
    };

    return {
        async stop() {
            release();
            const samples = new Float32Array(Math.min(total, SAMPLE_RATE * MAX_DURATION_MS / 1000));
            let offset = 0;
            for (const chunk of chunks) {
                if (offset >= samples.length) break;
                const part = chunk.subarray(0, samples.length - offset);
                samples.set(part, offset);
                offset += part.length;
            }
            return {blob: encodeWav(samples), durationMs: Math.round(samples.length / SAMPLE_RATE * 1000)};
        },
        cancel: release,
    };
}
