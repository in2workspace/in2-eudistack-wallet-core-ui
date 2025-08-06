/**
 * Interfaces for Ionic Angular lifecycle hooks: enter and leave methods.
/**
 * Called when the page is about to become active.
 */
export interface ViewWillEnter {
  ionViewWillEnter(): void;
}

/**
 * Called when the page has fully entered and is now the active page.
 */
export interface ViewDidEnter {
  ionViewDidEnter(): void;
}

/**
 * Called when the page is about to leave and no longer be the active page.
 */
export interface ViewWillLeave {
  ionViewWillLeave(): void;
}

/**
 * Called when the page has finished leaving and is no longer the active page.
 */
export interface ViewDidLeave {
  ionViewDidLeave(): void;
}
