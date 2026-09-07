# WulfCasino — Postman API Testing Guide

## 1. API Overview

WulfCasino backend API reference and QA testing guide.

The API reference is generated from the NestJS backend source (`hestabit_Backend/apps/api`) and covers controllers, routes, guards, validation DTOs, realistic request bodies, authentication, permissions, webhooks, and Socket.IO events.

### API Collections

| Collection | Requests | Purpose |
|---|---:|---|
| WulfCasino Player API | 239 | Player web application APIs |
| WulfCasino Agent API | 61 | Agent/Affiliate portal APIs |
| WulfCasino Admin API | 523 | Admin/back-office APIs |
| WulfCasino Webhooks & Internal | 35 | Provider callbacks and internal diagnostic APIs |
| **Total** | **858** | |

### Real-Time API

Socket.IO reference:

- 4 gateways
- 14 client-to-server events
- 88 server-to-client events
- JWT authentication
- Room-based communication

See `SOCKET_EVENTS.md` for the complete event reference.

---

# 2. Postman Environment Setup

## Environment

Use the **WulfCasino Local** environment.

### Variables

| Variable | Purpose |
|---|---|
| `baseUrl` | API base URL |
| `wsUrl` | Socket.IO/WebSocket URL |
| `playerToken` | Player JWT |
| `agentToken` | Agent JWT |
| `adminToken` | Admin JWT |

### Default Base URL

```text
http://localhost:8000/api/v1
```

Change `baseUrl` for development or staging environments.

### Swagger

Swagger is available at:

```text
{{baseUrl}}/docs
```

Swagger is basic-auth protected and intended for non-production use.

---

# 3. Postman Collection Structure

Recommended flow-wise structure:

```text
WulfCasino
│
├── 01 Authentication
│   ├── Player Login
│   ├── Admin Login
│   └── Agent Login
│
├── 02 Player
│   ├── Registration
│   ├── Profile
│   ├── KYC
│   └── Security
│
├── 03 Wallet & Payments
│   ├── Wallet
│   ├── Deposits
│   ├── Withdrawals
│   └── Transactions
│
├── 04 Games
│   ├── Lobby
│   ├── Games
│   ├── Providers
│   └── Favorites
│
├── 05 Rewards
│   ├── Bonuses
│   ├── Promotions
│   ├── VIP
│   ├── Races
│   ├── Raffles
│   └── Jackpot
│
├── 06 Subscription
│
├── 07 Notifications & Chat
│
├── 08 Agent
│   ├── Dashboard
│   ├── Sub-Agents
│   ├── Promo Codes
│   ├── Commissions
│   └── Payments
│
├── 09 Admin
│   ├── Employees
│   ├── Roles & Permissions
│   ├── Players
│   ├── Transactions
│   ├── CMS
│   ├── Games
│   ├── Reports
│   └── System Configuration
│
├── 10 Webhooks
│   ├── Coinflow
│   ├── Breeze
│   ├── Sumsub
│   ├── AleaPlay
│   └── SA Games
│
├── 11 Socket.IO
│   ├── Connection
│   ├── Client Events
│   └── Server Events
│
└── 12 Security & Negative Testing
```

---

# 4. Authentication Flow

## 4.1 Player Authentication

### Flow

```text
Register
   ↓
Verify Account
   ↓
Login
   ↓
Save JWT
   ↓
Access Protected APIs
   ↓
Logout
```

### Register

```http
POST /auth/register
```

Test:

- Valid registration
- Duplicate email
- Duplicate username
- Invalid email
- Invalid password
- Missing required fields
- Invalid field types

### Login

```http
POST /auth/login
```

Expected:

- HTTP 200
- JWT returned
- JWT saved to `{{playerToken}}`

### Token Verification

Use a protected endpoint, for example:

```http
GET /users/profile
Authorization: Bearer {{playerToken}}
```

Expected:

- HTTP 200
- Correct player information returned

### Logout

Verify:

- Logout succeeds
- Session/token behavior is correct
- Protected APIs behave according to the expected token policy

---

# 5. Admin Authentication

## Flow

```text
Admin Login
   ↓
JWT Generated
   ↓
Save adminToken
   ↓
Verify Role
   ↓
Verify Permissions
   ↓
Access Admin APIs
```

