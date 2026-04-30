<template>
  <div class="login">
    <h2>登录</h2>
    <form @submit.prevent="handleLogin">
      <div>
        <label for="username">用户名:</label>
        <input id="username" v-model="username" type="text" required />
      </div>
      <div>
        <label for="password">密码:</label>
        <input id="password" v-model="password" type="password" required />
      </div>
      <button type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
    </form>
    <p>还没有账号？<router-link to="/register">注册</router-link></p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { API_CONFIG, getApiUrl } from '../config'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    alert('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const response = await fetch(getApiUrl(API_CONFIG.AUTH.LOGIN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      alert(errorData.message || '登录失败，请重试')
      return
    }

    const data = await response.json()
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('username', username.value)
    localStorage.setItem('token', data.token)
    router.push('/chat')
  } catch (error) {
    console.error('登录错误:', error)
    alert('网络错误，请检查连接')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

form div {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>