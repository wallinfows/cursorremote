# 🦫 WoodChuck's Guide to Coding (wc)

*"How much code could a woodchuck chuck if a woodchuck could chuck code?"*

## 🎯 Mission Statement

The WoodChuck's Guide to Coding is our living knowledge base that captures solutions, patterns, and lessons learned during the RemoteCursor development journey. Every problem solved becomes a documented solution for future reference.

## 📚 Quick Reference

### Alias: `wc`
- **Usage**: `wc <topic>` - Search for solutions
- **Add**: `wc add <problem> <solution>` - Document new solution
- **Update**: `wc update <topic> <new-info>` - Update existing solution

## 🏗️ Architecture Patterns

### 1. **WebSocket Communication Pattern**
**Problem**: Need reliable bidirectional communication between components
**Solution**: Implement WebSocket bridge with heartbeat and reconnection logic
```javascript
// WebSocket Bridge Pattern
class WebSocketBridge {
  constructor(url, options = {}) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.onConnected();
    this.ws.onclose = () => this.onDisconnected();
    this.ws.onerror = (error) => this.onError(error);
    this.ws.onmessage = (event) => this.onMessage(event);
  }

  onConnected() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.startHeartbeat();
  }

  onDisconnected() {
    console.log('WebSocket disconnected');
    this.stopHeartbeat();
    this.attemptReconnect();
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat', timestamp: Date.now() });
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    }
  }
}
```

### 2. **Error Boundary Pattern**
**Problem**: Need to handle errors gracefully without crashing the entire application
**Solution**: Implement error boundaries with fallback UI and error reporting
```javascript
// Error Boundary Pattern
class ErrorBoundary {
  constructor() {
    this.errorHandlers = new Map();
    this.globalErrorHandler = this.handleGlobalError.bind(this);
    window.addEventListener('error', this.globalErrorHandler);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  handleGlobalError(event) {
    const error = {
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString()
    };
    this.reportError(error);
  }

  handleUnhandledRejection(event) {
    const error = {
      type: 'unhandledrejection',
      reason: event.reason,
      timestamp: new Date().toISOString()
    };
    this.reportError(error);
  }

  reportError(error) {
    // Send to error tracking service
    console.error('Error reported:', error);
    // Could send to Sentry, LogRocket, etc.
  }
}
```

### 3. **State Management Pattern**
**Problem**: Need consistent state management across components
**Solution**: Implement a simple state store with pub/sub pattern
```javascript
// State Management Pattern
class StateStore {
  constructor(initialState = {}) {
    this.state = initialState;
    this.subscribers = new Map();
    this.subscriberId = 0;
  }

  subscribe(callback) {
    const id = ++this.subscriberId;
    this.subscribers.set(id, callback);
    return () => this.subscribers.delete(id);
  }

  setState(updates) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.notifySubscribers(prevState, this.state);
  }

  getState() {
    return { ...this.state };
  }

  notifySubscribers(prevState, newState) {
    this.subscribers.forEach(callback => {
      try {
        callback(newState, prevState);
      } catch (error) {
        console.error('State subscriber error:', error);
      }
    });
  }
}
```

## 🔧 Development Solutions

### 1. **PowerShell Execution Policy Issues**
**Problem**: Scripts blocked by execution policy
**Solution**: 
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run script with bypass (temporary)
PowerShell -ExecutionPolicy Bypass -File script.ps1
```

### 2. **Node.js Process Management**
**Problem**: Multiple Node.js processes causing conflicts
**Solution**: Use process managers and proper cleanup
```javascript
// Process Management Pattern
class ProcessManager {
  constructor() {
    this.processes = new Map();
    this.setupGracefulShutdown();
  }

