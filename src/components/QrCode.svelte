<script>
    import qrcode from "qrcode-generator";

    export let text = "";

    function render(value) {
        if (!value) return "";
        //typeNumber 为 0 时自动选择尺寸
        const qr = qrcode(0, "L");
        qr.addData(value);
        qr.make();
        return qr.createSvgTag({cellSize: 4, margin: 2, scalable: true});
    }

    $: svg = render(text);
</script>

<!-- 二维码固定使用白底黑块, 深色模式下也能被扫描 -->
<div class="bg-white p-2 rounded-lg w-56 h-56 [&>svg]:w-full [&>svg]:h-full" role="img" aria-label="同步二维码">
    {@html svg}
</div>
