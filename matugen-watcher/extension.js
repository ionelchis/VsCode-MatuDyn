const vscode = require("vscode");
const fs = require("fs");

function activate(context) {
    console.log("Matugen watcher active");

    const themePath =
        process.env.HOME +
        "/.vscode-oss/extensions/matugen-theme/themes/matugen-theme.json";

    let lastHash = null;

    function checkFile() {
        try {
            const content = fs.readFileSync(themePath, "utf8");
            const hash = content.length + content.slice(0, 50);

            if (lastHash && lastHash !== hash) {
                vscode.commands.executeCommand(
                    "workbench.action.reloadWindow"
                );
            }

            lastHash = hash;
        } catch (e) {
            console.log("Watcher error:", e.message);
        }
    }

    // poll every 1s (stable across dev + packaged)
    const interval = setInterval(checkFile, 1000);

    context.subscriptions.push({
        dispose: () => clearInterval(interval)
    });
}

function deactivate() {}

module.exports = { activate, deactivate };
