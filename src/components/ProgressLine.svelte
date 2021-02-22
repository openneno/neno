<script>
    export let dotSize = 13;
    export let leftSize = 8;
    export let bgColor = "#a0aec0";
</script>

<div class="w-full flex items-center justify-center">
    <div
        class="lds-ellipsis"
        style=" --t-size: {leftSize * 3 + 'px'};--bg-color:{bgColor}"
    >
        <div
            style="   width: {dotSize}px;
        height:  {dotSize}px; 
        left: {leftSize}px;
        "
        />
        <div
            style="   
           
            width: {dotSize}px;
        height:  {dotSize}px;      
        left:  {leftSize}px;
        "
        />
        <div
            style="   width: {dotSize}px;
        height:  {dotSize}px;
        left:  {leftSize *
                4}px;
        "
        />
        <div
            style="   width: {dotSize}px;
        height:  {dotSize}px;
        left:  {leftSize *
                7}px;
        "
        />
    </div>
</div>

<style type="text/postcss">
    .lds-ellipsis {
        display: inline-block;
        position: relative;
        width: 60px;
    }
    .lds-ellipsis div {
        position: absolute;
        border-radius: 50%;
        background: var(--bg-color);
        animation-timing-function: cubic-bezier(0, 1, 1, 0);
    }
    .lds-ellipsis div:nth-child(1) {
        animation: lds-ellipsis1 0.6s infinite;
    }
    .lds-ellipsis div:nth-child(2) {
        animation: lds-ellipsis2 0.6s infinite;
    }
    .lds-ellipsis div:nth-child(3) {
        animation: lds-ellipsis2 0.6s infinite;
    }
    .lds-ellipsis div:nth-child(4) {
        animation: lds-ellipsis3 0.6s infinite;
    }
    @keyframes lds-ellipsis1 {
        0% {
            transform: scale(0);
        }
        100% {
            transform: scale(1);
        }
    }
    @keyframes lds-ellipsis3 {
        0% {
            transform: scale(1);
        }
        100% {
            transform: scale(0);
        }
    }
    @keyframes lds-ellipsis2 {
        0% {
            transform: translate(0, 0);
        }
        100% {
            transform: translate(var(--t-size), 0);
        }
    }
</style>
