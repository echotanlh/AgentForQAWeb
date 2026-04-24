<template>
  <div class="register">
    <h2>注册</h2>
    <form @submit.prevent="handleRegister">
      <div>
        <label for="username">用户名:</label>
        <input id="username" v-model="username" type="text" required />
      </div>
      <div>
        <label for="email">邮箱:</label>
        <input id="email" v-model="email" type="email" required />
      </div>
      <div>
        <label for="password">密码:</label>
        <input id="password" v-model="password" type="password" required />
      </div>
      <div>
        <label for="confirmPassword">确认密码:</label>
        <input id="confirmPassword" v-model="confirmPassword" type="password" required />
      </div>
      <button type="submit" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
    </form>
    <p>已有账号？<router-link to="/login">登录</router-link></p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const BASE_URL = 'http://192.168.2.119:8000'
const router = useRouter()
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const email = ref('')
const loading = ref(false)

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    alert('密码不匹配')
    return
  }
  if (!validateEmail(email.value)) {
    alert('请输入有效的邮箱地址')
    return
  }
  if (!username.value || !password.value || !email.value) {
    alert('请输入用户名、密码和邮箱')
    return
  }

  loading.value = true
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      alert(errorData.message || '注册失败，请重试')
      return
    }

    const data = await response.json()
    alert('注册成功')
    router.push('/login')
  } catch (error) {
    console.error('注册错误:', error)
    alert('网络错误，请检查连接')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register {
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
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #218838;
}
</style>