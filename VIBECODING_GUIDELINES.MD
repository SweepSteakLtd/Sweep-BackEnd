# VIBECODING GUIDELINES - AI Development Instructions

**IMPORTANT: You are developing features for an existing Express.js TypeScript backend. You MUST follow these exact patterns and conventions. Any deviation from these guidelines is unacceptable.**

## 🎯 Your Mission
You are implementing features in a well-structured Express.js/TypeScript backend. The codebase has specific patterns that you MUST replicate exactly. Read and internalize these rules before writing any code.

## 🛠 Technology Stack You're Working With
- **Runtime**: Node.js with ES2017+ features
- **Framework**: Express.js v5 with TypeScript
- **Database**: MongoDB with Mongoose ODM  
- **Core Libraries**: cors, body-parser, dotenv, express-validator, dayjs, axios
- **Build**: TypeScript compiler targeting ES2017

## 📁 Project Structure - WHERE to Put Your Code

```
src/
├── config/       # Environment variables and app configuration
├── handlers/     # Request handlers (controllers) - your endpoint logic goes here
├── middlewares/  # Express middleware functions for request processing
├── models/       # Mongoose schemas and models - database structure
├── routes/       # Route definitions - maps URLs to handlers
├── services/     # Business logic and external integrations
└── index.ts      # Main application entry point - DO NOT MODIFY
```

## ⚡ CRITICAL RULES - Follow These EXACTLY

### 1. Index Files Are Mandatory Barrel Exports
**EVERY folder MUST have an `index.ts` that re-exports all modules:**

```typescript
// CORRECT - Always do this in every index.ts
export * from './moduleName';
export * from './anotherModule';
```

**When you create a new file, IMMEDIATELY update the folder's index.ts**

### 2. Handler Pattern - How to Write Request Handlers

**Location**: `src/handlers/yourFeature/yourHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Brief description of what this handler does
 */
export const yourHandlerName = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Your logic here - call services, not direct DB operations
    const result = await yourService(req.body);
    
    return res.status(200).send({ 
      message: 'Success message',
      data: result 
    });
  } catch (error) {
    console.log(`HANDLER ERROR: ${error.message} 🛑`);
    return res.status(500).send({ 
      message: 'Error message',
      error: error.message 
    });
  }
};
```

**THEN update** `src/handlers/index.ts`:
```typescript
export * from './yourFeature/yourHandler';
```

### 3. Route Definition - How to Add Endpoints

**You MUST add routes to the existing array in** `src/routes/index.ts`:

```typescript
// At the top, import your handlers
import { yourHandlerName, anotherHandler } from '../handlers';

// Add to the routes array - DO NOT create new arrays
export const routes: RouteDescription[] = [
  // ... existing routes stay here ...
  {
    apiName: 'your-feature', // This becomes /api/your-feature
    endpoints: [
      {
        method: 'get',    // Must be: 'get' | 'post' | 'put' | 'patch' | 'delete'
        name: '/',         // Path after apiName
        stack: [yourHandlerName],  // Array of middlewares and handler
      },
      {
        method: 'post',
        name: '/:id',      // Supports parameters
        stack: [validationMiddleware, authMiddleware, anotherHandler],
      },
    ],
  },
];
```

**Routes are automatically prefixed with `/api/` - DON'T add it yourself**

### 4. Service Pattern - Business Logic Goes Here

**Location**: `src/services/yourService.ts`

```typescript
import { YourModel } from '../models';

export const createSomething = async (data: any): Promise<any> => {
  // Business logic here
  const result = await YourModel.create(data);
  return result;
};

export const getSomething = async (id: string): Promise<any> => {
  const result = await YourModel.findById(id);
  if (!result) {
    throw new Error('Not found');
  }
  return result;
};
```

**THEN update** `src/services/index.ts`:
```typescript
export * from './yourService';
```

### 5. Model Structure - Database Schemas

