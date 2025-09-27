import { create } from 'zustand';

const useUIStore = create((set) => ({
  showStartModal: true,
  showSelesaiModal: false,
  showSidebar: false,
  setShowStartModal: (val) => set({ showStartModal: val }),
  setShowSelesaiModal: (val) => set({ showSelesaiModal: val }),
  setShowSidebar: (val) => set({ showSidebar: val }),
}));

export default useUIStore;