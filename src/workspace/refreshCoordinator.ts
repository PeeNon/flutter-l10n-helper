import * as vscode from "vscode";

export class RefreshCoordinator {
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingRefresh: (() => Promise<void>) | undefined;
  private debounceMs: number;

  constructor(debounceMs: number = 300) {
    this.debounceMs = debounceMs;
  }

  scheduleRefresh(refreshFn: () => Promise<void>): void {
    this.pendingRefresh = refreshFn;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(async () => {
      if (this.pendingRefresh) {
        const fn = this.pendingRefresh;
        this.pendingRefresh = undefined;
        await fn();
      }
    }, this.debounceMs);
  }

  async refreshNow(refreshFn: () => Promise<void>): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.pendingRefresh = undefined;
    await refreshFn();
  }

  cancelPending(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.pendingRefresh = undefined;
  }

  dispose(): void {
    this.cancelPending();
  }
}
