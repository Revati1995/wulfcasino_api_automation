/**
 * Test Data Generator
 * Generates realistic test data for various entities
 *
 * Uses the @faker-js/faker v10 API (faker.person, faker.location, faker.helpers,
 * faker.string, faker.number). The pre-v8 namespaces (faker.name, faker.address,
 * faker.random, faker.datatype.uuid, faker.internet.userName) no longer exist.
 */

import { faker } from '@faker-js/faker';

export class DataGenerator {
  /**
   * Generate random user data
   */
  static generateUser(overrides: any = {}) {
    return {
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.username().replace(/[^a-z0-9_]/gi, '').toLowerCase(),
      password: 'Test123!@#',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number({ style: 'international' }),
      dateOfBirth: faker.date.birthdate({ min: 21, max: 60, mode: 'age' }).toISOString().split('T')[0],
      country: faker.location.countryCode(),
      city: faker.location.city(),
      address: faker.location.streetAddress(),
      postalCode: faker.location.zipCode(),
      ...overrides,
    };
  }

  /**
   * Generate random admin data
   */
  static generateAdmin(overrides: any = {}) {
    return {
      email: faker.internet.email().toLowerCase(),
      password: 'Admin123!@#',
      name: faker.person.fullName(),
      role: 'admin',
      permissions: ['users.read', 'users.write', 'games.read', 'games.write'],
      ...overrides,
    };
  }

  /**
   * Generate random player data
   */
  static generatePlayer(overrides: any = {}) {
    return {
      ...this.generateUser(),
      currency: 'USD',
      status: 'active',
      ...overrides,
    };
  }

  /**
   * Generate a POST /api/v1/auth/register payload in the shape the backend expects:
   * { entity, dob, password, isAgreedToTermsConditions, username, timezone }
   */
  static generatePlayerRegistration(overrides: any = {}) {
    const user = this.generateUser();
    return {
      entity: user.email,
      dob: user.dateOfBirth,
      password: user.password,
      isAgreedToTermsConditions: true,
      username: user.username,
      timezone: 'America/New_York',
      ...overrides,
    };
  }

  /**
   * Generate random agent data
   */
  static generateAgent(overrides: any = {}) {
    return {
      email: faker.internet.email().toLowerCase(),
      password: 'Agent123!@#',
      name: faker.company.name(),
      commission: parseFloat(faker.finance.amount({ min: 5, max: 20, dec: 2 })),
      status: 'active',
      phone: faker.phone.number({ style: 'international' }),
      country: faker.location.countryCode(),
      ...overrides,
    };
  }

  /**
   * Generate random game data
   */
  static generateGame(overrides: any = {}) {
    const gameTypes = ['slot', 'table', 'live', 'poker', 'scratch'];
    const providers = ['NetEnt', 'Microgaming', 'Evolution', 'Pragmatic Play', "Play'n GO"];

    return {
      name: `${faker.commerce.productName()} ${faker.word.sample()}`,
      provider: faker.helpers.arrayElement(providers),
      category: faker.helpers.arrayElement(gameTypes),
      type: faker.helpers.arrayElement(gameTypes),
      status: 'active',
      rtp: parseFloat(faker.finance.amount({ min: 92, max: 98, dec: 2 })),
      minBet: parseFloat(faker.finance.amount({ min: 0.1, max: 1, dec: 2 })),
      maxBet: parseFloat(faker.finance.amount({ min: 100, max: 1000, dec: 2 })),
      description: faker.lorem.sentence(),
      thumbnailUrl: faker.image.url({ width: 400, height: 300 }),
      ...overrides,
    };
  }

  /**
   * Generate random transaction data
   */
  static generateTransaction(playerId: string, overrides: any = {}) {
    const types = ['deposit', 'withdrawal', 'bet', 'win'];
    const statuses = ['pending', 'completed', 'failed'];

    return {
      playerId,
      type: faker.helpers.arrayElement(types),
      amount: parseFloat(faker.finance.amount({ min: 10, max: 1000, dec: 2 })),
      currency: 'USD',
      status: faker.helpers.arrayElement(statuses),
      paymentMethod: 'credit_card',
      ...overrides,
    };
  }

  /**
   * Generate random bet data
   */
  static generateBet(playerId: string, gameId: string, overrides: any = {}) {
    const amount = parseFloat(faker.finance.amount({ min: 1, max: 100, dec: 2 }));
    const multiplier = parseFloat(faker.finance.amount({ min: 0, max: 5, dec: 2 }));

    return {
      playerId,
      gameId,
      amount,
      currency: 'USD',
      multiplier,
      winAmount: amount * multiplier,
      status: multiplier > 0 ? 'win' : 'loss',
      ...overrides,
    };
  }

  /**
   * Generate random bonus data
   */
  static generateBonus(overrides: any = {}) {
    const bonusTypes = ['welcome', 'deposit', 'free_spins', 'cashback', 'loyalty'];

    return {
      name: `${faker.commerce.productAdjective()} Bonus`,
      type: faker.helpers.arrayElement(bonusTypes),
      amount: parseFloat(faker.finance.amount({ min: 10, max: 500, dec: 2 })),
      currency: 'USD',
      wagerRequirement: faker.number.int({ min: 20, max: 50 }),
      validDays: faker.number.int({ min: 7, max: 30 }),
      status: 'active',
      description: faker.lorem.sentence(),
      termsAndConditions: faker.lorem.paragraph(),
      ...overrides,
    };
  }

