import './hmr';
import "./main.css";
import 'remixicon/fonts/remixicon.css'
import 'quill/dist/quill.snow.css'
import { mount } from 'svelte'
import App from './App.svelte'


const app = mount(App, {
  target: document.body
})

export default app
