const countEl = document.getElementById("count");
const repoEl = document.getElementById("repo");
const itemsEl = document.getElementById("items");
const emptyEl = document.getElementById("empty");
const refreshButton = document.getElementById("refresh");
const retryButton = document.getElementById("retry");

const formatDate = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const renderSync = async () => {
  const { lastSync, pendingPush } = await chrome.storage.local.get(["lastSync", "pendingPush"]);
  const messageEl = document.getElementById("sync-message");
  messageEl.textContent = lastSync
    ? `${lastSync.title || lastSync.folderName || "Upload"}: ${lastSync.message}`
    : "No uploads yet.";
  messageEl.className = `sync-message ${lastSync?.status || ""}`;
  document.getElementById("sync-time").textContent = lastSync?.updatedAt ? formatDate(lastSync.updatedAt) : "";
  retryButton.hidden = !pendingPush;
  retryButton.disabled = lastSync?.status === "syncing";
};

const loadRepository = async () => {
  refreshButton.disabled = true;
  countEl.textContent = "…";
  itemsEl.replaceChildren();
  emptyEl.textContent = "Loading repository contents…";
  emptyEl.hidden = false;
  document.getElementById("languages").textContent = "—";
  document.getElementById("latest").textContent = "—";

  try {
    const stats = await window.LeetCodeGitHub.getRepoStats();
    repoEl.textContent = `github.com/${stats.owner}/${stats.repository}`;
    countEl.textContent = String(stats.folders.length);
    emptyEl.hidden = stats.folders.length > 0;
    if (!stats.folders.length) emptyEl.textContent = "No folders found at the repository root.";

    const languages = Object.entries(stats.languageCounts).sort((a, b) => b[1] - a[1]);
    document.getElementById("languages").textContent = languages.length
      ? languages.slice(0, 3).map(([language, total]) => `${language} ${total}`).join(" · ")
      : "No solution files found";
    document.getElementById("latest").textContent = stats.latestProblem
      ? `${stats.latestProblem.folderName} · ${formatDate(stats.latestProblem.date)}`
      : "No recent problem commit found";

    for (const folder of stats.folders) {
      const li = document.createElement("li");
      const detail = document.createElement("div");
      detail.className = "problem";
      const link = document.createElement("a");
      link.className = "folder-link";
      link.textContent = folder.name;
      link.href = folder.html_url || `https://github.com/${encodeURIComponent(stats.owner)}/${encodeURIComponent(stats.repository)}/tree/HEAD/${folder.name.split("/").map(encodeURIComponent).join("/")}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const meta = document.createElement("span");
      meta.textContent = "Open folder on GitHub ↗";
      detail.append(link, meta);
      li.append(detail);
      itemsEl.append(li);
    }
  } catch (error) {
    countEl.textContent = "—";
    repoEl.textContent = "GitHub connection unavailable";
    emptyEl.textContent = error.message || "Could not load repository contents.";
    emptyEl.hidden = false;
  } finally {
    refreshButton.disabled = false;
  }
};

document.getElementById("settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
refreshButton.addEventListener("click", loadRepository);
retryButton.addEventListener("click", async () => {
  retryButton.disabled = true;
  const { pendingPush } = await chrome.storage.local.get("pendingPush");
  if (pendingPush) await window.LeetCodeGitHub.syncProblem(pendingPush);
  await renderSync();
  await loadRepository();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.lastSync || changes.pendingPush)) renderSync();
});

renderSync();
loadRepository();
