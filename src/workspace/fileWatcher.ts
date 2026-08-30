import * as vscode from "vscode";
import { RefreshCoordinator } from "./refreshCoordinator";

export class FileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private refreshCoordinator: RefreshCoordinator;
  private onRefreshNeeded: () => Promise<void>;

  constructor(
    refreshCoordinator: RefreshCoordinator,
    onRefreshNeeded: () => Promise<void>
  ) {
    this.refreshCoordinator = refreshCoordinator;
    this.onRefreshNeeded = onRefreshNeeded;
  }

  startWatching(): void {
    const arbWatcher =
      vscode.workspace.createFileSystemWatcher("**/*.arb");
    this.watchers.push(arbWatcher);

    const l10nWatcher =
      vscode.workspace.createFileSystemWatcher("**/l10n.yaml");
    this.watchers.push(l10nWatcher);

    for (const watcher of this.watchers) {
      watcher.onDidChange(
        () => this.scheduleRefresh(),
        null
      );
      watcher.onDidCreate(
        () => this.scheduleRefresh(),
        null
      );
      watcher.onDidDelete(
        () => this.scheduleRefresh(),
        null
      );
    }
  }

  private scheduleRefresh(): void {
    this.refreshCoordinator.scheduleRefresh(this.onRefreshNeeded);
  }

  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
  }
}
