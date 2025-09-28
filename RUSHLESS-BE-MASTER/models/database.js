require("dotenv").config();

const mysql = require("mysql2/promise");

const DB_NAME = process.env.DB_NAME;

const serverPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDatabase() {
  try {
    await serverPool.query(`CREATE DATABASE IF NOT EXISTS 
${DB_NAME}
`);
    console.log("✅ Database dicek/dibuat");

    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // ... (other table creations remain the same) ...

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'siswa', 'guru') DEFAULT 'siswa',
        kelas VARCHAR(50),
        login_locked BOOLEAN DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_status (
        user_id INT(11) NOT NULL,
        status ENUM('online', 'offline') NOT NULL,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subfolders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        position INT NOT NULL DEFAULT 0,
        hidden BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        pengajar_id VARCHAR(100) NOT NULL,
        pengajar VARCHAR(100) NOT NULL,
        kelas TEXT NOT NULL,
        tanggal_mulai VARCHAR(100) NOT NULL,
        tanggal_selesai VARCHAR(100) DEFAULT NULL,
        waktu INT DEFAULT NULL,
        deskripsi TEXT,
    
        maxPercobaan INT DEFAULT 1,
        tampilkanHasil BOOLEAN DEFAULT FALSE,
        useToken BOOLEAN DEFAULT FALSE,
        tokenValue VARCHAR(6),
        tokenCreatedAt DATETIME,
    
        acakSoal BOOLEAN DEFAULT FALSE,
        acakJawaban BOOLEAN DEFAULT FALSE,
        minWaktuSubmit INT DEFAULT 0,
    
        logPengerjaan BOOLEAN DEFAULT FALSE,
        analisisJawaban BOOLEAN DEFAULT FALSE,
    
        subfolder_id INT DEFAULT NULL,
        hidden BOOLEAN DEFAULT FALSE,
    
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subfolder_id)
          REFERENCES subfolders(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `);

    // Migration for adding use_secure_app to courses
    const [courseColumns] = await pool.query(
      `
      SELECT * 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'courses' 
      AND COLUMN_NAME = 'use_secure_app'
    `,
      [DB_NAME]
    );

    if (courseColumns.length === 0) {
      await pool.query(`
        ALTER TABLE courses
        ADD COLUMN use_secure_app BOOLEAN DEFAULT FALSE
      `);
      console.log(
        "✅ Migrasi berhasil: Kolom 'use_secure_app' ditambahkan ke tabel 'courses'."
      );
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_work_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100),
        course_id INT,
        soal_id INT,
        jawaban VARCHAR(255),
        attemp INT DEFAULT 1,
        waktu INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kelas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_kelas VARCHAR(100) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jawaban_siswa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        soal_id INT NOT NULL,
        jawaban TEXT,
        attemp INT NOT NULL,
        flag INT DEFAULT 0,
        durasi_pengerjaan INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_jawaban (user_id, course_id, soal_id, attemp)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        soal LONGTEXT NOT NULL,
        opsi LONGTEXT NOT NULL,
        jawaban VARCHAR(255),
        tipe_soal VARCHAR(20) DEFAULT 'pilihan_ganda',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokenAuth (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        user_id INT NOT NULL,
        UNIQUE KEY unique_auth (course_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jawaban_trail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        course_id INT,
        soal_id INT,
        jawaban TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        attemp INT DEFAULT 1,
        UNIQUE KEY (user_id, course_id, soal_id, attemp)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS answertrail_timer (
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        waktu_tersisa INT DEFAULT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        total_penambahan_waktu INT DEFAULT 0,
        PRIMARY KEY (user_id, course_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS guru_kelas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guru_id INT NOT NULL,
        kelas VARCHAR(50) NOT NULL,
        UNIQUE KEY (guru_id, kelas)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judul VARCHAR(255),
        logo VARCHAR(255),
        app_mode VARCHAR(50) DEFAULT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        deskripsi TEXT,
        max_pengaksesan INT DEFAULT 1,
        analisis_penyelesaian BOOLEAN DEFAULT FALSE,
        tanggal_mulai VARCHAR(100),
        tanggal_selesai VARCHAR(100),
        waktu INT,
        orrder INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lesson_completion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE KEY (user_id, lesson_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS status_ujian (
        user_id INT,
        course_id INT,
        status VARCHAR(30) DEFAULT 'belum_mengerjakan',
        start_time DATETIME DEFAULT NULL,
        end_time DATETIME DEFAULT NULL,
        PRIMARY KEY (user_id, course_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        web_ip VARCHAR(100) NOT NULL DEFAULT 'localhost',
        web_port INT NOT NULL DEFAULT 3000,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS template_question (
          id INT NOT NULL AUTO_INCREMENT,
          user_id INT NOT NULL,
          course_id INT NOT NULL,
          template LONGTEXT NOT NULL,
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
      ) COMMENT='Tabel penyimpanan urutan soal per user';
    `);

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = 'admin'"
    );
    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO users (username, password, role, name)
        VALUES ('admin', SHA2('admin', 256), 'admin', 'Administrator')
      `);
      console.log("✅ User admin default dibuat");
    } else {
      console.log("ℹ️ User admin sudah ada");
    }

    return pool;
  } catch (err) {
    console.error("❌ Gagal inisialisasi database:", err.message);
    process.exit(1);
  }
}

module.exports = (async () => await initDatabase())();
