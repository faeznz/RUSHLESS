import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from '../utils/toast';
import JoditEditor from 'jodit-react';
import { FiPlus, FiTrash2, FiChevronLeft, FiLoader, FiArrowUp, FiArrowDown, FiSave, FiX, FiList } from 'react-icons/fi';

const ManageLessonSkeleton = () => (
  <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen animate-pulse">
    <div className="max-w-7xl mx-auto">
      <div className="h-6 w-48 bg-slate-200 rounded-md mb-4"></div>
      <div className="h-9 w-3/5 bg-slate-300 rounded-md"></div>
      <div className="h-5 w-4/5 bg-slate-200 rounded-md mt-2"></div>
      <div className="flex flex-col md:flex-row gap-8 mt-8">
        <div className="md:w-1/3 bg-white p-6 rounded-lg shadow-sm border">
          <div className="h-7 w-1/2 bg-slate-300 rounded-md mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 w-full bg-slate-200 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
          </div>
        </div>
        <div className="md:w-2/3 bg-white p-6 rounded-lg shadow-sm border">
          <div className="h-8 w-1/3 bg-slate-300 rounded-md mb-6"></div>
          <div className="h-5 w-24 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-12 w-full bg-slate-200 rounded-lg mb-4"></div>
          <div className="h-5 w-24 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-48 w-full bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  </div>
);

