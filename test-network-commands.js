// test-network-commands.js - Quick verification script
const { Validator, validate } = require('./dist/parser/validator');
const { CommandAST } = require('./dist/parser/grammar-parser');

// Test network health stream command
const healthStreamAst = {
  type: 'Command',
  commandPath: ['network', 'health', 'stream'],
  arguments: {
    named: {},
    positional: []
  },
  rawInput: 'network health stream'
};

// Test network graph stream command
const graphStreamAst = {
  type: 'Command',
  commandPath: ['network', 'graph', 'stream'],
  arguments: {
    named: {},
    positional: []
  },
  rawInput: 'network graph stream'
};

// Test network element monitor command (with required id)
const elementMonitorAst = {
  type: 'Command',
  commandPath: ['network', 'element', 'monitor'],
  arguments: {
    named: { id: 'element-123' },
    positional: []
  },
  rawInput: 'network element monitor --id element-123'
};

// Test network element monitor command (without id - should fail)
const elementMonitorInvalidAst = {
  type: 'Command',
  commandPath: ['network', 'element', 'monitor'],
  arguments: {
    named: {},
    positional: []
  },
  rawInput: 'network element monitor'
};

console.log('Testing network streaming commands validation...\n');

const tests = [
  { name: 'network.health.stream', ast: healthStreamAst },
  { name: 'network.graph.stream', ast: graphStreamAst },
  { name: 'network.element.monitor (valid)', ast: elementMonitorAst },
  { name: 'network.element.monitor (invalid)', ast: elementMonitorInvalidAst }
];

tests.forEach(test => {
  const result = validate(test.ast);
  console.log(`${test.name}: ${result.error ? 'FAILED' : 'PASSED'}`);
  if (result.error) {
    console.log(`  Error: ${result.message}`);
  } else {
    console.log(`  Command ID: ${result.commandId}`);
  }
});

console.log('\nAll validation tests completed.');