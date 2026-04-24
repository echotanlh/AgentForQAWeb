import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import Login from './components/Login.vue'
import Register from './components/Register.vue'
import Chat from './components/Chat.vue'

const routes = [
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  {
    path: '/chat',
    component: Chat,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('isLoggedIn') === 'true') {
        next()
      } else {
        next('/login')
      }
    }
  },
  { path: '/', redirect: '/chat' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Remove the old redirect logic since we have routes now
// if (typeof window !== 'undefined') {
//   try {
//     if (window.location.pathname === '' || window.location.pathname === '/') {
//       window.history.replaceState({}, '', '/chat')
//     }
//   } catch (e) {
//     // ignore
//   }
// }

createApp(App).use(router).mount('#app')
