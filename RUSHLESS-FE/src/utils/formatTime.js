function formatTimer(detik) {
  if (typeof detik !== "number" || isNaN(detik) || detik < 0) detik = 0;
  const jam = Math.floor(detik / 3600).toString().padStart(2, "0");
  const menit = Math.floor((detik % 3600) / 60).toString().padStart(2, "0");
  const dtk = (detik % 60).toString().padStart(2, "0");
  return `${jam}:${menit}:${dtk}`;
}

function formatDateTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";

  const tahun = date.getFullYear();
  const bulan = (date.getMonth() + 1).toString().padStart(2, "0");
  const hari = date.getDate().toString().padStart(2, "0");
  const jam = date.getHours().toString().padStart(2, "0");
  const menit = date.getMinutes().toString().padStart(2, "0");
  const detik = date.getSeconds().toString().padStart(2, "0");

  return `${tahun}-${bulan}-${hari} ${jam}:${menit}:${detik}`;
}

function formatDateOnly(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";

  const tahun = date.getFullYear();
  const bulan = (date.getMonth() + 1).toString().padStart(2, "0");
  const hari = date.getDate().toString().padStart(2, "0");

  return `${tahun}-${bulan}-${hari}`;
}

function formatTimeOnly(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";

  const jam = date.getHours().toString().padStart(2, "0");
  const menit = date.getMinutes().toString().padStart(2, "0");
  const detik = date.getSeconds().toString().padStart(2, "0");

  return `${jam}:${menit}:${detik}`;
}

export default {
  formatTimer,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
};