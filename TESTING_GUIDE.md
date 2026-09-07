# Testing Guide

Comprehensive guide for running and maintaining the WulfCasino API automation tests.

## Table of Contents

- [Test Overview](#test-overview)
- [Quick Start](#quick-start)
- [Test Execution](#test-execution)
- [Test Suites](#test-suites)
- [Understanding Test Results](#understanding-test-results)
- [Debugging Tests](#debugging-tests)
- [Common Issues](#common-issues)
- [Best Practices](#best-practices)

## Test Overview

### Test Coverage

| API | Test Files | Test Cases | Coverage |
|-----|------------|------------|----------|
| Admin API | 8 files | ~120 tests | Authentication, Users, Games, Transactions, Bonuses, Webhooks, Reports, Settings |
| Player API | 7 files | ~100 tests | Authentication, Profile, Wallet, Games, Betting, Bonuses, Responsible Gaming |
| Agent API | 6 files | ~80 tests | Authentication, Players, Commission, Financials, Reports, Marketing |
| **Total** | **21 files** | **~300 tests** | **Complete API coverage** |

### Test Types

- **Smoke Tests** (`@smoke`): Critical functionality tests
- **Regression Tests** (`@regression`): Comprehensive feature tests
- **Functional Tests**: Endpoint behavior validation
- **Negative Tests**: Error handling and validation
- **Security Tests**: Authentication and authorization

## Quick Start

### 1. Setup Environment

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### 2. Run Smoke Tests

```bash
npm run test:smoke
```

### 3. View Results

```bash
npm run test:report
```

## Test Execution

### Run All Tests

```bash
npm test
```

### Run Specific API

```bash
# Admin API tests only
npm run test:admin

# Player API tests only
npm run test:player

# Agent API tests only
npm run test:agent
```

### Run by Test Type

```bash
# Smoke tests (quick validation)
npm run test:smoke

# Regression tests (full coverage)
npm run test:regression
```

### Run Specific Test File

```bash
# Run single file
npx playwright test tests/admin/auth.spec.ts

# Run multiple files with pattern
npx playwright test tests/admin/*.spec.ts
```

### Run Specific Test

```bash
# Run test by name
npx playwright test -g "should login successfully"

# Run multiple tests by pattern
npx playwright test -g "authentication"
```

### Advanced Options

```bash
# Run in headed mode (see browser)
npm run test:headed

# Run in debug mode (pause on failures)
npm run test:debug

# Run in UI mode (interactive)
npm run test:ui

# Run with specific workers (parallel execution)
npx playwright test --workers=4

# Run with specific retries
npx playwright test --retries=2

# Run with specific timeout
npx playwright test --timeout=60000
```

## Test Suites

### Admin API Tests

**Location**: `tests/admin/`

#### Authentication (`auth.spec.ts`)
- Admin login
- Token verification
- Password management
- Logout

#### User Management (`user-management.spec.ts`)
- Create, read, update, delete users
- User transactions
- User status management
- Search and filters

#### Game Management (`game-management.spec.ts`)
- Game CRUD operations
- Game statistics
- Status management
- Validation

#### Transaction Management (`transaction-management.spec.ts`)
- Transaction retrieval
- Status updates
- Filtering and sorting
- Reports

#### Bonus Management (`bonus-management.spec.ts`)
- Bonus CRUD operations
- Bonus assignment
- Validation

#### Webhook Management (`webhook-management.spec.ts`)
- Webhook CRUD operations
- Webhook testing
- Event configuration

#### Reports (`reports.spec.ts`)
- Financial reports
- User activity reports
- Game performance reports
- Export functionality

#### Settings (`settings.spec.ts`)
- System settings
- Game provider management
- Configuration updates

### Player API Tests

**Location**: `tests/player/`

#### Authentication (`auth.spec.ts`)
- Player registration
- Login/logout
- Password management
- Token handling

#### Profile Management (`profile.spec.ts`)
- Profile updates
- Avatar management
- Two-factor authentication
- Validation

#### Wallet Management (`wallet.spec.ts`)
- Balance retrieval
- Deposits
- Withdrawals
- Transaction history

#### Games (`games.spec.ts`)
- Game discovery
- Game launch
- Favorites
- Recently played

#### Betting (`betting.spec.ts`)
- Place bets
- Bet history
- Bet cancellation
- Validation

#### Bonuses (`bonuses.spec.ts`)
- Available bonuses
- Bonus claims
- Active bonuses
- Bonus cancellation

#### Responsible Gaming (`responsible-gaming.spec.ts`)
- Deposit limits
- Loss limits
- Session limits
- Self-exclusion
- Reality check

### Agent API Tests

**Location**: `tests/agent/`

#### Authentication (`auth.spec.ts`)
- Agent login
- Token management
- Security

#### Player Management (`player-management.spec.ts`)
- Player CRUD operations
- Statistics
- Transactions
- Balance adjustments

#### Commission Management (`commission.spec.ts`)
- Commission settings
- History
- Reports
- Payouts

#### Financial Management (`financials.spec.ts`)
- Financial summary
- Transactions
- Calculations

#### Reports (`reports.spec.ts`)
- Performance reports
- Player activity
- Revenue reports

#### Marketing Tools (`marketing.spec.ts`)
- Marketing links
- Link statistics
- Promotional materials

## Understanding Test Results

### Console Output

```
✓ tests/admin/auth.spec.ts:12:5 › should login successfully @smoke (523ms)
✗ tests/admin/auth.spec.ts:25:5 › should fail with invalid password (234ms)

1 passed (523ms)
1 failed (234ms)
```

### HTML Report

```bash
npm run test:report
```

- Overview of all tests
- Pass/fail status
- Execution time
- Screenshots and traces for failures
- Request/response details

### JUnit Report

Location: `test-results/junit.xml`

- Machine-readable format
- CI/CD integration
- Test execution history

### Allure Report

```bash
# Generate report
allure generate allure-results -o allure-report --clean

# Open report
allure open allure-report
```

- Comprehensive test analytics
- Trends over time
- Detailed test execution
- Screenshots and logs

## Debugging Tests

### Enable Verbose Logging

```typescript
// In your test file
import { logger } from '../../utils/logger';

test('my test', async () => {
  logger.info('Test starting');
  logger.debug('Debug information');
});
```

### Check Logs

```bash
# View combined logs
cat logs/combined.log

# View error logs only
cat logs/error.log

# Follow logs in real-time
tail -f logs/combined.log
```

### Debug Mode

```bash
# Pause test execution
npm run test:debug

# Run specific test in debug mode
npx playwright test tests/admin/auth.spec.ts --debug
```

### Inspect Network Calls

Tests automatically log API requests and responses. Check logs for details.

### Use Test Helpers

```typescript
// Add debug logging
TestHelpers.logStep('Creating user');
TestHelpers.logResult(true, 'User created successfully');
```

## Common Issues

### Authentication Failures

**Symptom**: Tests failing with 401 Unauthorized

**Solutions**:
1. Check credentials in `.env` file
2. Verify API endpoints are correct
3. Check if tokens are expiring
4. Review authentication logs

```bash
grep "authentication" logs/combined.log
```

### Network Timeouts

**Symptom**: Tests timing out

**Solutions**:
1. Increase timeout in `playwright.config.ts`
2. Check API availability
3. Verify network connectivity
4. Review slow endpoints

```typescript
// Increase test timeout
test('slow test', async ({ authenticatedAdminApi }) => {
  test.setTimeout(120000); // 2 minutes
  // ... test code
});
```

### Flaky Tests

**Symptom**: Tests pass/fail inconsistently

**Solutions**:
1. Add retry logic
2. Increase wait times
3. Use proper assertions
4. Check for race conditions

```typescript
// Add retry
await TestHelpers.retry(async () => {
  const response = await api.getData();
  expect(response.success).toBeTruthy();
}, 3, 1000);
```

### Data Issues

**Symptom**: Tests failing due to duplicate data

**Solutions**:
1. Use unique test data
2. Enable test data cleanup
3. Use isolated test environments

```typescript
// Always use unique data
const email = TestHelpers.generateUniqueEmail('test');
const username = TestHelpers.generateUniqueUsername('test');
```

## Best Practices

### Test Independence

- Each test should be independent
- Don't rely on test execution order
- Clean up test data
- Use fixtures for setup/teardown

### Test Data

- Use unique, generated data
- Avoid hardcoded values
- Clean up after tests
- Use realistic data

### Assertions

- Use descriptive messages
- Test positive and negative cases
- Verify response structure
- Check error messages

### Performance

- Run tests in parallel when possible
- Use appropriate timeouts
- Avoid unnecessary waits
- Reuse authenticated sessions

### Maintenance

- Keep tests DRY (Don't Repeat Yourself)
- Use helper functions
- Update tests when APIs change
- Document complex test scenarios

### Version Control

- Commit test changes with code changes
- Use meaningful commit messages
- Keep test data out of version control
- Review test changes carefully

## Continuous Improvement

### Monitor Test Health

- Review test execution times
- Identify flaky tests
- Update failing tests promptly
- Add tests for new features

### Test Metrics

Track:
- Pass/fail rate
- Execution time
- Coverage
- Flakiness

### Regular Maintenance

- Update dependencies
- Refactor tests
- Remove obsolete tests
- Improve documentation

---

For more information, see [README.md](./README.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).
