# Contributing to WulfCasino API Automation

Thank you for your interest in contributing to the WulfCasino API Automation Testing Framework!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run tests to ensure everything works
npm test
```

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use async/await for asynchronous operations

### Formatting

- Run Prettier before committing:
  ```bash
  npm run format
  ```

### Linting

- Ensure no linting errors:
  ```bash
  npm run lint
  ```

### Type Checking

- Run type checker:
  ```bash
  npm run type-check
  ```

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Feature Name', () => {
  test.describe('Sub-feature', () => {
    test('should do something @smoke', async ({ authenticatedAdminApi }) => {
      // Arrange
      const testData = DataGenerator.generateSomething();

      // Act
      const response = await authenticatedAdminApi.doSomething(testData);

      // Assert
      TestHelpers.assertSuccess(response);
      expect(response.data).toBeDefined();
    });
  });
});
```

### Test Naming

- Use descriptive names that explain what is being tested
- Start with "should"
- Include expected behavior
- Example: `should create user with valid data`

### Test Tags

- `@smoke` - Critical path tests that must pass
- `@regression` - Comprehensive tests for full coverage
- Use tags to categorize tests for selective execution

### Test Data

- Always use unique test data
- Use `TestHelpers.generateUniqueEmail()` and `TestHelpers.generateUniqueUsername()`
- Use `DataGenerator` for complex test data
- Clean up test data when possible

## Adding New API Endpoints

### 1. Update Type Definitions

Add types in `types/api.types.ts`:

```typescript
export interface NewFeature {
  id: string;
  name: string;
  status: string;
}
```

### 2. Add Client Method

Add method to appropriate client (`utils/admin-api-client.ts`, etc.):

```typescript
async getNewFeature(id: string): Promise<ApiResponse<NewFeature>> {
  return this.apiClient.get(`/new-feature/${id}`);
}
```

### 3. Write Tests

Create test file in appropriate directory:

```typescript
// tests/admin/new-feature.spec.ts
import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

test.describe('New Feature', () => {
  test('should get new feature @smoke', async ({ authenticatedAdminApi }) => {
    const response = await authenticatedAdminApi.getNewFeature('test-id');
    TestHelpers.assertSuccess(response);
  });
});
```

## Adding Test Utilities

### Helper Functions

Add to `fixtures/test-helpers.ts`:

```typescript
static myHelper(param: string): string {
  // Implementation
  return result;
}
```

### Data Generators

Add to `fixtures/data-generator.ts`:

```typescript
static generateMyData(overrides: any = {}) {
  return {
    field1: faker.lorem.word(),
    field2: faker.datatype.number(),
    ...overrides,
  };
}
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass:
   ```bash
   npm test
   ```

2. Run linter:
   ```bash
   npm run lint:fix
   ```

3. Run type checker:
   ```bash
   npm run type-check
   ```

4. Format code:
   ```bash
   npm run format
   ```

### PR Guidelines

- **Title**: Clear and descriptive
- **Description**: Explain what and why
- **Tests**: Include tests for new features
- **Documentation**: Update README if needed
- **Small Changes**: Keep PRs focused and manageable

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Type checking passes
```

## Commit Messages

Follow conventional commits:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `test: add tests`
- `refactor: code refactoring`
- `chore: maintenance tasks`

## Issue Reporting

### Bug Reports

Include:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Logs if applicable

### Feature Requests

Include:
- Description of the feature
- Use case
- Proposed solution
- Alternative solutions considered

## Code Review

### What Reviewers Look For

- Code quality and readability
- Test coverage
- Documentation
- Performance implications
- Security considerations
- Breaking changes

### Responding to Feedback

- Be open to suggestions
- Ask questions if unclear
- Make requested changes
- Update PR description if scope changes

## Getting Help

- Check existing issues
- Read documentation
- Ask in discussions
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the project's license.

Thank you for contributing! 🎉