  /**
   * Generate random webhook data
   */
  static generateWebhook(overrides: any = {}) {
    const events = ['user.created', 'transaction.completed', 'bet.placed', 'game.launched'];

    return {
      url: faker.internet.url(),
      events: faker.helpers.arrayElements(events, 2),
      status: 'active',
      secret: faker.string.alphanumeric(32),
      description: faker.lorem.sentence(),
      ...overrides,
    };
  }

  /**
   * Generate random support ticket data
   */
  static generateSupportTicket(playerId: string, overrides: any = {}) {
    const categories = ['account', 'payment', 'technical', 'game', 'bonus'];
    const priorities = ['low', 'medium', 'high', 'urgent'];

    return {
      playerId,
      subject: faker.lorem.sentence(),
      category: faker.helpers.arrayElement(categories),
      priority: faker.helpers.arrayElement(priorities),
      message: faker.lorem.paragraph(),
      status: 'open',
      ...overrides,
    };
  }

  /**
   * Generate random marketing link data
   */
  static generateMarketingLink(agentId: string, overrides: any = {}) {
    return {
      agentId,
      name: `Campaign ${faker.string.alphanumeric(8)}`,
      url: `https://wulfcasino.com/ref/${faker.string.alphanumeric(10)}`,
      campaign: faker.company.catchPhrase(),
      medium: faker.helpers.arrayElement(['email', 'social', 'website', 'paid']),
      source: faker.helpers.arrayElement(['facebook', 'google', 'twitter', 'instagram']),
      status: 'active',
      ...overrides,
    };
  }

  /**
   * Generate random email
   */
  static generateEmail(): string {
    return faker.internet.email().toLowerCase();
  }

  /**
   * Generate random password
   */
  static generatePassword(length: number = 12): string {
    return faker.internet.password({ length, memorable: true, pattern: /[A-Za-z0-9!@#$%]/ });
  }

  /**
   * Generate unique ID
   */
  static generateId(): string {
    return faker.string.uuid();
  }

  /**
   * Generate random amount
   */
  static generateAmount(min: number = 10, max: number = 1000): number {
    return parseFloat(faker.finance.amount({ min, max, dec: 2 }));
  }

  /**
   * Generate random date in the past
   */
  static generatePastDate(years: number = 1): string {
    return faker.date.past({ years }).toISOString();
  }

  /**
   * Generate random date in the future
   */
  static generateFutureDate(years: number = 1): string {
    return faker.date.future({ years }).toISOString();
  }

  /**
   * Generate random phone number
   */
  static generatePhoneNumber(): string {
    return faker.phone.number({ style: 'international' });
  }

  /**
   * Generate random URL
   */
  static generateUrl(): string {
    return faker.internet.url();
  }

  /**
   * Generate a POST /api/v1/admin/users payload (admin-created player account):
   * { entity, name, password }
   * Only password is required by the backend; `entity` is the login email.
   * The isActive / isPremium / isVerified flags are deliberately omitted: the
   * backend DTO rejects JSON booleans for them ("isActive must be a string").
   */
  static generateAdminUser(overrides: any = {}) {
    const stamp = `${Date.now()}_${faker.string.alphanumeric(5).toLowerCase()}`;
    return {
      entity: `admin_test_${stamp}@test.com`,
      name: faker.person.fullName(),
      password: 'Test123!@#',
      ...overrides,
    };
  }

  /**
   * Generate a POST /api/v1/admin/bonus/create payload (CreateBonusDto).
   * Created inactive by default so it is never visible to real staging players.
   */
  static generateAdminBonus(overrides: any = {}) {
    return {
      name: `Test Bonus ${Date.now()} ${faker.string.alphanumeric(4)}`,
      description: faker.lorem.sentence(),
      type: 'deposit_match',
      matchPercentage: 100,
      maxBonus: 100,
      rewardCurrency: 'wulf_coin',
      minDeposit: 10,
      wageringMultiplier: 20,
      wageringType: 'bonus',
      validityDays: 30,
      playerStatus: 'all',
      isActive: false,
      ...overrides,
    };
  }

  /**
   * Generate a POST /api/v1/agent/promo-codes/create payload (CreatePromoCodeDto).
   * discountType enum: percentage | flat. Agent-created codes enter the approval flow
   * (approvalStatus "pending", isActive false) so they never reach real players unreviewed.
   */
  static generateAgentPromoCode(overrides: any = {}) {
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      code: `QA${faker.string.alphanumeric(8).toUpperCase()}`,
      description: `QA automation promo ${Date.now()}`,
      discountType: 'percentage',
      discountValue: faker.number.int({ min: 5, max: 20 }),
      minPurchaseAmount: 0,
      maxDiscountAmount: 50,
      maxUsage: 10,
      maxUsagePerUser: 1,
      currency: 'USD',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      isActive: true,
      ...overrides,
    };
  }

}
