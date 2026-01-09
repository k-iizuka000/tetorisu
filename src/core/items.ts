import type { EffectType, ItemType } from './types'

export const ITEM_TYPES: ItemType[] = ['bomb', 'shuffle', 'freeze', 'boost']

export const ITEM_LABELS: Record<ItemType, { name: string; description: string }> = {
  bomb: {
    name: 'ボム',
    description: '下の2段をまとめて消去',
  },
  shuffle: {
    name: 'シャッフル',
    description: 'NEXTキューを再配置',
  },
  freeze: {
    name: 'フリーズ',
    description: 'しばらく落下スピードを低下',
  },
  boost: {
    name: 'ブースト',
    description: 'しばらくスコア2倍',
  },
}

export const EFFECT_DURATIONS: Record<EffectType, number> = {
  freeze: 10,
  boost: 12,
}

export const EFFECT_LABELS: Record<EffectType, string> = {
  freeze: 'フリーズ',
  boost: 'スコアブースト',
}
