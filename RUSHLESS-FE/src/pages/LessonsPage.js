import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import api from "../api";
import { toast } from "../utils/toast";

import {
  FiPlus, FiSearch, FiBook, FiSettings,
  FiTrash2, FiChevronRight, FiAlertCircle, FiLoader, FiClock
} from "react-icons/fi";

function LessonsPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const role = Cookies.get("role");
  const name = Cookies.get("name");
  const userId = Cookies.get("user_id");

  useEffect(() => {
    const fetchLessonCourses = async () => {
      setLoading(true);
      try {
        const isSiswa = role === "siswa";
        let kelasSiswa = null;

        if (isSiswa) {
          const userRes = await api.get(`/users?name=${encodeURIComponent(name)}`);
          kelasSiswa = userRes.data?.kelas;
        }
        
        const url = isSiswa && kelasSiswa ? `/courses?kelas=${kelasSiswa}` : "/courses";
        const res = await api.get(url);
        setCourses(res.data);
      } catch (err) {
        console.error("❌ Gagal ambil data lesson courses:", err);
        toast.error("Gagal memuat daftar lesson.");
      } finally {
        setLoading(false);
      }
    };

    fetchLessonCourses();
  }, [role, name]);

  const handleManageClick = (id) => navigate(`/lessons/${id}/manage`);
  const handleViewClick = (id) => navigate(`/lessons/${id}/view`);

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus lesson ini?")) {
      try {
        await api.delete(`/courses/${id}`);
        setCourses(courses.filter((course) => course.id !== id));
        toast.success("Lesson berhasil dihapus.");
      } catch (err) {
        console.error("Gagal menghapus lesson:", err);
        toast.error("Gagal menghapus lesson.");
      }
    }
  };

  const getLessonStatus = (course) => {
    const now = new Date();
    const mulai = course.tanggal_mulai ? new Date(course.tanggal_mulai) : null;
    const selesai = course.tanggal_selesai ? new Date(course.tanggal_selesai) : null;

    if (selesai && now > selesai) {
      return { text: "Selesai", color: "bg-gray-500", disabled: true };
    }
    if (mulai && now < mulai) {
      return { text: "Segera Hadir", color: "bg-yellow-500", disabled: true };
    }
    return { text: "Berlangsung", color: "bg-green-600", disabled: false };
  };

  const lessonCourses = useMemo(() => {
    // A course is considered a "lesson" if it does not have a specific time limit (waktu).
    return courses.filter(course => !course.waktu || course.waktu === 0);
  }, [courses]);

  const filteredCourses = lessonCourses.filter((course) =>
    course.nama.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <FiLoader className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg text-slate-700">Memuat Lessons...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Materi & Lessons</h1>
            <p className="text-slate-500 mt-1">
              Selamat datang, {name}. Pilih materi untuk mulai belajar.
            </p>
          </div>
          {role !== "siswa" && (
            <button
              onClick={() => navigate("/create-lesson-course")}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105"
            >
              <FiPlus /> Buat Course Lesson Baru
            </button>
          )}
        </header>

        <div className="relative flex-grow mb-8">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama lesson..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-300 pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border">
            <FiAlertCircle className="mx-auto text-5xl text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">Tidak Ada Lesson Ditemukan</h3>
            <p className="text-slate-500 mt-2">Belum ada materi atau lesson yang dibuat untuk kategori ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4 sm:p-6">
            {filteredCourses.map((course) => {
              const status = getLessonStatus(course);
              return (
              <div key={course.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="h-32 bg-indigo-50 flex items-center justify-center relative">
                  <FiBook className="text-4xl text-indigo-300" />
                  <span className={`absolute top-2 right-2 text-xs font-semibold text-white px-2 py-1 rounded-full ${status.color}`}>
                    {status.text}
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-slate-800 mt-1 truncate group-hover:text-indigo-600 transition-colors"> {course.nama} </h3>
                  {course.pengajar && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      Oleh: {course.pengajar}
                    </p>
                  )}
                  <div className="mt-4 flex-grow"> <p className="text-sm text-slate-600 line-clamp-2">{course.deskripsi}</p> </div>
                  <div className="flex items-center text-xs text-slate-500 mt-4">
                    <FiBook className="mr-1.5" />
                    <span>{course.lesson_count} Materi</span>
                    {course.waktu > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <FiClock className="mr-1.5" />
                        <span>{course.waktu} Menit</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-50/70 border-t border-slate-200 mt-auto">
                  {role === "siswa" ? (
                     <button onClick={() => handleViewClick(course.id)} disabled={status.disabled} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-white ${status.disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`} > Lihat Materi <FiChevronRight /> </button>
                  ) : (
                    <div className="flex justify-between items-center gap-2">
                      <button onClick={() => handleManageClick(course.id)} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"> <FiSettings size={14} /> Kelola </button>
                      <button onClick={() => handleDelete(course.id)} className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"> <FiTrash2 size={14} /> Hapus </button>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}

export default LessonsPage;