### Login

```http
POST /admin/auth/login
```

Token:

```text
{{adminToken}}
```

Validate:

- Valid admin credentials
- Invalid credentials
- Missing credentials
- Token generation
- Role
- Permissions
- Unauthorized access

---

# 6. Agent Authentication

## Flow

```text
Agent Created
   ↓
Credentials Received
   ↓
Agent Login
   ↓
Save agentToken
   ↓
Access Agent APIs
```

Agent accounts use:

```http
POST /admin/auth/login
```

Token:

```text
{{agentToken}}
```

Verify:

- Agent can log in
- Agent receives correct role/permissions
- Agent can access agent APIs
- Agent cannot access unauthorized admin APIs

---

# 7. PLAYER API — Flow-Wise Testing

## Flow 1 — Registration & Authentication

```text
Register
   ↓
Verify Account
   ↓
Login
   ↓
Token
   ↓
Protected API
```

Test:

- Valid registration
- Duplicate user
- Invalid credentials
- Invalid request body
- Login
- Logout
- Token validation
- Expired token
- Missing token

---

# 8. Player Profile

## Flow

```text
Login
   ↓
Get Profile
   ↓
Update Profile
   ↓
Get Profile Again
   ↓
Verify Changes
```

Test:

- Get profile
- Update profile
- Change password
- Invalid profile data
- Missing fields
- Unauthorized access
- Verify updated data

---

# 9. KYC

## Flow

```text
Login
   ↓
Submit KYC
   ↓
Upload Documents
   ↓
Check KYC Status
   ↓
Admin Review
   ↓
Approved / Rejected
   ↓
Resubmission if Required
```

Test:

- Submit KYC
- Required fields
- Invalid fields
- Document upload
- KYC status
- Approved status
- Rejected status
- Resubmission
- Unauthorized access

---

# 10. Wallet & Balance

## Flow

```text
Login
   ↓
Check Balance
   ↓
Wallet / Vault
   ↓
Transaction History
```

Verify:

- Gold Coin balance
- Sweep Coin balance
- Vault balance
- Transaction history
- Balance accuracy
- Balance after transaction
- Unauthorized access

---

# 11. Deposit Flow

## Flow

```text
Login
   ↓
Select Deposit
   ↓
Create Deposit
   ↓
Payment Provider
   ↓
Payment Success / Failure
   ↓
Webhook
   ↓
Transaction Updated
   ↓
Wallet Balance Updated
```

Providers:

- Coinflow
- Breeze

Test:

- Valid deposit
- Minimum/maximum amount
- Invalid amount
- Successful payment
- Failed payment
- Cancelled payment
- Duplicate payment
- Duplicate callback
- Invalid webhook signature
- Missing webhook fields
- Balance update

---

# 12. Withdrawal Flow

## Flow

```text
Login
   ↓
Create Withdrawal
   ↓
Validation
   ↓
Provider Processing
   ↓
Callback
   ↓
Withdrawal Status Updated
   ↓
Wallet Updated
```

Test:

- Valid withdrawal
- Invalid amount
- Insufficient balance
- KYC restriction
- Invalid user
- Withdrawal status
- Successful callback
- Failed callback
- Duplicate callback
- Invalid signature

---

# 13. Games & Lobby

## Flow

```text
Login
   ↓
Open Lobby
   ↓
Game Listing
   ↓
Game Details
   ↓
Launch Game
   ↓
Play
   ↓
Wager
   ↓
Balance Update
```

Test:

- Game listing
- Game details
- Categories
- Search
- Filtering
- Favorites
- Game launch
- Provider integration
- Game availability
- Balance/wager update

---

# 14. Bonuses & Promotions

## Flow

```text
Login
   ↓
View Bonuses
   ↓
Claim Bonus
   ↓
Apply Promo Code
   ↓
Bonus Activated
   ↓
Verify Wallet / Bonus Balance
```

Test:

- Available bonuses
- Claim bonus
- Valid promo code
- Invalid promo code
- Expired promo code
- Already-used promo code
- Inactive promo
- Bonus balance
- Bonus eligibility

---

