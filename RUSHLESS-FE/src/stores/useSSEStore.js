import { create } from "zustand";
import useExamStore from "./useExamStore";

const SSE_API_URL =
  process.env.REACT_APP_API_EXAM_BASE_URL || "http://localhost:4040/api/v1";

const useSSEStore = create((set, get) => ({
  /* state SSE */
  pesertaOnline: new Map(),
  connPenguji: "closed", // closed | connecting | open | error

  /* actions umum */
  setConnPenguji: (st) => set({ connPenguji: st }),

  upsertPeserta: (data) =>
    set((s) => {
      const next = new Map(s.pesertaOnline);
      next.set(data.id, { ...data, lastUpdate: Date.now() });
      return { pesertaOnline: next };
    }),

  removePeserta: (id) =>
    set((s) => {
      const next = new Map(s.pesertaOnline);
      next.delete(id);
      return { pesertaOnline: next };
    }),

  /* SSE peserta */
  connectPesertaSSE: (courseId, userId) => {
    const url = `${SSE_API_URL}/stream/peserta?courseId=${courseId}&userId=${userId}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.type === "sync" && p.data) {
          const { sisaWaktu, jawaban } = p.data;
          const mapped = {};
          if (Array.isArray(jawaban)) {
            jawaban.forEach((j) => {
              const soalId = String(j.soal_id);

              let idx = null;
              if (j.jawaban) {
                const letter = String(j.jawaban).trim().toUpperCase();
                idx = letter.charCodeAt(0) - 65; // 0=A,1=B,...
              }

              mapped[soalId] = {
                jawaban: idx, // tetap angka
                flag: j.flag === true, // tambahin flag
                attemp: j.attemp ?? 1, // kalau mau simpan attempt juga
              };
            });
          }
          useExamStore.setState({
            jawabanSiswa: mapped,
            sisaWaktu: sisaWaktu ?? useExamStore.getState().sisaWaktu,
          });
          if (sisaWaktu !== undefined && sisaWaktu <= 0) es.close();
        }
      } catch (err) {
        console.error("❌ Gagal parse SSE peserta:", err);
      }
    };

    es.onerror = (err) => console.error("❌ SSE peserta error:", err);
    return es;
  },

  /* SSE penguji */
  connectPengujiSSE: (courseId) => {
    const url = `${SSE_API_URL}/stream/penguji?courseId=${courseId}`;
    const es = new EventSource(url);

    set({ connPenguji: "connecting" });

    es.onopen = () => set({ connPenguji: "open" });
    es.onerror = () => set({ connPenguji: "error" });

    es.onmessage = (e) => {
      try {
        // SSE backend mengirim array JSON peserta
        const payload = JSON.parse(e.data); // ex: [{"userId":"1","username":"Admin","status":"mengerjakan"}]
        const next = new Map();

        if (Array.isArray(payload) && payload.length > 0) {
          payload.forEach((p) => {
            next.set(p.userId, {
              id: p.userId,
              name: p.name,
              username: p.username,
              status: p.status,
              kelas: p.kelas,
              start_time: p.start_time,
              end_time: p.end_time,
              lastUpdate: Date.now(),
            });
          });
        }

        // jika array kosong, otomatis Map kosong → "Belum ada siswa online"
        set({ pesertaOnline: next });
      } catch (err) {
        console.error("❌ Gagal parse SSE penguji:", err);
      }
    };

    return () => {
      es.close();
      set({ connPenguji: "closed" });
    };
  },
}));

export default useSSEStore;
