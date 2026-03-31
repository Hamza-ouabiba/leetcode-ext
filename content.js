const problem = {};

const getProblemInfo = () => {
  const titleEl = document.querySelector(".text-title-large a");
  const descEl = document.querySelector('[data-track-load="description_content"]');

  return {
    title: titleEl?.innerText?.trim() || "Unknown Title",
    description: descEl?.innerText?.trim() || "No description"
  };
};

const getLanguage = () => {
  const langEl = document.querySelector('.flex.h-full.flex-nowrap.items-center button[aria-haspopup="dialog"]');
  return langEl?.textContent?.trim()?.toLowerCase() || "unknown";
};

const getLanguageSuffix = (language) => {
  const map = {
    "c++": "cpp",
    "java": "java",
    "python3": "py",
    "python": "py",
    "javascript": "js",
    "typescript": "ts",
    "c#": "cs",
    "c": "c",
    "go": "go",
    "kotlin": "kt",
    "swift": "swift",
    "rust": "rs",
    "ruby": "rb",
    "php": "php",
    "dart": "dart",
    "scala": "scala",
    "elixir": "ex",
    "erlang": "erl",
    "racket": "rkt"
  };
  return map[language.toLowerCase()] || "txt";
};

const getCodeBlock = () => {
  const codeBlock = [...document.querySelectorAll("code")]
    .find(code =>
      code.querySelector(".react-syntax-highlighter-line-number") &&
      [...code.classList].some(c => c.startsWith("language-"))
    );

  if (!codeBlock) return null;

  const clone = codeBlock.cloneNode(true);
  clone
    .querySelectorAll(".react-syntax-highlighter-line-number")
    .forEach(el => el.remove());

  return clone.textContent?.trim() || "";
};

const getFolderName = () => {
  const problemInfo = getProblemInfo();
  const match = problemInfo.title?.match(/^(\d+)\.\s+([\w\s-]+)/);
  if (match) {
    const number = match[1];
    const slug = match[2].toLowerCase().replace(/\s+/g, "-");
    return `${number}-${slug}`;
  }

  const urlMatch = window.location.pathname.match(/\/problems\/([\w-]+)\//);
  if (urlMatch) return urlMatch[1];

  return "unknown-problem";
};

const writeReadme = () => {
  if (!problem || !problem.description) return "";

  const title = problem.title || "Problem";
  const description = problem.description;

  return `# ${title} 
  
  ${description}`.trim();
};

const pushToGithub = async (folderName, filename, content, commitMsg, retries = 3) => {
  if (!folderName || !filename || !content) return;

  const path = `${folderName}/${filename}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`;

  try {
    let sha = null;
    const res = await fetch(apiUrl, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
      console.log(`File ${path} exists, will update it`);
    } else if (res.status !== 404) {
      console.error(`GitHub check file failed: ${res.status} ${res.statusText}`);
      if (retries > 0) return pushToGithub(folderName, filename, content, commitMsg, retries - 1);
      return;
    }

    const body = {
      message: commitMsg,
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha || undefined
    };

    const pushRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (pushRes.ok) alert(`✅ Successfully pushed ${path}`);
    else {
      console.error(`❌ GitHub push failed: ${pushRes.status} ${pushRes.statusText}`);
      if (retries > 0) return pushToGithub(folderName, filename, content, commitMsg, retries - 1);
    }
  } catch (err) {
    console.error("GitHub push error:", err);
    if (retries > 0) return pushToGithub(folderName, filename, content, commitMsg, retries - 1);
  }
};

const submitButtonClick = () => {
  const button = document.querySelector('[data-e2e-locator="console-submit-button"]');
  if (!button) return;

  let interval = null;

  button.addEventListener("click", () => {
    if (interval) return;

    interval = setInterval(async () => {
      const resultEl = document.querySelector('[data-e2e-locator="submission-result"]');
      if (resultEl) {
        clearInterval(interval);
        interval = null;

        const problemInfo = getProblemInfo();
        const code = getCodeBlock();
        problem.code = code;
        problem.title = problemInfo.title;
        problem.description = problemInfo.description;

        const folderName = getFolderName();
        const language = getLanguage();
        const filename = `solution.${getLanguageSuffix(language)}`;
        const commitMsg = `Solve ${problem.title}`;
        const readMe = writeReadme();
        const readMeFile = `Readme.md`;
        await pushToGithub(folderName, readMeFile, readMe, 'Readme file');
        await pushToGithub(folderName, filename, code, commitMsg);
      }
    }, 100);
  });
};

submitButtonClick();