# 15. VIP

## Flow

```text
Login
   ↓
Get VIP Status
   ↓
Check VIP Level
   ↓
Check Progress
   ↓
Check Benefits
   ↓
Access VIP Features
```

Test:

- VIP level
- VIP progress
- Benefits
- Eligibility
- Restricted APIs
- VIP feature gates

---

# 16. Races

## Flow

```text
Login
   ↓
View Race
   ↓
Enroll
   ↓
Play / Wager
   ↓
Race Position Updated
   ↓
Leaderboard
   ↓
Reward
```

Test:

- Race listing
- Race details
- Enrollment
- Maximum user limit
- Race full behavior
- Duplicate enrollment
- Leaderboard
- Reward
- Race status
- Refresh behavior

---

# 17. Raffles

## Flow

```text
Login
   ↓
View Raffle
   ↓
Participate
   ↓
Check Entry
   ↓
Draw
   ↓
Winner / Result
```

Test:

- Raffle listing
- Eligibility
- Participation
- Duplicate participation
- Result
- Winner data
- Reward

---

# 18. Jackpot

## Flow

```text
Login
   ↓
View Jackpot
   ↓
Play Eligible Game
   ↓
Jackpot Update
   ↓
Winner
   ↓
Reward
```

Test:

- Jackpot listing
- Jackpot value
- Eligibility
- Jackpot update
- Winner
- Reward

---

# 19. Subscription

## Flow

```text
View Subscription
   ↓
Select Plan
   ↓
Purchase
   ↓
Payment
   ↓
Subscription Activated
   ↓
Access Premium Feature
```

Test:

- Available plans
- Valid purchase
- Invalid purchase
- Active subscription
- Expired subscription
- Cancellation
- Renewal
- Feature restrictions

---

# 20. Notifications & Chat

## Notification Flow

```text
Login
   ↓
Get Notifications
   ↓
Open Notification
   ↓
Mark Read
   ↓
Verify Read Status
```

Test:

- Notification listing
- Read/unread
- Notification details
- Invalid notification ID

## Chat Flow

```text
Login
   ↓
Connect
   ↓
Join Chat Room
   ↓
Send Message
   ↓
Receive Message
```

Test:

- Connection
- Authentication
- Send message
- Receive message
- Room access
- Unauthorized room access

---

# 21. AGENT API

## Agent Flow

```text
Admin Creates Agent
   ↓
Agent Receives Credentials
   ↓
Agent Login
   ↓
Agent Dashboard
   ↓
Create / Manage Sub-Agent
   ↓
Promo Code
   ↓
User Referral
   ↓
Commission
   ↓
Agent Payment
```

---

# 22. Agent Dashboard

Test:

- Dashboard statistics
- Users
- Revenue
- Commission
- Transactions
- Payment statistics
- Date filters

---

# 23. Sub-Agent Flow

```text
Agent Login
   ↓
Create Sub-Agent
   ↓
Sub-Agent Credentials
   ↓
Sub-Agent Login
   ↓
Verify Permissions
   ↓
Dashboard
```

Test:

- Create sub-agent
- Duplicate sub-agent
- Invalid data
- Login
- Permissions
- Access restrictions

---

# 24. Agent Promo Code Flow

## Manual Approval

```text
Agent Creates Promo Code
   ↓
Admin Reviews
   ↓
Admin Approves
   ↓
Promo Becomes Active
   ↓
User Applies Promo
   ↓
Referral / Bonus Verified
```

## Automatic Approval

```text
Agent Creates Promo Code
   ↓
Promo Automatically Active
   ↓
User Applies Promo
   ↓
Referral / Bonus Verified
```

Test both workflows.

---

# 25. Agent Commission Flow

```text
User Registers Through Agent
   ↓
User Performs Eligible Activity
   ↓
Commission Generated
   ↓
Agent Views Commission
```

Verify:

- Correct referral
- Commission calculation
- Commission status
- Commission history
- Agent balance

---

# 26. Agent Payment Flow

```text
Payment Request
   ↓
Provider
   ↓
Payment Processing
   ↓
Callback
   ↓
Payment Status
```

Providers:

- Breeze
- Coinflow

Test:

