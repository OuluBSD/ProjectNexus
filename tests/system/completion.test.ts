import { completionHandler } from '../../src/commands/system/completion';
import { ExecutionContext } from '../../runtime/types';

describe('Completion Command', () => {
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockContext = {
      state: {},
      session: null,
      metadata: {}
    };
  });

  test('should generate bash completion script', async () => {
    const result = await completionHandler({ shell: 'bash' }, mockContext);
    
    expect(result.status).toBe('ok');
    expect(result.data).toContain('#!/bin/bash');
    expect(result.data).toContain('nexus_completion');
    expect(result.errors).toHaveLength(0);
  });

  test('should generate zsh completion script', async () => {
    const result = await completionHandler({ shell: 'zsh' }, mockContext);
    
    expect(result.status).toBe('ok');
    expect(result.data).toContain('#compdef nexus');
    expect(result.errors).toHaveLength(0);
  });

  test('should generate fish completion script', async () => {
    const result = await completionHandler({ shell: 'fish' }, mockContext);
    
    expect(result.status).toBe('ok');
    expect(result.data).toContain('Fish completion script for nexus CLI');
    expect(result.data).toContain('complete -c nexus');
    expect(result.errors).toHaveLength(0);
  });

  test('should return error for unsupported shell', async () => {
    const result = await completionHandler({ shell: 'unsupported' }, mockContext);
    
    expect(result.status).toBe('error');
    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Unsupported shell: unsupported');
  });

  test('should return error when shell is not provided', async () => {
    const result = await completionHandler({}, mockContext);
    
    expect(result.status).toBe('error');
    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Missing required flag: --shell');
  });
});