const ManageLessonPage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentLesson, setCurrentLesson] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  
  const [form, setForm] = useState({
    nama: "",
    deskripsi: "",
    kelas: [],
    tanggalMulai: "",
    waktuMulai: "",
    enableTanggalSelesai: false,
    tanggalSelesai: "",
    waktuSelesai: "",
    waktuMode: "30",
    waktuCustom: "",
    maxPercobaan: 1,
    tanpaBatasPercobaan: false,
    analisisJawaban: false,
  });
  const [availableClasses, setAvailableClasses] = useState([]);

  

  const editorConfig = useMemo(() => ({
    readonly: false,
    placeholder: 'Tulis konten materi di sini...',
    height: 400,
  }), []);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/kelas');
        setAvailableClasses(res.data);
      } catch (error) {
        console.error("Gagal mengambil data kelas", error);
        toast.error("Gagal memuat data kelas.");
      }
    };
    fetchClasses();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const courseRes = await api.get(`/courses/${courseId}`);
      const c = courseRes.data;
      setCourse(c);
      setForm({
        nama: c.nama || "",
        deskripsi: c.deskripsi || "",
        kelas: Array.isArray(c.kelas) ? c.kelas : [c.kelas],
        tanggalMulai: c.tanggal_mulai?.split("T")[0] || "",
        waktuMulai: c.tanggal_mulai?.split("T")[1]?.slice(0, 5) || "",
        enableTanggalSelesai: !!c.tanggal_selesai,
        tanggalSelesai: c.tanggal_selesai?.split("T")[0] || "",
        waktuSelesai: c.tanggal_selesai?.split("T")[1]?.slice(0, 5) || "",
        waktuMode: [30, 45, 60, 120].includes(c.waktu)
          ? String(c.waktu)
          : c.waktu === null
          ? "unlimited"
          : "custom",
        waktuCustom: ![30, 45, 60, 120].includes(c.waktu) ? c.waktu : "",
        maxPercobaan: parseInt(c.maxPercobaan) || 1,
        tanpaBatasPercobaan: c.maxPercobaan === -1,
        analisisJawaban: Boolean(c.analisisJawaban),
      });

      const lessonsRes = await api.get(`/lessons/course/${courseId}`);
      setLessons(lessonsRes.data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error("Gagal mengambil data lesson", error);
      toast.error("Gagal memuat data. Kembali ke halaman sebelumnya.");
      navigate('/lessons');
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectLesson = (lesson) => {
    setCurrentLesson(lesson);
    setLessonTitle(lesson.title);
    setEditorContent(lesson.content);
  };

  const handleAddNew = () => {
    setCurrentLesson(null);
    setLessonTitle('');
    setEditorContent('');
  };

  const handleSave = async () => {
    if (!lessonTitle) {
      return toast.warn('Judul materi tidak boleh kosong.');
    }
    setIsSaving(true);

    const payload = { 
        course_id: courseId, 
        title: lessonTitle, 
        content: editorContent,
    };
    try {
      if (currentLesson) {
        await api.put(`/lessons/${currentLesson.id}`, payload);
        toast.success('Materi berhasil diperbarui');
      } else {
        await api.post('/lessons', payload);
        toast.success('Materi baru berhasil disimpan');
      }
      await fetchData();
      handleAddNew();
    } catch (error) {
      console.error("Gagal menyimpan materi", error);
      toast.error('Gagal menyimpan materi.');
    } finally {
      setIsSaving(false);
    }
  };

  const promptDelete = (lesson) => {
    setLessonToDelete(lesson);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!lessonToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/lessons/${lessonToDelete.id}`);
      toast.success('Materi berhasil dihapus');
      setLessons(lessons.filter(l => l.id !== lessonToDelete.id));
      if (currentLesson && currentLesson.id === lessonToDelete.id) {
        handleAddNew();
      }
    } catch (error) {
      console.error("Gagal menghapus materi", error);
      toast.error('Gagal menghapus materi.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setLessonToDelete(null);
    }
  };

  const handleSaveOrder = useCallback(async (reorderedLessons) => {
    const orderedIds = reorderedLessons.map(l => l.id);
    try {
      await api.post('/lessons/reorder', { course_id: courseId, orderedIds });
      toast.success('Urutan materi berhasil disimpan.');
    } catch (error) {
      console.error("Gagal menyimpan urutan", error);
      toast.error('Gagal menyimpan urutan materi.');
      fetchData();
    }
  }, [courseId, fetchData]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const waktu =
      form.waktuMode === "custom"
        ? parseInt(form.waktuCustom)
        : form.waktuMode === "unlimited"
        ? null
        : parseInt(form.waktuMode);

    const payload = {
      ...course,
      nama: form.nama,
      deskripsi: form.deskripsi,
      kelas: form.kelas,
      tanggal_mulai: `${form.tanggalMulai}T${form.waktuMulai}`,
      tanggal_selesai: form.enableTanggalSelesai
        ? `${form.tanggalSelesai}T${form.waktuSelesai}`
        : null,
      waktu,
      maxPercobaan: form.tanpaBatasPercobaan ? -1 : parseInt(form.maxPercobaan),
      analisisJawaban: form.analisisJawaban,
    };

    try {
      const res = await api.put(`/courses/${courseId}`, payload);
      setCourse(res.data);
      toast.success("Pengaturan course berhasil diperbarui.");
    } catch (error) {
      console.error("Gagal memperbarui course", error);
      toast.error("Gagal memperbarui pengaturan course.");
    }
  };

  const handleMove = (index, direction) => {
    const newLessons = [...lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLessons.length) return;
    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
    setLessons(newLessons);
    handleSaveOrder(newLessons);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  

  if (loading) {
    return <ManageLessonSkeleton />;
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen font-sans">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/lessons')} className="flex items-center gap-2 text-indigo-600 font-semibold mb-4 hover:underline">
            <FiChevronLeft /> Kembali ke Daftar Lesson
          </button>
          <p className="text-slate-500 mt-1">Ubah pengaturan umum untuk lesson ini, lalu kelola setiap materi di bawah.</p>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-8">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Pengaturan Lesson</h2>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="courseName" className="block text-sm font-medium text-slate-700 mb-1">Nama Lesson</label>
                  <input type="text" id="courseName" name="nama" value={form.nama} onChange={handleChange} className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"/>
                </div>
                <div>
                  <label htmlFor="courseClass" className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableClasses.map(kelas => (
                      <label key={kelas.id} className="flex items-center">
                        <input type="checkbox" checked={form.kelas.includes(kelas.nama)} onChange={e => {
                          const { checked } = e.target;
                          setForm(prev => {
                            const newKelas = checked ? [...prev.kelas, kelas.nama] : prev.kelas.filter(nama => nama !== kelas.nama);
                            return { ...prev, kelas: newKelas };
                          });
                        }} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                        <span className="ml-2 text-sm text-gray-600">{kelas.nama}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="courseDescription" className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea id="courseDescription" name="deskripsi" value={form.deskripsi} onChange={handleChange} rows="3" className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal & Waktu Mulai</label>
                  <div className="flex gap-2">
                    <input type="date" name="tanggalMulai" value={form.tanggalMulai} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    <input type="time" name="waktuMulai" value={form.waktuMulai} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                    <input type="checkbox" name="enableTanggalSelesai" checked={form.enableTanggalSelesai} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                    Tanggal & Waktu Selesai
                  </label>
                  <div className="flex gap-2">
                    <input type="date" name="tanggalSelesai" value={form.tanggalSelesai} onChange={handleChange} disabled={!form.enableTanggalSelesai} className="w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                    <input type="time" name="waktuSelesai" value={form.waktuSelesai} onChange={handleChange} disabled={!form.enableTanggalSelesai} className="w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="waktu-pembelajaran" className="block text-sm font-medium text-gray-600 mb-1">Waktu Pembelajaran</label>
                  <select id="waktu-pembelajaran" name="waktuMode" value={form.waktuMode} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option value="30">30 Menit</option>
                    <option value="45">45 Menit</option>
                    <option value="60">60 Menit</option>
                    <option value="120">120 Menit</option>
                    <option value="custom">Custom</option>
                    <option value="unlimited">Tanpa Batas</option>
                  </select>
                  {form.waktuMode === "custom" && (
                    <input type="number" name="waktuCustom" value={form.waktuCustom} placeholder="Masukkan durasi (menit)" onChange={handleChange} className="w-full mt-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  )}
                </div>
              </div>

              <div className="border-t pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label htmlFor="max-percobaan" className="block text-sm font-medium text-gray-700">
                      Maksimal Percobaan
                    </label>
                    <div className="mt-1 flex items-center gap-4">
                        <input
                            id="max-percobaan"
                            type="number"
                            min="1"
                            value={form.maxPercobaan}
                            onChange={(e) => setForm({ ...form, maxPercobaan: parseInt(e.target.value) })}
                            className="block w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                            disabled={form.tanpaBatasPercobaan}
                        />
                        <label className="flex items-center">
                            <input
                            type="checkbox"
                            checked={form.tanpaBatasPercobaan}
                            onChange={(e) => setForm((prev) => ({ ...prev, tanpaBatasPercobaan: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-800">Tanpa Batas</span>
                        </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-base font-medium text-gray-800">Opsi Tambahan</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.analisisJawaban}
                        onChange={(e) => setForm((prev) => ({ ...prev, analisisJawaban: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-800">Analisis Penyelesaian Lesson</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="submit" className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-col md:flex-row gap-8 mt-8">
            <div className="md:w-1/3 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2"><FiList /> Daftar Materi</h2>
              </div>
               <button onClick={handleAddNew} className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all mb-4">
                  <FiPlus /> Tambah Materi Baru
                </button>
              <ul className="space-y-2">
                {lessons.map((lesson, index) => (
                  <li key={lesson.id} className={`rounded-lg flex justify-between items-center group transition-colors ${currentLesson?.id === lesson.id ? 'bg-indigo-100 ring-2 ring-indigo-300' : 'hover:bg-slate-100'}`}>
                    <span onClick={() => handleSelectLesson(lesson)} className="flex-grow cursor-pointer font-medium p-3 truncate">
                      {index + 1}. {lesson.title}
                    </span>
                    <div className={`flex items-center pr-2 transition-opacity ${currentLesson?.id === lesson.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed"><FiArrowUp size={16} /></button>
                      <button onClick={() => handleMove(index, 'down')} disabled={index === lessons.length - 1} className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed"><FiArrowDown size={16} /></button>
                      <button onClick={() => promptDelete(lesson)} className="text-slate-500 hover:text-red-600 p-1.5 rounded-md hover:bg-red-100 ml-1"><FiTrash2 size={16} /></button>
                    </div>
                  </li>
                ))}
                {lessons.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Belum ada materi. Klik tombol di atas untuk memulai.</p>}
              </ul>
            </div>

            <div className="md:w-2/3 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6 text-slate-800">{currentLesson ? 'Edit Materi' : 'Tambah Materi Baru'}</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="lessonTitle" className="block text-sm font-medium text-slate-700 mb-1">Judul Materi</label>
                  <input type="text" id="lessonTitle" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" placeholder="Contoh: Bab 1 - Pengenalan"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Konten Materi</label>
                  <div className="jodit-container border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                    <JoditEditor value={editorContent} config={editorConfig} onBlur={newContent => setEditorContent(newContent)} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:bg-indigo-300 disabled:cursor-not-allowed">
                  {isSaving ? <FiLoader className="animate-spin"/> : <FiSave />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Materi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Konfirmasi Hapus</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600"><FiX /></button>
            </div>
            <p className="text-slate-600 mb-6">
              Anda yakin ingin menghapus materi <strong className="text-slate-800">"{lessonToDelete?.title}"</strong>? Tindakan ini tidak dapat diurungkan.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="px-4 py-2 rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                Batal
              </button>
              <button onClick={confirmDelete} disabled={isDeleting} className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-red-300">
                {isDeleting && <FiLoader className="animate-spin"/>}
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageLessonPage;