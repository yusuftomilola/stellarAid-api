# Contributing to StellarAid API

Thank you for your interest in contributing! Please follow these guidelines to ensure a smooth contribution process.

## Prerequisites

Before submitting a pull request, ensure you have:

- Node.js 20+ installed
- npm installed

## Development Workflow

### 1. Install Dependencies

```bash
npm ci
```

### 2. Before Making Any Changes

Run the following commands to ensure your environment is working:

```bash
# Check for linting errors
npm run lint

# Build the project
npm run build

# Run tests
npm test
```

### 3. Making Changes

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. **ALWAYS** run the following before committing:
   ```bash
   npm run lint      # Fix any linting errors
   npm run build     # Ensure project builds successfully
   npm test          # Ensure all tests pass
   ```

### 4. Adding New Tests

If you add new test files (`.spec.ts` or `.test.ts`), they **MUST** pass in CI:

```bash
# Run specific test file
npm test -- your-new-file.spec.ts

# Run all tests
npm test
```

## CI/CD Requirements

All pull requests must pass these automated checks:

| Check | Description | Required |
|-------|-------------|----------|
| **Lint** | ESLint checks for code quality | ✅ Yes |
| **Build** | TypeScript compilation | ✅ Yes |
| **Tests** | All Jest tests must pass | ✅ Yes |

If any check fails, the PR cannot be merged.

## Pull Request Process

1. Update your local branch with the latest changes from `main`:
   ```bash
   git pull origin main
   ```

2. Resolve any merge conflicts

3. Run the full check suite one more time:
   ```bash
   npm run lint && npm run build && npm test
   ```

4. Push your branch and create a Pull Request

5. Fill out the PR template completely

6. Wait for all CI checks to pass

7. Request review from maintainers

## Common Issues

### Lint Errors

If you see ESLint errors, try auto-fixing them:

```bash
npm run lint
```

### Build Errors

Ensure TypeScript compiles without errors:

```bash
npm run build
```

### Test Failures

Run tests with coverage to see what's failing:

```bash
npm run test:cov
```

## Questions?

If you have questions, please open an issue for discussion before submitting a PR.
