import { getExtendedType, assignDefaultCredentialTypeIfNeeded, getCredentialTypeAndAssignDefaultIfNeeded } from "./get-credential-type.helpers";

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

  describe('getSpecificType', () => {
    it('returns the specific type when order is [VC, Type]', () => {
      const vc = { type: ['VerifiableCredential', 'LEARCredentialEmployee'] } as any;
      const result = getExtendedType(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('returns the specific type when order is [Type, VC]', () => {
      const vc = { type: ['LEARCredentialEmployee', 'VerifiableCredential'] } as any;
      const result = getExtendedType(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('logs two errors, one warning, and returns "VerifiableCredential" if no valid type is found', () => {
      const vc = { type: ['Foo', 'Bar'] } as any;
      const result = getExtendedType(vc);
      expect(result).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalledTimes(2); // "Invalid credential type." + vc.type
      expect(warnSpy).toHaveBeenCalledWith("Using 'VerifiableCredential' as default.");
    });

    it('handles null or empty type and returns "VerifiableCredential" with 2 errors and 1 warning', () => {
      const vc1 = { type: undefined } as any;
      const r1 = getExtendedType(vc1);
      expect(r1).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith("Using 'VerifiableCredential' as default.");

      errorSpy.mockClear();
      warnSpy.mockClear();

      const vc2 = { type: [] } as any;
      const r2 = getExtendedType(vc2);
      expect(r2).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith("Using 'VerifiableCredential' as default.");
    });
  });

  describe('assignDefaultCredentialTypeIfNeeded', () => {
    it('returns "LEARCredentialEmployee" and warns if input is "VerifiableCredential"', () => {
      const result = assignDefaultCredentialTypeIfNeeded('VerifiableCredential' as any);
      expect(result).toBe('LEARCredentialEmployee');
      expect(warnSpy).toHaveBeenCalledWith('Using LEARCredentialEmployee as default');
    });

    it('returns the same type and does not warn if input is a specific type', () => {
      const result = assignDefaultCredentialTypeIfNeeded('LEARCredentialEmployee' as any);
      expect(result).toBe('LEARCredentialEmployee');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('getCredentialTypeAndAssignDefaultIfNeeded (integration)', () => {
    it('detects the specific type correctly when order is [VC, Type]', () => {
      const vc = { type: ['VerifiableCredential', 'LEARCredentialEmployee'] } as any;
      const result = getCredentialTypeAndAssignDefaultIfNeeded(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('returns the default "LEARCredentialEmployee" if type is invalid or empty and logs accordingly', () => {
      const vcInvalid = { type: ['Foo', 'Bar'] } as any;
      const resultInvalid = getCredentialTypeAndAssignDefaultIfNeeded(vcInvalid);
      expect(resultInvalid).toBe('LEARCredentialEmployee');

      // getSpecificType: 2 errors + 1 warning
      // assignDefaultCredentialTypeIfNeeded: 1 warning
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenNthCalledWith(1, "Using 'VerifiableCredential' as default.");
      expect(warnSpy).toHaveBeenNthCalledWith(2, 'Using LEARCredentialEmployee as default');

      errorSpy.mockClear();
      warnSpy.mockClear();

      const vcEmpty = { type: [] } as any;
      const resultEmpty = getCredentialTypeAndAssignDefaultIfNeeded(vcEmpty);
      expect(resultEmpty).toBe('LEARCredentialEmployee');
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenNthCalledWith(1, "Using 'VerifiableCredential' as default.");
      expect(warnSpy).toHaveBeenNthCalledWith(2, 'Using LEARCredentialEmployee as default');
    });

    it('works when the specific type is first and VC is second', () => {
      const vc = { type: ['LEARCredentialEmployee', 'VerifiableCredential'] } as any;
      const result = getCredentialTypeAndAssignDefaultIfNeeded(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
