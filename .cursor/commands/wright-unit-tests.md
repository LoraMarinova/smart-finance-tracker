# wright-unit-tests

Generate **self-contained, dependency-free unit tests** for the code I point you at (or, if I name nothing, the file currently in focus). This command is mandatory: you MUST actually create the test file(s), run them, and report results — do not just describe what you would do.

## Hard rules (non-negotiable)

1. **No test frameworks or libraries.** Do NOT use or install Vitest, Jest, Mocha, Chai, Playwright, pytest, etc. Do NOT add anything to `package.json`/`requirements.txt`. Use only the language runtime.
2. **Self-contained file.** Each test is a single plain script that:
   - `import`s the real module(s) under test by relative path,
   - calls the functions/values with concrete inputs,
   - asserts the actual result equals the expected result,
   - prints a readable pass/fail summary,
   - exits with a non-zero code if any assertion fails (so it is CI-friendly).
3. **Define your own tiny assert helper** inside the test file (a function that throws on mismatch). Built-in `node:assert` is acceptable too, but prefer the inline helper to keep it truly standalone. Nothing else may be imported except the modules being tested.
4. **Pure logic only.** Test exported functions/values. Do not test React rendering, the DOM, HTTP, or the database with this command — extract pure logic if needed (see `apply-best-practices`: functions should return values and throw errors, not log).

## File placement and naming

- JavaScript: create `*.unit.mjs` files. Use the `.mjs` extension so they run as ES modules and are **ignored by the Vitest config** (`src/**/*.{test,spec}.{js,jsx}`). Put them next to the source or under `frontend/unit/`. Run with `node`.
- Python: create `*_unittest.py` files that run as plain scripts (`python file`) using `assert`; do not use pytest fixtures or imports.
- Never name a file `*.test.js`/`*.spec.js`/`test_*.py` for this command — those belong to the existing Vitest/pytest suites and must not be disturbed.

## What to cover

- The happy path for each exported function.
- Important edge cases: empty/missing input, invalid input, boundaries/limits, and any error paths (assert that the expected exception is thrown).
- One assertion per expectation, each with a clear label in the output.

## Required JavaScript template

```js
// example.unit.mjs — run: node example.unit.mjs
import { validate, validateGoal } from '../src/validation.js'

let passed = 0
let failed = 0

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    passed++
    console.log(`ok   - ${label}`)
  } else {
    failed++
    console.error(`FAIL - ${label}\n       expected ${e}\n       actual   ${a}`)
  }
}

function assertThrows(fn, label) {
  try {
    fn()
    failed++
    console.error(`FAIL - ${label} (expected an exception)`)
  } catch {
    passed++
    console.log(`ok   - ${label}`)
  }
}

// --- tests ---
assertEqual(validateGoal({ name: 'Car', target: '5000' }), {}, 'valid goal has no errors')
assertEqual(
  validateGoal({ name: '', target: '' }).name,
  'Name is required.',
  'missing name reports message',
)

// --- summary ---
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

## After writing

- Run every test file you created (`node <file>.unit.mjs`, or `python <file>_unittest.py`) and paste the actual output.
- Report `N passed, M failed`. If anything fails, fix the code or the test and re-run until green.
- Do not claim success without showing the run output.
