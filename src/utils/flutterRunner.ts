import { exec } from "child_process";

export function runGenL10n(projectRoot: string): Promise<void> {
  return new Promise((resolve) => {
    exec("flutter gen-l10n", { cwd: projectRoot }, (error) => {
      if (error) {
        console.error("flutter gen-l10n failed:", error.message);
      }
      resolve();
    });
  });
}
