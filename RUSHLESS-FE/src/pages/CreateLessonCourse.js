import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { toast } from "../utils/toast";

function CreateLessonCourse() {
  const [user, setUser] = useState(null);
  const [kelasList, setKelasList] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    kelas: [],
    deskripsi: "",
  });

  const navigate = useNavigate();
  const nameCookie = Cookies.get("name")?.toString();

  useEffect(() => {
    const fetchUserAndKelas = async () => {
      try {
        const userRes = await api.get("/users");
        const currentUser = userRes.data.find((u) => u.name === nameCookie);
  
        if (!currentUser) {
          alert("Unauthorized!");
          navigate("/lessons");
          return;
        }
  
        setUser(currentUser);
  
        const role = currentUser.role;
  
        if (role === "guru") {
          const namaGuru = currentUser.name;
          const kelasRes = await api.get(`/guru-kelas/nama/${encodeURIComponent(namaGuru)}`);
          const filteredKelas = kelasRes.data.map((nama, idx) => ({
            id: idx + 1,
            nama_kelas: nama,
          }));
          setKelasList(filteredKelas);
        } else {
          const kelasRes = await api.get("/data/kelas");
          setKelasList(kelasRes.data);
        }
  
      } catch (err) {
        console.error("Gagal ambil user/kelas:", err);
        navigate("/lessons");
      }
    };
  
    fetchUserAndKelas();
  }, [nameCookie, navigate]);
  

  const handleChange = (e) => {
    const { name, value, type, checked, selectedOptions } = e.target;

    if (name === "kelas") {
      const selected = Array.from(selectedOptions, (opt) => opt.value);
      setForm((prev) => ({ ...prev, kelas: selected }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const payload = {
      nama: form.nama,
      pengajarId: user.id,
      kelas: form.kelas,
      tanggalMulai: new Date().toISOString(), // Set current date/time for simplicity
      tanggalSelesai: null, // No end date for lessons
      waktu: null, // No time limit for lessons
      deskripsi: form.deskripsi,
      // Default values for lesson courses (no exam-specific settings)
      maxPercobaan: 1,
      tampilkanHasil: false,
      useToken: false,
      tokenValue: null,
      acakSoal: false,
      acakJawaban: false,
      minWaktuSubmit: 0,
      logPengerjaan: false,
      analisisJawaban: false,
    };
  
    try {
      await api.post("/courses", payload);
      toast.success("✅ Course Lesson berhasil dibuat!");
      navigate("/lessons");
    } catch (err) {
      console.error("Gagal simpan course lesson:", err);
      toast.error("❌ Gagal menyimpan course lesson");
    }
  };

  if (!user) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Buat Course Lesson Baru</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Nama Lesson</label>
          <input
            type="text"
            name="nama"
            value={form.nama}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
            <label className="block font-medium">Kelas (boleh lebih dari 1)</label>
                <div className="w-full border rounded p-3 mt-1 h-40 overflow-y-auto">
                    {kelasList.map((k) => (
                    <div key={k.id} className="flex items-center mb-2">
                        <input
                        type="checkbox"
                        id={`kelas-${k.id}`}
                        value={k.nama_kelas}
                        checked={form.kelas.includes(k.nama_kelas)}
                        onChange={(e) => {
                            const { checked, value } = e.target;
                            setForm((prev) => {
                            if (checked) {
                                return { ...prev, kelas: [...prev.kelas, value] };
                            }
                            else {
                                return {
                                ...prev,
                                kelas: prev.kelas.filter((item) => item !== value),
                                };
                            }
                            });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor={`kelas-${k.id}`} className="ml-2 block text-sm text-gray-900">
                        {k.nama_kelas}
                        </label>
                    </div>
                    ))}
                </div>
            </div>

        <div>
          <label className="block font-medium">Deskripsi</label>
          <textarea
            name="deskripsi"
            value={form.deskripsi}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Simpan Course Lesson
        </button>
      </form>
    </div>
  );
}

export default CreateLessonCourse;
