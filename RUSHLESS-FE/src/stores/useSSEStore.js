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

          // Simpan jawaban apa adanya (key A/B/C)
          const answerKey = j.jawaban ? String(j.jawaban).trim().toUpperCase() : null;

          mapped[soalId] = {
            jawaban: answerKey,       // key asli, bukan angka
            flag: j.flag === true,    // optional flag
            attemp: j.attemp ?? 1,    // attempt
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
              isOnline: p.isOnline,
              start_time: p.start_time,
              end_time: p.end_time,
              login_locked: p.login_locked,
              lastUpdate: Date.now(),
            });
          });
        }

        console.log("✅ SSE penguji pesertaOnline:", next);

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
