// Huddle Management System
// Manages collaborative development sessions

const fs = require('fs').promises;
const path = require('path');

class HuddleManager {
  constructor(dataPath = './scripts/huddles/data') {
    this.dataPath = dataPath;
    this.huddles = new Map();
    this.huddleIdCounter = 0;
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.access(this.dataPath);
    } catch {
      await fs.mkdir(this.dataPath, { recursive: true });
    }
  }

  async load() {
    try {
      const files = await fs.readdir(this.dataPath);
      const huddleFiles = files.filter(file => file.startsWith('huddle-') && file.endsWith('.json'));
      
      for (const file of huddleFiles) {
        const filePath = path.join(this.dataPath, file);
        const data = await fs.readFile(filePath, 'utf8');
        const huddle = JSON.parse(data);
        this.huddles.set(huddle.huddleId, huddle);
        
        // Update counter
        const idNumber = parseInt(huddle.huddleId.split('-')[2]);
        if (idNumber > this.huddleIdCounter) {
          this.huddleIdCounter = idNumber;
        }
      }
    } catch (error) {
      console.error('Error loading huddles:', error);
    }
  }

  async save() {
    try {
      for (const [huddleId, huddle] of this.huddles) {
        const filePath = path.join(this.dataPath, `huddle-${huddleId.split('-')[2]}.json`);
        await fs.writeFile(filePath, JSON.stringify(huddle, null, 2));
      }
    } catch (error) {
      console.error('Error saving huddles:', error);
      throw error;
    }
  }

  generateHuddleId() {
    this.huddleIdCounter++;
    return `HUD-${new Date().getFullYear()}-${this.huddleIdCounter.toString().padStart(3, '0')}`;
  }

  async createHuddle(config) {
    const huddle = {
      huddleId: this.generateHuddleId(),
      type: config.type || 'general',
      title: config.title,
      duration: config.duration || 30,
      participants: config.participants || [],
      agenda: config.agenda || [],
      goals: config.goals || [],
      prerequisites: config.prerequisites || [],
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      decisions: [],
      actionItems: [],
      notes: [],
      context: config.context || {}
    };

    this.huddles.set(huddle.huddleId, huddle);
    await this.save();
    
    console.log(`Created huddle: ${huddle.huddleId} - ${huddle.title}`);
    return huddle;
  }

  async getHuddle(huddleId) {
    return this.huddles.get(huddleId);
  }

  async updateHuddle(huddleId, updates) {
    const huddle = this.huddles.get(huddleId);
    if (!huddle) {
      throw new Error(`Huddle ${huddleId} not found`);
    }
    
    Object.assign(huddle, updates);
    await this.save();
    return huddle;
  }

  async startHuddle(huddleId) {
    return this.updateHuddle(huddleId, {
      status: 'active',
      startTime: new Date().toISOString()
    });
  }

  async endHuddle(huddleId) {
    const huddle = await this.getHuddle(huddleId);
    if (!huddle) {
      throw new Error(`Huddle ${huddleId} not found`);
    }

    const endTime = new Date();
    const startTime = huddle.startTime ? new Date(huddle.startTime) : endTime;
    const actualDuration = Math.round((endTime - startTime) / (1000 * 60)); // minutes

    return this.updateHuddle(huddleId, {
      status: 'completed',
      endTime: endTime.toISOString(),
      actualDuration: actualDuration
    });
  }

  async addDecision(huddleId, decision, owner) {
    const huddle = await this.getHuddle(huddleId);
    if (!huddle) {
      throw new Error(`Huddle ${huddleId} not found`);
    }

    const decisionEntry = {
      id: this.generateId(),
      text: decision,
      owner: owner,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    huddle.decisions.push(decisionEntry);
    await this.save();
    
    return decisionEntry;
  }

  async addActionItem(huddleId, action, assignee, dueDate) {
    const huddle = await this.getHuddle(huddleId);
    if (!huddle) {
      throw new Error(`Huddle ${huddleId} not found`);
    }

    const actionItem = {
      id: this.generateId(),
      text: action,
      assignee: assignee,
      dueDate: dueDate,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    huddle.actionItems.push(actionItem);
    await this.save();
    
    return actionItem;
  }

  async addNote(huddleId, note) {
    const huddle = await this.getHuddle(huddleId);
    if (!huddle) {
      throw new Error(`Huddle ${huddleId} not found`);
    }

    const noteEntry = {
      id: this.generateId(),
      text: note,
      timestamp: new Date().toISOString()
    };

    huddle.notes.push(noteEntry);
    await this.save();
    
    return noteEntry;
  }

  async searchHuddles(criteria = {}) {
    const results = [];
    
    for (const [huddleId, huddle] of this.huddles) {
      if (this.matchesCriteria(huddle, criteria)) {
        results.push(huddle);
      }
    }
    
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  matchesCriteria(huddle, criteria) {
    if (criteria.type && huddle.type !== criteria.type) return false;
    if (criteria.status && huddle.status !== criteria.status) return false;
    if (criteria.participant && !huddle.participants.includes(criteria.participant)) return false;
    
    if (criteria.dateRange) {
      const [start, end] = criteria.dateRange.split('..');
      const huddleDate = new Date(huddle.createdAt);
      if (start && huddleDate < new Date(start)) return false;
      if (end && huddleDate > new Date(end)) return false;
    }
    
    if (criteria.search && !huddle.title.toLowerCase().includes(criteria.search.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  async getActiveHuddles() {
    return this.searchHuddles({ status: 'active' });
  }

  async getScheduledHuddles() {
    return this.searchHuddles({ status: 'scheduled' });
  }

  async getCompletedHuddles() {
    return this.searchHuddles({ status: 'completed' });
  }

  async getHuddlesByType(type) {
    return this.searchHuddles({ type: type });
  }

  async getHuddlesByParticipant(participant) {
    return this.searchHuddles({ participant: participant });
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  async generateSummary(huddleId) {
    const huddle = await this.getHuddle(huddleId);
    if (!huddle) {
      throw new Error(`Huddle ${huddleId} not found`);
    }

    const summary = {
      huddleId: huddle.huddleId,
      title: huddle.title,
      type: huddle.type,
      status: huddle.status,
      duration: huddle.actualDuration || huddle.duration,
      participants: huddle.participants,
      decisions: huddle.decisions.map(d => d.text),
      actionItems: huddle.actionItems.map(a => ({
        text: a.text,
        assignee: a.assignee,
        dueDate: a.dueDate,
        status: a.status
      })),
      notes: huddle.notes.map(n => n.text),
      startTime: huddle.startTime,
      endTime: huddle.endTime
    };

    return summary;
  }

  async exportHuddles(format = 'json', criteria = {}) {
    const huddles = await this.searchHuddles(criteria);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(huddles, null, 2);
      
      case 'csv':
        const headers = ['huddleId', 'type', 'title', 'status', 'duration', 'participants', 'createdAt'];
        const csv = [
          headers.join(','),
          ...huddles.map(huddle => 
            headers.map(header => {
              const value = header === 'participants' 
                ? huddle[header].join(';')
                : huddle[header] || '';
              return `"${value.toString().replace(/"/g, '""')}"`;
            }).join(',')
          )
        ].join('\n');
        return csv;
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

// Action Item Tracker
class ActionItemTracker {
  constructor() {
    this.actionItems = new Map();
  }

  addActionItem(huddleId, action) {
    const actionId = this.generateId();
    this.actionItems.set(actionId, {
      ...action,
      huddleId: huddleId,
      status: 'pending',
      createdAt: new Date()
    });
    return actionId;
  }

  updateStatus(actionId, status, notes = '') {
    const action = this.actionItems.get(actionId);
    if (action) {
      action.status = status;
      action.updatedAt = new Date();
      action.notes = notes;
    }
  }

  getOverdueItems() {
    const now = new Date();
    return Array.from(this.actionItems.values())
      .filter(item => item.status === 'pending' && item.dueDate < now);
  }

  getHuddleActions(huddleId) {
    return Array.from(this.actionItems.values())
      .filter(item => item.huddleId === huddleId);
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Huddle Metrics Calculator
class HuddleMetrics {
  constructor(huddleData) {
    this.huddles = huddleData;
  }

  calculateParticipationRate() {
    const totalInvited = this.huddles.reduce((sum, huddle) => 
      sum + huddle.participants.length, 0);
    const totalAttended = this.huddles.reduce((sum, huddle) => 
      sum + (huddle.attendedParticipants ? huddle.attendedParticipants.length : huddle.participants.length), 0);
    
    return totalInvited > 0 ? (totalAttended / totalInvited) * 100 : 0;
  }

  calculateDecisionVelocity() {
    const totalDecisions = this.huddles.reduce((sum, huddle) => 
      sum + huddle.decisions.length, 0);
    const totalDuration = this.huddles.reduce((sum, huddle) => 
      sum + (huddle.actualDuration || huddle.duration), 0);
    
    return totalDuration > 0 ? totalDecisions / (totalDuration / 60) : 0;
  }

  calculateActionCompletionRate() {
    const totalActions = this.huddles.reduce((sum, huddle) => 
      sum + huddle.actionItems.length, 0);
    const completedActions = this.huddles.reduce((sum, huddle) => 
      sum + huddle.actionItems.filter(item => item.status === 'completed').length, 0);
    
    return totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
  }

  calculateEffectivenessScore() {
    const participationRate = this.calculateParticipationRate();
    const decisionVelocity = this.calculateDecisionVelocity();
    const actionCompletionRate = this.calculateActionCompletionRate();
    
    // Weighted average
    return (participationRate * 0.3) + (decisionVelocity * 0.4) + (actionCompletionRate * 0.3);
  }

  getHuddleBreakdown() {
    const breakdown = {};
    
    for (const huddle of this.huddles) {
      if (!breakdown[huddle.type]) {
        breakdown[huddle.type] = {
          count: 0,
          avgDuration: 0,
          totalDuration: 0,
          avgParticipants: 0,
          totalParticipants: 0
        };
      }
      
      breakdown[huddle.type].count++;
      breakdown[huddle.type].totalDuration += huddle.actualDuration || huddle.duration;
      breakdown[huddle.type].totalParticipants += huddle.participants.length;
    }
    
    // Calculate averages
    for (const type in breakdown) {
      const stats = breakdown[type];
      stats.avgDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
      stats.avgParticipants = stats.count > 0 ? stats.totalParticipants / stats.count : 0;
    }
    
    return breakdown;
  }
}

// Huddle Session Manager
class HuddleSession {
  constructor(huddleId, participants) {
    this.huddleId = huddleId;
    this.participants = participants;
    this.startTime = new Date();
    this.decisions = [];
    this.actionItems = [];
    this.notes = [];
    this.status = 'active';
  }

  addDecision(decision, owner) {
    this.decisions.push({
      id: this.generateId(),
      text: decision,
      owner: owner,
      timestamp: new Date(),
      status: 'pending'
    });
  }

  addActionItem(action, assignee, dueDate) {
    this.actionItems.push({
      id: this.generateId(),
      text: action,
      assignee: assignee,
      dueDate: dueDate,
      status: 'pending',
      timestamp: new Date()
    });
  }

  addNote(note) {
    this.notes.push({
      id: this.generateId(),
      text: note,
      timestamp: new Date()
    });
  }

  endSession() {
    this.endTime = new Date();
    this.status = 'completed';
    this.duration = this.endTime - this.startTime;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = {
  HuddleManager,
  ActionItemTracker,
  HuddleMetrics,
  HuddleSession
};