**Location**: `src/models/yourModel.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

// Define TypeScript interface
export interface IYourModel extends Document {
  name: string;
  email: string;
  createdAt: Date;
  // ... other fields
}

// Define Mongoose schema
const YourModelSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  // ... other fields
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

// Export the model
export const YourModel = mongoose.model<IYourModel>('YourModel', YourModelSchema);
```

**THEN update** `src/models/index.ts`:
```typescript
export * from './yourModel';
```

### 6. Configuration Access Pattern

**ALWAYS import configuration from** `src/config/index.ts`:

```typescript
import { secrets, config, env, links } from '../config';

// Use like this:
if (env.CURRENT === env.PRODUCTION) {
  // Production-only logic
}

const dbUri = secrets.MONGO_URI;
const frontendUrl = links.FRONTEND;
```

**To add new config**, modify `src/config/index.ts`:
```typescript
export const secrets = {
  MONGO_URI: process.env.MONGO_URI || '',
  YOUR_SECRET: process.env.YOUR_SECRET || '',
};
```

### 7. Middleware Pattern

**Location**: `src/middlewares/yourMiddleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export const yourMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Middleware logic
    // Modify req or res as needed
    
    // MUST call next() to continue
    next();
  } catch (error) {
    return res.status(400).send({ message: 'Middleware error' });
  }
};
```

**THEN update** `src/middlewares/index.ts`:
```typescript
export * from './yourMiddleware';
```

## 📝 Code Style Requirements

### Import Order - MUST Follow This Pattern
```typescript
// 1. External packages first
import * as dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

// 2. Internal imports second
import { config } from './config';
import { routes } from './routes';
import { YourService } from './services';
```

### Console Logging Format
```typescript
// Use UPPERCASE descriptions with context and emojis
console.log(`DATABASE CONNECTION ACTIVE ✅`);
console.log(`PROCESSING USER REQUEST: ${userId}`);
console.log(`SERVICE ERROR: ${error.message} 🛑`);
console.log(`ENV: ${env.CURRENT} PORT: 8080 ROUTE: ${path} METHOD: ${method}`);
```

### TypeScript Requirements
- **NEVER use `any` without a comment explaining why**
- **ALWAYS define interfaces for request/response bodies**
- **Use `type` imports when importing only types**: `import type { RequestHandler } from 'express'`
- **Define return types for all functions**

### Async/Await Rules
- **ALL handlers MUST be async**
- **ALL service functions MUST be async**
- **ALWAYS use try-catch in handlers**
- **NEVER use callbacks - only Promises**

## 🚫 What NOT to Do

### ❌ DON'T Create These Anti-Patterns:

1. **DON'T create routes outside the routes array**
```typescript
// WRONG - Never do this
app.get('/api/custom', handler); // NO!
```

2. **DON'T put business logic in handlers**
```typescript
// WRONG - Handlers should be thin
export const handler = async (req, res) => {
  // DON'T write complex logic here
  const users = await mongoose.connection.db.collection('users').find(); // NO!
};
```

3. **DON'T forget to export through index files**
```typescript
// WRONG - Always export through index.ts
import { myHandler } from '../handlers/feature/myHandler'; // NO!
// CORRECT
import { myHandler } from '../handlers'; // YES!
```

4. **DON'T use relative imports beyond immediate parent**
```typescript
// WRONG
import { something } from '../../services/nested/deep/service'; // NO!
// CORRECT  
import { something } from '../services'; // YES!
```

5. **DON'T modify the main application setup in src/index.ts**

## 📋 Implementation Checklist

When implementing a new feature, follow this EXACT order:

### Step 1: Create the Model (if needed)
- [ ] Create `src/models/yourModel.ts`
- [ ] Define interface and schema
- [ ] Update `src/models/index.ts` with export

### Step 2: Create Services
- [ ] Create `src/services/yourService.ts`
- [ ] Implement business logic functions
- [ ] Update `src/services/index.ts` with export

