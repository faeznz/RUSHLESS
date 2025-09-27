import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userId: null,

      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null, userId: null }),

      setToken: (token) => {
        try {
          const decoded = jwtDecode(token);
          const userId = decoded?.sub || decoded?.id || null;
          console.log(userId)
          set({ userId });
        } catch (err) {
          console.error('Invalid token', err);
          set({ userId: null });
        }
      },

      getUserId: () => get().userId,
    }),
    {
      name: 'auth',
      partialize: (state) => ({
        user: state.user,
        userId: state.userId,
      }),
    }
  )
);

export default useAuthStore;