- Successful payment
- Failed payment
- Invalid amount
- Duplicate callback
- Invalid signature

---

# 27. ADMIN API

## Admin Flow

```text
Admin Login
   ↓
Dashboard
   ↓
Employee / Roles
   ↓
Players
   ↓
Transactions
   ↓
Games
   ↓
CMS
   ↓
Reports
   ↓
System Configuration
```

---

# 28. Employee Management

## Flow

```text
Create Employee
   ↓
Assign Role
   ↓
Assign Permissions
   ↓
Employee Login
   ↓
Verify Access
```

Test:

- Create employee
- Update employee
- Disable employee
- Role assignment
- Permission assignment
- Login
- Unauthorized API access

---

# 29. Roles & Permissions

Test:

- Role creation
- Role update
- Permission assignment
- Permission removal
- Access with permission
- Access without permission
- Super-admin restrictions

Expected behavior:

```text
Valid Permission → API Accessible

Missing Permission → 403 Forbidden

Missing Authentication → 401 Unauthorized
```

---

# 30. Player Management

## Flow

```text
Search Player
   ↓
View Player
   ↓
Update Player
   ↓
Restrict / Unrestrict
   ↓
Verify Player Status
```

Test:

- Search
- Player details
- Update information
- Account restriction
- Account activation
- KYC information
- Transaction information

---

# 31. Admin Transactions & Payouts

## Flow

```text
Player Transaction
   ↓
Admin Reviews
   ↓
Approve / Reject
   ↓
Transaction Status Updated
   ↓
Player Balance Updated
```

Test:

- Deposit review
- Withdrawal review
- Payout review
- Approval
- Rejection
- Duplicate action
- Invalid transaction ID
- Transaction history

---

# 32. CMS

## Flow

```text
Create Content
   ↓
Update Content
   ↓
Activate
   ↓
Display on User Side
   ↓
Verify
```

Cover:

- Banners
- Sidebar
- Modals
- Collections
- Home layout

Test:

- Create
- Update
- Delete
- Activate/deactivate
- Invalid data
- User-side visibility

---

# 33. Game Administration

## Flow

```text
Game Configuration
   ↓
Provider Configuration
   ↓
Lobby
   ↓
Game Available
   ↓
User Launches Game
```

Test:

- Game configuration
- Provider configuration
- Enable/disable game
- Game availability
- Game launch
- Invalid configuration

---

# 34. Bonus & Promotion Administration

## Flow

```text
Admin Creates Bonus / Promotion
   ↓
Configure Rules
   ↓
Approve / Activate
   ↓
User Claims / Applies
   ↓
Verify Result
```

Test:

- Create
- Update
- Activate
- Deactivate
- Approval
- Eligibility
- User claim
- Promotion validation

---

# 35. Reports

## Flow

```text
Select Report
   ↓
Apply Filters
   ↓
Generate Report
   ↓
Validate Results
```

Test:

- Date filters
- User filters
- Transaction filters
- Status filters
- Pagination
- Sorting
- Data accuracy

---

# 36. System Configuration & Logs

## System Configuration

```text
Admin Login
   ↓
Read Setting
   ↓
Update Setting
   ↓
User-Side Impact
   ↓
Verify
```

Test:

- Valid configuration
- Invalid configuration
- Permission checks
- Immediate impact
- Persistence

## System Logs

Access key:

```http
POST /admin/system-logs/access
```

Then use:

```http
x-logs-key: <access-key>
```

Test:

- Generate access key
- Access logs
- Invalid key
- Missing key
- Log filtering

---

# 37. WEBHOOK TESTING

Webhook APIs are inbound provider callbacks.

## General Webhook Flow

```text
Provider
   ↓
WulfCasino Webhook
   ↓
Signature Validation
   ↓
Payload Validation
   ↓
Transaction / Account Update
   ↓
Response
```

Test:

- Valid payload
- Invalid payload
- Missing fields
- Invalid signature
- Duplicate webhook
- Replay webhook
- Incorrect transaction ID
- Invalid user
- Provider failure

---

# 38. Webhook Providers

## Coinflow

Coinflow payin/subscription:

```text
Authorization Header
=
Dashboard Validation Key
```

