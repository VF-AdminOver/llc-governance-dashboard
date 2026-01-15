/**
 * Period data model for LLC Governance Dashboard
 * Represents a monthly financial period with all associated data
 */

export class Period {
  constructor(data = {}) {
    this.label = data.label || ""; // Format: "YYYY-MM"
    this.coreTotal = data.coreTotal || 0.00;
    this.assignedChildUnits = data.assignedChildUnits || {};
    this.overrides = data.overrides || {};
    this.careEntries = data.careEntries || [];
    this.decisions = data.decisions || [];
    this.amendments = data.amendments || [];
    this.isLocked = data.isLocked || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Validate period data
   * @param {Object} household - Household configuration for validation
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validate(household) {
    const errors = [];

    // Validate label format
    if (!/^\d{4}-\d{2}$/.test(this.label)) {
      errors.push(`Period label must be in YYYY-MM format, found ${this.label}`);
    }

    // Validate core total
    if (this.coreTotal <= 0) {
      errors.push(`Core total must be positive, found ${this.coreTotal}`);
    }

    // Validate assigned child units sum to total child units
    const totalAssigned = Object.values(this.assignedChildUnits).reduce((sum, units) => sum + units, 0);
    const expectedTotal = household.childrenCount * household.childUnitWeight;
    
    if (Math.abs(totalAssigned - expectedTotal) > 0.01) {
      errors.push(`Assigned child units (${totalAssigned}) must equal expected total (${expectedTotal})`);
    }

    // Validate each adult has assigned child units
    household.adults.forEach(adult => {
      if (!(adult.id in this.assignedChildUnits)) {
        errors.push(`Adult ${adult.name} missing assigned child units`);
      }
    });

    // Validate care entries
    this.careEntries.forEach((entry, index) => {
      if (!entry.adultId || !entry.date || !entry.task || typeof entry.hours !== 'number') {
        errors.push(`Care entry ${index + 1} missing required fields`);
      }
      if (entry.hours <= 0) {
        errors.push(`Care entry ${index + 1} has invalid hours: ${entry.hours}`);
      }
    });

    // Validate decisions
    this.decisions.forEach((decision, index) => {
      if (!decision.id || !decision.title || !decision.date) {
        errors.push(`Decision ${index + 1} missing required fields`);
      }
    });

    // Validate amendments
    this.amendments.forEach((amendment, index) => {
      if (!amendment.id || !amendment.description || !amendment.date) {
        errors.push(`Amendment ${index + 1} missing required fields`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get care value for a specific adult
   * @param {string} adultId - Adult ID to get care value for
   * @param {number} careRatePerHour - Hourly care rate
   * @returns {number} Total care value for the adult
   */
  getCareValue(adultId, careRatePerHour) {
    return this.careEntries
      .filter(entry => entry.adultId === adultId)
      .reduce((total, entry) => total + entry.hours, 0) * careRatePerHour;
  }

  /**
   * Get total care value for all adults
   * @param {number} careRatePerHour - Hourly care rate
   * @returns {Object} Care values by adult ID
   */
  getAllCareValues(careRatePerHour) {
    const careValues = {};
    this.careEntries.forEach(entry => {
      if (!careValues[entry.adultId]) {
        careValues[entry.adultId] = 0;
      }
      careValues[entry.adultId] += entry.hours * careRatePerHour;
    });
    return careValues;
  }

  /**
   * Add a care entry
   * @param {Object} careEntry - Care entry to add
   */
  addCareEntry(careEntry) {
    if (this.isLocked) {
      throw new Error("Cannot modify locked period");
    }
    
    this.careEntries.push({
      id: this._generateId(),
      ...careEntry,
      date: careEntry.date || new Date().toISOString().split('T')[0]
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Add a decision
   * @param {Object} decision - Decision to add
   */
  addDecision(decision) {
    if (this.isLocked) {
      throw new Error("Cannot modify locked period");
    }
    
    this.decisions.push({
      id: this._generateId(),
      ...decision,
      date: decision.date || new Date().toISOString().split('T')[0]
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Add an amendment
   * @param {Object} amendment - Amendment to add
   */
  addAmendment(amendment) {
    if (this.isLocked) {
      throw new Error("Cannot modify locked period");
    }
    
    this.amendments.push({
      id: this._generateId(),
      ...amendment,
      date: amendment.date || new Date().toISOString().split('T')[0]
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Lock the period to prevent further modifications
   */
  lock() {
    this.isLocked = true;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Unlock the period to allow modifications
   */
  unlock() {
    this.isLocked = false;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Generate a unique ID for entries
   * @returns {string} Unique ID
   * @private
   */
  _generateId() {
    return `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export period data as JSON
   * @returns {Object} Period data in JSON format
   */
  toJSON() {
    return {
      label: this.label,
      coreTotal: this.coreTotal,
      assignedChildUnits: this.assignedChildUnits,
      overrides: this.overrides,
      careEntries: this.careEntries,
      decisions: this.decisions,
      amendments: this.amendments,
      isLocked: this.isLocked,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create period from JSON data
   * @param {Object} jsonData - JSON data to create period from
   * @returns {Period} New period instance
   */
  static fromJSON(jsonData) {
    return new Period(jsonData);
  }
}