### Step 3: Create Handlers
- [ ] Create `src/handlers/yourFeature/` folder
- [ ] Create handler files inside
- [ ] Update `src/handlers/index.ts` with exports

### Step 4: Add Routes
- [ ] Import handlers in `src/routes/index.ts`
- [ ] Add RouteDescription object to routes array
- [ ] Verify path structure (`/api/your-feature/endpoint`)

### Step 5: Create Middlewares (if needed)
- [ ] Create `src/middlewares/yourMiddleware.ts`
- [ ] Update `src/middlewares/index.ts` with export
- [ ] Add to route stack arrays where needed

## 🎨 Example: Complete User Feature Implementation

Here's EXACTLY how you should implement a user management feature:

### 1. Model: `src/models/user.ts`
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  isActive: boolean;
  createdAt: Date;
}

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

export const User = mongoose.model<IUser>('User', UserSchema);
```

### 2. Service: `src/services/userService.ts`
```typescript
import { User, IUser } from '../models';

export const createUser = async (userData: Partial<IUser>): Promise<IUser> => {
  console.log(`CREATING NEW USER: ${userData.email}`);
  const user = await User.create(userData);
  console.log(`USER CREATED SUCCESSFULLY ✅`);
  return user;
};

export const getUserById = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};
```

### 3. Handler: `src/handlers/user/userHandlers.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { createUser, getUserById } from '../../services';

export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await createUser(req.body);
    return res.status(201).send({ 
      message: 'User created successfully',
      data: user 
    });
  } catch (error) {
    console.log(`USER CREATION ERROR: ${error.message} 🛑`);
    return res.status(400).send({ 
      message: 'Failed to create user',
      error: error.message 
    });
  }
};

export const getUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserById(req.params.id);
    return res.status(200).send({ 
      message: 'User retrieved successfully',
      data: user 
    });
  } catch (error) {
    console.log(`USER RETRIEVAL ERROR: ${error.message} 🛑`);
    return res.status(404).send({ 
      message: 'User not found',
      error: error.message 
    });
  }
};
```

### 4. Update Routes: `src/routes/index.ts`
```typescript
import { createUserHandler, getUserHandler } from '../handlers';

export const routes: RouteDescription[] = [
  // ... existing routes ...
  {
    apiName: 'users',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [createUserHandler],
      },
      {
        method: 'get',
        name: '/:id',
        stack: [getUserHandler],
      },
    ],
  },
];
```

### 5. Update All Index Files:
```typescript
// src/models/index.ts
export * from './user';

// src/services/index.ts
export * from './userService';

// src/handlers/index.ts
export * from './user/userHandlers';
```

## 🔥 Final Reminders

1. **ALWAYS maintain the existing structure** - Don't create new patterns
2. **ALWAYS update index.ts files** - Every new module must be exported
3. **ALWAYS use async/await** - No callbacks, only Promises
4. **ALWAYS follow the route structure** - Use the routes array only
5. **ALWAYS separate concerns** - Handlers → Services → Models
6. **ALWAYS use TypeScript strictly** - Define all types and interfaces
7. **ALWAYS handle errors properly** - Try-catch in handlers, throw in services
8. **ALWAYS log with context** - Use descriptive uppercase messages

## ⚠️ Before You Write Any Code

Ask yourself:
- [ ] Have I checked where similar code exists in the project?
- [ ] Am I following the exact folder structure?
- [ ] Will I update all necessary index.ts files?
- [ ] Am I using the routes array pattern correctly?
- [ ] Have I separated handler, service, and model logic?
- [ ] Am I using async/await everywhere needed?
- [ ] Have I added proper TypeScript types?

**If any answer is NO, review these guidelines again before proceeding.**

---

**REMEMBER: You are adding to an existing, well-structured codebase. Your code MUST blend seamlessly with what's already there. Follow these patterns EXACTLY.**