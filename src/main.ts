import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { configureGraphQLSession } from './services/graphql'
import { useAuthStore } from './stores/authStore'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

configureGraphQLSession({
  async refresh() {
    const authStore = useAuthStore()
    const ok = await authStore.refreshSession()
    return ok ? authStore.token : null
  },
  async onExpired() {
    const authStore = useAuthStore()
    await authStore.expireSession()
    if (router.currentRoute.value.name !== 'login') {
      await router.push({
        name: 'login',
        query: {
          expired: '1',
          redirect: router.currentRoute.value.fullPath,
        },
      })
    }
    authStore.resetSessionExpiryGuard()
  },
})

app.mount('#app')
