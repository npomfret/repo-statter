#!/bin/bash

# Script to create a test repository with diverse commits for testing repo-statter
# This creates a realistic test scenario with multiple file types, users, and operations

set -e

REPO_DIR="test-repo"

# Clean up any existing test repo
if [ -d "$REPO_DIR" ]; then
    rm -rf "$REPO_DIR"
fi

# Create and initialize the repo
mkdir "$REPO_DIR"
cd "$REPO_DIR"
git init

# Configure different users for commits
declare -a USERS=(
    "Alice Johnson:alice@example.com"
    "Bob Smith:bob@example.com" 
    "Carol Davis:carol@example.com"
)

# Function to set git user
set_user() {
    local user_info=$1
    local name=$(echo "$user_info" | cut -d: -f1)
    local email=$(echo "$user_info" | cut -d: -f2)
    git config user.name "$name"
    git config user.email "$email"
}

# Function to create a commit with a specific user
commit_as() {
    local user_index=$1
    local message=$2
    set_user "${USERS[$user_index]}"
    git add .
    git commit -m "$message"
    sleep 1  # Ensure different timestamps
}

echo "Creating test repository with diverse commits..."

# Commit 1: Alice creates initial JavaScript files
set_user "${USERS[0]}"
cat > utils.js << 'EOF'
// Utility functions
function formatDate(date) {
    return date.toLocaleDateString();
}

function calculateSum(numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}

module.exports = { formatDate, calculateSum };
EOF

cat > app.js << 'EOF'
const { formatDate, calculateSum } = require('./utils');

class Application {
    constructor() {
        this.startTime = new Date();
        this.data = [];
    }
    
    run() {
        console.log('App started at:', formatDate(this.startTime));
        this.processData();
    }
    
    processData() {
        this.data = [1, 2, 3, 4, 5];
        const total = calculateSum(this.data);
        console.log('Total:', total);
    }
}

const app = new Application();
app.run();
EOF

commit_as 0 "Initial commit: Add basic JavaScript application structure"

# Commit 2: Bob adds TypeScript configuration and files
set_user "${USERS[1]}"
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

mkdir -p src
cat > src/types.ts << 'EOF'
export interface User {
    id: number;
    name: string;
    email: string;
    active: boolean;
}

export interface Config {
    apiUrl: string;
    timeout: number;
    retries: number;
}

export type Status = 'pending' | 'success' | 'error';
EOF

cat > src/api.ts << 'EOF'
import { User, Config, Status } from './types';

export class ApiClient {
    private config: Config;
    
    constructor(config: Config) {
        this.config = config;
    }
    
    async fetchUsers(): Promise<User[]> {
        try {
            const response = await fetch(`${this.config.apiUrl}/users`);
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }
    }
    
    async updateUserStatus(userId: number, status: Status): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.apiUrl}/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            return response.ok;
        } catch (error) {
            console.error('Failed to update user status:', error);
            return false;
        }
    }
}
EOF

commit_as 1 "Add TypeScript configuration and API client"

# Commit 3: Carol adds package.json and more JS utilities
set_user "${USERS[2]}"
cat > package.json << 'EOF'
{
  "name": "test-repo",
  "version": "1.0.0",
  "description": "Test repository for repo-statter",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "build": "tsc",
    "test": "echo \"No tests yet\" && exit 0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
EOF

cat > helpers.js << 'EOF'
// Additional helper functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

module.exports = { debounce, throttle, deepClone };
EOF

commit_as 2 "Add package.json and helper utilities"

# Commit 4: Alice refactors and adds more TypeScript
set_user "${USERS[0]}"
cat > src/logger.ts << 'EOF'
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private level: LogLevel;
    
    constructor(level: LogLevel = LogLevel.INFO) {
        this.level = level;
    }
    
    debug(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
    
    info(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.INFO) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }
    
    warn(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.WARN) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }
    
    error(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.ERROR) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}

export const logger = new Logger();
EOF

# Update utils.js with additional functions
cat >> utils.js << 'EOF'

// New utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

module.exports = { formatDate, calculateSum, isValidEmail, generateId };
EOF

commit_as 0 "Add logging system and extend utilities"

# Commit 5: Bob adds database layer
set_user "${USERS[1]}"
cat > src/database.ts << 'EOF'
import { User } from './types';
import { logger } from './logger';

export interface DatabaseConnection {
    query<T>(sql: string, params?: any[]): Promise<T[]>;
    execute(sql: string, params?: any[]): Promise<void>;
    close(): Promise<void>;
}

