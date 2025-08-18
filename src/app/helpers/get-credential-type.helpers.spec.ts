import { getSpecificType, assignDefaultCredentialTypeIfNeeded, getCredentialTypeAndAssignDefaultIfNeeded } from "./get-credential-type.helpers";


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
    it('retorna el segon element quan el primer és "VerifiableCredential"', () => {
      const vc = { type: ['VerifiableCredential', 'LEARCredentialEmployee'] } as any;
      const result = getSpecificType(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('retorna el primer element quan el segon és "VerifiableCredential"', () => {
      const vc = { type: ['LEARCredentialEmployee', 'VerifiableCredential'] } as any;
      const result = getSpecificType(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('fa console.error i retorna "VerifiableCredential" si cap posició conté "VerifiableCredential"', () => {
      const vc = { type: ['Foo', 'Bar'] } as any;
      const result = getSpecificType(vc);
      expect(result).toBe('VerifiableCredential');
      // S'esperen dos errors: "Invalid credential type: " i el valor de vc.type
      expect(errorSpy).toHaveBeenCalledTimes(2);
    });

    it('accepta type nul o buit i retorna "VerifiableCredential" amb error loguejat', () => {
      const vc1 = { type: undefined } as any;
      const vc2 = { type: [] } as any;

      const r1 = getSpecificType(vc1);
      expect(r1).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockClear();

      const r2 = getSpecificType(vc2);
      expect(r2).toBe('VerifiableCredential');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('assignDefaultCredentialTypeIfNeeded', () => {
    it('torna "LEARCredentialEmployee" i avisa si rep "VerifiableCredential"', () => {
      const result = assignDefaultCredentialTypeIfNeeded('VerifiableCredential' as any);
      expect(result).toBe('LEARCredentialEmployee');
      expect(warnSpy).toHaveBeenCalledWith('Using LEARCredentialEmployee as default');
    });

    it('no canvia el tipus ni avisa si rep un tipus específic', () => {
      const result = assignDefaultCredentialTypeIfNeeded('LEARCredentialEmployee' as any);
      expect(result).toBe('LEARCredentialEmployee');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('getCredentialTypeAndAssignDefaultIfNeeded (integració)', () => {
    it('detecta el tipus específic correctament quan l’ordre és [VC, Tipus]', () => {
      const vc = { type: ['VerifiableCredential', 'LEARCredentialEmployee'] } as any;
      const result = getCredentialTypeAndAssignDefaultIfNeeded(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('retorna el default "LEARCredentialEmployee" si el type és invàlid o buit', () => {
      const vcInvalid = { type: ['Foo', 'Bar'] } as any;
      const resultInvalid = getCredentialTypeAndAssignDefaultIfNeeded(vcInvalid);
      expect(resultInvalid).toBe('LEARCredentialEmployee');
      // Dos errors del getSpecificType + un warn del assignDefault...
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith('Using LEARCredentialEmployee as default');

      errorSpy.mockClear();
      warnSpy.mockClear();

      const vcEmpty = { type: [] } as any;
      const resultEmpty = getCredentialTypeAndAssignDefaultIfNeeded(vcEmpty);
      expect(resultEmpty).toBe('LEARCredentialEmployee');
      expect(errorSpy).toHaveBeenCalled(); // errors del getSpecificType
      expect(warnSpy).toHaveBeenCalledWith('Using LEARCredentialEmployee as default');
    });

    it('funciona si "VerifiableCredential" va a la segona posició', () => {
      const vc = { type: ['LEARCredentialEmployee', 'VerifiableCredential'] } as any;
      const result = getCredentialTypeAndAssignDefaultIfNeeded(vc);
      expect(result).toBe('LEARCredentialEmployee');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});