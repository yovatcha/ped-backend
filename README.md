# Strapi Backend Setup Guide

## 1. Initial Strapi Setup

```bash
# Create new Strapi project
npx create-strapi-app@latest coupon-backend --quickstart

# Navigate to project
cd coupon-backend

# Install required dependencies
npm install @strapi/plugin-users-permissions
```

## 2. Content-Types Configuration

### A. Store Content-Type

Navigate to: **Content-Type Builder** → **Create new collection type**

**Collection Name:** `store`

**Fields:**

```
firstName         - Text (Short text)
lastName          - Text (Short text)
phone             - Text (Short text)
email             - Email
position          - Text (Short text)
storeName         - Text (Short text) *Required
mainBusinessType  - Text (Short text)
subBusinessType   - Text (Short text)
storePhone        - Text (Short text)
address           - Text (Long text)
openTime          - Time
closeTime         - Time
openCloseDay      - JSON
facebook          - Text (Short text)
instagram         - Text (Short text)
lineOA            - Text (Short text)
premiumIdLine     - Text (Short text)
website           - Text (Short text)
googleMapLink     - Text (Long text)
shopCTPLink       - Text (Long text)
agent             - Relation: Many-to-One with User (from users-permissions)
vouchers          - Relation: One-to-Many with Voucher
```

**Important Relations:**
- Add relation: `agent` → **User (from users-permissions)** → Many Stores to One User
- Add relation: `vouchers` → One Store has Many Vouchers

### B. Voucher Content-Type

**Collection Name:** `voucher`

**Fields:**

```
voucherName       - Text (Short text) *Required
voucherDetail     - Text (Long text)
packageType       - Text (Short text)
voucherAmount     - Text (Short text)
voucherStart      - Date
voucherEnd        - Date
store             - Relation: Many-to-One with Store
collections       - Relation: One-to-Many with Collection
```

**Relations:**
- Add relation: `store` → **Store** → Many Vouchers to One Store
- Add relation: `collections` → One Voucher has Many Collections

### C. Collection Content-Type

**Collection Name:** `collection`

**Fields:**

```
type              - Text (Short text)
name              - Text (Short text) *Required
value             - Number (integer or decimal)
voucher           - Relation: Many-to-One with Voucher
```

**Relations:**
- Add relation: `voucher` → **Voucher** → Many Collections to One Voucher

## 3. Permissions Setup

Navigate to: **Settings** → **Users & Permissions Plugin** → **Roles**

### Authenticated Role (for Agents)

**Store Permissions:**
```
✓ find (with filters: user = logged-in user)
✓ findOne (own stores only)
✓ create
✓ update (own stores only)
✓ delete (own stores only)
```

**Voucher Permissions:**
```
✓ find
✓ findOne
✓ create
✓ update
✓ delete
```

**Collection Permissions:**
```
✓ find
✓ findOne
✓ create
✓ update
✓ delete
```

**Users-permissions:**
```
✓ me (to get current user info)
```

### Public Role

**Auth:**
```
✓ login
✓ register (if you want self-registration)
```

## 4. Custom Controller for Filtering (Optional but Recommended)

Create: `src/api/store/controllers/store.js`

```javascript
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::store.store', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Filter stores by logged-in user
    ctx.query = {
      ...ctx.query,
      filters: {
        ...ctx.query.filters,
        agent: user.id,
      },
      populate: {
        vouchers: {
          populate: ['collections'],
        },
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
```

## 5. Environment Setup

Create `.env` file:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret
```

## 6. CORS Configuration

Edit `config/middlewares.js`:

```javascript
module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

## 7. Run Strapi

```bash
npm run develop
```

Access admin panel at: `http://localhost:1337/admin`

## 8. Create Test User (Agent)

1. Go to **Content Manager** → **User**
2. Click **Create new entry**
3. Fill in:
   - Username: `agent1`
   - Email: `agent1@example.com`
   - Password: `Test1234!`
   - Confirmed: `true`
   - Role: `Authenticated`
4. Save

## 9. API Endpoints

Your API will be available at:

```
POST   /api/auth/local                    # Login
GET    /api/users/me                      # Get current user
GET    /api/stores                        # Get agent's stores
POST   /api/stores                        # Create store
GET    /api/stores/:id                    # Get single store
PUT    /api/stores/:id                    # Update store
DELETE /api/stores/:id                    # Delete store
GET    /api/vouchers                      # Get vouchers
POST   /api/vouchers                      # Create voucher
GET    /api/collections                   # Get collections
POST   /api/collections                   # Create collection
```

## 10. Testing with Postman/curl

**Login:**
```bash
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "agent1@example.com",
    "password": "Test1234!"
  }'
```

Save the JWT token from response and use it in subsequent requests:

**Get Stores:**
```bash
curl -X GET http://localhost:1337/api/stores \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```