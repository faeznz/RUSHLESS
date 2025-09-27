import React, { useState, Fragment } from 'react';
import { FiBookOpen, FiClipboard, FiLayers, FiLoader, FiCheckCircle } from 'react-icons/fi';
import api from '../api';

const SetupPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const modes = [
    {
      key: 'assessment',
      title: 'Ujian / Asesmen',
      description:
        'Fokus pada pembuatan dan pelaksanaan ujian online, lengkap dengan penilaian otomatis.',
      icon: <FiClipboard className="mx-auto h-12 w-12 text-blue-500" />,
      buttonText: 'Pilih Mode Ujian',
      buttonClass: 'bg-blue-500 hover:bg-blue-600 focus-visible:outline-blue-600',
    },
    {
      key: 'lesson',
      title: 'Pembelajaran / Lesson',
      description:
        'Fokus pada pembuatan dan penyajian materi pembelajaran atau kursus online.',
      icon: <FiBookOpen className="mx-auto h-12 w-12 text-green-500" />,
      buttonText: 'Pilih Mode Lesson',
      buttonClass: 'bg-green-500 hover:bg-green-600 focus-visible:outline-green-600',
    },
    {
      key: 'multi',
      title: 'Multi (Keduanya)',
      description:
        'Gabungkan fungsionalitas asesmen dan lesson untuk pengalaman belajar yang lengkap.',
      icon: <FiLayers className="mx-auto h-12 w-12 text-purple-500" />,
      buttonText: 'Pilih Mode Multi',
      buttonClass: 'bg-purple-500 hover:bg-purple-600 focus-visible:outline-purple-600',
    },
  ];

  const handleSelectClick = (modeKey) => {
    setSelectedMode(modeKey);
    setShowModal(true);
    setError('');
    setIsSuccess(false);
  };

  const handleConfirm = async () => {
    if (!selectedMode) return;

    setLoading(true);
    setError('');
    try {
      await api.post('/mode', { mode: selectedMode });

      setIsSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const message = err.response?.data?.message || 'Gagal mengatur mode aplikasi';
      setError(message);
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (loading || isSuccess) return;
    setShowModal(false);
    setTimeout(() => setSelectedMode(null), 300);
  };

  const selectedModeDetails = modes.find((m) => m.key === selectedMode);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-slate-100 font-sans p-4">
        <div className="p-8 sm:p-12 bg-white rounded-xl shadow-2xl max-w-4xl text-center">
          <h1 className="text-4xl font-bold mb-4 text-slate-800">Selamat Datang!</h1>
          <p className="text-slate-600 mb-10 max-w-2xl mx-auto">
            Ini adalah pertama kalinya Anda menjalankan aplikasi. Silakan pilih mode fungsionalitas
            yang ingin Anda gunakan.
            <br />
            <span className="font-semibold text-orange-600">
              Pilihan ini bersifat permanen dan hanya akan muncul sekali.
            </span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {modes.map((mode) => (
              <div
                key={mode.key}
                className="flex flex-col border border-slate-200 p-6 rounded-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex-grow">
                  {mode.icon}
                  <h2 className="text-xl font-semibold my-3 text-slate-700">{mode.title}</h2>
                  <p className="text-sm text-slate-500 mb-6">{mode.description}</p>
                </div>
                <button
                  onClick={() => handleSelectClick(mode.key)}
                  className={`w-full text-white py-2.5 rounded-md font-semibold transition-colors duration-300 disabled:bg-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${mode.buttonClass}`}
                >
                  {mode.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isSuccess ? (
              <Fragment>
                <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h2 className="text-2xl font-bold mt-4 text-slate-800">Berhasil!</h2>
                <p className="text-slate-600 mt-2">
                  Aplikasi telah diatur ke mode{' '}
                  <strong className="capitalize">{selectedMode}</strong>. Halaman akan dimuat ulang.
                </p>
              </Fragment>
            ) : (
              <Fragment>
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Konfirmasi Pilihan</h2>
                <p className="text-slate-600 mb-6">
                  Anda yakin ingin mengatur aplikasi ke mode{' '}
                  <strong className="capitalize">{selectedMode}</strong>? Tindakan ini tidak dapat
                  diubah.
                </p>

                {error && (
                  <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>
                )}

                <div className="flex justify-center gap-4">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="px-6 py-2 rounded-md text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors duration-300 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className={`px-6 py-2 rounded-md text-white font-semibold transition-colors duration-300 flex items-center gap-2 disabled:bg-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${selectedModeDetails?.buttonClass}`}
                  >
                    {loading && <FiLoader className="animate-spin h-5 w-5" />}
                    {loading ? 'Memproses...' : 'Ya, Lanjutkan'}
                  </button>
                </div>
              </Fragment>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SetupPage;
