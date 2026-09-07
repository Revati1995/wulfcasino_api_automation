/**
 * Test Data Generator
 * Generates realistic test data for various entities
 */

import { faker } from '@faker-js/faker';

export class DataGenerator {
  /**
   * Generate random user data
   */
  static generateUser(overrides: any = {}) {
    return {
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.userName().toLowerCase(),
      password: 'Test123!@#',
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      phone: faker.phone.phoneNumber(),
      dateOfBirth: faker.date.past(30, new Date(2000, 0, 1)).toISOString().split('T')[0],
      country: faker.address.countryCode(),
      city: faker.address.city(),
      address: faker.address.streetAddress(),
      postalCode: faker.address.zipCode(),
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
      name: faker.name.findName(),
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
   * Generate random agent data
   */
  static generateAgent(overrides: any = {}) {
    return {
      email: faker.internet.email().toLowerCase(),
      password: 'Agent123!@#',
      name: faker.company.companyName(),
      commission: parseFloat(faker.finance.amount(5, 20, 2)),
      status: 'active',
      phone: faker.phone.phoneNumber(),
      country: faker.address.countryCode(),
      ...overrides,
    };
  }

  /**
   * Generate random game data
   */
  static generateGame(overrides: any = {}) {
    const gameTypes = ['slot', 'table', 'live', 'poker', 'scratch'];
    const providers = ['NetEnt', 'Microgaming', 'Evolution', 'Pragmatic Play', 'Play\'n GO'];

    return {
      name: `${faker.commerce.productName()} ${faker.random.word()}`,
      provider: faker.random.arrayElement(providers),
      category: faker.random.arrayElement(gameTypes),
      type: faker.random.arrayElement(gameTypes),
      status: 'active',
      rtp: parseFloat(faker.finance.amount(92, 98, 2)),
      minBet: parseFloat(faker.finance.amount(0.1, 1, 2)),
      maxBet: parseFloat(faker.finance.amount(100, 1000, 2)),
      description: faker.lorem.sentence(),
      thumbnailUrl: faker.image.imageUrl(400, 300, 'casino', true),
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
      type: faker.random.arrayElement(types),
      amount: parseFloat(faker.finance.amount(10, 1000, 2)),
      currency: 'USD',
      status: faker.random.arrayElement(statuses),
      paymentMethod: 'credit_card',
      ...overrides,
    };
  }

  /**
   * Generate random bet data
   */
  static generateBet(playerId: string, gameId: string, overrides: any = {}) {
    const amount = parseFloat(faker.finance.amount(1, 100, 2));
    const multiplier = parseFloat(faker.finance.amount(0, 5, 2));

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
      type: faker.random.arrayElement(bonusTypes),
      amount: parseFloat(faker.finance.amount(10, 500, 2)),
      currency: 'USD',
      wagerRequirement: faker.datatype.number({ min: 20, max: 50 }),
      validDays: faker.datatype.number({ min: 7, max: 30 }),
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
      events: [
        faker.random.arrayElement(events),
        faker.random.arrayElement(events),
      ],
      status: 'active',
      secret: faker.random.alphaNumeric(32),
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
      category: faker.random.arrayElement(categories),
      priority: faker.random.arrayElement(priorities),
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
      name: `Campaign ${faker.random.alphaNumeric(8)}`,
      url: `https://wulfcasino.com/ref/${faker.random.alphaNumeric(10)}`,
      campaign: faker.company.catchPhrase(),
      medium: faker.random.arrayElement(['email', 'social', 'website', 'paid']),
      source: faker.random.arrayElement(['facebook', 'google', 'twitter', 'instagram']),
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
    return faker.internet.password(length, true, /[A-Za-z0-9!@#$%]/);
  }

  /**
   * Generate unique ID
   */
  static generateId(): string {
    return faker.datatype.uuid();
  }

  /**
   * Generate random amount
   */
  static generateAmount(min: number = 10, max: number = 1000): number {
    return parseFloat(faker.finance.amount(min, max, 2));
  }

  /**
   * Generate random date in the past
   */
  static generatePastDate(years: number = 1): string {
    return faker.date.past(years).toISOString();
  }

  /**
   * Generate random date in the future
   */
  static generateFutureDate(years: number = 1): string {
    return faker.date.future(years).toISOString();
  }

  /**
   * Generate random phone number
   */
  static generatePhoneNumber(): string {
    return faker.phone.phoneNumber();
  }

  /**
   * Generate random URL
   */
  static generateUrl(): string {
    return faker.internet.url();
  }
}
