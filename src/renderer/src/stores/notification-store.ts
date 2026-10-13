import { create } from 'zustand'
import { useFinanceStore } from './finance-store'

export interface Notification {
  id: string
  title: string
  description: string
  type: 'budget' | 'goal' | 'info'
  read: boolean
  createdAt: Date
}

interface NotificationState {
  notifications: Notification[]
  generate: () => void
  markAllRead: () => void
  unreadCount: number
}

let notifCount = 0

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,

  generate: () => {
    const { budgets, goals } = useFinanceStore.getState()
    const now = new Date()
    const fresh: Notification[] = []

    for (const b of budgets) {
      if (b.limit > 0 && b.spent / b.limit >= 0.8) {
        const pct = Math.round((b.spent / b.limit) * 100)
        fresh.push({
          id: `notif-${++notifCount}`,
          title: 'Presupuesto casi al límite',
          description: `${b.category} lleva ${pct}% usado (${pct >= 100 ? 'excedido' : 'cerca del límite'})`,
          type: 'budget',
          read: false,
          createdAt: now
        })
      }
    }

    for (const g of goals) {
      if (g.currentAmount > 0 && g.currentAmount >= g.targetAmount) {
        fresh.push({
          id: `notif-${++notifCount}`,
          title: 'Meta de ahorro cumplida',
          description: `¡Felicidades! Alcanzaste la meta "${g.name}"`,
          type: 'goal',
          read: false,
          createdAt: now
        })
      }
    }

    set({ notifications: fresh, unreadCount: fresh.length })
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    }))
  }
}))