export class UserRepository {
    constructor(private db: DatabaseConnection) {}
    
    async findAll(): Promise<User[]> {
        try {
            logger.info('Fetching all users from database');
            const users = await this.db.query<User>(
                'SELECT id, name, email, active FROM users ORDER BY name'
            );
            logger.debug(`Found ${users.length} users`);
            return users;
        } catch (error) {
            logger.error('Failed to fetch users:', error);
            throw error;
        }
    }
    
    async findById(id: number): Promise<User | null> {
        try {
            const users = await this.db.query<User>(
                'SELECT id, name, email, active FROM users WHERE id = ?',
                [id]
            );
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            logger.error(`Failed to fetch user ${id}:`, error);
            throw error;
        }
    }
    
    async create(user: Omit<User, 'id'>): Promise<User> {
        try {
            await this.db.execute(
                'INSERT INTO users (name, email, active) VALUES (?, ?, ?)',
                [user.name, user.email, user.active]
            );
            logger.info(`Created user: ${user.name}`);
            // In a real scenario, we'd return the created user with ID
            return { id: 0, ...user };
        } catch (error) {
            logger.error('Failed to create user:', error);
            throw error;
        }
    }
}
EOF

commit_as 1 "Add database layer and user repository"

# Commit 6: Carol adds validation and error handling
set_user "${USERS[2]}"
cat > validation.js << 'EOF'
const { isValidEmail } = require('./utils');

class ValidationError extends Error {
    constructor(field, message) {
        super(`Validation error for ${field}: ${message}`);
        this.field = field;
        this.name = 'ValidationError';
    }
}

function validateUser(user) {
    const errors = [];
    
    if (!user.name || user.name.trim().length < 2) {
        errors.push(new ValidationError('name', 'Name must be at least 2 characters long'));
    }
    
    if (!user.email || !isValidEmail(user.email)) {
        errors.push(new ValidationError('email', 'Invalid email format'));
    }
    
    if (typeof user.active !== 'boolean') {
        errors.push(new ValidationError('active', 'Active status must be a boolean'));
    }
    
    if (errors.length > 0) {
        throw errors;
    }
    
    return true;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
}

module.exports = { ValidationError, validateUser, sanitizeInput };
EOF

commit_as 2 "Add input validation and error handling"

# Commit 7: Alice deletes old file and refactors
set_user "${USERS[0]}"
rm helpers.js  # Delete the helpers file
git add .

# Update app.js to use new validation
cat > app.js << 'EOF'
const { formatDate, calculateSum, generateId } = require('./utils');
const { validateUser, sanitizeInput } = require('./validation');

class Application {
    constructor() {
        this.startTime = new Date();
        this.users = [];
    }
    
    run() {
        console.log('App started at:', formatDate(this.startTime));
        this.initializeUsers();
        this.processData();
    }
    
    initializeUsers() {
        const sampleUsers = [
            { name: 'John Doe', email: 'john@example.com', active: true },
            { name: 'Jane Smith', email: 'jane@example.com', active: false }
        ];
        
        for (const user of sampleUsers) {
            try {
                validateUser(user);
                user.id = generateId();
                user.name = sanitizeInput(user.name);
                this.users.push(user);
                console.log('Added user:', user.name);
            } catch (errors) {
                console.error('User validation failed:', errors);
            }
        }
    }
    
    processData() {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const total = calculateSum(data);
        console.log('Total:', total);
        console.log('Active users:', this.users.filter(u => u.active).length);
    }
}

const app = new Application();
app.run();
EOF

commit_as 0 "Remove helpers.js and refactor app to use validation"

# Commit 8: Bob adds more TypeScript features
set_user "${USERS[1]}"
cat > src/events.ts << 'EOF'
export type EventType = 'user_created' | 'user_updated' | 'user_deleted';

export interface Event<T = any> {
    id: string;
    type: EventType;
    timestamp: Date;
    data: T;
}

export type EventHandler<T = any> = (event: Event<T>) => void | Promise<void>;

export class EventEmitter {
    private handlers = new Map<EventType, EventHandler[]>();
    
    on<T>(eventType: EventType, handler: EventHandler<T>): void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);
    }
    
    off<T>(eventType: EventType, handler: EventHandler<T>): void {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    async emit<T>(event: Event<T>): Promise<void> {
        const handlers = this.handlers.get(event.type);
        if (handlers) {
            await Promise.all(handlers.map(handler => handler(event)));
        }
    }
}
EOF

