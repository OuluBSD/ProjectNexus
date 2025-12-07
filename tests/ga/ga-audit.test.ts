import { runGAAudit } from '../../tools/ga-audit.js';

describe('GA Audit Test', () => {
  test('GA audit passes and returns readyForGA: true', async () => {
    const result = await runGAAudit();
    
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('readyForGA');
    expect(result).toHaveProperty('checks');
    expect(result).toHaveProperty('timestamp');
    
    expect(result.status).toBe('ok');
    expect(result.readyForGA).toBe(true);
    expect(Array.isArray(result.checks)).toBe(true);
    expect(typeof result.timestamp).toBe('string');
    
    // Verify that there are no failing checks
    const failingChecks = result.checks.filter(check => check.status === 'fail');
    expect(failingChecks.length).toBe(0);
    
    console.log(`GA Audit completed with ${result.checks.length} checks, all passed`);
  });
});