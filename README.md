# Leetcode Extension

A **LeetCode extension** that automatically pushes solved problem code (and a generated README) to your GitHub repository.

This extension extracts the problem title, description, and your solution code from the LeetCode page and pushes them to a GitHub repo in a structured folder format.

---

## 🚀 Features

- Reads the problem title and description from the LeetCode UI
- Extracts your solution code after submission
- Creates a folder named after the problem (e.g., `1-two-sum`)
- Generates a basic `README.md` with the problem title & description
- Pushes both solution and README to your GitHub repository automatically

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/Hamza-ouabiba/leetcode-ext.git
cd leetcode-ext
```

### ⚙️ Add the extension to your browser

**For Chrome / Edge:**

1. Go to `chrome://extensions/`
2. Enable **Developer Mode** (top right corner)
3. Click **Load unpacked**
4. Select the project folder you cloned

---

## 🔐 Configuration (IMPORTANT)

### 3. Create `cred.js`

Create a file named:

```
cred.js
```

### 4. Add your credentials

```js
const GITHUB_USERNAME = "your-username";
const GITHUB_REPO = "your-repo-name";
const GITHUB_TOKEN = "your-personal-access-token";
```
