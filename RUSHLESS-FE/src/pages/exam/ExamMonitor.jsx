import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import useSSEStore from "../../stores/useSSEStore";
import formatter from "../../utils/formatTime"; // pakai default export

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

    const list = [...pesertaOnline.values()].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow">
                <div>
                    <h1 className="text-2xl font-bold">{courseName}</h1>
                </div>
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-xl font-light">Peserta Ujian</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span
                            className={`inline-block h-2 w-2 rounded-full bg-${statusColor}-500`}
                        />
                        {connPenguji === "open" ? "Terkoneksi" : "Menghubungkan..."}
                    </div>
                </div>

                {list.length === 0 ? (
                    <p className="text-center text-gray-500">Belum ada siswa online</p>
                ) : (
                    <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Name
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Kelas
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Status
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Mulai
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Selesai
                                </th><th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Tanggal
                                </th>
                                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {list.map((s) => (
                                <tr key={s.id}>
                                    <td className="px-4 py-2 text-gray-900">{s.name}</td>
                                    <td className="px-4 py-2 text-gray-900">{s.kelas}</td>
                                    <td
                                        className={`px-4 py-2 ${STATUS_CLASS[s.status] || "text-gray-600"}`}
                                    >
                                        {STATUS_LABEL[s.status] || s.status}
                                    </td>
                                    <td className="px-4 py-2 text-gray-900">
                                        {s.start_time ? formatter.formatTimeOnly(new Date(s.start_time)) : "-"}
                                    </td>
                                    <td className="px-4 py-2 text-gray-900">
                                        {s.end_time ? formatter.formatTimeOnly(new Date(s.end_time)) : "-"}
                                    </td><td className="px-4 py-2 text-gray-900">
                                        {s.start_time ? formatter.formatDateOnly(new Date(s.start_time)) : "-"}
                                    </td>
                                    <td className="px-4 py-2 text-center space-x-2">
                                        <button
                                            disabled={s.status !== "mengerjakan"}
                                            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                                        >
                                            Kick
                                        </button>
                                        <button
                                            disabled={s.status !== "mengerjakan"}
                                            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                                        >
                                            Lock
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
