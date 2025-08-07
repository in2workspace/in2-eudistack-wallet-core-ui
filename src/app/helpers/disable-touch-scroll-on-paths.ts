export function disableTouchScrollOnPaths(noScrollPages: string[]) {
  const handler = (event: TouchEvent) => {
    const currentPath = new URL(window.location.href).pathname;
    if (noScrollPages.includes(currentPath)) {
      event.preventDefault();
    }
  };

  document.addEventListener('touchmove', handler, { passive: false });

  return () => {
    document.removeEventListener('touchmove', handler);
  };
}