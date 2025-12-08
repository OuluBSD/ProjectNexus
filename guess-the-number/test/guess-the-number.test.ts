// Simple tests for the GuessTheNumberGame class
// Note: These are conceptual tests since the game uses readline and is interactive

import { GuessTheNumberGame } from '../dist/guess-the-number-game';

// Simple test to check if the class can be instantiated and works correctly
function testGameInitialization() {
  console.log("Running test: Game initialization with custom parameters...");

  try {
    const game = new GuessTheNumberGame(1, 10, 5);
    // Access private properties through type assertion
    const minRange = (game as any).minRange;
    const maxRange = (game as any).maxRange;
    const maxAttempts = (game as any).maxAttempts;

    if (minRange !== 1 || maxRange !== 10 || maxAttempts !== 5) {
      throw new Error(`Properties not set correctly: minRange=${minRange}, maxRange=${maxRange}, maxAttempts=${maxAttempts}`);
    }

    console.log("✅ Game initialization test passed!");
    return true;
  } catch (error) {
    console.log("❌ Game initialization test failed:", error);
    return false;
  }
}

function testGameDefaultInitialization() {
  console.log("Running test: Game initialization with default parameters...");

  try {
    const game = new GuessTheNumberGame();
    const minRange = (game as any).minRange;
    const maxRange = (game as any).maxRange;
    const maxAttempts = (game as any).maxAttempts;

    if (minRange !== 1 || maxRange !== 100 || maxAttempts !== 7) {
      throw new Error(`Default properties not set correctly: minRange=${minRange}, maxRange=${maxRange}, maxAttempts=${maxAttempts}`);
    }

    console.log("✅ Default initialization test passed!");
    return true;
  } catch (error) {
    console.log("❌ Default initialization test failed:", error);
    return false;
  }
}

function testRandomNumberGeneration() {
  console.log("Running test: Random number generation...");

  try {
    const game = new GuessTheNumberGame(1, 10, 5);
    const secretNumber = (game as any).secretNumber;

    if (secretNumber < 1 || secretNumber > 10) {
      throw new Error(`Generated number not in range: ${secretNumber}`);
    }

    console.log("✅ Random number generation test passed!");
    return true;
  } catch (error) {
    console.log("❌ Random number generation test failed:", error);
    return false;
  }
}

// Run all tests
function runTests() {
  console.log("🧪 Starting tests for GuessTheNumberGame...\n");

  const results = [
    testGameInitialization(),
    testGameDefaultInitialization(),
    testRandomNumberGeneration()
  ];

  const passedCount = results.filter(Boolean).length;
  const totalCount = results.length;

  console.log(`\n📊 Test Results: ${passedCount}/${totalCount} tests passed`);

  if (passedCount === totalCount) {
    console.log("🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("💥 Some tests failed!");
    process.exit(1);
  }
}

// Run the tests when this file is executed
if (require.main === module) {
  runTests();
}