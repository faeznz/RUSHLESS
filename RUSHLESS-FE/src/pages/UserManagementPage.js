import { useEffect, useState, useMemo } from "react";
import api from "../api";
import UserFormModal from "../components/UserFormModal";
import * as XLSX from "xlsx";
import { FiPlus, FiUpload, FiSearch } from 'react-icons/fi';
import { toast } from "../utils/toast";

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [readOnly, setReadOnly] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, kelasRes] = await Promise.all([
        api.get("/users"),
        api.get("/data/kelas"),
      ]);
      setUsers(usersRes.data);
      setKelas(kelasRes.data);
    } catch (error) {
      console.error("Gagal mengambil data:");
      toast.error("Gagal mengambil data dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (id) => {
    const konfirmasi = window.confirm("Anda yakin ingin menghapus pengguna ini?");
    if (!konfirmasi) return;

    try {
      await api.delete(`/users/${id}`);
      toast.success("Berhasil Menghapus Pengguna")
      fetchData();
    } catch (err) {
      console.error("Gagal menghapus pengguna:", err);
      toast.error("Gagal menghapus pengguna!");
    }
  };

  const handleFormSubmit = () => {
    setShowModal(false);
    fetchData();
  };

  const filteredGroupedUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      const matchName =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase());

      const matchKelas =
        selectedClassFilter === "" || user.kelas === selectedClassFilter;

      return matchName && matchKelas;
    });

    const groups = {};
    filtered.forEach((user) => {
      const key = user.kelas || "Tanpa Kelas";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(user);
    });

    return groups;
  }, [users, searchTerm, selectedClassFilter]);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const header = jsonData[0];
      const rows = jsonData.slice(1);

      if (
        !["Nama", "Username", "Role", "Kelas", "Password"].every((field) =>
          header.includes(field)
        )
      ) {
        toast.error("Format Excel tidak sesuai!");
        return;
      }

      const usersToImport = rows.map((row) => {
        const user = {};
        header.forEach((col, i) => {
          user[col.toLowerCase()] = row[i];
        });
        return {
          name: user.nama,
          username: user.username,
          role: user.role?.toLowerCase(),
          kelas: user.kelas,
          password: user.password,
        };
      });

      try {
        await api.post("/users/import", { users: usersToImport });
        toast.success("Berhasil mengimpor pengguna!");
        fetchData();
      } catch (error) {
        console.error("Gagal import:", error);
        toast.error("Terjadi kesalahan saat import data.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Manajemen Pengguna
        </h1>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <input
          type="text"
          name="x-user-search-arya"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          readOnly={readOnly}
          onFocus={() => setReadOnly(false)}
          placeholder="Cari pengguna..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Kelas</option>
            {kelas.map((k) => (
              <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>
            ))}
          </select>

          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
            className="hidden"
            id="excelInput"
          />
          <label
            htmlFor="excelInput"
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300"
          >
            <FiUpload size={18} />
            Import
          </label>
          <button
            onClick={handleAddUser}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-colors duration-300"
          >
            <FiPlus size={20} />
            Tambah
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">Memuat data...</p>
      ) : (
        <div className="space-y-10">
          {Object.keys(filteredGroupedUsers).map((kelasNama) => {
            const currentUsersInClass = filteredGroupedUsers[kelasNama];
            return (
              <section key={kelasNama}>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                  Kelas: {kelasNama}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                  {currentUsersInClass.map((user) => (
                    <div key={user.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                      <div>
                        <p className="font-bold text-lg text-indigo-700">{user.name}</p>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                        <p className="text-sm text-gray-500 capitalize mt-2">
                          <span className="font-semibold">Role:</span> {user.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-4 border-t pt-3">
                        <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Hapus</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentUsersInClass.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 capitalize">{user.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-medium flex justify-end items-center gap-4">
                            <button onClick={() => handleEditUser(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {showModal && (
        <UserFormModal
          user={selectedUser}
          kelasList={kelas}
          onClose={() => setShowModal(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

export default UserManagementPage;