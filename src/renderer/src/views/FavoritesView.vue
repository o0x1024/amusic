<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { FavoriteRecord } from '../../../shared/types'

const emit = defineEmits<{
  apply: [record: FavoriteRecord]
}>()

const favorites = ref<FavoriteRecord[]>([])
const loading = ref(true)

onMounted(async () => {
  await loadFavorites()
})

async function loadFavorites() {
  loading.value = true
  try {
    favorites.value = await window.amusic.invoke('favorites:list')
  } catch {
    favorites.value = []
  } finally {
    loading.value = false
  }
}

async function removeFavorite(id: string) {
  try {
    favorites.value = await window.amusic.invoke('favorites:delete', id)
  } catch {
    /* ignore */
  }
}

function applyFavorite(record: FavoriteRecord) {
  emit('apply', record)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <div class="p-8 animate-fade-in">
    <div class="mb-6 pb-4 border-b border-base-300/60">
      <h2 class="text-2xl font-extrabold tracking-tight">收藏夹</h2>
      <p class="text-sm text-base-content/50 mt-1">保存喜爱的生成结果，一键应用创作参数</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="favorites.length === 0" class="flex flex-col items-center justify-center py-20 text-center text-base-content/50 gap-2">
      <font-awesome-icon icon="bookmark" class="text-3xl text-primary/50" />
      <strong class="text-base-content">还没有收藏</strong>
      <span class="text-sm">在音乐工作台生成结果后，点击「收藏」按钮即可保存到这里。</span>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        v-for="fav in favorites"
        :key="fav.id"
        class="card bg-base-100 shadow-sm border border-base-300/60"
      >
        <div class="card-body p-5">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="min-w-0">
              <h3 class="font-bold text-lg truncate">{{ fav.title }}</h3>
              <p class="text-xs text-base-content/40 mt-0.5">{{ formatTime(fav.createdAt) }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" class="btn btn-primary btn-sm gap-1" @click="applyFavorite(fav)">
                <font-awesome-icon icon="wand-magic-sparkles" class="w-3.5 h-3.5" />
                应用
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-square text-error" title="删除" @click="removeFavorite(fav.id)">
                <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-1 mb-3">
            <span v-for="tag in fav.styleTags" :key="tag" class="badge badge-outline badge-sm">{{ tag }}</span>
            <span class="badge badge-outline badge-sm">{{ fav.params.platform.join(' / ') }}</span>
            <span class="badge badge-outline badge-sm">{{ fav.params.tempo.join(' / ') }}</span>
            <span class="badge badge-outline badge-sm">{{ fav.params.mood.join(' / ') }}</span>
            <span class="badge badge-outline badge-sm">{{ fav.params.vocal.join(' / ') }}</span>
            <span class="badge badge-outline badge-sm">{{ fav.rhyme ? '需要押韵' : '不强制押韵' }}</span>
          </div>

          <div class="rounded-lg bg-base-200/50 p-3 mb-3">
            <p class="text-xs text-base-content/50 mb-1">灵感</p>
            <p class="text-sm text-base-content/70 line-clamp-3">{{ fav.idea }}</p>
          </div>

          <div class="rounded-lg bg-base-200/50 p-3">
            <div class="flex items-center justify-between mb-1">
              <p class="text-xs text-base-content/50">歌词</p>
              <span class="text-xs text-base-content/30">{{ fav.result.lyrics.length }} 字</span>
            </div>
            <pre class="whitespace-pre-wrap break-words text-xs leading-5 font-mono text-base-content/60 line-clamp-6">{{ fav.result.lyrics }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
