import checkParity from '../../tools/parity-check';

describe('CLI vs UI Parity Test', () => {
  test('should have zero parity errors between CLI and UI', () => {
    const result = checkParity();
    
    // The test expects zero [ERROR] outputs from the parity checker
    expect(result.errors).toBe(0);
    
    // Additional assertions for overall status
    expect(result.status).toBe('ok');
    
    // Log the results for debugging
    console.log('Parity check results:', {
      status: result.status,
      errors: result.errors,
      warnings: result.warnings,
      missing: result.missing
    });
  });

  test('should return valid result structure', () => {
    const result = checkParity();
    
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('missing');
    
    expect(typeof result.status).toBe('string');
    expect(typeof result.errors).toBe('number');
    expect(typeof result.warnings).toBe('number');
    expect(Array.isArray(result.missing)).toBe(true);
  });
});