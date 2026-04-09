<template>
  <div class="chat-root">
    <div class="chat-header">AI Agent</div>
    <div class="messages" ref="messagesContainer">
      <div v-for="(m, i) in messages" :key="i" :class="['message', m.role]">
        <div class="avatar">{{ m.role === 'user' ? '你' : 'AI' }}</div>
        <div class="message-text"><vue-markdown :source="m.text" /></div>
      </div>
    </div>

    <form class="composer" @submit.prevent="send">
      <input v-model="input" :disabled="sending" type="text" placeholder="Type a message" />
      <button type="submit" :disabled="sending">{{ sending ? 'Sending...' : 'Send' }}</button>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import VueMarkdown from 'vue-markdown-render'

// 请求接口的服务端域名（或IP+端口）
const API_BASE = 'http://192.168.2.125:8000'

const messages = ref([])
const input = ref('')
const messagesContainer = ref(null)
const sending = ref(false)

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/chat_history`)
    if (res.ok) {
      const history = await res.json()
      // 按 timestamp 排序
      history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      const newMessages = []
      history.forEach(item => {
        newMessages.push({ role: 'user', text: item.question })
        newMessages.push({ role: 'ai', text: item.answer })
      })
      messages.value = newMessages
    } else {
      // 如果请求失败，显示初始消息
      messages.value = [{ role: 'ai', text: '大兄弟，你可以跟AI聊天了！' }]
    }
  } catch (e) {
    // 忽略错误，显示初始消息
    messages.value = [{ role: 'ai', text: '大兄弟，你可以跟AI聊天了！' }]
  }
}

async function send() {
  const text = input.value && input.value.trim()
  if (!text || sending.value) return

  // show the question immediately
  messages.value.push({ role: 'user', text })
  input.value = ''
  sending.value = true

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text, user_id: null, stream: false }),
    })

    if (!res.ok) {
      messages.value.push({ role: 'ai', text: '返回异常' })
      return
    }

    let data
    try { data = await res.json() } catch (e) { data = await res.text() }

    let answer = ''
    if (typeof data === 'string') answer = data
    else if (data && (data.answer || data.message || data.data)) answer = data.answer || data.message || data.data
    else answer = JSON.stringify(data)

    messages.value.push({ role: 'ai', text: answer })
  } catch (e) {
    messages.value.push({ role: 'ai', text: '返回异常' })
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

async function scrollToBottom() {
  await nextTick()
  const el = messagesContainer.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

watch(messages, () => scrollToBottom())

onMounted(async () => {
  await loadHistory()
  scrollToBottom()
})
</script>

<style scoped>
.chat-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  padding: 12px;
  box-sizing: border-box;
}
.chat-header {
  text-align: center;
  padding: 10px 0;
  font-weight: 600;
  font-size: 16px;
  border-bottom: 1px solid #eee;
  margin-bottom: 8px;
}
.messages {
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}
.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: fit-content;
  max-width: 92%;
}
.message.ai {
  align-self: flex-end;
  margin-left: auto;
  flex-direction: row-reverse;
}
.message.user {
  justify-content: flex-start;
  flex-direction: row;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
}
.message.user .avatar {
  background: #f97316;
}
.message.ai .avatar {
  background: #3b82f6;

}
.message-text {
  display: inline-block;
  max-width: 86%;
  padding: 8px 12px;
  border-radius: 12px;
  line-height: 1.4;
  text-align: left;
  word-break: break-word;
}
.message.user .message-text {
  background: #f1f0f0;
  color: #111;
  border-top-left-radius: 4px;
}
.message.ai .message-text {
  background: #dcf8c6;
  color: #111;
  border-top-right-radius: 4px;
}
.composer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.composer input {
  flex: 1 1 auto;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 16px;
}
.composer button {
  padding: 10px 16px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  cursor: pointer;
}
.composer button:active { transform: translateY(1px) }

</style>
