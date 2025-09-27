import React, { useState, useEffect, useCallback, useRef } from "react";
import { renderAsync } from "docx-preview";
import { toast } from "../utils/toast";
import api from "../api";

const LoadingOverlay = () => (
  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-10">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-400"></div>
    <p className="text-white text-lg mt-4 font-semibold">Menganalisis Dokumen...</p>
  </div>
);

function ParsingModal({ isOpen, onClose, file, onSave }) {
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState({
    soal: "",
    opsi: [],
    jawaban: "",
  });
  const [selectionMode, setSelectionMode] = useState("soal");
  const [editingIndex, setEditingIndex] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const contentRef = useRef(null);

  const processFile = useCallback(async () => {
    if (!file || !contentRef.current) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await renderAsync(event.target.result, contentRef.current, null, {
          className: "docx",
          inWrapper: false,
        });
      } catch (error) {
        console.error("Error rendering docx", error);
        toast.error("Gagal membaca file docx.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  useEffect(() => {
    if (isOpen) {
      processFile();
      const savedSelections = localStorage.getItem(`selections_${file?.name}`);
      if (savedSelections) {
        setSelections(JSON.parse(savedSelections));
      }
    } else {
      setSelections([]);
      setCurrentSelection({ soal: "", opsi: [], jawaban: "" });
      setSelectionMode("soal");
      setEditingIndex(null);
      if (contentRef.current) contentRef.current.innerHTML = "";
    }
  }, [isOpen, processFile, file]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(
        `selections_${file?.name}`,
        JSON.stringify(selections)
      );
    }
  }, [selections, isOpen, file]);

  const handleAutoParse = async () => {
    if (!file) {
      toast.warn("Tidak ada file yang dipilih.");
      return;
    }
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      // Panggil endpoint backend yang baru untuk zip
      const response = await api.post("/upload/parse-zip", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const structuredQuestions = response.data;

      if (structuredQuestions && structuredQuestions.length > 0) {
        setSelections(structuredQuestions);
        toast.success(`${structuredQuestions.length} soal berhasil diparsing dari dokumen!`);
      } else {
        toast.warn("Tidak ada soal yang ditemukan dalam dokumen dengan format yang benar.");
      }
    } catch (err) {
      console.error("Docx parse error:", err);
      const errorMessage =
        err.response?.data?.message || "Gagal memproses file di server.";
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const markTextAsParsed = (textToMark) => {
    if (contentRef.current && textToMark) {
      const content = contentRef.current.innerHTML;
      const newContent = content.replace(
        textToMark,
        () => `<span class="bg-green-200">${textToMark}</span>`
      );
      if (content !== newContent) {
        contentRef.current.innerHTML = newContent;
      }
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount > 0) return;

    const range = selection.getRangeAt(0);
    if (
      range.startContainer.parentElement.closest(".bg-green-200") ||
      range.endContainer.parentElement.closest(".bg-green-200")
    ) {
      toast.warn("Teks ini sudah diparsing.");
      selection.removeAllRanges();
      return;
    }

    const selectedText = range.toString().trim();
    if (selectedText) {
      const tempDiv = document.createElement("div");
      tempDiv.appendChild(range.cloneContents());
      const selectedHtml = tempDiv.innerHTML;

      switch (selectionMode) {
        case "soal":
          setCurrentSelection((prev) => ({ ...prev, soal: selectedHtml }));
          toast.success(`Soal ditandai`);
          setSelectionMode("opsi");
          break;
        case "opsi":
          setCurrentSelection((prev) => ({
            ...prev,
            opsi: [...prev.opsi, selectedHtml],
          }));
          toast.info(`Opsi ditandai`);
          break;
        case "jawaban":
          if (selectedText.length > 1)
            toast.warn("Jawaban sebaiknya hanya satu huruf.");
          setCurrentSelection((prev) => ({
            ...prev,
            jawaban: selectedText.charAt(0).toUpperCase(),
          }));
          toast.success(`Jawaban ditandai`);
          break;
        default:
          break;
      }
    }
  };

  const addOrUpdateSoal = () => {
    if (
      !currentSelection.soal ||
      currentSelection.opsi.length === 0 ||
      !currentSelection.jawaban
    ) {
      toast.error("Soal, Opsi, dan Jawaban harus lengkap.");
      return;
    }

    const newSelections = [...selections];
    if (editingIndex !== null) {
      newSelections[editingIndex] = currentSelection;
      toast.success("Soal berhasil diperbarui!");
    } else {
      newSelections.push(currentSelection);
      toast.success("Soal berhasil ditambahkan!");
    }

    markTextAsParsed(currentSelection.soal);
    currentSelection.opsi.forEach((opsi) => markTextAsParsed(opsi));

    setSelections(newSelections);
    setCurrentSelection({ soal: "", opsi: [], jawaban: "" });
    setSelectionMode("soal");
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setCurrentSelection(selections[index]);
    setSelectionMode("soal");
  };

  const handleDelete = (index) => {
    if (window.confirm("Yakin ingin menghapus soal ini?")) {
      setSelections(selections.filter((_, i) => i !== index));
      toast.info("Soal dihapus.");
    }
  };

  const resetCurrentSoal = () => {
    setCurrentSelection({ soal: "", opsi: [], jawaban: "" });
    setSelectionMode("soal");
    if (editingIndex !== null) setEditingIndex(null);
    toast.info("Soal saat ini direset.");
  };

  const handleSave = () => {
    if (selections.length === 0)
      return toast.error("Tidak ada soal untuk disimpan.");
    onSave(selections);
    localStorage.removeItem(`selections_${file?.name}`);
    onClose();
  };

  if (!isOpen) return null;

  const getModeButtonClass = (mode) =>
    selectionMode === mode
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col relative">
        {isParsing && <LoadingOverlay />}
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Parse Soal Interaktif
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
          >
            &times;
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div
            className="w-1/2 p-6 overflow-y-auto border-r"
            onMouseUp={handleMouseUp}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">Konten Dokumen:</h3>
              <button
                onClick={handleAutoParse}
                disabled={isParsing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-semibold disabled:bg-purple-300 flex items-center gap-2"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Parse Dokumen
              </button>
            </div>
            <div
              ref={contentRef}
              className="prose max-w-none docx-preview-container"
            />
          </div>

          <div className="w-1/2 p-6 flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
              <h3 className="font-semibold mb-4 text-gray-700">
                Kontrol Seleksi Manual:
              </h3>
              <div className="flex gap-2 mb-4 p-3 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setSelectionMode("soal")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass(
                    "soal"
                  )}`}
                >
                  1. Tandai Soal
                </button>
                <button
                  onClick={() => setSelectionMode("opsi")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass(
                    "opsi"
                  )}`}
                >
                  2. Tandai Opsi
                </button>
                <button
                  onClick={() => setSelectionMode("jawaban")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass(
                    "jawaban"
                  )}`}
                >
                  3. Tandai Jawaban
                </button>
              </div>

              <div className="mb-4 p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-2">
                  {editingIndex !== null
                    ? `Mengedit Soal #${editingIndex + 1}`
                    : "Soal Saat Ini:"}
                </h4>
                <div className="bg-gray-50 p-2 rounded text-xs mb-1">
                  <strong>Soal:</strong>{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currentSelection.soal || "...",
                    }}
                  />
                </div>
                <div className="bg-gray-50 p-2 rounded text-xs mb-1">
                  <strong>Opsi:</strong>{" "}
                  <ul>
                    {currentSelection.opsi.map((o, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: o }} />
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <strong>Jawaban:</strong> {currentSelection.jawaban || "..."}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={addOrUpdateSoal}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    {editingIndex !== null ? "Update Soal" : "Tambah Soal"}
                  </button>
                  <button
                    onClick={resetCurrentSoal}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h3 className="font-semibold mb-2 text-gray-700">
                Daftar Soal ({selections.length}):
              </h3>
              <div className="space-y-2">
                {selections.map((s, index) => (
                  <div
                    key={index}
                    className={`border p-2 rounded text-xs flex justify-between items-start ${ 
                      editingIndex === index ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <div>
                      <p>
                        <strong>{index + 1}. </strong>{" "}
                        <span
                          dangerouslySetInnerHTML={{ __html: s.soal.replace(/\n/g, '<br/>') }}
                        />
                      </p>
                      <ul className="pl-4 list-disc list-inside">
                        {s.opsi.map((opt, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: opt.replace(/\n/g, '<br/>') }} />
                        ))}
                      </ul>
                      <p className="pl-4">
                        <strong>Jawaban:</strong> {s.jawaban}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="p-4 border-t flex justify-end gap-4 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
          >
            Simpan & Terapkan
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ParsingModal;