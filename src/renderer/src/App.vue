<script setup lang="ts">
import { ref } from 'vue'
import FavoritesView from './views/FavoritesView.vue'
import StudioView from './views/StudioView.vue'
import SettingsView from './views/SettingsView.vue'
import type { FavoriteRecord } from '../../shared/types'

type Page = 'studio' | 'favorites' | 'settings'

const page = ref<Page>('studio')
const navItems = [
  { path: 'studio' as const, icon: 'music', label: '音乐工作台', section: 'workspace' },
  { path: 'favorites' as const, icon: 'bookmark', label: '收藏夹', section: 'workspace' },
  { path: 'settings' as const, icon: 'cog', label: '系统设置', section: 'system' }
]

const workspaceNavItems = navItems.filter(item => item.section === 'workspace')
const systemNavItems = navItems.filter(item => item.section === 'system')

const pendingFavorite = ref<FavoriteRecord | null>(null)

function applyFavorite(record: FavoriteRecord) {
  pendingFavorite.value = record
  page.value = 'studio'
}
</script>

<template>
  <div class="flex h-screen bg-base-100 text-base-content font-sans">
    <aside class="bg-base-200 border-r border-base-300 flex flex-col shrink-0 select-none relative w-[260px]">
      <div class="px-6 py-5 border-b border-base-300 flex flex-col gap-1">
        <h1 class="text-xl font-extrabold text-primary flex items-center gap-2.5 tracking-tight">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <font-awesome-icon icon="project-diagram" class="text-lg" />
          </div>
          <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text">amusic</span>
        </h1>
        <p class="text-xs text-base-content/40 font-medium tracking-wide">AI-POWERED MUSIC ASSISTANT</p>
      </div>

      <div class="flex-1 py-5 overflow-y-auto scrollbar-thin">
        <div class="px-3 mb-8">
          <h3 class="px-3 mb-3 text-xs font-bold text-base-content/40 uppercase tracking-wider">
            创作工作区
          </h3>
          <ul class="menu menu-sm rounded-box w-full">
            <li v-for="item in workspaceNavItems" :key="item.path">
              <button
                type="button"
                :class="{ 'menu-active': page === item.path }"
                @click="page = item.path"
              >
                <font-awesome-icon :icon="item.icon" class="w-4 h-4 opacity-80" />
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>

        <div class="px-3">
          <h3 class="px-3 mb-3 text-xs font-bold text-base-content/40 uppercase tracking-wider">
            系统
          </h3>
          <ul class="menu menu-sm rounded-box w-full">
            <li v-for="item in systemNavItems" :key="item.path">
              <button
                type="button"
                :class="{ 'menu-active': page === item.path }"
                @click="page = item.path"
              >
                <font-awesome-icon :icon="item.icon" class="w-4 h-4 opacity-80" />
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-base-300/50 flex items-center justify-between text-xs font-semibold text-base-content/30 tracking-wider">
        <span>amusic Desktop</span>
        <span>v0.1.0</span>
      </div>
    </aside>

    <main class="flex-1 min-h-0 overflow-auto bg-base-100 relative">
      <StudioView v-if="page === 'studio'" :pending-favorite="pendingFavorite" @open-settings="page = 'settings'" />
      <FavoritesView v-else-if="page === 'favorites'" @apply="applyFavorite" />
      <SettingsView v-else />
    </main>
  </div>
</template>
