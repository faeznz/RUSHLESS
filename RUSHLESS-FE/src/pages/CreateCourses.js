import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { toast } from "../utils/toast";
function CreateCourses() {
  const [user, setUser] = useState(null);
  const [kelasList, setKelasList] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    kelas: [],
    tanggalMulai: "",
    waktuMulai: "",
    tanggalSelesai: "",
    waktuSelesai: "",
    enableTanggalSelesai: false,
    waktuMode: "60",
    waktuCustom: "",
    waktu: "",
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
          navigate("/courses");
          return;
        }
  
        setUser(currentUser);
  
        // Ambil data kelas berdasarkan role
        const role = currentUser.role;
  
        if (role === "guru") {
          const namaGuru = currentUser.name; // atau bisa dari cookie
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
        navigate("/courses");
      }
    };
  
    fetchUserAndKelas();
  }, [nameCookie, navigate]);
  

  const handleChange = (e) => {
    const { name, value, type, checked, selectedOptions } = e.target;

    if (name === "kelas") {
      const selected = Array.from(selectedOptions, (opt) => opt.value);
      setForm((prev) => ({ ...prev, kelas: selected }));
    } else if (name === "enableTanggalSelesai") {
      setForm((prev) => ({ ...prev, enableTanggalSelesai: checked }));
    } else if (name === "waktuMode") {
      setForm((prev) => ({
        ...prev,
        waktuMode: value,
        waktu: value === "custom" ? prev.waktuCustom : value === "unlimited" ? "" : value,
      }));
    } else if (name === "waktuCustom") {
      setForm((prev) => ({
        ...prev,
        waktuCustom: value,
        waktu: value,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const waktu = form.waktuMode === "custom"
      ? parseInt(form.waktuCustom)
      : (form.waktuMode === "unlimited" ? null : parseInt(form.waktuMode));
  
    const payload = {
      nama: form.nama,
      pengajarId: user.id,
      kelas: form.kelas,
      tanggalMulai: `${form.tanggalMulai}T${form.waktuMulai}`,
      tanggalSelesai: form.enableTanggalSelesai
        ? `${form.tanggalSelesai}T${form.waktuSelesai}`
        : null,
      waktu,
      deskripsi: form.deskripsi,
    };
  
    try {
      await api.post("/courses", payload);
      toast.success("✅ Course berhasil dibuat!");
      navigate("/courses");
    } catch (err) {
      console.error("Gagal simpan course:", err);
      toast.error("❌ Gagal menyimpan course");
    }
  };  

  if (!user) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Buat Course / Ujian</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Nama Ujian / Mapel</label>
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
          <label className="block font-medium mb-1">Tanggal & Waktu Mulai</label>
          <div className="flex gap-2">
            <input
              type="date"
              name="tanggalMulai"
              value={form.tanggalMulai}
              onChange={handleChange}
              required
              className="w-1/2 border px-3 py-2 rounded"
            />
            <input
              type="time"
              name="waktuMulai"
              value={form.waktuMulai}
              onChange={handleChange}
              required
              className="w-1/2 border px-3 py-2 rounded"
            />
          </div>
        </div>

        <div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="enableTanggalSelesai"
              checked={form.enableTanggalSelesai}
              onChange={handleChange}
            />
            Tanggal & Waktu Selesai
          </label>
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              name="tanggalSelesai"
              value={form.tanggalSelesai}
              onChange={handleChange}
              disabled={!form.enableTanggalSelesai}
              required={form.enableTanggalSelesai}
              className="w-1/2 border px-3 py-2 rounded disabled:bg-gray-200"
            />
            <input
              type="time"
              name="waktuSelesai"
              value={form.waktuSelesai}
              onChange={handleChange}
              disabled={!form.enableTanggalSelesai}
              required={form.enableTanggalSelesai}
              className="w-1/2 border px-3 py-2 rounded disabled:bg-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Waktu Ujian</label>
          <select
            name="waktuMode"
            value={form.waktuMode}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="30">30 Menit</option>
            <option value="45">45 Menit</option>
            <option value="60">60 Menit</option>
            <option value="120">120 Menit</option>
            <option value="custom">Custom</option>
            <option value="unlimited">Tanpa Batas</option>
          </select>

          {form.waktuMode === "custom" && (
            <input
              type="number"
              name="waktuCustom"
              value={form.waktuCustom}
              placeholder="Masukkan durasi dalam menit"
              onChange={handleChange}
              className="w-full border mt-2 px-3 py-2 rounded"
            />
          )}
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
          Simpan Course
        </button>
      </form>
    </div>
  );
}

export default CreateCourses;
