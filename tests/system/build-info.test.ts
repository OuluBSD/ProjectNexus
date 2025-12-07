import { BUILD_INFO } from '../../src/generated/build-info';

describe('Build Info', () => {
  test('should have correct structure', () => {
    expect(BUILD_INFO).toHaveProperty('version');
    expect(BUILD_INFO).toHaveProperty('gitHash');
    expect(BUILD_INFO).toHaveProperty('buildDate');
    expect(BUILD_INFO).toHaveProperty('platform');
  });

  test('should have valid version format', () => {
    expect(typeof BUILD_INFO.version).toBe('string');
    expect(BUILD_INFO.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('should have git hash as string', () => {
    expect(typeof BUILD_INFO.gitHash).toBe('string');
  });

  test('should have valid date format', () => {
    expect(typeof BUILD_INFO.buildDate).toBe('string');
    // Check that it's a valid ISO date string
    expect(() => new Date(BUILD_INFO.buildDate)).not.toThrow();
  });

  test('should have platform as string', () => {
    expect(typeof BUILD_INFO.platform).toBe('string');
  });
});