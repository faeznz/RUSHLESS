import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from 'react';
import MngNavbar from "../components/ManageNavbar";
import api from '../api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import {
  FiUsers,
  FiTarget,
  FiAlertCircle,
  FiTrendingUp,
  FiChevronDown,
  FiSearch,
  FiTrendingDown
} from 'react-icons/fi';

const StatCard = ({ icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`rounded-full p-3 bg-${color}-100 text-${color}-600`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
);

const ProgressBar = ({ value }) => {
    const normalizedValue = Math.max(0, Math.min(100, value));
    let barColor = 'bg-blue-500';
    if (normalizedValue < 40) barColor = 'bg-red-500';
    else if (normalizedValue < 70) barColor = 'bg-yellow-500';
    else barColor = 'bg-green-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`${barColor} h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${normalizedValue}%` }}
        ></div>
      </div>
    );
};

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center gap-4">
      <FiAlertCircle size={24} />
      <div>
        <p className="font-bold">Gagal Memuat Data</p>
        <p>{message}</p>
      </div>
    </div>
);

const formatDurasi = (detik) => {
    if (!detik || isNaN(detik)) return "-";
    const jam = Math.floor(detik / 3600).toString().padStart(2, '0');
    const menit = Math.floor((detik % 3600) / 60).toString().padStart(2, '0');
    const dtk = (detik % 60).toString().padStart(2, '0');
    return jam === "00" ? `${menit}:${dtk}` : `${jam}:${menit}:${dtk}`;
};

