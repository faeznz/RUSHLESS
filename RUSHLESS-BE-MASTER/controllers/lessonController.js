const dbPromise = require('../models/database');

exports.createLesson = async (req, res) => {
    const {
        course_id, title, content, deskripsi, max_pengaksesan,
        analisis_penyelesaian, tanggal_mulai, tanggal_selesai, waktu
    } = req.body;

    if (!course_id || !title) {
        return res.status(400).json({ message: 'Course ID dan judul wajib diisi.' });
    }

    try {
        const db = await dbPromise;
        const [maxOrderRow] = await db.query('SELECT MAX(orrder) as max_order FROM lessons WHERE course_id = ?', [course_id]);
        const newOrder = (maxOrderRow[0].max_order === null ? -1 : maxOrderRow[0].max_order) + 1;

        const [result] = await db.query(
            'INSERT INTO lessons (course_id, title, content, deskripsi, max_pengaksesan, analisis_penyelesaian, tanggal_mulai, tanggal_selesai, waktu, orrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [course_id, title, content, deskripsi, max_pengaksesan, analisis_penyelesaian, tanggal_mulai, tanggal_selesai, waktu, newOrder]
        );

        res.status(201).json({ message: 'Materi berhasil dibuat', lessonId: result.insertId });
    } catch (err) {
        console.error('❌ Gagal membuat materi:', err);
        res.status(500).json({ message: 'Gagal membuat materi', error: err.message });
    }
};

exports.getLessonsByCourse = async (req, res) => {
    const { courseId } = req.params;
    try {
        const db = await dbPromise;
        const [lessons] = await db.query('SELECT * FROM lessons WHERE course_id = ? ORDER BY orrder ASC', [courseId]);
        res.json(lessons);
    } catch (err) {
        console.error('❌ Gagal mengambil materi:', err);
        res.status(500).json({ message: 'Gagal mengambil data materi', error: err.message });
    }
};

exports.getLesson = async (req, res) => {
    const { lessonId } = req.params;
    try {
        const db = await dbPromise;
        const [lesson] = await db.query('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (lesson.length === 0) {
            return res.status(404).json({ message: 'Materi tidak ditemukan' });
        }
        res.json(lesson[0]);
    } catch (err) {
        console.error('❌ Gagal mengambil materi:', err);
        res.status(500).json({ message: 'Gagal mengambil data materi', error: err.message });
    }
};

exports.updateLesson = async (req, res) => {
    const { lessonId } = req.params;
    const {
        title, content, deskripsi, max_pengaksesan,
        analisis_penyelesaian, tanggal_mulai, tanggal_selesai, waktu
    } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Judul wajib diisi.' });
    }

    try {
        const db = await dbPromise;
        await db.query(
            'UPDATE lessons SET title = ?, content = ?, deskripsi = ?, max_pengaksesan = ?, analisis_penyelesaian = ?, tanggal_mulai = ?, tanggal_selesai = ?, waktu = ? WHERE id = ?',
            [title, content, deskripsi, max_pengaksesan, analisis_penyelesaian, tanggal_mulai, tanggal_selesai, waktu, lessonId]
        );
        res.json({ message: 'Materi berhasil diperbarui' });
    } catch (err) {
        console.error('❌ Gagal memperbarui materi:', err);
        res.status(500).json({ message: 'Gagal memperbarui materi', error: err.message });
    }
};

exports.deleteLesson = async (req, res) => {
    const { lessonId } = req.params;
    try {
        const db = await dbPromise;
        await db.query('DELETE FROM lessons WHERE id = ?', [lessonId]);
        res.json({ message: 'Materi berhasil dihapus' });
    } catch (err) {
        console.error('❌ Gagal menghapus materi:', err);
        res.status(500).json({ message: 'Gagal menghapus materi', error: err.message });
    }
};

exports.reorderLessons = async (req, res) => {
    const { course_id, orderedIds } = req.body;
    if (!course_id || !Array.isArray(orderedIds)) {
        return res.status(400).json({ message: 'Course ID dan array orderedIds wajib diisi.' });
    }

    let connection;
    try {
        const db = await dbPromise;
        connection = await db.getConnection();
        await connection.beginTransaction();

        const updatePromises = orderedIds.map((lessonId, index) => {
            return connection.query('UPDATE lessons SET orrder = ? WHERE id = ? AND course_id = ?', [index, lessonId, course_id]);
        });
        
        await Promise.all(updatePromises);

        await connection.commit();
        res.json({ message: 'Urutan materi berhasil diperbarui.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('❌ Gagal mengurutkan materi:', err);
        res.status(500).json({ message: 'Gagal mengurutkan materi', error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.markLessonAsCompleted = async (req, res) => {
    const { lessonId } = req.params;
    const userId = req.user.id; // Asumsi dari middleware otentikasi

    try {
        const db = await dbPromise;
        await db.query('INSERT IGNORE INTO lesson_completion (user_id, lesson_id) VALUES (?, ?)', [userId, lessonId]);
        res.status(200).json({ message: 'Materi ditandai sebagai selesai.' });
    } catch (err) {
        console.error('❌ Gagal menandai materi selesai:', err);
        res.status(500).json({ message: 'Gagal menandai materi selesai', error: err.message });
    }
};

exports.getCompletionStatusForCourse = async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id; // Asumsi dari middleware otentikasi

    try {
        const db = await dbPromise;
        const [rows] = await db.query('SELECT lesson_id FROM lesson_completion WHERE user_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)', [userId, courseId]);
        const completedLessons = rows.map(row => row.lesson_id);
        res.json(completedLessons);
    } catch (err) {
        console.error('❌ Gagal mengambil status penyelesaian:', err);
        res.status(500).json({ message: 'Gagal mengambil status penyelesaian', error: err.message });
    }
};