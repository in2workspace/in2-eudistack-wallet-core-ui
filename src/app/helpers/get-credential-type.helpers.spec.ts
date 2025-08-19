import { getExtendedCredentialType, isValidCredentialType } from "./get-credential-type.helpers";

describe('credential type helpers', () => {
  const originalError = console.error;
  const originalWarn = console.warn;

  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    console.error = originalError;
    console.warn = originalWarn;
    jest.clearAllMocks();
  });

  describe('isValidCredentialType', () => {
    it('returns true for a known credential type', () => {
      expect(isValidCredentialType('LEARCredentialEmployee' as any)).toBe(true);
      expect(isValidCredentialType('LEARCredentialMachine' as any)).toBe(true);
      expect(isValidCredentialType('gx:LabelCredential' as any)).toBe(true);
    });

    it('returns false for an unknown credential type', () => {
      expect(isValidCredentialType('VerifiableCredential' as any)).toBe(false);
      expect(isValidCredentialType('LearCredentialEmployee' as any)).toBe(false);
    });
  });

  describe('getExtendedCredentialType', () => {
    it('Returns type when order is [VerifiableCredential, type]', () => {
      const vc = { type: ['VerifiableCredential', 'LEARCredentialEmployee'] } as any;
      const result = getExtendedCredentialType(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('Returns type when order is [Type, VerifiableCredential]', () => {
      const vc = { type: ['LEARCredentialEmployee', 'VerifiableCredential'] } as any;
      const result = getExtendedCredentialType(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('Handles invalid credential type', () => {
      const vc = { type: ['Foo', 'Bar'] } as any;
      const result = getExtendedCredentialType(vc);
      expect(result).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalledTimes(2); // "Invalid credential type." + vc.type
      expect(warnSpy).toHaveBeenCalledWith("Using 'VerifiableCredential' as default.");
    });

    it('Handles null or empty returning "VerifiableCredential"', () => {
      const vc1 = { type: undefined } as any;
      const r1 = getExtendedCredentialType(vc1);
      expect(r1).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith("Using 'VerifiableCredential' as default.");

      errorSpy.mockClear();
      warnSpy.mockClear();

      const vc2 = { type: [] } as any;
      const r2 = getExtendedCredentialType(vc2);
      expect(r2).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith("Using 'VerifiableCredential' as default.");
    });
  });
});
