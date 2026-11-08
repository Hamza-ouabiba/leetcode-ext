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
  return langEl?.textContent?.trim() || "unknown";
};

const getLanguageSuffix = language => ({
  "c++": "cpp", java: "java", python3: "py", python: "py", javascript: "js", typescript: "ts",
  "c#": "cs", c: "c", go: "go", kotlin: "kt", swift: "swift", rust: "rs", ruby: "rb",
  php: "php", dart: "dart", scala: "scala", elixir: "ex", erlang: "erl", racket: "rkt"
}[language.trim().toLowerCase()] || "txt");

const getCode = () => {
  const codeBlock = [...document.querySelectorAll("code")].find(code =>
    code.querySelector(".react-syntax-highlighter-line-number") &&
    [...code.classList].some(className => className.startsWith("language-"))
  );
  if (!codeBlock) return "";
  const clone = codeBlock.cloneNode(true);
  clone.querySelectorAll(".react-syntax-highlighter-line-number").forEach(element => element.remove());
  return clone.textContent?.trim() || "";
};

const getFolderName = title => {
  const titleMatch = title.match(/^(\d+)\.\s+([\w\s-]+)/);
  if (titleMatch) return `${titleMatch[1]}-${titleMatch[2].trim().toLowerCase().replace(/\s+/g, "-")}`;
  return window.location.pathname.match(/\/problems\/([\w-]+)\//)?.[1] || "unknown-problem";
};

const getReadme = ({ title, description }) => `# ${title}\n\n${description}`;

const isAccepted = text => /^accepted\b/i.test(text.trim());
const isFinishedFailure = text => /^(wrong answer|time limit exceeded|memory limit exceeded|runtime error|compile error|output limit exceeded|internal error)\b/i.test(text.trim());

const monitorSubmission = button => {
  let timer = null;
  let interval = null;

  button.addEventListener("click", () => {
    if (interval) return;
    const resultEl = document.querySelector('[data-e2e-locator="submission-result"]');
    const previousResult = resultEl?.innerText?.trim() || "";
    let sawResultChange = false;

    interval = setInterval(async () => {
      const current = document.querySelector('[data-e2e-locator="submission-result"]')?.innerText?.trim() || "";
      if (current !== previousResult) sawResultChange = true;
      if (!sawResultChange || (!isAccepted(current) && !isFinishedFailure(current))) return;

      clearInterval(interval);
      clearTimeout(timer);
      interval = null;

      if (!isAccepted(current)) {
        await window.LeetCodeGitHub.setSyncStatus({
          status: "rejected",
          title: getProblemInfo().title,
          message: `Not uploaded: LeetCode result was “${current.split("\n")[0]}”.`
        });
        return;
      }

      const { title, description } = getProblemInfo();
      const language = getLanguage();
      const code = getCode();
      if (!code) {
        await window.LeetCodeGitHub.setSyncStatus({ status: "error", title, message: "Accepted, but the solution code could not be read." });
        return;
      }

      const payload = {
        title,
        folderName: getFolderName(title),
        language,
        solutionFile: `solution.${getLanguageSuffix(language)}`,
        readmeContent: getReadme({ title, description }),
        code
      };
      await window.LeetCodeGitHub.syncProblem(payload);
    }, 250);

    timer = setTimeout(async () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
      await window.LeetCodeGitHub.setSyncStatus({
        status: "error",
        title: getProblemInfo().title,
        message: "Timed out waiting for LeetCode’s submission result."
      });
    }, 120000);
  });
};

const submitButton = document.querySelector('[data-e2e-locator="console-submit-button"]');
if (submitButton) monitorSubmission(submitButton);
