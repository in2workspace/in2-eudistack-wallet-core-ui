import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoaderService {
  private readonly loadingCount$ = signal(0);

  readonly isLoading$ = computed(() => {
    const loadingCount = this.loadingCount$();
    if(loadingCount < 0){
      console.error('Loading count is < 0: it looks like it has been attempted to cancel a process that was not notified to the loader service.');
    }
    return loadingCount > 0
  });

  addLoadingProcess(): void {
    this.loadingCount$.update(count => count + 1);
  }

  removeLoadingProcess(): void {
    this.loadingCount$.update(count => Math.max(0, count - 1));
  }

  resetLoadingCount(): void {
    this.loadingCount$.set(0);
  }
}