const StudentRow = ({ student, courseId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const summary = useMemo(() => {
      if (!student.attempts || student.attempts.length === 0) {
        return { bestScore: 0, totalAttempts: 0, progress: 0 };
      }
      const bestAttempt = student.attempts.reduce((prev, current) => (prev.benar > current.benar) ? prev : current);
      return {
        bestScore: bestAttempt.benar,
        totalAttempts: student.attempts.length,
        progress: (bestAttempt.benar / bestAttempt.total_dikerjakan) * 100
      };
    }, [student.attempts]);

    return (
      <div className="border-b border-gray-200">
        <div
          className="flex flex-col md:flex-row items-start md:items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-full md:w-1/3 font-medium text-gray-800 mb-2 md:mb-0">
            {student.name}
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {summary.totalAttempts} percobaan
            </span>
          </div>
          <div className="w-full md:w-1/6 text-left md:text-center text-gray-600 mb-2 md:mb-0">
              <span className="md:hidden font-semibold mr-2">Skor Terbaik: </span>
              <span className="font-bold text-lg text-gray-800">
                {Math.round(summary.progress)} <span className="text-sm text-gray-500">/ 100</span>
              </span>
              <p className="text-xs text-gray-500">
                ({summary.bestScore} benar dari {student.attempts[0]?.total_dikerjakan || '-'} soal)
              </p>
          </div>
          <div className="w-full md:flex-1 flex items-center gap-4">
              <div className="flex-grow">
                  <ProgressBar value={summary.progress} />
              </div>
              <FiChevronDown
                size={20}
                className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              />
          </div>
        </div>
        {isOpen && (
          <div className="bg-gray-50 px-4 md:px-8 py-4">
            <div className="border-l-2 border-blue-200 pl-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Riwayat Percobaan:</h4>
              {student.attempts
                .sort((a, b) => a.attemp - b.attemp)
                .map(attempt => (
                  <div key={attempt.attemp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                    <div>
                      <span className="font-semibold">Percobaan Ke-{attempt.attemp}</span>
                      <div className="text-xs text-gray-500 flex gap-4 mt-1 flex-wrap">
                        <span>Benar: <span className="text-green-600 font-medium">{attempt.benar}</span></span>
                        <span>Salah: <span className="text-red-600 font-medium">{attempt.salah}</span></span>
                        <span>Durasi: <span className="text-blue-600 font-medium">{formatDurasi(attempt.durasi_pengerjaan)}</span></span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/courses/${courseId}/log/${attempt.user_id}/${attempt.attemp}`);
                      }}
                      className="mt-2 sm:mt-0 px-3 py-1 text-sm text-blue-600 border border-blue-600 hover:bg-blue-50 rounded-md transition-all"
                    >
                      Lihat Log
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/courses/${courseId}/${attempt.user_id}/${attempt.attemp}/hasil`);
                      }}
                      className="mt-2 sm:mt-0 px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all"
                    >
                      Lihat Hasil
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
};

const exportToExcel = (group, selectedAttempts, pointPerQuestion) => {
  const workbook = XLSX.utils.book_new();
  const sheetData = [];

  const sortedAttempts = [...selectedAttempts].sort((a, b) => a - b);

  sortedAttempts.forEach((attemptNumber, index) => {
    // Sub-header for the attempt
    sheetData.push([`Attempt ${attemptNumber}`]);

    const attemptStudents = group.students.filter(s => s.attempts.some(a => a.attemp === attemptNumber));
    const soalCount = attemptStudents[0]?.attempts.find(a => a.attemp === attemptNumber)?.total_dikerjakan || 10;
    const soalHeaders = Array.from({ length: soalCount }, (_, i) => `Soal ${i + 1}`);
    const headers = ['Kelas', 'Nama', 'Skor', ...soalHeaders];
    sheetData.push(headers);

    let totalSkor = 0;
    let studentCount = 0;

    attemptStudents.forEach(student => {
      const attempt = student.attempts.find(a => a.attemp === attemptNumber);
      if (!attempt) return;

      studentCount++;
      const jawaban = attempt.detail_jawaban || [];
      const skor = jawaban.reduce((acc, j) => acc + (j ? pointPerQuestion : 0), 0);
      totalSkor += skor;

      const row = [
        student.kelas,
        student.name,
        skor.toFixed(1),
        ...Array.from({ length: soalCount }, (_, i) => (jawaban[i] ? pointPerQuestion : 0))
      ];
      sheetData.push(row);
    });

    if (studentCount > 0) {
      const avgSkor = totalSkor / studentCount;
      const avgRow = ["", "Rata-rata", avgSkor.toFixed(1), ...Array(soalCount).fill("")];
      sheetData.push(avgRow);
    }

    // Add 2 blank rows if it's not the last attempt
    if (index < sortedAttempts.length - 1) {
      sheetData.push([]);
      sheetData.push([]);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, group.className);
  const fileName = `Analytics_${group.className}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(dataBlob, fileName);
};

const AnalyticsPage = () => {
    const { id: courseId } = useParams();
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState([]);
    const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [showExportModal, setShowExportModal] = useState(false);
    const [kelasToExport, setKelasToExport] = useState("");
    const [maxAttempts, setMaxAttempts] = useState(0);
    const [selectedAttempts, setSelectedAttempts] = useState([]);
        const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
      fetchMaxAttempts(kelasToExport);
      setSelectedAttempts([]); // Reset selected attempts when class changes
    }, [kelasToExport]);

    const fetchMaxAttempts = async (className) => {
      if (!className) {
        setMaxAttempts(0);
        return;
      }
      try {
        const res = await api.get(`/courses/analytics/${courseId}/max-attempts?className=${className}`);
        setMaxAttempts(res.data.maxAttempts || 0);
      } catch (err) {
        console.error("Gagal ambil max attempts:", err);
        setMaxAttempts(0);
      }
    };

    useEffect(() => {
      fetchMaxAttempts(kelasToExport);
      setSelectedAttempts([]); // Reset selected attempts when class changes
    }, [kelasToExport]);

    const handleAttemptCheckboxChange = (attemptNumber) => {
      setSelectedAttempts(prev => 
        prev.includes(attemptNumber) 
          ? prev.filter(a => a !== attemptNumber) 
          : [...prev, attemptNumber]
      );
    };

    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/courses/analytics/${courseId}`);
        setAnalytics(res.data);
        setError(null);
      } catch (err) {
        console.error("❌ Gagal ambil analytics:", err);
        setError(err.message || "Terjadi kesalahan.");
      } finally {
        if (loading) setLoading(false);
      }
    };

    const loadJawabanDetail = async (courseId, userId, attemptNumber) => {
      try {
        const res = await api.get(`/courses/${courseId}/user/${userId}/${attemptNumber}/jawaban-detail`);
        return res.data.detail_jawaban;
      } catch (err) {
        console.error(`❌ Gagal ambil detail jawaban untuk user ${userId}:`, err);
        return [];
      }
    };    

    useEffect(() => {
      setLoading(true);
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 15000);
      return () => clearInterval(interval);
    }, [courseId]);

    const groupedAndSortedData = useMemo(() => {
      if (!analytics || analytics.length === 0) return [];

      const studentsById = analytics.reduce((acc, attempt) => {
        acc[attempt.user_id] = acc[attempt.user_id] || {
          ...attempt,
          attempts: []
        };
        acc[attempt.user_id].attempts.push(attempt);
        return acc;
      }, {});

      let studentList = Object.values(studentsById);

      if (searchTerm) {
        studentList = studentList.filter(student =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (selectedClass) {
        studentList = studentList.filter(student => student.kelas === selectedClass);
      }

      const studentsByClass = studentList.reduce((acc, student) => {
        acc[student.kelas] = acc[student.kelas] || [];
        acc[student.kelas].push(student);
        return acc;
      }, {});

      return Object.keys(studentsByClass)
        .sort()
        .map(className => ({
          className,
          students: studentsByClass[className].sort((a, b) => a.name.localeCompare(b.name))
        }));
    }, [analytics, searchTerm, selectedClass]);

    const summaryStats = useMemo(() => {
      if (analytics.length === 0) {
        return { totalUsers: 0, highestScore: "0.0", lowestScore: "0.0", totalAttempts: 0 };
      }
    
      const totalUsers = Object.keys(
        analytics.reduce((acc, item) => ({ ...acc, [item.user_id]: true }), {})
      ).length;
    
      const totalAttempts = analytics.length;
    
      let totalPersentase = 0;
      let highestPersen = 0;
      let lowestPersen = 100;
    
      analytics.forEach((u) => {
        const total = u.total_dikerjakan || 1;
        const persen = (u.benar / total) * 100;
        totalPersentase += persen;
        if (persen > highestPersen) highestPersen = persen;
        if (persen < lowestPersen) lowestPersen = persen;
      });
    
      const avgScore = (totalAttempts > 0 ? totalPersentase / totalAttempts : 0).toFixed(1);
      const highestScore = highestPersen.toFixed(1);
      const lowestScore = lowestPersen.toFixed(1);
    
      return {
        totalUsers,
        avgScore,
        highestScore,
        lowestScore,
        totalAttempts,
      };
    }, [analytics]);
    
    const uniqueClasses = useMemo(() => {
      if (!analytics || analytics.length === 0) return [];
      const classSet = new Set(analytics.map(item => item.kelas));
      return ["", ...Array.from(classSet).sort()];
    }, [analytics]);

    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Course Analytics</h1>
          </div>
          <MngNavbar />
          <div className="mt-6">
            {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <StatCard icon={<FiUsers size={22} />} title="Total Peserta" value={summaryStats.totalUsers} color="blue" />
                  <StatCard icon={<FiTrendingDown size={22} />} title="NIlai Terendah" value={summaryStats.lowestScore} color="yellow" />
                  <StatCard icon={<FiTrendingUp size={22} />} title="Nilai Tertinggi" value={summaryStats.highestScore} color="green" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">
                      Detail Performa Peserta
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cari nama peserta..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {uniqueClasses.map((kelas, index) => (
                          <option key={index} value={kelas}>
                            {kelas === "" ? "Semua Kelas" : `Kelas: ${kelas}`}
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
                      >
                        Export Excel
                      </button>
                    </div>

                                                            {showExportModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                          <h2 className="text-lg font-semibold mb-4">Pengaturan Ekspor Excel</h2>
                          
                          {/* Class Selector */}
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                          <select
                            value={kelasToExport}
                            onChange={(e) => setKelasToExport(e.target.value)}
                            className="w-full mb-4 p-2 border border-gray-300 rounded"
                          >
                            <option value="">-- Pilih Kelas --</option>
                            {groupedAndSortedData.map(group => (
                              <option key={group.className} value={group.className}>{group.className}</option>
                            ))}
                          </select>

                          {/* Attempts Selector */}
                          {maxAttempts > 0 && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Attempts</label>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border p-3 rounded-md">
                                <div className="col-span-full">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      onChange={() => {
                                        if (selectedAttempts.length === maxAttempts) {
                                          setSelectedAttempts([]);
                                        } else {
                                          setSelectedAttempts(Array.from({ length: maxAttempts }, (_, i) => i + 1));
                                        }
                                      }}
                                      checked={selectedAttempts.length === maxAttempts}
                                      className="rounded"
                                    />
                                    <span className="font-medium">Pilih Semua</span>
                                  </label>
                                </div>
                                {Array.from({ length: maxAttempts }, (_, i) => i + 1).map(attempt => (
                                  <label key={attempt} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      value={attempt} 
                                      checked={selectedAttempts.includes(attempt)}
                                      onChange={() => handleAttemptCheckboxChange(attempt)}
                                      className="rounded"
                                    />
                                    <span>{attempt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex justify-end gap-2 mt-6">
                            <button
                              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                              onClick={() => setShowExportModal(false)}
                            >
                              Batal
                            </button>
                            <button
                              disabled={!kelasToExport || selectedAttempts.length === 0 || isExporting}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                              onClick={async () => {
                                setIsExporting(true);
                                const group = groupedAndSortedData.find(g => g.className === kelasToExport);
                                if (!group) {
                                  setIsExporting(false);
                                  return;
                                }

                                const firstStudentWithAttempts = group.students.find(s => s.attempts.length > 0);
                                const soalCount = firstStudentWithAttempts?.attempts[0]?.total_dikerjakan || 10;
                                const pointPerQuestion = 100 / soalCount;

                                for (const student of group.students) {
                                  for (const attempt of student.attempts) {
                                    if (selectedAttempts.includes(attempt.attemp)) {
                                      // Load detail only if not already loaded
                                      if (!attempt.detail_jawaban) {
                                        const detail = await loadJawabanDetail(courseId, student.user_id, attempt.attemp);
                                        attempt.detail_jawaban = detail;
                                      }
                                    }
                                  }
                                }

                                exportToExcel(group, selectedAttempts, pointPerQuestion);
                                setIsExporting(false);
                                setShowExportModal(false);
                              }}
                            >
                              {isExporting ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Mengekspor...
                                </>
                              ) : 'Ekspor'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    </div>
                  </div>
                  {groupedAndSortedData.length > 0 ? (
                    <div>
                      <div className="hidden md:flex bg-gray-100 text-gray-600 uppercase text-xs font-semibold px-4 py-2">
                        <div className="md:w-1/3">Nama Peserta</div>
                        <div className="md:w-1/6 text-center">Skor Terbaik</div>
                        <div className="flex-1">Progress</div>
                      </div>
                      {groupedAndSortedData.map(classGroup => (
                        <div key={classGroup.className}>
                          <h4 className="bg-gray-200 text-gray-800 font-bold p-3 text-sm">
                            Kelas: {classGroup.className}
                          </h4>
                          {classGroup.students.map(student => (
                            <StudentRow key={student.user_id} student={student} courseId={courseId} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <FiUsers size={40} className="mx-auto mb-2 text-gray-400" />
                      <p className="font-semibold">Tidak Ada Data</p>
                      <p className="text-sm">Tidak ada peserta yang cocok dengan kriteria filter Anda.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
};

export default AnalyticsPage;