/**
 * Static Test Data
 * Pre-defined test data for common test scenarios
 */

export const TestData = {
  // Valid credentials
  validAdminCredentials: {
    email: 'admin@wulfcasino.com',
    password: 'SecurePassword123!',
  },

  validPlayerCredentials: {
    email: 'player@test.com',
    password: 'PlayerPass123!',
  },

  validAgentCredentials: {
    email: 'agent@test.com',
    password: 'AgentPass123!',
  },

  // Invalid credentials
  invalidCredentials: {
    email: 'invalid@test.com',
    password: 'wrongpassword',
  },

  // Invalid email formats
  invalidEmails: [
    'notanemail',
    '@nodomain.com',
    'user@',
    'user @domain.com',
    '',
  ],

  // Weak passwords
  weakPasswords: [
    '123',
    'password',
    'abc',
    '12345678',
    '',
  ],

  // Valid user data templates
  validUserData: {
    email: 'newuser@test.com',
    username: 'testuser123',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    country: 'US',
    city: 'New York',
    address: '123 Test Street',
    postalCode: '10001',
  },

  // Valid game data
  validGameData: {
    name: 'Test Slot Game',
    provider: 'Test Provider',
    category: 'slot',
    type: 'slot',
    status: 'active',
    rtp: 96.5,
    minBet: 0.10,
    maxBet: 100.00,
    description: 'Test game description',
  },

  // Valid bonus data
  validBonusData: {
    name: 'Welcome Bonus',
    type: 'welcome',
    amount: 100,
    currency: 'USD',
    wagerRequirement: 35,
    validDays: 30,
    status: 'active',
    description: 'New player welcome bonus',
  },

  // Valid transaction data
  validDepositData: {
    amount: 100.00,
    currency: 'USD',
    paymentMethod: 'credit_card',
    cardNumber: '4111111111111111',
    expiryDate: '12/25',
    cvv: '123',
  },

  validWithdrawalData: {
    amount: 50.00,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    bankAccount: '1234567890',
    bankCode: 'TEST123',
  },

  // Valid bet data
  validBetData: {
    gameId: 'test-game-123',
    amount: 10.00,
    currency: 'USD',
  },

  // Valid webhook data
  validWebhookData: {
    url: 'https://webhook.test.com/callback',
    events: ['user.created', 'transaction.completed'],
    status: 'active',
    description: 'Test webhook',
  },

  // Pagination defaults
  defaultPagination: {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  },

  // Common filters
  filters: {
    active: { status: 'active' },
    inactive: { status: 'inactive' },
    pending: { status: 'pending' },
    completed: { status: 'completed' },
    failed: { status: 'failed' },
  },

  // Game categories
  gameCategories: ['slot', 'table', 'live', 'poker', 'scratch'],

  // Game providers
  gameProviders: ['NetEnt', 'Microgaming', 'Evolution', 'Pragmatic Play', 'Play\'n GO'],

  // Transaction types
  transactionTypes: ['deposit', 'withdrawal', 'bet', 'win'],

  // Transaction statuses
  transactionStatuses: ['pending', 'completed', 'failed', 'cancelled'],

  // User statuses
  userStatuses: ['active', 'inactive', 'suspended', 'banned'],

  // Currencies
  currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],

  // Payment methods
  paymentMethods: ['credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'crypto'],

  // Bonus types
  bonusTypes: ['welcome', 'deposit', 'free_spins', 'cashback', 'loyalty', 'referral'],

  // Support ticket categories
  supportCategories: ['account', 'payment', 'technical', 'game', 'bonus', 'general'],

  // Support ticket priorities
  supportPriorities: ['low', 'medium', 'high', 'urgent'],

  // Agent commission tiers
  commissionTiers: [
    { tier: 'bronze', percentage: 10, minPlayers: 0 },
    { tier: 'silver', percentage: 15, minPlayers: 10 },
    { tier: 'gold', percentage: 20, minPlayers: 25 },
    { tier: 'platinum', percentage: 25, minPlayers: 50 },
  ],

  // Date ranges for testing
  dateRanges: {
    today: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    lastWeek: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    lastMonth: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  },

  // Error messages for validation
  errorMessages: {
    invalidEmail: 'Invalid email format',
    weakPassword: 'Password does not meet requirements',
    requiredField: 'This field is required',
    invalidAmount: 'Invalid amount',
    insufficientBalance: 'Insufficient balance',
    unauthorized: 'Unauthorized',
    notFound: 'Resource not found',
    alreadyExists: 'Resource already exists',
  },
};
