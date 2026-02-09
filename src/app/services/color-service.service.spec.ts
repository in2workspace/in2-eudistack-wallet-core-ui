// color.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ColorService } from './color-service.service';

describe('ColorService', () => {
  let service: ColorService;
  let documentRef: Document;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ColorService],
    });

    service = TestBed.inject(ColorService);
    documentRef = TestBed.inject(DOCUMENT);
    root = documentRef.documentElement;

    root.removeAttribute('style');
    while (documentRef.body.firstChild) {
      documentRef.body.removeChild(documentRef.body.firstChild);
    }
  });

  describe('applyCustomColors', () => {
    it('should set base CSS variable + -rgb + shade/tint (+ their rgb) for non-contrast variables (hex input)', () => {
      const setPropertySpy = jest.spyOn(root.style, 'setProperty');

      service.applyCustomColors({
        '--ion-color-primary': '#00add3',
      });

      expect(setPropertySpy).toHaveBeenCalledWith('--ion-color-primary', '#00add3');
      expect(setPropertySpy).toHaveBeenCalledWith('--ion-color-primary-rgb', '0, 173, 211');

      expect(setPropertySpy).toHaveBeenCalledWith(
        '--ion-color-primary-shade',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--ion-color-primary-tint',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );

      expect(setPropertySpy).toHaveBeenCalledWith(
        '--ion-color-primary-shade-rgb',
        expect.stringMatching(/^\d{1,3}, \d{1,3}, \d{1,3}$/)
      );
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--ion-color-primary-tint-rgb',
        expect.stringMatching(/^\d{1,3}, \d{1,3}, \d{1,3}$/)
      );

      expect(setPropertySpy.mock.calls).toHaveLength(6);
    });
  it('should NOT compute shade/tint for contrast variables, but should set variable + -rgb', () => {
    const setPropertySpy = jest.spyOn(root.style, 'setProperty');

    service.applyCustomColors({
      '--ion-color-primary-contrast': '#ffffff',
    });

    // Only look at calls for this variable
    const contrastCalls = setPropertySpy.mock.calls.filter(([key]) =>
      String(key).startsWith('--ion-color-primary-contrast')
    );

    expect(contrastCalls).toEqual([
      ['--ion-color-primary-contrast', '#ffffff'],
      ['--ion-color-primary-contrast-rgb', '255, 255, 255'],
    ]);

    const contrastKeys = contrastCalls.map(([k]) => String(k));
    expect(contrastKeys).not.toContain('--ion-color-primary-contrast-shade');
    expect(contrastKeys).not.toContain('--ion-color-primary-contrast-tint');
    expect(contrastKeys).not.toContain('--ion-color-primary-contrast-shade-rgb');
    expect(contrastKeys).not.toContain('--ion-color-primary-contrast-tint-rgb');
  });

    it('should support rgb(...) input and compute -rgb correctly (including shade/tint)', () => {
      const setPropertySpy = jest.spyOn(root.style, 'setProperty');

      service.applyCustomColors({
        '--ion-color-secondary': 'rgb(10, 20, 30)',
      });

      expect(setPropertySpy).toHaveBeenCalledWith('--ion-color-secondary-rgb', '10, 20, 30');

      expect(setPropertySpy).toHaveBeenCalledWith(
        '--ion-color-secondary-shade',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--ion-color-secondary-tint',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
    });

    it('should support modern rgb() syntax with spaces and optional alpha via "/"', () => {
      const setPropertySpy = jest.spyOn(root.style, 'setProperty');

      service.applyCustomColors({
        '--ion-color-tertiary': 'rgb(0 173 211 / 0.5)',
      });

      expect(setPropertySpy).toHaveBeenCalledWith('--ion-color-tertiary-rgb', '0, 173, 211');
    });

    it('should support percent rgb channels and clamp values', () => {
      const setPropertySpy = jest.spyOn(root.style, 'setProperty');

      service.applyCustomColors({
        '--ion-color-success': 'rgb(100% 0% 50%)',
      });

      expect(setPropertySpy).toHaveBeenCalledWith('--ion-color-success-rgb', '255, 0, 128');
    });

    it('should resolve named colors via computed style (deterministic stub)', () => {
      // Stub deterministic getComputedStyle for this test
      const original = globalThis.getComputedStyle;

      const getComputedStyleMock = jest.fn(() => {
        return { color: 'rgb(12, 34, 56)' } as unknown as CSSStyleDeclaration;
      });

      globalThis.getComputedStyle = getComputedStyleMock as unknown as typeof getComputedStyle;

      const setPropertySpy = jest.spyOn(root.style, 'setProperty');

      service.applyCustomColors({
        '--ion-color-warning': 'rebeccapurple',
      });

      expect(getComputedStyleMock).toHaveBeenCalled();
      expect(setPropertySpy).toHaveBeenCalledWith('--ion-color-warning-rgb', '12, 34, 56');

      // Restore
      globalThis.getComputedStyle = original;
    });
  });
});
