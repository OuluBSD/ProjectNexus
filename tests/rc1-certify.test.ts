import { runRc1Certification } from '../tools/rc1-certify';

describe('RC1 Certification Test', () => {
  test('RC1 certification passes and returns readyForRC1: true', async () => {
    // Run the RC1 certification script
    const result = await runRc1Certification();
    
    // Output the full result for debugging
    console.log('RC1 Certification Result:', JSON.stringify(result, null, 2));
    
    // Check that the overall result indicates readiness
    expect(result.readyForRC1).toBe(true);
    
    // Check that the status is 'ok'
    expect(result.status).toBe('ok');
    
    // Check that we have checks in the result
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
    
    // Check that no checks have status 'fail'
    const failedChecks = result.checks.filter(check => check.status === 'fail');
    if (failedChecks.length > 0) {
      console.error('Failed checks:', failedChecks);
    }
    expect(failedChecks.length).toBe(0);
  });
});