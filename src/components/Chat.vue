<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import mermaid from 'mermaid'
import UserAvatar from './UserAvatar.vue'
import { API_CONFIG, getApiUrl } from '../config'

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
const showErrorBubble = ref(false)
const errorMessage = ref('')
let errorTimeout = null

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

function showFriendlyError(message, duration = 5000) {
  // Clear any existing timeout
  if (errorTimeout) {
    clearTimeout(errorTimeout)
  }
  
  errorMessage.value = message
  showErrorBubble.value = true
  
  // Auto-hide after duration
  errorTimeout = setTimeout(() => {
    showErrorBubble.value = false
  }, duration)
}

function hideErrorBubble() {
  showErrorBubble.value = false
  if (errorTimeout) {
    clearTimeout(errorTimeout)
  }
}

async function loadHistory() {
  try {
    const res = await fetch(getApiUrl(API_CONFIG.CHAT.HISTORY), {
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
    showFriendlyError('请先登录以继续对话', 3000)
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
    const res = await fetch(getApiUrl(API_CONFIG.CHAT.ASK), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ question: text, user_id: null, stream: false }),
    })

    if (!res.ok) {
      let errorMsg = '服务器返回异常'
      
      // Try to parse error response
      try {
        const errorData = await res.json()
        if (errorData.message) {
          errorMsg = errorData.message
        } else if (errorData.error) {
          errorMsg = errorData.error
        } else if (errorData.detail) {
          errorMsg = errorData.detail
        }
      } catch (e) {
        // If can't parse JSON, use status-based messages
        if (res.status === 401) {
          errorMsg = '认证已过期，请重新登录'
        } else if (res.status === 403) {
          errorMsg = '没有权限执行此操作'
        } else if (res.status === 404) {
          errorMsg = '请求的资源不存在'
        } else if (res.status === 429) {
          errorMsg = '请求过于频繁，请稍后再试'
        } else if (res.status >= 500) {
          errorMsg = '服务器内部错误，请稍后重试'
        }
      }
      
      showFriendlyError(errorMsg)
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
    let errorMsg = '网络连接失败，请检查网络设置'
    
    if (e.message.includes('Failed to fetch')) {
      errorMsg = '无法连接到服务器，请确保网络正常'
    } else if (e.message.includes('timeout')) {
      errorMsg = '请求超时，请稍后重试'
    }
    
    showFriendlyError(errorMsg)
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

watch(
  () => messages.value,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  }
)

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="chat-root">
    <!-- Error Bubble -->
    <transition name="error-bubble">
      <div v-if="showErrorBubble" class="error-bubble" @click="hideErrorBubble">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <div class="error-title">出错了</div>
          <div class="error-message">{{ errorMessage }}</div>
        </div>
        <button class="error-close" @click.stop="hideErrorBubble">×</button>
      </div>
    </transition>

    <div class="chat-header">
      <span>AI Agent</span>
      <UserAvatar />
    </div>
    <div class="messages" ref="messagesContainer">
      <div v-for="(m, i) in messages" :key="i" :class="['message', m.role]">
        <div class="message-avatar">{{ m.role === 'user' ? '我' : 'AI' }}</div>
        <div class="message-bubble" v-html="renderHtml(m.text)"></div>
      </div>
    </div>

    <form class="composer" @submit.prevent="send">
      <input v-model="input" :disabled="sending" type="text" placeholder="Type a message" />
      <button type="submit" :disabled="sending">{{ sending ? 'Sending...' : 'Send' }}</button>
    </form>
  </div>
</template>

<style scoped>
.chat-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

/* Error Bubble Styles */
.error-bubble {
  position: fixed;
  top: 80px;
  right: 20px;
  max-width: 400px;
  min-width: 300px;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #ef4444;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3), 0 4px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  z-index: 1000;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: slideInRight 0.4s ease-out;
}

.error-bubble:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4), 0 6px 15px rgba(0, 0, 0, 0.15);
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-size: 14px;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 4px;
}

.error-message {
  font-size: 13px;
  color: #991b1b;
  line-height: 1.5;
  word-wrap: break-word;
}

.error-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #dc2626;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.error-close:hover {
  background-color: rgba(220, 38, 38, 0.1);
  transform: rotate(90deg);
}

/* Animations */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.error-bubble-enter-active,
.error-bubble-leave-active {
  transition: all 0.3s ease;
}

.error-bubble-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.error-bubble-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: white;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f5f5;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background-color: #9ca3af;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background-color: #3b82f6;
}

.message.ai .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-bubble {
  max-width: 65%;
  padding: 10px 14px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  position: relative;
  text-align: left;
}

.message-bubble :deep(p) {
  margin: 0 0 8px 0;
  text-align: left;
}

.message-bubble :deep(p:last-child) {
  margin-bottom: 0;
}

.message-bubble :deep(pre) {
  background-color: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
  text-align: left;
}

.message-bubble :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  text-align: left;
}

.message-bubble :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.message-bubble :deep(.mermaid) {
  background-color: white;
  padding: 12px;
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
}

.message.user .message-bubble {
  background-color: #95ec69;
  color: #000;
}

.message.user .message-bubble :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
}

.message.ai .message-bubble {
  background-color: white;
  color: #333;
}

/* Bubble tail for AI messages */
.message.ai .message-bubble::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 12px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 8px solid white;
}

/* Bubble tail for user messages */
.message.user .message-bubble::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 12px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 8px solid #95ec69;
}

.composer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9f9f9;
}

.composer input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s ease;
}

.composer input:focus {
  border-color: #3b82f6;
}

.composer input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.composer button {
  padding: 10px 20px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.composer button:hover:not(:disabled) {
  background-color: #2563eb;
}

.composer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