Coinflow payout:

```text
x-coinflow-signature
```

Signature is generated from the raw request body.

## Breeze

Payout callbacks use:

```text
signature
```

with HMAC-SHA256 validation.

## Sumsub

Test:

- KYC callback
- Valid callback
- Invalid callback
- Invalid signature/authentication
- Duplicate callback

## AleaPlay

Uses:

```text
digest
```

with SHA-512 validation.

## SA Games

Payload uses:

```text
DES-encrypted form data
```

Test:

- Valid encrypted payload
- Invalid payload
- Decryption failure
- Invalid transaction
- Duplicate callback

---

# 39. SOCKET.IO API

REST APIs are only part of the WulfCasino backend.

Real-time functionality includes:

- Balance updates
- Notifications
- Jackpots
- Races
- Chat
- Admin live-watch

---

# 40. Socket.IO Connection

## Flow

```text
Player/Admin Login
   ↓
JWT
   ↓
Socket Connection
   ↓
JWT in Handshake
   ↓
Join Room
   ↓
Send / Receive Events
```

Authentication:

```text
handshake.auth.token
```

---

# 41. Socket Rooms

Known room patterns include:

```text
global
user:<id>
admins
watch:user:<id>
```

Test:

- Correct room access
- Unauthorized room access
- Join/leave behavior
- Event delivery
- User-specific events
- Admin events

---

# 42. Socket Event Testing

Maintain an event matrix:

| Event | Direction | Room | Trigger | Expected Result |
|---|---|---|---|---|
| Event Name | Client → Server | Room | User action | Expected response |
| Event Name | Server → Client | Room | Backend action | UI update |

For complete event details, use `SOCKET_EVENTS.md`.

---

# 43. Common API Validation Testing

Apply these tests to all API modules.

## Request Validation

- Missing required fields
- Empty fields
- Null values
- Invalid data types
- Invalid enum values
- Invalid IDs
- Invalid query parameters
- Invalid path parameters
- Duplicate requests

## Authentication

- No token
- Invalid token
- Expired token
- Incorrect token
- Valid token

## Authorization

- Correct role
- Incorrect role
- Missing permission
- Super-admin restriction
- Player accessing admin API
- Agent accessing unauthorized admin API

---

# 44. HTTP Status Code Validation

Validate appropriate responses for:

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict |
| 429 | Too many requests |
| 500 | Internal server error |

---

# 45. Response Validation

For every API validate:

## Status Code

Confirm expected HTTP status.

## Response Body

Check:

- Required fields
- Field names
- Data types
- Null handling
- Error response
- Error code
- Message
- Pagination data

## Data Consistency

Where applicable:

```text
API Request
   ↓
API Response
   ↓
Database
   ↓
User/Admin UI
```

Verify that data is consistent across all layers.

---

# 46. API Smoke Testing Flow

Use a small set of critical APIs for every build.

```text
Environment Check
   ↓
Player Login
   ↓
Player Profile
   ↓
Wallet
   ↓
Deposit
   ↓
Game Launch
   ↓
Wager
   ↓
Withdrawal
   ↓
Admin Login
   ↓
Transaction Verification
   ↓
Agent Login
   ↓
Agent Dashboard
```

## Smoke Test Checklist

- [ ] Environment is accessible
- [ ] Player login works
- [ ] Admin login works
- [ ] Agent login works
- [ ] Profile API works
- [ ] Wallet API works
- [ ] Deposit API works
- [ ] Game launch works
- [ ] Wager flow works
- [ ] Withdrawal flow works
- [ ] Admin transaction verification works
- [ ] Agent dashboard works

---

# 47. API Regression Testing Flow

Execute regression testing after major changes or deployments.

```text
Authentication
   ↓
Player/Profile
   ↓
KYC
   ↓
Wallet
   ↓
Deposit
   ↓
Withdrawal
   ↓
Games
   ↓
Bonuses
   ↓
VIP
   ↓
Race / Raffle / Jackpot
   ↓
Subscription
   ↓
Notifications / Chat
   ↓
Agent
   ↓
Admin
   ↓
Webhooks
   ↓
Socket.IO
   ↓
Security
```

---

# 48. Security Testing

