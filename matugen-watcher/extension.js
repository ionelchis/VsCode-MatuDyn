const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STABLE_PATH =
    process.env.HOME +
    "/.local/share/matudyn/themes/vs-code/themes/matugen-theme.json";

function getExtensionThemePath() {
    const ext = vscode.extensions.getExtension("local.matugen-theme");
    return ext
        ? path.join(ext.extensionPath, "themes", "matugen-theme.json")
        : null;
}

function readFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        const hash = crypto.createHash("sha256").update(content).digest("hex");
        return { content, hash };
    } catch (e) {
        return null;
    }
}

function isValidJson(content) {
    // Strip JSONC comments before validating (theme files use /* */ style comments)
    const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*/g, "");
    try {
        JSON.parse(stripped);
        return true;
    } catch (e) {
        return false;
    }
}

function copyToExtension(extPath) {
    fs.mkdirSync(path.dirname(extPath), { recursive: true });
    fs.copyFileSync(STABLE_PATH, extPath);
}

function activate(context) {
    console.log("Matugen watcher active");

    let lastHash = null;

    // Initial sync: copy stable → extension dir without reloading if they differ
    const extPath = getExtensionThemePath();
    const stable = readFile(STABLE_PATH);
    if (stable && extPath) {
        const existing = readFile(extPath);
        if (!existing || existing.hash !== stable.hash) {
            try {
                copyToExtension(extPath);
                console.log("Matugen watcher: initial sync done");
            } catch (e) {
                console.log("Matugen watcher: initial sync failed:", e.message);
            }
        }
        lastHash = stable.hash;
    }

    function checkFile() {
        const stable = readFile(STABLE_PATH);
        if (!stable) return; // matugen hasn't run yet

        if (lastHash && lastHash !== stable.hash) {
            if (!isValidJson(stable.content)) {
                console.log("Matugen watcher: skipping mid-write partial file");
                return;
            }
            const extPath = getExtensionThemePath();
            if (extPath) {
                try {
                    copyToExtension(extPath);
                    vscode.commands.executeCommand(
                        "workbench.action.reloadWindow"
                    );
                } catch (e) {
                    console.log("Matugen watcher: copy failed:", e.message);
                }
            }
        }

        lastHash = stable.hash;
    }

    // poll every 1s (stable across dev + packaged)
    const interval = setInterval(checkFile, 1000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

function deactivate() {}

module.exports = { activate, deactivate };
