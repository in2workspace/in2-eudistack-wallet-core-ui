import { disableTouchScrollOnPaths } from "./disable-touch-scroll-on-paths";

describe('disableTouchScrollOnPaths', () => {
  let unsubscribe: () => void;


  const setLocation = (path: string) => {
    Object.defineProperty(window, 'location', {
      value: { href: `http://example.com${path}` },
      writable: true,
    });
  };

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = undefined!;
    }
    jest.restoreAllMocks();
  });

  test('prevents default touchmove on specified paths', () => {
    setLocation('/test');
    unsubscribe = disableTouchScrollOnPaths(['/test']);

    const event = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  test('does not prevent default on other paths', () => {
    setLocation('/other');
    unsubscribe = disableTouchScrollOnPaths(['/test']);

    const event = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  test('unbinds event listener when unsubscribe is called', () => {
    setLocation('/test');
    unsubscribe = disableTouchScrollOnPaths(['/test']);

    const firstEvent = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(firstEvent);
    expect(firstEvent.defaultPrevented).toBe(true);

    // Remove the listener
    unsubscribe();

    const secondEvent = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(secondEvent);
    expect(secondEvent.defaultPrevented).toBe(false);
  });
});
