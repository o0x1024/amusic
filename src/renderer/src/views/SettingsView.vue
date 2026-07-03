<script setup lang="ts">
import { ref } from 'vue'
import GeneralSettingsPanel from './setting/GeneralSettingsPanel.vue'
import AiServiceSettingsPanel from './setting/AiServiceSettingsPanel.vue'

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

const categories = [
  { id: 'ai', label: 'AI 服务', icon: 'server' },
  { id: 'general', label: '常规设置', icon: 'desktop' },
  { id: 'backup', label: '数据备份', icon: 'database' }
] as const

type CategoryId = (typeof categories)[number]['id']

const activeCategory = ref<CategoryId>('ai')
const toasts = ref<Toast[]>([])
let toastId = 0

function showToast(type: Toast['type'], message: string) {
  const id = ++toastId
  toasts.value.push({ id, type, message })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3000)
}

function toastAlertClass(type: Toast['type']): string {
  if (type === 'success') return 'alert-success'
  if (type === 'error') return 'alert-error'
  return 'alert-info'
}
</script>

<template>
  <div class="settings-page p-8 animate-fade-in">
    <div class="toast toast-bottom toast-end z-50">
      <transition-group name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="['alert shadow-lg text-sm min-w-64', toastAlertClass(t.type)]"
        >
          <font-awesome-icon
            :icon="t.type === 'success' ? 'check-circle' : t.type === 'error' ? 'exclamation-circle' : 'info-circle'"
            class="w-4 h-4 shrink-0"
          />
          <span>{{ t.message }}</span>
        </div>
      </transition-group>
    </div>

    <div class="flex items-center justify-between mb-6 pb-4 border-b border-base-300/60">
      <div>
        <h2 class="text-2xl font-extrabold tracking-tight">系统设置</h2>
        <p class="text-sm text-base-content/50 mt-1">配置界面外观与 AI 服务，所有数据仅保存在本地</p>
      </div>
    </div>

    <div class="settings-layout flex gap-3">
      <aside class="settings-sidebar shrink-0 w-44">
        <ul class="menu menu-sm bg-base-200 rounded-box p-2 sticky top-6 border border-base-300/60 w-full">
          <li v-for="category in categories" :key="category.id">
            <button
              type="button"
              :class="{ 'menu-active': activeCategory === category.id }"
              @click="activeCategory = category.id"
            >
              <font-awesome-icon :icon="category.icon" class="w-4 h-4" />
              {{ category.label }}
            </button>
          </li>
        </ul>
      </aside>

      <div class="settings-content flex-1 min-w-0">
        <GeneralSettingsPanel v-show="activeCategory === 'general'" />

        <AiServiceSettingsPanel v-show="activeCategory === 'ai'" @toast="showToast" />

        <div v-show="activeCategory === 'backup'" class="space-y-4">
          <div class="mb-2">
            <h3 class="text-xl font-bold">数据备份</h3>
            <p class="text-sm text-base-content/50 mt-1">管理本地数据备份与恢复</p>
          </div>
          <div class="card bg-base-100 shadow-sm border border-base-300/60">
            <div class="card-body p-6">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center text-info">
                  <font-awesome-icon icon="database" class="text-base" />
                </div>
                <div>
                  <h4 class="font-semibold">本地备份</h4>
                  <p class="text-xs text-base-content/50">MVP 暂未开放作品库备份；设置项已保存在 Electron userData 目录。</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-base-300/60">
          <div class="flex items-center gap-2 text-base-content/30 text-xs">
            <font-awesome-icon icon="info-circle" class="w-3.5 h-3.5" />
            <span>
              <strong class="text-base-content/50">amusic</strong> v0.1.0 · 所有创作数据均存储在本地，不会上传到任何服务器
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-layout {
  min-height: calc(100vh - 220px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

@media (max-width: 1024px) {
  .settings-layout {
    @apply flex-col;
  }

  .settings-sidebar {
    @apply w-full;
  }

  .settings-sidebar .menu {
    @apply static flex flex-row overflow-x-auto;
  }

  .settings-sidebar .menu li {
    @apply shrink-0;
  }
}
</style>
