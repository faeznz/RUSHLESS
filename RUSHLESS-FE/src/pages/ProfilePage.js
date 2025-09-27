import { useState, useEffect } from 'react';
import api from '../api';
import { toast } from '../utils/toast';
import Cookies from 'js-cookie';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const PasswordStrengthMeter = ({ password }) => {
  const getStrength = () => {
    let score = 0;
    if (!password) return score;

    // award every unique letter until 5 repetitions
    const letters = {};
    for (let i = 0; i < password.length; i++) {
      letters[password[i]] = (letters[password[i]] || 0) + 1;
      score += 5.0 / letters[password[i]];
    }

    // bonus points for mixing it up
    const variations = {
      digits: /\d/.test(password),
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      nonWords: /\W/.test(password),
    };

    let variationCount = 0;
    for (const check in variations) {
      variationCount += variations[check] ? 1 : 0;
    }
    score += (variationCount - 1) * 10;

    return parseInt(score);
  };

  const strength = getStrength();
  let strengthText = '';
  let color = '';

  if (strength > 80) {
    strengthText = 'Sangat Kuat';
    color = 'bg-green-500';
  } else if (strength > 60) {
    strengthText = 'Kuat';
    color = 'bg-blue-500';
  } else if (strength > 30) {
    strengthText = 'Sedang';
    color = 'bg-yellow-500';
  } else {
    strengthText = 'Lemah';
    color = 'bg-red-500';
  }

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.min(strength, 100)}%` }}></div>
      <p className="text-sm mt-1">{strengthText}</p>
    </div>
  );
};

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = Cookies.get('user_id');
        const res = await api.get(`/users/${userId}`);
        setUser(res.data);
      } catch (error) {
        console.error('Gagal mengambil data pengguna:', error);
        toast.error('Gagal mengambil data pengguna.');
      }
    };
    fetchUser();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok!');
      return;
    }

    try {
      const userId = Cookies.get('user_id');
      await api.put(`/users/${userId}/change-password`, {
        oldPassword,
        newPassword,
      });
      toast.success('Password berhasil diubah!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Gagal mengubah password:', error);
      toast.error(error.response?.data?.message || 'Gagal mengubah password.');
    }
  };

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profil Saya</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Kolom Kiri: Info Pengguna */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-4xl mb-4">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-gray-500">@{user.username}</p>
            </div>
            <hr className="my-6" />
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Role:</span>
                <span className="font-semibold capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Kelas:</span>
                <span className="font-semibold">{user.kelas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Ubah Password */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ubah Password</h2>
            <form onSubmit={handleChangePassword}>
              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1">Password Lama</label>
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                  style={{ top: '24px' }}
                >
                  {showOldPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1">Password Baru</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                  style={{ top: '24px' }}
                >
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </button>
                <PasswordStrengthMeter password={newPassword} />
              </div>
              <div className="mt-6 mb-4 relative">
                <label className="block text-sm font-medium mb-1">Konfirmasi Password Baru</label>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                  style={{ top: '24px' }}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-colors duration-300"
              >
                Ubah Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
