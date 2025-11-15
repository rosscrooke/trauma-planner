import consultantsData from '../data/consultants.json';
import rotationsData from '../data/rotations.json';
import weekendRotaData from '../data/weekendRota.json';

class DataService {
  constructor() {
    this.consultants = consultantsData.consultants;
    this.leaveReasons = consultantsData.leaveReasons;
    this.rotations = rotationsData;
    this.weekendRota = weekendRotaData.fridayWeekendRota;
    this.apiBase = '/.netlify/functions';
    // Check if running on Netlify - detect by checking if functions are available
    // In production, always try to use Netlify Functions first, fallback to localStorage if they fail
    this.isNetlify = window.location.hostname !== 'localhost' &&
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.startsWith('192.168.');
  }

  // Static data methods
  getConsultants() {
    return this.consultants;
  }

  getConsultantByInitials(initials) {
    return this.consultants.find(c => c.initials === initials);
  }

  getConsultantByName(name) {
    return this.consultants.find(c => c.name === name);
  }

  getLeaveReasons() {
    return this.leaveReasons;
  }

  getRotations() {
    return this.rotations;
  }

  getWeekendRota() {
    return this.weekendRota;
  }

  // Dynamic data methods (using Netlify Functions or localStorage)
  async getLeave() {
    if (!this.isNetlify) {
      // Use localStorage for local development
      const stored = localStorage.getItem('trauma-planner-leave');
      return stored ? JSON.parse(stored) : [];
    }

    try {
      const response = await fetch(`${this.apiBase}/leave-get`);
      if (!response.ok) {
        // Fallback to localStorage if Netlify Functions not available
        console.log('Netlify Functions not available, using localStorage');
        const stored = localStorage.getItem('trauma-planner-leave');
        return stored ? JSON.parse(stored) : [];
      }
      const data = await response.json();
      return data.leave || [];
    } catch (error) {
      console.error('Error fetching leave, falling back to localStorage:', error);
      const stored = localStorage.getItem('trauma-planner-leave');
      return stored ? JSON.parse(stored) : [];
    }
  }

  async addLeave(leaveEntry) {
    if (!this.isNetlify) {
      // Use localStorage for local development
      const existing = await this.getLeave();
      const newEntry = {
        ...leaveEntry,
        id: leaveEntry.id || Date.now() + Math.random()
      };
      const updated = [...existing, newEntry];
      localStorage.setItem('trauma-planner-leave', JSON.stringify(updated));
      return { entry: newEntry };
    }

    try {
      const response = await fetch(`${this.apiBase}/leave-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveEntry)
      });
      if (!response.ok) {
        // Fallback to localStorage if Netlify Functions not available
        console.log('Netlify Functions not available, using localStorage');
        const existing = await this.getLeave();
        const newEntry = {
          ...leaveEntry,
          id: leaveEntry.id || Date.now() + Math.random()
        };
        const updated = [...existing, newEntry];
        localStorage.setItem('trauma-planner-leave', JSON.stringify(updated));
        return { entry: newEntry };
      }
      return await response.json();
    } catch (error) {
      console.error('Error adding leave, falling back to localStorage:', error);
      // Fallback to localStorage
      const existing = await this.getLeave();
      const newEntry = {
        ...leaveEntry,
        id: leaveEntry.id || Date.now() + Math.random()
      };
      const updated = [...existing, newEntry];
      localStorage.setItem('trauma-planner-leave', JSON.stringify(updated));
      return { entry: newEntry };
    }
  }

  async removeLeave(leaveId) {
    if (!this.isNetlify) {
      // Use localStorage for local development
      const existing = await this.getLeave();
      const updated = existing.filter(entry => entry.id !== leaveId);
      localStorage.setItem('trauma-planner-leave', JSON.stringify(updated));
      return { success: true };
    }

    try {
      const response = await fetch(`${this.apiBase}/leave-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId })
      });
      if (!response.ok) throw new Error('Failed to remove leave');
      return await response.json();
    } catch (error) {
      console.error('Error removing leave:', error);
      throw error;
    }
  }

  async getSwaps() {
    if (!this.isNetlify) {
      // Use localStorage for local development
      const stored = localStorage.getItem('trauma-planner-swaps');
      return stored ? JSON.parse(stored) : {};
    }

    try {
      const response = await fetch(`${this.apiBase}/swaps-get`);
      if (!response.ok) throw new Error('Failed to fetch swaps');
      const data = await response.json();
      return data.swaps || {};
    } catch (error) {
      console.error('Error fetching swaps:', error);
      return {};
    }
  }

  async addSwap(weekDay, swap) {
    if (!this.isNetlify) {
      // Use localStorage for local development
      const existing = await this.getSwaps();
      existing[weekDay] = swap;
      localStorage.setItem('trauma-planner-swaps', JSON.stringify(existing));
      return { success: true };
    }

    try {
      const response = await fetch(`${this.apiBase}/swaps-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekDay, swap })
      });
      if (!response.ok) throw new Error('Failed to add swap');
      return await response.json();
    } catch (error) {
      console.error('Error adding swap:', error);
      throw error;
    }
  }

  async getOverrides() {
    if (!this.isNetlify) {
      // Use localStorage for local development
      const stored = localStorage.getItem('trauma-planner-overrides');
      return stored ? JSON.parse(stored) : { packhamClarke: {}, bakerBick: {} };
    }

    try {
      const response = await fetch(`${this.apiBase}/overrides-get`);
      if (!response.ok) throw new Error('Failed to fetch overrides');
      const data = await response.json();
      return data.overrides || { packhamClarke: {}, bakerBick: {} };
    } catch (error) {
      console.error('Error fetching overrides:', error);
      return { packhamClarke: {}, bakerBick: {} };
    }
  }

  async updateOverrides(overrides) {
    if (!this.isNetlify) {
      // Use localStorage for local development
      localStorage.setItem('trauma-planner-overrides', JSON.stringify(overrides));
      return { success: true };
    }

    try {
      const response = await fetch(`${this.apiBase}/overrides-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides)
      });
      if (!response.ok) throw new Error('Failed to update overrides');
      return await response.json();
    } catch (error) {
      console.error('Error updating overrides:', error);
      throw error;
    }
  }
}

export default new DataService();