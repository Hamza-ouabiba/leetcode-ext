# LeetCode GitHub Sync

A browser extension that saves accepted LeetCode solutions and problem descriptions to a GitHub repository.

## Features

- Uploads only after LeetCode reports **Accepted**.
- Saves `Readme.md` and a language-specific `solution.*` file in a folder for the problem.
- Shows repository problem folders, solution language counts, and the latest problem-folder commit in the toolbar popup.
- Links each problem folder directly to GitHub.
- Shows the last upload result and keeps a failed upload available for retry.
- Stores GitHub settings in the browser instead of a credential source file.

## Install

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project folder.
4. Open the extension’s **Settings** page from the toolbar popup.
5. Enter the GitHub owner, repository, and a personal access token.
6. Choose **Test connection**, then **Save settings**.

Create a fine-grained token with **Contents: Read and write** access to the selected repository. The token is stored in this browser’s extension storage and is not included in the extension files.

## Security note

An earlier version used a token in `cred.js`. That file has been removed from the extension. If that token was real, revoke it in GitHub and enter a replacement token in the Settings page. Removing the file does not remove it from previous Git history.
