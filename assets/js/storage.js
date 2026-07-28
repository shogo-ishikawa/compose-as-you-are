const PREFIX = "caya:v0.1.0";

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  getCurrentLesson() {
    return read("current-lesson", null);
  },

  setCurrentLesson(id) {
    return write("current-lesson", id);
  },

  getCode(lessonId) {
    return read(`code:${lessonId}`, null);
  },

  setCode(lessonId, code) {
    return write(`code:${lessonId}`, code);
  },

  removeCode(lessonId) {
    try {
      window.localStorage.removeItem(`${PREFIX}:code:${lessonId}`);
      return true;
    } catch {
      return false;
    }
  },

  getCompletedLessons() {
    const items = read("completed", []);
    return new Set(Array.isArray(items) ? items : []);
  },

  setCompletedLessons(set) {
    return write("completed", [...set]);
  },

  getSettings() {
    return read("settings", {
      volume: 62,
      loop: false,
    });
  },

  setSettings(settings) {
    return write("settings", settings);
  },
};
