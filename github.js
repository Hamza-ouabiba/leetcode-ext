(() => {
  const API = "https://api.github.com";

  const getSettings = async () => {
    const { githubSettings = {} } = await chrome.storage.local.get("githubSettings");
    return {
      owner: (githubSettings.owner || "").trim(),
      repository: (githubSettings.repository || "").trim(),
      token: (githubSettings.token || "").trim()
    };
  };

  const request = async (settings, endpoint, init = {}) => {
    const response = await fetch(`${API}${endpoint}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${settings.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.headers || {})
      }
    });
    if (!response.ok) {
      let detail = "";
      try { detail = (await response.json()).message || ""; } catch {}
      const error = new Error(detail || `GitHub returned ${response.status} ${response.statusText}.`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  };

  const repoPath = settings => `/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repository)}`;
  const apiErrorMessage = error => {
    if (error.status === 401) return "GitHub rejected the token. Check your settings.";
    if (error.status === 403) return "GitHub denied access or reached its API limit. Check token permissions and try again.";
    if (error.status === 404) return "Repository not found, or the token cannot access it.";
    return error.message || "GitHub request failed.";
  };

  const setSyncStatus = async status => {
    await chrome.storage.local.set({ lastSync: { ...status, updatedAt: new Date().toISOString() } });
  };

  const writeFile = async (settings, folderName, filename, content, message) => {
    const path = `${folderName}/${filename}`;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const endpoint = `${repoPath(settings)}/contents/${encodedPath}`;
    let sha;
    try {
      const current = await request(settings, endpoint);
      sha = current.sha;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      ...(sha ? { sha } : {})
    };
    await request(settings, endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  };

  const recordPush = async payload => {
    const { pushedProblems = [] } = await chrome.storage.local.get("pushedProblems");
    const previous = pushedProblems.find(item => item.folderName === payload.folderName && item.repository === `${payload.owner}/${payload.repository}`);
    const pushedAt = new Date().toISOString();
    const record = {
      title: payload.title,
      folderName: payload.folderName,
      language: payload.language,
      repository: `${payload.owner}/${payload.repository}`,
      solutionFile: payload.solutionFile,
      readmePushed: true,
      pushedAt,
      firstPushedAt: previous?.firstPushedAt || previous?.pushedAt || pushedAt
    };
    const remaining = pushedProblems.filter(item => !(item.folderName === payload.folderName && item.repository === record.repository));
    await chrome.storage.local.set({ pushedProblems: [record, ...remaining].slice(0, 500) });
  };

  const syncProblem = async payload => {
    const settings = await getSettings();
    const retryPayload = { ...payload, owner: settings.owner, repository: settings.repository };
    await chrome.storage.local.set({ pendingPush: retryPayload });
    if (!settings.owner || !settings.repository || !settings.token) {
      const error = new Error("Add your GitHub owner, repository, and token in extension settings first.");
      await setSyncStatus({ status: "error", title: payload.title, folderName: payload.folderName, message: error.message });
      return { ok: false, error: error.message };
    }

    await setSyncStatus({ status: "syncing", title: payload.title, folderName: payload.folderName, message: "Uploading README and solution…" });
    try {
      await writeFile(settings, payload.folderName, "Readme.md", payload.readmeContent, `Document ${payload.title}`);
      await setSyncStatus({ status: "syncing", title: payload.title, folderName: payload.folderName, message: "README uploaded. Uploading solution…" });
      await writeFile(settings, payload.folderName, payload.solutionFile, payload.code, `Solve ${payload.title}`);
      await recordPush({ ...payload, ...settings });
      await chrome.storage.local.remove("pendingPush");
      await setSyncStatus({ status: "success", title: payload.title, folderName: payload.folderName, message: "README and solution uploaded successfully." });
      return { ok: true };
    } catch (error) {
      const message = apiErrorMessage(error);
      await setSyncStatus({ status: "error", title: payload.title, folderName: payload.folderName, message });
      return { ok: false, error: message };
    }
  };

  const listRoot = async settings => {
    const all = [];
    for (let page = 1; ; page += 1) {
      const entries = await request(settings, `${repoPath(settings)}/contents?per_page=100&page=${page}`);
      if (!Array.isArray(entries)) throw new Error("Repository root could not be read.");
      all.push(...entries);
      if (entries.length < 100) return all;
    }
  };

  const languageForExtension = extension => ({
    cpp: "C++", cc: "C++", cxx: "C++", java: "Java", py: "Python", js: "JavaScript", ts: "TypeScript",
    cs: "C#", c: "C", go: "Go", kt: "Kotlin", swift: "Swift", rs: "Rust", rb: "Ruby", php: "PHP",
    dart: "Dart", scala: "Scala", ex: "Elixir", erl: "Erlang", rkt: "Racket"
  }[extension.toLowerCase()] || extension.toUpperCase());

  const getRepoStats = async () => {
    const settings = await getSettings();
    if (!settings.owner || !settings.repository || !settings.token) throw new Error("Set your GitHub connection in extension settings.");

    const [rootEntries, repoInfo] = await Promise.all([
      listRoot(settings),
      request(settings, repoPath(settings))
    ]);
    const folders = rootEntries
      .filter(entry => entry.type === "dir")
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    const folderNames = new Set(folders.map(folder => folder.name));
    const languageCounts = {};
    try {
      const branch = encodeURIComponent(repoInfo.default_branch);
      const branchInfo = await request(settings, `${repoPath(settings)}/branches/${branch}`);
      const treeSha = encodeURIComponent(branchInfo.commit.commit.tree.sha);
      const tree = await request(settings, `${repoPath(settings)}/git/trees/${treeSha}?recursive=1`);
      for (const entry of tree.tree || []) {
        if (entry.type !== "blob") continue;
        const [topFolder, filename] = entry.path.split("/", 2);
        if (!folderNames.has(topFolder) || !/^solution\.[^.]+$/i.test(filename || "")) continue;
        const language = languageForExtension(filename.split(".").pop());
        languageCounts[language] = (languageCounts[language] || 0) + 1;
      }
    } catch (error) {
      console.warn("Could not calculate language totals:", error);
    }

    let latestProblem = null;
    try {
      const commits = await request(settings, `${repoPath(settings)}/commits?per_page=100`);
      for (let offset = 0; offset < commits.length && !latestProblem; offset += 8) {
        const details = await Promise.all(commits.slice(offset, offset + 8).map(commit =>
          request(settings, `${repoPath(settings)}/commits/${commit.sha}`).catch(() => null)
        ));
        for (const detail of details) {
          const changed = (detail?.files || []).map(file => file.filename.split("/")[0]).find(name => folderNames.has(name));
          if (changed) {
            const commit = commits.find(item => item.sha === detail.sha);
            latestProblem = { folderName: changed, date: detail.commit?.author?.date || commit?.commit?.author?.date };
            break;
          }
        }
      }
    } catch (error) {
      console.warn("Could not determine recent problem activity:", error);
    }

    return { owner: settings.owner, repository: settings.repository, folders, languageCounts, latestProblem };
  };

  const testConnection = async settings => {
    if (!settings.owner || !settings.repository || !settings.token) throw new Error("Enter your owner, repository, and token first.");
    const repo = await request(settings, repoPath(settings));
    return repo.full_name;
  };

  window.LeetCodeGitHub = { getSettings, syncProblem, getRepoStats, testConnection, setSyncStatus, apiErrorMessage };
})();
