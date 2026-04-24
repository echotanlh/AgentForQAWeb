<template>
  <div class="chat-root">
    <div class="chat-header">
      <span>AI Agent</span>
      <UserAvatar />
    </div>
    <div class="messages" ref="messagesContainer">
      <div v-for="(m, i) in messages" :key="i" :class="['message', m.role]">
        <div class="avatar">{{ m.role === 'user' ? '你' : 'AI' }}</div>
        <div class="message-text" v-html="renderHtml(m.text)"></div>
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
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import mermaid from 'mermaid'
import UserAvatar from './UserAvatar.vue'

// 请求接口的服务端域名（或IP+端口）
const API_BASE = 'http://192.168.2.119:8000'
const router = useRouter()

const getHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

const md = new MarkdownIt({ html: true, linkify: true })
const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules)
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const info = token.info ? token.info.trim() : ''
  if (info === 'flowchart') {
    const code = token.content.trim()
    return `<div class="mermaid">${md.utils.escapeHtml(code)}</div>`
  }
  return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
}

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
  },
})

const messages = ref([])
const input = ref('')
const messagesContainer = ref(null)
const sending = ref(false)

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderHtml(text) {
  const raw = text || ''
  const trimmed = raw.trimStart()
  const mermaidStart = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|journey|gantt|pie|erDiagram|mindmap|requirementDiagram|gitGraph)\b/i
  if (mermaidStart.test(trimmed)) {
    const safe = escapeHtml(raw)
    return `<div class="mermaid">${safe}</div>`
  }
  return md.render(raw)
}

async function renderMermaidDiagrams() {
  const el = messagesContainer.value
  if (!el) return
  const nodes = el.querySelectorAll('.mermaid')
  await Promise.all(Array.from(nodes).map(async (node) => {
    if (node.dataset.rendered === 'true') return
    const code = node.textContent || ''
    if (!code.trim()) return
    try {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
      const { svg, bindFunctions } = await mermaid.render(id, code, node)
      node.innerHTML = svg
      bindFunctions?.(node)
      node.dataset.rendered = 'true'
    } catch (error) {
      console.error('Mermaid render failed:', error)
    }
  }))
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/chat_history`, {
      headers: getHeaders()
    })
    if (res.ok) {
      const history = await res.json()
      // 按 timestamp 排序
      history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      const newMessages = []
      history.forEach(item => {
        newMessages.push({ role: 'user', text: item.question })
        newMessages.push({ role: 'ai', text: item.answer })
      })
      // 如果历史消息为空，显示欢迎文案
      if (newMessages.length === 0) {
        messages.value = [{ role: 'ai', text: '你现在可以跟我聊天啦' }]
      } else {
        messages.value = newMessages
      }
    } else {
      // 如果请求失败，显示初始消息
      messages.value = [{ role: 'ai', text: '你现在可以跟我聊天啦' }]
    }
  } catch (e) {
    // 忽略错误，显示初始消息
    messages.value = [{ role: 'ai', text: '你现在可以跟我聊天啦' }]
  }
}

async function send() {
  const token = localStorage.getItem('token')
  if (!token) {
    messages.value.push({ role: 'ai', text: '请先登录' })
    setTimeout(() => {
      router.push('/login')
    }, 1500)
    return
  }

  const text = input.value && input.value.trim()
  if (!text || sending.value) return

  // show the question immediately
  messages.value.push({ role: 'user', text })
  input.value = ''
  sending.value = true

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: getHeaders(),
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
  renderMermaidDiagrams()
  const el = messagesContainer.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

watch(messages, () => {
  scrollToBottom()
})

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    messages.value.push({ role: 'ai', text: '请先登录' })
    setTimeout(() => {
      router.push('/login')
    }, 1500)
    return
  }
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
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  flex-wrap: nowrap;
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
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
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
.message-text .mermaid {
  max-width: 100%;
  overflow-x: auto;
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
