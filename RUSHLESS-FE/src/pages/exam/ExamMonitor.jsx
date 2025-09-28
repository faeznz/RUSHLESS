// ExamMonitor.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useSSEStore from "../../stores/useSSEStore";
import formatter from "../../utils/formatTime";
import api from "../../api";
import { toast } from "../../utils/toast";

const STATUS_LABEL = {
  inactive: "Belum Mengerjakan",
  masuk_room: "Didalam Room",
  mengerjakan: "Sedang Mengerjakan",
  selesai: "Selesai",
  sudah_mengerjakan: "Selesai",
  left: "Meninggalkan sesi",
};

const STATUS_CLASS = {
  inactive: "text-red-500",
  masuk_room: "text-blue-500",
  mengerjakan: "text-yellow-600",
  selesai: "text-green-500",
  sudah_mengerjakan: "text-green-500",
  left: "text-gray-400",
};

export default function ExamMonitor() {
  const { pesertaOnline, connPenguji, connectPengujiSSE } = useSSEStore();
  const location = useLocation();
  const { courseId, courseName } = location.state || {};

  const [sortBy, setSortBy] = useState("kelas");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    const closeFn = connectPengujiSSE(courseId);
    return closeFn;
  }, [courseId, connectPengujiSSE]);

  const statusColor = {
    closed: "gray",
    connecting: "yellow",
    open: "green",
    error: "red",
  }[connPenguji];

  let list = [...pesertaOnline.values()];

  list.sort((a, b) => {
    let valA, valB;
    if (sortBy === "status") {
      valA = STATUS_LABEL[a.status] || a.status;
      valB = STATUS_LABEL[b.status] || b.status;
    } else {
      valA = a[sortBy] || "";
      valB = b[sortBy] || "";
    }
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortDir === "asc" ? "▲" : "▼";
  };

  const handleKick = async (user) => {
    try {
      await api.post("/exam/logout-user", { user_id: user.id });
      toast.success(`✅ ${user.name} berhasil logout`);
    } catch (err) {
      console.error(err);
      toast.error(`❌ Gagal logout ${user.name}`);
    }
  };
  
  const handleReset = async (user) => {
    try {
      await api.post(`/exam/reset/${user.id}`, { user_id: user.id });
      toast.success(`✅ ${user.name} berhasil reset`);
    } catch (err) {
      console.error(err);
      toast.error(`❌ Gagal reset ${user.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{courseName}</h1>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-light text-gray-600">Peserta Ujian</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className={`inline-block h-3 w-3 rounded-full bg-${statusColor}-500`}
            />
            {connPenguji === "open" ? "Terkoneksi" : "Menghubungkan..."}
          </div>
        </div>

        {list.length === 0 ? (
          <p className="text-center text-gray-500">Belum ada siswa online</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    onClick={() => handleSort("username")}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    Username {renderSortIcon("username")}
                  </th>
                  <th
                    onClick={() => handleSort("name")}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    Nama {renderSortIcon("name")}
                  </th>
                  <th
                    onClick={() => handleSort("kelas")}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    Kelas {renderSortIcon("kelas")}
                  </th>
                  <th
                    onClick={() => handleSort("isOnline")}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    Connection {renderSortIcon("isOnline")}
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
                  >
                    Status {renderSortIcon("status")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Mulai
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Selesai
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-900 font-medium">{s.username}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-900">{s.kelas}</td>
                    <td className="px-4 py-3 text-gray-900">{s.isOnline ? "Online" : "Offline"}</td>
                    <td className={`px-4 py-3 ${STATUS_CLASS[s.status] || "text-gray-600"} font-medium`}>
                      {STATUS_LABEL[s.status] || s.status}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {s.start_time
                        ? formatter.formatTimeOnly(new Date(s.start_time))
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {s.end_time
                        ? formatter.formatTimeOnly(new Date(s.end_time))
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {s.start_time
                        ? formatter.formatDateOnly(new Date(s.start_time))
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleReset(s)}
                          disabled={s.status !== "mengerjakan"}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition
                            ${s.status === "mengerjakan"
                              ? "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => handleKick(s)}
                          disabled={s.status !== "mengerjakan"}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition
                            ${s.status === "mengerjakan"
                              ? "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                          Kick
                        </button>
                        <button
                          disabled={s.status !== "mengerjakan"}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition
                            ${s.status === "mengerjakan"
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                          Lock
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}