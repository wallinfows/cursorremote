// Book of the Dead - Error Database Implementation
// Manages error storage, retrieval, and analytics

const fs = require('fs').promises;
const path = require('path');

class ErrorDatabase {
  constructor(dbPath = './data/errors.json') {
    this.dbPath = dbPath;
    this.errors = new Map();
    this.errorIdCounter = 0;
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    const dir = path.dirname(this.dbPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async load() {
    try {
      const data = await fs.readFile(this.dbPath, 'utf8');
      const parsed = JSON.parse(data);
      this.errors = new Map(parsed.errors);
      this.errorIdCounter = parsed.errorIdCounter || 0;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading error database:', error);
      }
      // Initialize empty database
      this.errors = new Map();
      this.errorIdCounter = 0;
    }
  }

  async save() {
    try {
      const data = {
        errors: Array.from(this.errors.entries()),
        errorIdCounter: this.errorIdCounter,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving error database:', error);
      throw error;
    }
  }

  generateErrorId() {
    this.errorIdCounter++;
    return `ERR-${new Date().getFullYear()}-${this.errorIdCounter.toString().padStart(3, '0')}`;
  }

  async add(errorEntry) {
    if (!errorEntry.errorId) {
      errorEntry.errorId = this.generateErrorId();
    }
    
    errorEntry.timestamp = errorEntry.timestamp || new Date().toISOString();
    errorEntry.status = errorEntry.status || 'DETECTED';
    
    this.errors.set(errorEntry.errorId, errorEntry);
    await this.save();
    
    console.log(`Error logged: ${errorEntry.errorId} - ${errorEntry.title}`);
    return errorEntry.errorId;
  }

  async get(errorId) {
    return this.errors.get(errorId);
  }

  async update(errorId, updates) {
    const error = this.errors.get(errorId);
    if (!error) {
      throw new Error(`Error ${errorId} not found`);
    }
    
    Object.assign(error, updates);
    await this.save();
    return error;
  }

  async updateInvestigation(errorId, investigation) {
    return this.update(errorId, { investigation });
  }

  async updateResolution(errorId, resolution) {
    return this.update(errorId, { 
      resolution,
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString()
    });
  }

  async updatePrevention(errorId, prevention) {
    return this.update(errorId, { prevention });
  }

  async search(criteria = {}) {
    const results = [];
    
    for (const [errorId, error] of this.errors) {
      if (this.matchesCriteria(error, criteria)) {
        results.push(error);
      }
    }
    
    return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  matchesCriteria(error, criteria) {
    if (criteria.component && error.component !== criteria.component) return false;
    if (criteria.severity && error.severity !== criteria.severity) return false;
    if (criteria.status && error.status !== criteria.status) return false;
    if (criteria.category && error.category !== criteria.category) return false;
    
    if (criteria.dateRange) {
      const [start, end] = criteria.dateRange.split('..');
      const errorDate = new Date(error.timestamp);
      if (start && errorDate < new Date(start)) return false;
      if (end && errorDate > new Date(end)) return false;
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      const hasTag = criteria.tags.some(tag => error.tags && error.tags.includes(tag));
      if (!hasTag) return false;
    }
    
    if (criteria.message && !error.errorMessage.toLowerCase().includes(criteria.message.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  async searchSimilar(error) {
    const similar = [];
    
    for (const [errorId, existingError] of this.errors) {
      if (errorId === error.errorId) continue;
      
      const similarity = this.calculateSimilarity(error, existingError);
      if (similarity > 0.7) { // 70% similarity threshold
        similar.push({ ...existingError, similarity });
      }
    }
    
    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  calculateSimilarity(error1, error2) {
    let score = 0;
    let total = 0;
    
    // Component similarity
    if (error1.component === error2.component) score += 1;
    total += 1;
    
    // Category similarity
    if (error1.category === error2.category) score += 1;
    total += 1;
    
    // Error code similarity
    if (error1.errorCode === error2.errorCode) score += 2;
    total += 2;
    
    // Message similarity (simple keyword matching)
    const words1 = error1.errorMessage.toLowerCase().split(/\s+/);
    const words2 = error2.errorMessage.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    const messageSimilarity = commonWords.length / Math.max(words1.length, words2.length);
    score += messageSimilarity * 2;
    total += 2;
    
    return score / total;
  }

  async getByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.search({
      dateRange: `${startOfDay.toISOString()}..${endOfDay.toISOString()}`
    });
  }

  async getByTimeRange(timeRange) {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return this.search({
      dateRange: `${startDate.toISOString()}..${now.toISOString()}`
    });
  }

  async getAll() {
    return Array.from(this.errors.values());
  }

  async getStats(criteria = {}) {
    const errors = await this.search(criteria);
    
    const stats = {
      total: errors.length,
      bySeverity: {},
      byComponent: {},
      byCategory: {},
      byStatus: {},
      resolutionRate: 0,
      avgResolutionTime: 0,
      topErrorPatterns: []
    };
    
    let resolvedCount = 0;
    let totalResolutionTime = 0;
    const patterns = new Map();
    
    for (const error of errors) {
      // Severity breakdown
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Component breakdown
      stats.byComponent[error.component] = (stats.byComponent[error.component] || 0) + 1;
      
      // Category breakdown
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // Status breakdown
      stats.byStatus[error.status] = (stats.byStatus[error.status] || 0) + 1;
      
      // Resolution metrics
      if (error.status === 'RESOLVED') {
        resolvedCount++;
        if (error.resolution && error.resolution.resolutionTime) {
          totalResolutionTime += error.resolution.resolutionTime;
        }
      }
      
      // Pattern analysis
      const patternKey = `${error.component}-${error.errorCode}`;
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          pattern: patternKey,
          count: 0,
          component: error.component,
          errorCode: error.errorCode,
          avgResolutionTime: 0,
          totalResolutionTime: 0
        });
      }
      
      const pattern = patterns.get(patternKey);
      pattern.count++;
      if (error.resolution && error.resolution.resolutionTime) {
        pattern.totalResolutionTime += error.resolution.resolutionTime;
        pattern.avgResolutionTime = pattern.totalResolutionTime / pattern.count;
      }
    }
    
    stats.resolutionRate = errors.length > 0 ? (resolvedCount / errors.length) * 100 : 0;
    stats.avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
    stats.topErrorPatterns = Array.from(patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return stats;
  }

  async export(format = 'json', criteria = {}) {
    const errors = await this.search(criteria);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(errors, null, 2);
      
      case 'csv':
        const headers = ['errorId', 'timestamp', 'severity', 'status', 'component', 'category', 'title', 'errorMessage'];
        const csv = [
          headers.join(','),
          ...errors.map(error => 
            headers.map(header => {
              const value = error[header] || '';
              return `"${value.toString().replace(/"/g, '""')}"`;
            }).join(',')
          )
        ].join('\n');
        return csv;
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async cleanup(maxAge = 365) { // Keep errors for 1 year by default
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    const toDelete = [];
    for (const [errorId, error] of this.errors) {
      if (new Date(error.timestamp) < cutoffDate) {
        toDelete.push(errorId);
      }
    }
    
    for (const errorId of toDelete) {
      this.errors.delete(errorId);
    }
    
    if (toDelete.length > 0) {
      await this.save();
      console.log(`Cleaned up ${toDelete.length} old error entries`);
    }
    
    return toDelete.length;
  }
}

// Error ID Generator
class ErrorIdGenerator {
  constructor() {
    this.counter = 0;
  }

  generate() {
    this.counter++;
    return `ERR-${new Date().getFullYear()}-${this.counter.toString().padStart(3, '0')}`;
  }
}

// Error Detector
class ErrorDetector {
  constructor(errorDatabase) {
    this.errorDatabase = errorDatabase;
  }

  detectError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      severity: this.calculateSeverity(error),
      status: 'DETECTED',
      component: context.component || 'unknown',
      category: this.categorizeError(error),
      title: this.generateTitle(error),
      description: error.message,
      errorCode: this.extractErrorCode(error),
      errorMessage: error.message,
      stackTrace: error.stack,
      context: {
        ...context,
        environment: this.getEnvironmentInfo()
      },
      tags: this.extractTags(error, context)
    };

    return this.errorDatabase.add(errorEntry);
  }

  calculateSeverity(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) return 'CRITICAL';
    if (message.includes('connection refused') || message.includes('timeout')) return 'HIGH';
    if (message.includes('warning') || message.includes('deprecated')) return 'MEDIUM';
    return 'LOW';
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('websocket') || message.includes('connection')) return 'CONNECTION_ERROR';
    if (message.includes('memory') || message.includes('process')) return 'PROCESS_ERROR';
    if (message.includes('auth') || message.includes('token')) return 'AUTH_ERROR';
    if (message.includes('database') || message.includes('sql')) return 'DATA_ERROR';
    if (message.includes('render') || message.includes('ui')) return 'UI_ERROR';
    if (message.includes('security') || message.includes('xss')) return 'SECURITY_ERROR';
    
    return 'GENERAL_ERROR';
  }

  generateTitle(error) {
    const message = error.message;
    const maxLength = 100;
    
    if (message.length <= maxLength) {
      return message;
    }
    
    return message.substring(0, maxLength - 3) + '...';
  }

  extractErrorCode(error) {
    // Try to extract error code from various sources
    if (error.code) return error.code;
    if (error.errorCode) return error.errorCode;
    if (error.name) return error.name;
    
    // Generate code from message
    const words = error.message.split(/\s+/).slice(0, 3);
    return words.map(word => word.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('_');
  }

  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    };
  }

  extractTags(error, context) {
    const tags = [];
    
    // Add component tag
    if (context.component) {
      tags.push(context.component);
    }
    
    // Add error type tags
    const message = error.message.toLowerCase();
    if (message.includes('websocket')) tags.push('websocket');
    if (message.includes('memory')) tags.push('memory');
    if (message.includes('timeout')) tags.push('timeout');
    if (message.includes('connection')) tags.push('connection');
    if (message.includes('authentication')) tags.push('auth');
    
    // Add context tags
    if (context.environment === 'production') tags.push('production');
    if (context.environment === 'development') tags.push('development');
    
    return tags;
  }
}

module.exports = {
  ErrorDatabase,
  ErrorIdGenerator,
  ErrorDetector
};
