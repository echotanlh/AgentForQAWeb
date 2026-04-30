<template>
  <div class="user-avatar-wrapper">
    <div class="avatar-circle" @click="toggleMenu">
      {{ firstLetter }}
    </div>
    <div v-if="showMenu" class="dropdown-menu">
      <button @click="handleLogout" class="logout-btn">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { API_CONFIG, getApiUrl } from '../config'

const router = useRouter()
const showMenu = ref(false)
const username = ref('')

const firstLetter = computed(() => {
  return username.value ? username.value.charAt(0).toUpperCase() : 'U'
})

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const handleClickOutside = (event) => {
  const wrapper = document.querySelector('.user-avatar-wrapper')
  if (wrapper && !wrapper.contains(event.target)) {
    showMenu.value = false
  }
}

const handleLogout = async () => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      await fetch(getApiUrl(API_CONFIG.AUTH.LOGOUT), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    }
  } catch (error) {
    console.error('Logout failed:', error)
  }
  localStorage.removeItem('token')
  router.push('/login')
}

onMounted(() => {
  username.value = localStorage.getItem('username') || 'User'
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.user-avatar-wrapper {
  position: relative;
  display: inline-block;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-circle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dropdown-menu {
  position: absolute;
  top: 50px;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
}

.logout-btn {
  display: block;
  width: 100%;
  padding: 10px 15px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s ease;
}

.logout-btn:hover {
  background-color: #f5f5f5;
  color: #d9534f;
}

.logout-btn:active {
  background-color: #ebebeb;
}
</style>
