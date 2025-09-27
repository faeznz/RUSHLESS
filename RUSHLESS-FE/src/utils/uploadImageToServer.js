import api from "../api";

export async function uploadImageToServer(file) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await api.post("/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.path;
  } catch (error) {
    console.error("Gagal upload gambar ke server:", error);
    throw error;
  }
}
