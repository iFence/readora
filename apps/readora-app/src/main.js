import { createApp } from 'vue'
import './assets/css/reset.css'
import './style.css'
import App from './App.vue';
import router from "@/router/index.js";
import i18n from './i18n';
import { initializeWindowLifecycle } from '@/services/windowService.js';
import { setupGlobalShortcuts } from '@/services/shortcutService.js';
import { initializeAppShell } from '@/services/appShellService.js';

const app = createApp(App);
app.use(i18n);
app.use(router);
app.mount('#app');

initializeAppShell();
initializeWindowLifecycle().catch(() => {});

setupGlobalShortcuts().catch(() => {});
