import { useState, useEffect } from "react";
import api from "../api";
import { toast } from "../utils/toast";

function UserFormModal({ user, kelasList, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "siswa",
    kelas: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        username: user.username || "",
        password: "",
        role: user.role || "siswa",
        kelas: user.kelas || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };

    if (name === "role") {
      if (value === "guru") {
        newForm.kelas = "guru";
      } else if (value === "admin") {
        newForm.kelas = "admin";
      }
    }

    setForm(newForm);
  };

  const handleSubmit = async () => {
    try {
      if (user) {
        await api.put(`/users/${user.id}`, form);
        toast.success("Berhasil memperbarui pengguna");
      } else {
        await api.post("/users", form);
        toast.success("Berhasil menambahkan pengguna");
      }
      onSubmit();
    } catch (error) {
      toast.error("Gagal menyimpan pengguna");
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md p-6 w-full max-w-md shadow-lg">
        <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${user ? "text-green-700" : "text-blue-700"}`}>
          {user ? "🛠️ Edit Pengguna" : "➕ Tambah Pengguna"}
        </h2>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
          <input
            name="name"
            placeholder="Nama lengkap"
            value={form.name}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="admin">Admin</option>
            <option value="guru">Guru</option>
            <option value="siswa">Siswa</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Kelas</label>
          <select
            name="kelas"
            value={form.kelas}
            onChange={handleChange}
            disabled={form.role === 'admin' || form.role === 'guru'}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">- Pilih Kelas -</option>
            {kelasList.map((kls, i) => (
              <option key={i} value={kls.nama_kelas || kls.nama}>
                {kls.nama_kelas || kls.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            name="password"
            type="password"
            placeholder={user ? "(Biarkan kosong jika tidak diubah)" : "Masukkan password"}
            value={form.password}
            onChange={handleChange}
            className={`w-full p-2 border rounded focus:outline-none focus:ring-2 ${
              user ? "focus:ring-green-400" : "focus:ring-blue-400"
            }`}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 rounded text-white hover:opacity-90 ${
              user ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {user ? "Perbarui" : "Tambah"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserFormModal;
