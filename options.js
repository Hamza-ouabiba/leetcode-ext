const ownerInput = document.getElementById("owner");
const repositoryInput = document.getElementById("repository");
const tokenInput = document.getElementById("token");
const statusEl = document.getElementById("status");

const showStatus = (message, error = false) => {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", error);
};

const readForm = async () => {
  const { githubSettings = {} } = await chrome.storage.local.get("githubSettings");
  return {
    owner: ownerInput.value.trim(),
    repository: repositoryInput.value.trim(),
    token: tokenInput.value.trim() || githubSettings.token || ""
  };
};

const saveSettings = async () => {
  const settings = await readForm();
  if (!settings.owner || !settings.repository || !settings.token) {
    showStatus("Enter an owner, repository, and token before saving.", true);
    return false;
  }
  await chrome.storage.local.set({ githubSettings: settings });
  tokenInput.value = "";
  showStatus("Settings saved in this browser.");
  return true;
};

const loadSettings = async () => {
  const { githubSettings = {} } = await chrome.storage.local.get("githubSettings");
  ownerInput.value = githubSettings.owner || "Hamza-ouabiba";
  repositoryInput.value = githubSettings.repository || "LeetCode-v2";
  showStatus(githubSettings.token ? "A token is saved locally. Leave the token field blank to keep it." : "Add a token to connect your repository.");
};

document.getElementById("settings-form").addEventListener("submit", async event => {
  event.preventDefault();
  await saveSettings();
});

document.getElementById("test").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  showStatus("Testing GitHub access…");
  try {
    const name = await window.LeetCodeGitHub.testConnection(await readForm());
    showStatus(`Connected to ${name}. Save settings to use this repository.`);
  } catch (error) {
    showStatus(error.message || "Could not connect to GitHub.", true);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("clear-token").addEventListener("click", async () => {
  const { githubSettings = {} } = await chrome.storage.local.get("githubSettings");
  await chrome.storage.local.set({ githubSettings: { ...githubSettings, token: "" } });
  tokenInput.value = "";
  showStatus("Saved token removed. Add a replacement token to reconnect.");
});

loadSettings();
