# Property-Based Tests

This directory contains property-based tests using fast-check to validate universal correctness properties across the Turf Cats platform.

## What are Property-Based Tests?

Property-based tests validate that certain properties (invariants) hold true across a wide range of randomly generated inputs. Unlike unit tests that check specific examples, property tests explore the input space to find edge cases and ensure correctness across all valid scenarios.

## Running Property Tests

```bash
# Run all property tests
npm test tests/properties

# Run specific property test file
npm test tests/properties/transfer-history.property.test.ts

# Run with UI
npm run test:ui
```

## Test Structure

Each property test follows this structure:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

describe('Property Tests: Feature Name', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('Property X: Description', async () => {
    /**
     * Feature: turf-cats-tournament-platform
     * Property X: For any [condition], the system should [behavior]
     * Validates: Requirements X.Y
     */
    
    await fc.assert(
      fc.asyncProperty(
        // Arbitraries (generators for random inputs)
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 1000 }),
        
        // Test function
        async (input1, input2) => {
          // Setup
          // Execute
          // Verify property holds
        }
      ),
      { numRuns: 100 } // Run 100 iterations minimum
    )
  })
})
```

## Property Test Coverage

This directory implements the following properties from the design document:

### Transfer History (Properties 14-15)
- **Property 14**: Transfer History Required Fields
- **Property 15**: Transfer History Preservation

### Database Import (Properties 32-35)
- **Property 32**: DB Parser Handles Valid Input
- **Property 33**: DB Parser Rejects Invalid Input
- **Property 34**: DB Pretty Printer Formats Correctly
- **Property 35**: DB Parser Round-Trip

## Best Practices

1. **Isolation**: Each property test should be independent
2. **Cleanup**: Always reset the database before each test
3. **Determinism**: Use fixed seeds when debugging specific failures
4. **Coverage**: Run at least 100 iterations per property
5. **Clarity**: Document what property is being validated
6. **Performance**: Keep property tests under 5 seconds each

## Debugging Failed Properties

When a property test fails, fast-check will provide a counterexample:

```
Error: Property failed after 42 tests
{ seed: 1234567890, path: "42:0", endOnFailure: true }
Counterexample: ["invalid-input", -5]
```

To reproduce the failure:

```typescript
await fc.assert(
  fc.asyncProperty(...),
  { 
    numRuns: 100,
    seed: 1234567890, // Use the seed from the failure
    path: "42:0"      // Use the path from the failure
  }
)
```
