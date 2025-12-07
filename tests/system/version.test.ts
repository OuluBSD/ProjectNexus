import { versionHandler } from '../../src/commands/system/version';
import { ExecutionContext } from '../../src/runtime/types';

describe('Version Command', () => {
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockContext = {
      state: {},
      session: null,
      metadata: {}
    };
  });

  test('should return version information', async () => {
    const result = await versionHandler({}, mockContext);
    
    expect(result.status).toBe('ok');
    expect(result.data).toHaveProperty('version');
    expect(result.data).toHaveProperty('commit');
    expect(result.data).toHaveProperty('buildDate');
    expect(result.data).toHaveProperty('platform');
    expect(result.errors).toHaveLength(0);
    
    // Check that version is a valid semver string
    expect(typeof result.data.version).toBe('string');
    expect(result.data.version).toMatch(/^\d+\.\d+\.\d+$/);
    
    // Check that commit is a string (might be "unknown" during tests)
    expect(typeof result.data.commit).toBe('string');
    
    // Check that buildDate is a valid ISO string
    expect(typeof result.data.buildDate).toBe('string');
    expect(() => new Date(result.data.buildDate)).not.toThrow();
    
    // Check that platform is a string
    expect(typeof result.data.platform).toBe('string');
  });
});