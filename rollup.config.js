import commonjs from "rollup-plugin-commonjs";
// import purgeCss from '@fullhuman/postcss-purgecss';
import livereload from "rollup-plugin-livereload";
import postcss from "rollup-plugin-postcss";
import resolve from "rollup-plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import svelte_preprocess_postcss from "svelte-preprocess-postcss";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";
import copy from "rollup-plugin-copy-assets";
import json from 'rollup-plugin-json';

const production = !process.env.ROLLUP_WATCH;
export default {
  input: "src/main.js",
  output: {
    format: "iife",
    sourcemap: true,
    name: "app",
    file: "dist/main.js"
  },

  plugins: [
    svelte({
      dev: !production,
      // preprocess: {
      //   style: svelte_preprocess_postcss()
      // },

      preprocess: svelte_preprocess_postcss({ postcss: true }),
      css: css => {
        css.write("components.css");
      },
      emitCss: true
    }),
    json({
      // All JSON files will be parsed by default,
      // but you can also specifically include/exclude files
      include: 'node_modules/**',
      exclude: [ 'node_modules/foo/**', 'node_modules/bar/**' ],

      // for tree-shaking, properties will be declared as
      // variables, using either `var` or `const`
      preferConst: true, // Default: false

      // specify indentation for the generated default export —
      // defaults to '\t'
      indent: '  ',

      // ignores indent and generates the smallest code
      compact: true, // Default: false

      // generate a named export for every property of the JSON object
      namedExports: true // Default: true
    }),
    resolve(),
    commonjs(),
    globals(),
    builtins(),
    copy({
      assets: ["src/assets"]
    }),
    postcss({
      extract: true
    }),
    !production && livereload("dist"),
    production && terser()
    
  ]
  // watch: {
  //    clearScreen: false,
  // },
};