commit_as 1 "Add event system with TypeScript generics"

# Commit 9: Carol adds configuration management
set_user "${USERS[2]}"
cat > config.js << 'EOF'
const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        const defaultConfig = {
            app: {
                name: 'Test Application',
                version: '1.0.0',
                debug: false
            },
            database: {
                host: 'localhost',
                port: 5432,
                name: 'testdb'
            },
            api: {
                baseUrl: 'https://api.example.com',
                timeout: 5000,
                retries: 3
            }
        };
        
        try {
            const configPath = path.join(__dirname, 'config.json');
            if (fs.existsSync(configPath)) {
                const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return { ...defaultConfig, ...fileConfig };
            }
        } catch (error) {
            console.warn('Failed to load config file, using defaults:', error.message);
        }
        
        return defaultConfig;
    }
    
    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }
    
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!obj[k]) obj[k] = {};
            return obj[k];
        }, this.config);
        target[lastKey] = value;
    }
}

module.exports = new ConfigManager();
EOF

commit_as 2 "Add configuration management system"

# Commit 10: Alice adds final TypeScript service layer
set_user "${USERS[0]}"
cat > src/services.ts << 'EOF'
import { User, Status } from './types';
import { UserRepository } from './database';
import { EventEmitter, Event } from './events';
import { logger } from './logger';

export class UserService {
    constructor(
        private userRepo: UserRepository,
        private eventEmitter: EventEmitter
    ) {}
    
    async getAllUsers(): Promise<User[]> {
        logger.info('UserService: Getting all users');
        return await this.userRepo.findAll();
    }
    
    async getUserById(id: number): Promise<User | null> {
        logger.info(`UserService: Getting user ${id}`);
        return await this.userRepo.findById(id);
    }
    
    async createUser(userData: Omit<User, 'id'>): Promise<User> {
        logger.info(`UserService: Creating user ${userData.name}`);
        
        const user = await this.userRepo.create(userData);
        
        await this.eventEmitter.emit<User>({
            id: Math.random().toString(36),
            type: 'user_created',
            timestamp: new Date(),
            data: user
        });
        
        return user;
    }
    
    async updateUserStatus(userId: number, status: Status): Promise<void> {
        logger.info(`UserService: Updating user ${userId} status to ${status}`);
        
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        
        // Update logic would go here
        
        await this.eventEmitter.emit<{ userId: number; status: Status }>({
            id: Math.random().toString(36),
            type: 'user_updated',
            timestamp: new Date(),
            data: { userId, status }
        });
    }
}
EOF

commit_as 0 "Add service layer with event integration"

# Commit 11: Bob adds a README
set_user "${USERS[1]}"
cat > README.md << 'EOF'
# Test Repository

This is a test repository created for testing repo-statter functionality.

## Structure

- `app.js` - Main application entry point
- `utils.js` - Utility functions
- `validation.js` - Input validation
- `config.js` - Configuration management
- `src/` - TypeScript source files
  - `types.ts` - Type definitions
  - `api.ts` - API client
  - `logger.ts` - Logging system
  - `database.ts` - Database layer
  - `events.ts` - Event system
  - `services.ts` - Business logic

## Usage

```bash
npm install
npm run build
npm start
```

## Features

- TypeScript and JavaScript mixed codebase
- Event-driven architecture
- Logging system
- Database abstraction
- Input validation
- Configuration management
EOF

commit_as 1 "Add README documentation"

# Commit 12: Carol makes final cleanup
set_user "${USERS[2]}"
# Update package.json with more realistic content
cat > package.json << 'EOF'
{
  "name": "test-repo",
  "version": "1.2.0",
  "description": "Test repository for repo-statter with mixed JS/TS codebase",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "echo \"Error: no test specified\" && exit 1",
    "lint": "echo \"Linting...\" && exit 0"
  },
  "keywords": ["test", "javascript", "typescript", "demo"],
  "author": "Test Team",
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
EOF

# Add .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.env
.DS_Store
coverage/
EOF

commit_as 2 "Update package.json and add .gitignore"

cd ..

echo "✅ Test repository created successfully!"
echo "📊 Repository stats:"
echo "   - 12 commits"
echo "   - 3 contributors (Alice, Bob, Carol)"
echo "   - Mixed JavaScript and TypeScript files"
echo "   - File operations: create, edit, delete"
echo "   - Various file types: .js, .ts, .json, .md"
echo ""
echo "🚀 You can now run: npm start test-repo"