/**
 * Household data model for LLC Governance Dashboard
 * Represents the core configuration and settings for a multi-adult family or LLC
  */

export class Household {
  constructor(data = {}) {
    this.name = data.name || "Sample LLC";
    this.currency = data.currency || "USD";
    this.adults = data.adults || [];
    this.childrenCount = data.childrenCount || 0;
    this.childUnitWeight = data.childUnitWeight || 0.6;
    this.capPercent = data.capPercent || 0.30;
    this.careModel = data.careModel || "credit"; // "credit" | "stipend"
    this.careRatePerHour = data.careRatePerHour || 20.0;
    this.coreCategories = data.coreCategories || [];
    this.visionAllocPercent = data.visionAllocPercent || 0.10;
    this.emergencyMonths = data.emergencyMonths || 4;
    this.sinkingFunds = data.sinkingFunds || [];
    this.governance = data.governance || {};
    this.documents = data.documents || {};
  }

  /**
   * Validate household configuration
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    // Validate adults count (3 to 5)
    if (this.adults.length < 3 || this.adults.length > 5) {
      errors.push(`Household must have 3-5 adults, found ${this.adults.length}`);
    }

    // Validate each adult has required fields
    this.adults.forEach((adult, index) => {
      if (!adult.id || !adult.name) {
        errors.push(`Adult ${index + 1} missing required id or name`);
      }
      if (typeof adult.netIncome !== 'number' || adult.netIncome < 0) {
        errors.push(`Adult ${adult.name} has invalid netIncome: ${adult.netIncome}`);
      }
    });

    // Validate child unit weight
    if (this.childUnitWeight < 0.1 || this.childUnitWeight > 1.0) {
      errors.push(`childUnitWeight must be between 0.1 and 1.0, found ${this.childUnitWeight}`);
    }

    // Validate cap percent
    if (this.capPercent < 0.05 || this.capPercent > 0.6) {
      errors.push(`capPercent must be between 0.05 and 0.6, found ${this.capPercent}`);
    }

    // Validate care model
    if (!["credit", "stipend"].includes(this.careModel)) {
      errors.push(`careModel must be "credit" or "stipend", found ${this.careModel}`);
    }

    // Validate care rate
    if (this.careRatePerHour <= 0) {
      errors.push(`careRatePerHour must be positive, found ${this.careRatePerHour}`);
    }

    // Validate vision allocation
    if (this.visionAllocPercent < 0 || this.visionAllocPercent > 0.5) {
      errors.push(`visionAllocPercent must be between 0 and 0.5, found ${this.visionAllocPercent}`);
    }

    // Validate emergency months
    if (this.emergencyMonths < 1 || this.emergencyMonths > 12) {
      errors.push(`emergencyMonths must be between 1 and 12, found ${this.emergencyMonths}`);
    }

    // Validate governance settings
    if (this.governance.routineQuorum && this.governance.routineQuorum > this.adults.length) {
      errors.push(`routineQuorum cannot exceed number of adults`);
    }
    if (this.governance.majorQuorum && this.governance.majorQuorum > this.adults.length) {
      errors.push(`majorQuorum cannot exceed number of adults`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get total household net income
   * @returns {number} Sum of all adult net incomes
   */
  getTotalNetIncome() {
    return this.adults.reduce((sum, adult) => sum + adult.netIncome, 0);
  }

  /**
   * Get total child units
   * @returns {number} Total child units based on count and weight
   */
  getTotalChildUnits() {
    return this.childrenCount * this.childUnitWeight;
  }

  /**
   * Get total units (adults + children)
   * @returns {number} Total units for cost sharing calculations
   */
  getTotalUnits() {
    return this.adults.length + this.getTotalChildUnits();
  }

  /**
   * Get monthly core budget estimate
   * @returns {number} Total monthly core expenses
   */
  getEstimatedMonthlyCore() {
    // This would typically be calculated from historical data
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get emergency fund target
   * @returns {number} Target emergency fund amount
   */
  getEmergencyTarget() {
    const monthlyCore = this.getEstimatedMonthlyCore();
    return monthlyCore * this.emergencyMonths;
  }

  /**
   * Get monthly vision allocation
   * @returns {number} Monthly amount for vision goals
   */
  getMonthlyVisionAllocation() {
    return this.getTotalNetIncome() * this.visionAllocPercent / 12;
  }

  /**
   * Export household data as JSON
   * @returns {Object} Household data in JSON format
   */
  toJSON() {
    return {
      name: this.name,
      currency: this.currency,
      adults: this.adults,
      childrenCount: this.childrenCount,
      childUnitWeight: this.childUnitWeight,
      capPercent: this.capPercent,
      careModel: this.careModel,
      careRatePerHour: this.careRatePerHour,
      coreCategories: this.coreCategories,
      visionAllocPercent: this.visionAllocPercent,
      emergencyMonths: this.emergencyMonths,
      sinkingFunds: this.sinkingFunds,
      governance: this.governance,
      documents: this.documents
    };
  }

  /**
   * Create household from JSON data
   * @param {Object} jsonData - JSON data to create household from
   * @returns {Household} New household instance
   */
  static fromJSON(jsonData) {
    return new Household(jsonData);
  }
}
