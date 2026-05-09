(function () {
  const Utils = window.SuperTraining.Utils;

  const IGNORED_PERSON_PROJECTS = [
    {
      name: "程春林",
      projects: ["航空安保", "英语能力"],
      reason: "自动过滤清单：该人员这两个项目过期不用管。"
    },
    {
      name: "宋云龙",
      projects: ["航空安保", "英语能力"],
      reason: "自动过滤清单：该人员这两个项目过期不用管。"
    }
  ];

  const ignoreMap = new Map();
  IGNORED_PERSON_PROJECTS.forEach((item) => {
    const name = Utils.normalizeText(item.name);
    const projects = new Set(item.projects.map((projectName) => Utils.normalizeProjectName(projectName)));
    ignoreMap.set(name, {
      ...item,
      name,
      projects
    });
  });

  function getIgnoreReason(person, projectName) {
    const name = Utils.normalizeText(person && person.name);
    const canonicalProjectName = Utils.normalizeProjectName(projectName);
    if (!name || !canonicalProjectName) return "";

    const item = ignoreMap.get(name);
    if (!item || !item.projects.has(canonicalProjectName)) return "";
    return item.reason;
  }

  function shouldIgnore(person, projectName) {
    return Boolean(getIgnoreReason(person, projectName));
  }

  window.SuperTraining.TrainingIgnoreList = {
    IGNORED_PERSON_PROJECTS,
    shouldIgnore,
    getIgnoreReason
  };
})();
