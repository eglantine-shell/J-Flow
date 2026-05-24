import { create } from 'zustand'

type AppMode = 'todo' | 'decision'

type UiState = {
  selectedDate: string
  mode: AppMode
  setSelectedDate: (date: string) => void
  setMode: (mode: AppMode) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedDate: new Date().toISOString().slice(0, 10),
  mode: 'todo',
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setMode: (mode) => set({ mode }),
}))

