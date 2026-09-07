# WulfCasino API Automation Testing Framework

Comprehensive API automation testing framework for WulfCasino Admin, Player, and Agent APIs built with Playwright and TypeScript.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Reports](#test-reports)
- [CI/CD Integration](#cicd-integration)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **Three API Coverage**: Admin, Player, and Agent APIs
- **TypeScript**: Fully typed for better IDE support and code quality
- **Playwright**: Modern test automation framework with built-in API testing
- **Custom Fixtures**: Reusable test fixtures for authentication and API clients
- **Data Generators**: Realistic test data generation with Faker
- **Comprehensive Logging**: Winston-based logging with file and console outputs
- **Multiple Reporters**: HTML, JSON, JUnit, and Allure reports
- **CI/CD Ready**: GitHub Actions workflows included
- **Environment Management**: Separate configs for local, staging, and production
- **Retry Logic**: Automatic retry for flaky API calls
- **Authentication**: Automatic token management and refresh

## 📁 Project Structure

```
Histabit_API_Auto/
├── .github/
│   └── workflows/
│       └── test.yml              # GitHub Actions CI/CD pipeline
├── config/
│   └── environment.ts            # Environment configuration manager
├── fixtures/
│   ├── api-fixtures.ts           # Playwright custom fixtures
│   ├── data-generator.ts         # Test data generator
│   ├── test-data.ts              # Static test data
│   └── test-helpers.ts           # Helper functions
├── tests/
│   ├── admin/                    # Admin API tests
│   │   ├── auth.spec.ts
│   │   ├── user-management.spec.ts
│   │   ├── game-management.spec.ts
│   │   ├── transaction-management.spec.ts
│   │   ├── bonus-management.spec.ts
│   │   ├── webhook-management.spec.ts
│   │   ├── reports.spec.ts
│   │   └── settings.spec.ts
│   ├── player/                   # Player API tests
│   │   ├── auth.spec.ts
│   │   ├── profile.spec.ts
│   │   ├── wallet.spec.ts
│   │   ├── games.spec.ts
│   │   ├── betting.spec.ts
│   │   ├── bonuses.spec.ts
│   │   └── responsible-gaming.spec.ts
│   └── agent/                    # Agent API tests
│       ├── auth.spec.ts
│       ├── player-management.spec.ts
│       ├── commission.spec.ts
│       ├── financials.spec.ts
│       ├── reports.spec.ts
│       └── marketing.spec.ts
├── types/
│   ├── api.types.ts              # TypeScript type definitions
│   └── index.ts
├── utils/
│   ├── api-client.ts             # Base API client
│   ├── auth-helper.ts            # Authentication helper
│   ├── admin-api-client.ts       # Admin API client
│   ├── player-api-client.ts      # Player API client
│   ├── agent-api-client.ts       # Agent API client
│   └── logger.ts                 # Winston logger configuration
├── .env.example                  # Environment variables template
├── .eslintrc.json                # ESLint configuration
├── .prettierrc.json              # Prettier configuration
├── playwright.config.ts          # Playwright configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Project dependencies

```

## 🔧 Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v8.x or higher
- **Git**: For version control

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Histabit_API_Auto
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (edit `.env`):
   ```env
   # API Base URLs
   ADMIN_API_URL=http://localhost:3000/admin
   PLAYER_API_URL=http://localhost:3000/player
   AGENT_API_URL=http://localhost:3000/agent

   # Admin Credentials
   ADMIN_EMAIL=admin@wulfcasino.com
   ADMIN_PASSWORD=SecurePassword123!

   # Player Credentials
   PLAYER_EMAIL=player@test.com
   PLAYER_PASSWORD=PlayerPass123!

   # Agent Credentials
   AGENT_EMAIL=agent@test.com
   AGENT_PASSWORD=AgentPass123!
   ```

## ⚙️ Configuration

### Environment Variables

All configuration is managed through environment variables. See `.env.example` for all available options.

### Test Configuration

The `playwright.config.ts` file contains:
- Test timeout settings
- Retry configuration
- Reporter settings
- Project-specific configurations

## 🚀 Running Tests

### Run all tests
```bash
npm test
```

### Run specific API tests
```bash
npm run test:admin      # Admin API tests
npm run test:player     # Player API tests
npm run test:agent      # Agent API tests
```

### Run by tags
```bash
npm run test:smoke      # Smoke tests only
npm run test:regression # Regression tests only
```

### Run in headed mode
```bash
npm run test:headed
```

### Run in debug mode
```bash
npm run test:debug
```

### Run in UI mode
```bash
npm run test:ui
```

## 📊 Test Reports

### View HTML Report
```bash
npm run test:report
```

Reports are automatically generated in:
- `playwright-report/` - HTML report
- `test-results/` - JSON and JUnit reports
- `allure-results/` - Allure report data

### Generate Allure Report
```bash
npm install -g allure-commandline
allure generate allure-results -o allure-report --clean
allure open allure-report
```

## 🔄 CI/CD Integration

### GitHub Actions

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/test.yml`) that:

- Runs on push, pull requests, and scheduled (daily)
- Tests against multiple Node.js versions
- Runs tests in parallel by API suite
- Generates and uploads test reports
- Supports manual triggering

### Required Secrets

Add these secrets in GitHub repository settings:

```
BASE_URL
ADMIN_API_URL
PLAYER_API_URL
AGENT_API_URL
ADMIN_EMAIL
ADMIN_PASSWORD
PLAYER_EMAIL
PLAYER_PASSWORD
AGENT_EMAIL
AGENT_PASSWORD
```

## ✍️ Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

test.describe('Feature Name', () => {
  test('should perform action @smoke', async ({ authenticatedAdminApi }) => {
    const response = await authenticatedAdminApi.someMethod();

    TestHelpers.assertSuccess(response);
    TestHelpers.assertHasData(response);
    expect(response.data).toHaveProperty('expectedField');
  });
});
```

### Using Test Helpers

```typescript
// Assertions
TestHelpers.assertSuccess(response);
TestHelpers.assertFailure(response);
TestHelpers.assertStatusCode(response, 200);
TestHelpers.assertHasData(response);
TestHelpers.assertHasProperties(obj, ['field1', 'field2']);

// Utilities
const email = TestHelpers.generateUniqueEmail('prefix');
const username = TestHelpers.generateUniqueUsername('prefix');
await TestHelpers.sleep(1000);
await TestHelpers.retry(() => someOperation(), 3, 1000);
```

### Generating Test Data

```typescript
import { DataGenerator } from '../../fixtures';

// Generate user data
const userData = DataGenerator.generateUser({
  email: TestHelpers.generateUniqueEmail('test'),
});

// Generate game data
const gameData = DataGenerator.generateGame({
  name: 'My Test Game',
});

// Generate transaction data
const transactionData = DataGenerator.generateTransaction(playerId);
```

### Using Fixtures

```typescript
// Unauthenticated client
test('test without auth', async ({ adminApi }) => {
  // Use adminApi for endpoints that don't require authentication
});

// Authenticated client
test('test with auth', async ({ authenticatedAdminApi }) => {
  // Client is already authenticated
  const response = await authenticatedAdminApi.getUsers();
});
```

## 📝 Best Practices

### Test Organization
- Group related tests using `test.describe()`
- Use descriptive test names
- Tag tests with `@smoke`, `@regression`, etc.
- Keep tests independent and isolated

### Data Management
- Use unique test data (emails, usernames, etc.)
- Clean up test data after tests when possible
- Use test data generators for realistic data

### Assertions
- Use TestHelpers for consistent assertions
- Verify both success and error scenarios
- Check response structure and data types

### Error Handling
- Tests should handle expected failures gracefully
- Use appropriate assertions for error cases
- Log meaningful error messages

### Performance
- Run independent tests in parallel
- Use fixtures to share setup code
- Avoid unnecessary API calls

## 🐛 Troubleshooting

### Tests Failing Locally

1. **Check environment variables**:
   ```bash
   cat .env
   ```

2. **Verify API endpoints are accessible**:
   ```bash
   curl $ADMIN_API_URL/health
   ```

3. **Check logs**:
   ```bash
   cat logs/combined.log
   ```

### Authentication Issues

- Verify credentials in `.env` file
- Check token expiration settings
- Review authentication logs

### Network Timeouts

- Increase timeout in playwright.config.ts
- Check network connectivity
- Verify API response times

### Type Errors

```bash
npm run type-check
```

### Linting Issues

```bash
npm run lint
npm run lint:fix
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Faker Documentation](https://fakerjs.dev/)

## 🤝 Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

[License Type] - See LICENSE file for details

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- WulfCasino team
- Playwright community
- Open source contributors
