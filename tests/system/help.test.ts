import { helpHandler } from '../../src/commands/system/help';
import { ExecutionContext } from '../../src/runtime/types';

describe('Help Command', () => {
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockContext = {
      state: {},
      session: null,
      metadata: {}
    };
  });

  test('should return all namespaces when no arguments provided', async () => {
    const result = await helpHandler({}, mockContext);
    
    expect(result.status).toBe('ok');
    expect(result.data).toContain('Available namespaces:');
    expect(result.data).toContain('agent');
    expect(result.data).toContain('settings');
    expect(result.data).toContain('auth');
    expect(result.data).toContain('network');
    expect(result.data).toContain('debug');
    expect(result.errors).toHaveLength(0);
  });

  test('should return commands in a specific namespace', async () => {
    const result = await helpHandler({ namespace: 'agent' }, mockContext);
    
    expect(result.status).toBe('ok');
    expect(result.data).toContain('Commands in namespace "agent"');
    expect(result.data).toContain('agent.project.list');
    expect(result.data).toContain('List all projects');
    expect(result.errors).toHaveLength(0);
  });

  test('should return error for non-existent namespace', async () => {
    const result = await helpHandler({ namespace: 'nonexistent' }, mockContext);
    
    expect(result.status).toBe('error');
    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('No commands found in namespace "nonexistent"');
  });

  test('should return detailed help for a specific command', async () => {
    const result = await helpHandler({ 
      namespace: 'agent', 
      command: 'project' 
    }, mockContext);
    
    // This should fail since agent.project is not a complete command path
    expect(result.status).toBe('error');
    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
  });

  test('should return detailed help for a complete command path', async () => {
    const result = await helpHandler({ 
      namespace: 'agent', 
      command: 'project.list' 
    }, mockContext);
    
    expect(result.status).toBe('ok');
    expect(result.data).toContain('agent.project.list');
    expect(result.data).toContain('List all projects');
    expect(result.data).toContain('Arguments:');
    expect(result.data).toContain('Flags:');
    expect(result.errors).toHaveLength(0);
  });
});