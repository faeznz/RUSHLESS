# Rushless Mobile Config API

Express service that exposes a simple endpoint for the mobile app to fetch the `link_web` configuration stored in MongoDB.

## Prasyarat

- Node.js 18+
- MongoDB instance yang bisa diakses

## Cara Menjalankan

1. Salin `env.example` menjadi `.env`, lalu isi nilai yang sesuai.
   ```bash
   cp env.example .env
   ```
2. Instal dependensi (sudah dijalankan sekali, ulangi jika perlu):
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm run dev
   ```

Server akan berjalan di `http://localhost:4000` (atau sesuai variabel `PORT`).

## Endpoint

- `GET /api/config/mobile`
- `POST /api/config/mobile` (body JSON `{ "link_web": "..." }`)

Mengembalikan JSON:

```json
{
  "link_web": "https://contoh.com"
}
```

Jika data belum ada di koleksi MongoDB, endpoint akan mengembalikan status `404`.

## Admin Page

Akses `http://localhost:4000/admin/mobile-config` untuk membuka form sederhana yang bisa membaca dan mengubah nilai `link_web` melalui endpoint di atas.

