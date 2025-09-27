const live = {}; 
// key = userId -> { userId, username, courseId, sisaWaktu, jawaban[] }

exports.get = (userId) => {
  return live[userId] || null;
};

exports.getAll = (courseId) => {
  return Object.values(live)
    .filter((p) => p.courseId == courseId)
    .map(({ jawaban, ...rest }) => rest);
};

exports.set = (userId, data) => {
  live[userId] = { ...live[userId], ...data };
};

exports.del = (userId) => {
  delete live[userId];
};