  addProcess(name, process) {
    this.processes.set(name, process);
    process.on('exit', (code) => {
      console.log(`Process ${name} exited with code ${code}`);
      this.processes.delete(name);
    });
  }

  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        this.shutdownAll();
      });
    });
  }

  async shutdownAll() {
    const shutdownPromises = Array.from(this.processes.entries()).map(([name, proc]) => {
      return new Promise((resolve) => {
        proc.on('exit', () => resolve());
        proc.kill('SIGTERM');
        // Force kill after 5 seconds
        setTimeout(() => {
          proc.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    });

    await Promise.all(shutdownPromises);
    process.exit(0);
  }
}
```

### 3. **Git Workflow Issues**
**Problem**: Merge conflicts and branch management
**Solution**: Establish clear Git workflow
```bash
# Feature branch workflow
git checkout -b feature/new-feature
# ... make changes ...
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Merge with main
git checkout main
git pull origin main
git merge feature/new-feature
git push origin main

# Clean up
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

## 🚨 Error Solutions

### 1. **WebSocket Connection Failures**
**Problem**: WebSocket connections dropping or failing to establish
**Solution**: Implement robust connection handling
```javascript
// WebSocket Connection Recovery
class RobustWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      maxRetries: 5,
      retryDelay: 1000,
      exponentialBackoff: true,
      ...options
    };
    this.retryCount = 0;
    this.isConnecting = false;
    this.connect();
  }

  connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      this.isConnecting = false;
      this.retryCount = 0;
      this.onConnected();
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      if (!event.wasClean) {
        this.handleConnectionError(new Error('Connection closed unexpectedly'));
      }
    };

    this.ws.onerror = (error) => {
      this.handleConnectionError(error);
    };
  }

  handleConnectionError(error) {
    console.error('WebSocket connection error:', error);
    
    if (this.retryCount < this.options.maxRetries) {
      this.retryCount++;
      const delay = this.options.exponentialBackoff 
        ? this.options.retryDelay * Math.pow(2, this.retryCount - 1)
        : this.options.retryDelay;
      
      setTimeout(() => this.connect(), delay);
    } else {
      this.onMaxRetriesExceeded();
    }
  }
}
```

### 2. **Memory Leaks in Node.js**
**Problem**: Memory usage growing over time
**Solution**: Implement memory monitoring and cleanup
```javascript
// Memory Leak Detection
class MemoryMonitor {
  constructor() {
    this.baselineMemory = process.memoryUsage();
    this.monitoringInterval = null;
  }

  startMonitoring(intervalMs = 30000) {
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  checkMemoryUsage() {
    const currentMemory = process.memoryUsage();
    const memoryIncrease = {
      rss: currentMemory.rss - this.baselineMemory.rss,
      heapUsed: currentMemory.heapUsed - this.baselineMemory.heapUsed,
      heapTotal: currentMemory.heapTotal - this.baselineMemory.heapTotal
    };

    // Alert if memory usage increased significantly
    if (memoryIncrease.heapUsed > 50 * 1024 * 1024) { // 50MB
      console.warn('Potential memory leak detected:', memoryIncrease);
      this.triggerGarbageCollection();
    }
  }

  triggerGarbageCollection() {
    if (global.gc) {
      global.gc();
      console.log('Garbage collection triggered');
    }
  }
}
```

## 🛠️ Development Tools

### 1. **Health Monitoring Script**
**Problem**: Need to monitor system health during development
**Solution**: PowerShell health monitoring script
```powershell
# Usage: .\health-monitor.ps1 -Continuous -Interval 30
# Features: CPU, memory, disk, process monitoring
```

### 2. **Error Tracking Setup**
**Problem**: Need to track and analyze errors
**Solution**: Structured error logging
```javascript
// Error Tracking Setup
class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 1000;
  }

  trackError(error, context = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      severity: this.calculateSeverity(error),
      resolved: false
    };

    this.errors.push(errorEntry);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    this.persistError(errorEntry);
  }

  calculateSeverity(error) {
    if (error.message.includes('CRITICAL')) return 'CRITICAL';
    if (error.message.includes('WARNING')) return 'WARNING';
    return 'INFO';
  }

  persistError(errorEntry) {
    // Save to file or send to external service
    console.error('Error tracked:', errorEntry);
  }
}
```

## 📊 Performance Solutions

### 1. **Database Connection Pooling**
**Problem**: Database connections exhausting resources
**Solution**: Implement connection pooling
```javascript
// Connection Pool Pattern
class ConnectionPool {
  constructor(config) {
    this.config = config;
    this.pool = [];
    this.maxConnections = config.maxConnections || 10;
    this.minConnections = config.minConnections || 2;
    this.initialize();
  }

  async initialize() {
    for (let i = 0; i < this.minConnections; i++) {
      await this.createConnection();
    }
  }

  async getConnection() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    
    if (this.pool.length < this.maxConnections) {
      return await this.createConnection();
    }
    
    // Wait for available connection
    return new Promise(resolve => {
      const checkPool = () => {
        if (this.pool.length > 0) {
          resolve(this.pool.pop());
        } else {
          setTimeout(checkPool, 100);
        }
      };
      checkPool();
    });
  }

  releaseConnection(connection) {
    if (this.pool.length < this.maxConnections) {
      this.pool.push(connection);
    } else {
      connection.close();
    }
  }
}
```

### 2. **Caching Strategy**
**Problem**: Repeated expensive operations
**Solution**: Implement intelligent caching
```javascript
// Caching Strategy
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
    this.ttl = 300000; // 5 minutes
  }

  set(key, value, ttl = this.ttl) {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
```

## 🔒 Security Solutions

### 1. **Input Validation**
**Problem**: Malicious input causing security vulnerabilities
**Solution**: Comprehensive input validation
```javascript
// Input Validation Pattern
class InputValidator {
  static validateString(input, options = {}) {
    const {
      minLength = 0,
      maxLength = 1000,
      pattern = null,
      required = false
    } = options;

    if (required && (!input || input.trim() === '')) {
      throw new Error('Input is required');
    }

    if (input && typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    if (input && input.length < minLength) {
      throw new Error(`Input must be at least ${minLength} characters`);
    }

    if (input && input.length > maxLength) {
      throw new Error(`Input must be no more than ${maxLength} characters`);
    }

    if (pattern && input && !pattern.test(input)) {
      throw new Error('Input does not match required pattern');
    }

    return input ? input.trim() : '';
  }

  static sanitizeHtml(input) {
    // Basic HTML sanitization
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
```

### 2. **Authentication Patterns**
**Problem**: Secure user authentication
**Solution**: JWT with refresh tokens
```javascript
// Authentication Pattern
class AuthManager {
  constructor() {
    this.accessTokenKey = 'accessToken';
    this.refreshTokenKey = 'refreshToken';
  }

  async login(credentials) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { accessToken, refreshToken } = await response.json();
      this.setTokens(accessToken, refreshToken);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  getAccessToken() {
    return localStorage.getItem(this.accessTokenKey);
  }

  async refreshAccessToken() {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { accessToken } = await response.json();
      localStorage.setItem(this.accessTokenKey, accessToken);
      return accessToken;
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  logout() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}
```

## 📝 Documentation Standards

### 1. **Code Documentation**
**Problem**: Code becoming unmaintainable without proper documentation
**Solution**: Establish documentation standards
```javascript
/**
 * @description Handles WebSocket communication between components
 * @class WebSocketBridge
 * @param {string} url - WebSocket server URL
 * @param {Object} options - Configuration options
 * @param {number} options.maxReconnectAttempts - Maximum reconnection attempts
 * @param {number} options.heartbeatInterval - Heartbeat interval in milliseconds
 * @example
 * const bridge = new WebSocketBridge('ws://localhost:8080', {
 *   maxReconnectAttempts: 5,
 *   heartbeatInterval: 30000
 * });
 */
```

### 2. **API Documentation**
**Problem**: APIs not well documented
**Solution**: Use OpenAPI/Swagger specifications
```yaml
# OpenAPI Specification Example
openapi: 3.0.0
info:
  title: RemoteCursor API
  version: 1.0.0
  description: API for RemoteCursor chat management

paths:
  /api/chats:
    post:
      summary: Submit a new chat
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                  description: Chat message content
              required:
                - message
      responses:
        '200':
          description: Chat submitted successfully
        '400':
          description: Invalid request
        '401':
          description: Unauthorized
```

## 🎯 Best Practices

### 1. **Code Organization**
- Use consistent file naming conventions
- Organize code by feature, not type
- Keep functions small and focused
- Use meaningful variable and function names

### 2. **Error Handling**
- Always handle errors explicitly
- Use try-catch blocks appropriately
- Log errors with context
- Provide user-friendly error messages

### 3. **Testing**
- Write tests for critical functionality
- Use descriptive test names
- Test edge cases and error conditions
- Maintain good test coverage

### 4. **Performance**
- Profile code regularly
- Optimize bottlenecks
- Use appropriate data structures
- Implement caching where beneficial

## 📚 Learning Resources

### 1. **WebSocket Development**
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Socket.io Documentation](https://socket.io/docs/)

### 2. **Node.js Best Practices**
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practices-security.html)

### 3. **Security**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Fundamentals](https://web.dev/security/)

### 4. **Performance**
- [Web Performance Best Practices](https://web.dev/performance/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/performance/)

---

## 🦫 WoodChuck's Wisdom

*"The best code is the code that solves the problem today and can be understood tomorrow."*

**Remember**: This guide is a living document. Every solution we discover becomes part of our collective knowledge. Keep it updated, keep it practical, and keep it useful!

*Last Updated: [Current Date]*
*Version: 1.0*
