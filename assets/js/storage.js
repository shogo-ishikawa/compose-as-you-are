const PREFIX = "caya:v1.0.0";

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

function remove(key) {
  try {
    window.localStorage.removeItem(`${PREFIX}:${key}`);
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

  getCurrentActivity(lessonId) {
    return read(`current-activity:${lessonId}`, "example");
  },

  setCurrentActivity(lessonId, activityId) {
    return write(`current-activity:${lessonId}`, activityId);
  },

  getCode(lessonId, activityId = "example") {
    return read(`code:${lessonId}:${activityId}`, null);
  },

  setCode(lessonId, activityId, code) {
    return write(`code:${lessonId}:${activityId}`, code);
  },

  removeCode(lessonId, activityId = "example") {
    return remove(`code:${lessonId}:${activityId}`);
  },

  getCompletedActivities() {
    const items = read("completed-activities", []);
    return new Set(Array.isArray(items) ? items : []);
  },

  setCompletedActivities(set) {
    return write("completed-activities", [...set]);
  },

  getSettings() {
    return read("settings", { volume: 62, loop: false });
  },

  setSettings(settings) {
    return write("settings", settings);
  },

  getStudioProject() {
    return read("studio-project", null);
  },

  setStudioProject(project) {
    return write("studio-project", project);
  },

  getStudioCode() {
    return read("studio-code", null);
  },

  setStudioCode(code) {
    return write("studio-code", code);
  },
};
