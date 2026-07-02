import {createApp} from 'vue'
import App from './App.vue'
import router from './router'
import './styles/styles.scss'

import PrimeVue from 'primevue/config'
import {Avatar, Button, Card, Drawer, Image, Menu, Menubar, SelectButton, Toolbar, Tooltip} from 'primevue'
import Lara from '@primevue/themes/lara'
import i18n from "./i18n.js";
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import ApiService from './core/services/api.service'

import { createPinia } from 'pinia';

const app = createApp(App)

// Inicializar autenticación
const apiService = new ApiService();
apiService.initializeAuth();

// Hacer el router disponible globalmente para el interceptor
window.router = router;

const pinia = createPinia();
app.use(pinia)
app.use(router)

app
    .use(PrimeVue, { 
        ripple: true, 
        theme: { 
            preset: Lara,
            options: {
                darkModeSelector: '.app-dark'
            }
        }
    })
    .component('pv-button', Button)
    .component('pv-card',Card)
    .component('pv-select-button', SelectButton)
    .component('pv-drawer', Drawer)
    .component('pv-avatar', Avatar)
    .component('pv-menu', Menu)
    .component('pv-menubar', Menubar)
    .component('pv-toolbar', Toolbar)
    .component('pv-tooltip', Tooltip)
    .component('pv-image', Image)
    .use(i18n)
    .use(ToastService)
    .component('Toast', Toast)
    .mount('#app')