The source analysis identified APIs that appear to be unguarded or require a dedicated security review.

## APIs / Areas to Review

- Entire `admin/coin-bundles` CRUD
- Entire banner-pack controller
- `admin/kyc/*`
- `admin/bonus/seed`
- `admin/promotions/seed`
- Promotion test-helper APIs
- Agent-package webhooks
- Three upload GET routes

## Security Test

For each suspected protected endpoint:

```text
Send Request Without Authentication
   ↓
Verify Response
```

Expected according to the intended authorization model:

```text
401 Unauthorized
```

or

```text
403 Forbidden
```

Also test:

- Player token
- Agent token
- Admin token
- Wrong role
- Missing permission
- Expired token

---

# 49. Routing Quirks

The source analysis identified several routing considerations.

## Admin Mounted Modules

Several modules are mounted under `/admin`, including:

- Manual deposits
- Subscription changes
- Agent notification
- Messaging

## Admin Leaderboard

The admin leaderboard intentionally uses:

```text
admin/admin/leaderboard
```

## Compliance & SEON

Compliance and SEON configuration have dual-mounted routes.

Both aliases should be verified.

## Admin Medals

The admin medals controller has an empty prefix, so its routes are mounted at the API root.

---

# 50. Empty Controllers

The following controllers are registered but currently have no routes:

- Payments
- Ledger
- Notifications
- Integration Providers

They therefore do not appear in the Postman collections.

---

# 51. Special Headers

Special headers are pre-filled where required.

Example:

```text
x-logs-key
```

System Logs access key is obtained through:

```http
POST /admin/system-logs/access
```

Other provider-specific headers should be validated according to the individual webhook documentation.

---

# 52. Request Conventions

## Request Bodies

Request bodies contain realistic examples based on validation DTOs.

Descriptions should include:

- Purpose
- Required fields
- Optional fields
- Enum options
- Expected values

## Query Parameters

- Required parameters are enabled
- Optional parameters are included but disabled
- Parameter descriptions should explain usage

## Path Parameters

Use Postman path variables:

```text
:id
```

Example values should be provided where applicable.

## Authorization

Protected requests inherit the collection-level Bearer token.

Public and webhook endpoints explicitly use:

```text
No Auth
```

---

# 53. Feature Gates

Some APIs are controlled by feature requirements such as:

- Subscription
- VIP
- Permissions
- Super-admin access
- Throttling

These requirements should be included in the Postman request descriptions.

---

# 54. QA Execution Flow

Recommended execution order for complete API testing:

```text
1. Environment
      ↓
2. Authentication
      ↓
3. Player APIs
      ↓
4. Wallet
      ↓
5. Deposit
      ↓
6. Withdrawal
      ↓
7. Games
      ↓
8. Rewards
      ↓
9. Subscription
      ↓
10. Agent
      ↓
11. Admin
      ↓
12. Webhooks
      ↓
13. Socket.IO
      ↓
14. Negative Testing
      ↓
15. Security Testing
```

---

# 55. Recommended QA Test Execution

For each request, record:

| Field | Description |
|---|---|
| API | Endpoint name |
| Method | GET/POST/PUT/PATCH/DELETE |
| Test Type | Smoke/Regression/Functional/Negative |
| Expected Status | Expected HTTP status |
| Actual Status | Actual response status |
| Expected Result | Expected behavior |
| Actual Result | Actual behavior |
| Status | Pass/Fail |
| Defect ID | JIRA/defect reference |
| Remarks | Additional information |

---

# 56. Smoke vs Regression

## Smoke Testing

Focus on critical business flows:

```text
Login
→ Profile
→ Wallet
→ Deposit
→ Game
→ Wager
→ Withdrawal
→ Admin
→ Agent
```

## Regression Testing

Cover:

```text
Authentication
Profile
KYC
Wallet
Payments
Games
Bonuses
VIP
Races
Raffles
Jackpot
Subscription
Notifications
Chat
Agent
Admin
Webhooks
Socket.IO
Security
```

---

# 57. Postman Test Script Recommendations

For login requests, automatically save the JWT.

Example concept:

```javascript
const response = pm.response.json();

if (response.token) {
    pm.environment.set("playerToken", response.token);
}
```

