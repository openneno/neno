import {defineConfig} from "vite";
import {svelte} from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from 'vite-plugin-pwa'
import replace from '@rollup/plugin-replace'

const pwaOptions = {
    mode: 'development',
    base: '/',
    includeAssets: ['favicon.svg'],
    manifest: {
        name: 'NENO',
        short_name: 'NENO',
        theme_color: '#f3f4f6',
        icons: [
            {
                src: 'neno.png', // <== don't add slash, for testing
                sizes: '512x512',
                type: 'image/png',
            },

        ],
    },
}

const replaceOptions = { __DATE__: new Date().toISOString() }
const claims = process.env.CLAIMS === 'true'
const reload = process.env.RELOAD_SW === 'true'

if (process.env.SW === 'true') {
    pwaOptions.srcDir = 'src'
    pwaOptions.filename = claims ? 'claims-sw.ts' : 'prompt-sw.ts'
    pwaOptions.strategies = 'injectManifest'
    pwaOptions.manifest.name = 'PWA Inject Manifest'
    pwaOptions.manifest.short_name = 'PWA Inject'
}

if (claims)
    pwaOptions.registerType = 'autoUpdate'

if (reload) {
    // @ts-ignore
    replaceOptions.__RELOAD_SW__ = 'true'
}
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svelte(),
        VitePWA(pwaOptions),
        replace(replaceOptions),
    ]

});
