import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Ensure the chat H5 page is reachable at /chat
if (typeof window !== 'undefined') {
	try {
		if (window.location.pathname === '' || window.location.pathname === '/') {
			window.history.replaceState({}, '', '/chat')
		}
	} catch (e) {
		// ignore
	}
}

createApp(App).mount('#app')