Use equivalent variables for:

```text
playerToken
agentToken
adminToken
```

For API requests, add automated checks for:

- Status code
- Response time
- Required response fields
- Response data types
- Error response
- Authentication behavior

---

# 58. Collection Maintenance

The collections were generated from:

```text
hestabit_Backend/apps/api/src
```

Primary source of truth:

- Controller decorators
- `@Controller`
- `@Get`
- `@Post`
- `@Put`
- `@Patch`
- `@Delete`
- `@UseGuards`
- DTOs
- PermissionsGuard
- RouterModule prefixes in `app.module.ts`

---

# 59. Keeping Postman Collections Updated

## Small Changes

For small endpoint changes:

1. Update affected Postman request
2. Update request body/parameters
3. Update description
4. Run the request
5. Export collection

## Large Changes

For significant backend changes:

1. Re-analyze controllers
2. Re-analyze DTOs
3. Re-analyze guards
4. Re-check RouterModule prefixes
5. Re-generate collections
6. Compare endpoint count
7. Run smoke testing
8. Run regression testing

---

# 60. Final API Testing Checklist

## Environment

- [ ] Environment imported
- [ ] `baseUrl` configured
- [ ] `wsUrl` configured
- [ ] Tokens configured/generated

## Authentication

- [ ] Player login
- [ ] Admin login
- [ ] Agent login
- [ ] Token generation
- [ ] Token validation
- [ ] Invalid token
- [ ] Expired token

## Player

- [ ] Registration
- [ ] Profile
- [ ] KYC
- [ ] Wallet
- [ ] Deposit
- [ ] Withdrawal
- [ ] Games
- [ ] Bonuses
- [ ] VIP
- [ ] Races
- [ ] Raffles
- [ ] Jackpot
- [ ] Subscription
- [ ] Notifications
- [ ] Chat

## Agent

- [ ] Dashboard
- [ ] Sub-agent
- [ ] Promo code
- [ ] Manual approval
- [ ] Automatic approval
- [ ] Referral
- [ ] Commission
- [ ] Payments

## Admin

- [ ] Employees
- [ ] Roles
- [ ] Permissions
- [ ] Players
- [ ] Transactions
- [ ] Payouts
- [ ] CMS
- [ ] Games
- [ ] Bonuses
- [ ] Promotions
- [ ] Reports
- [ ] System configuration
- [ ] Logs

## Webhooks

- [ ] Coinflow
- [ ] Breeze
- [ ] Sumsub
- [ ] AleaPlay
- [ ] SA Games
- [ ] Signature validation
- [ ] Duplicate callback handling

## Socket.IO

- [ ] Connection
- [ ] JWT handshake
- [ ] Rooms
- [ ] Client events
- [ ] Server events
- [ ] Balance updates
- [ ] Notifications
- [ ] Jackpot
- [ ] Races
- [ ] Chat
- [ ] Admin live-watch

## Security

- [ ] Authentication bypass
- [ ] Authorization bypass
- [ ] Role validation
- [ ] Permission validation
- [ ] Unguarded endpoints
- [ ] Invalid tokens
- [ ] Invalid signatures
- [ ] Rate limiting
- [ ] Input validation

---

# 61. Summary

The WulfCasino backend contains **858 Postman requests across 4 collections**, covering Player, Agent, Admin, Webhook/Internal, and Socket.IO functionality.

For QA execution, the recommended approach is to organize the APIs by **business flow** rather than only by backend controller/module:

```text
Authentication
    ↓
Player
    ↓
Wallet & Payments
    ↓
Games
    ↓
Rewards
    ↓
Subscription
    ↓
Agent
    ↓
Admin
    ↓
Webhooks
    ↓
Socket.IO
    ↓
Negative Testing
    ↓
Security Testing
```

This structure supports:

- API smoke testing
- API regression testing
- Functional testing
- Negative testing
- Authorization testing
- Webhook testing
- Integration testing
- Real-time Socket.IO testing
- Security review
- QA execution reporting

**Source:** NestJS controllers, DTOs, guards, and RouterModule configuration under `hestabit_Backend/apps/api/src`, analyzed in August 2026.
