import { create } from "zustand";
import { fetchMe } from "@entities/session/api/session.api.js";

/**
 * Состояние сессии в памяти вкладки (в браузерное хранилище ничего не пишется).
 * Источник истины — сервер: при старте и после важных операций профиль
 * перезапрашивается через GET /api/auth/me.
 *
 * status: "loading" — идёт первичная проверка; "authenticated"; "anonymous".
 */
export const useSessionStore = create((set) => ({
  status: "loading",
  user: null,

  load: async () => {
    try {
      const user = await fetchMe();
      set({ user, status: "authenticated" });
    } catch {
      set({ user: null, status: "anonymous" });
    }
  },

  setUser: (user) => set({ user, status: "authenticated" }),
  clear: () => set({ user: null, status: "anonymous" }),
}));
