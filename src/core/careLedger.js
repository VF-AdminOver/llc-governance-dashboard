/**
 * Care Ledger calculator for LLC Governance Dashboard
 * Handles care work compensation using either credit or stipend models
 */

export class CareLedgerCalculator {
  constructor(household, period) {
    this.household = household;
    this.period = period;
  }

  /**
   * Apply care ledger model and calculate adjustments
   * @param {Object} unitResult - Result from unit method calculation
   * @returns {Object} Care ledger result with adjustments and preview
   */
  applyCareLedger(unitResult) {
    const result = {
      careValues: {},
      nextMonthCoreCredit: {},
      nextMonthCoreIncrease: 0,
      payees: [],
      summary: {},
      auditTrail: []
    };

    // Calculate care values for each adult
    this.household.adults.forEach(adult => {
      const careValue = this.period.getCareValue(adult.id, this.household.careRatePerHour);
      result.careValues[adult.id] = careValue;
      
      result.auditTrail.push(`${adult.name}: ${this.period.careEntries.filter(e => e.adultId === adult.id).length} entries, ${this.period.careEntries.filter(e => e.adultId === adult.id).reduce((sum, e) => sum + e.hours, 0)} hours = ${careValue.toFixed(2)} ${this.household.currency}`);
    });

    // Apply care model
    if (this.household.careModel === "credit") {
      result.auditTrail.push(`\nApplying CREDIT model:`);
      
      // Credits reduce next month's core share
      this.household.adults.forEach(adult => {
        const careValue = result.careValues[adult.id];
        result.nextMonthCoreCredit[adult.id] = -careValue; // Negative for credit
        
        if (careValue > 0) {
          result.auditTrail.push(`${adult.name}: ${careValue.toFixed(2)} ${this.household.currency} credit to next month's core share`);
        }
      });
      
      result.summary.model = "credit";
      result.summary.description = "Care work credits reduce next month's core contributions";
      
    } else if (this.household.careModel === "stipend") {
      result.auditTrail.push(`\nApplying STIPEND model:`);
      
      // Stipends are paid out of core, increasing next month's total
      const totalCareValue = Object.values(result.careValues).reduce((sum, value) => sum + value, 0);
      result.nextMonthCoreIncrease = totalCareValue;
      
      // Record payees for stipends
      this.household.adults.forEach(adult => {
        const careValue = result.careValues[adult.id];
        if (careValue > 0) {
          result.payees.push({
            adultId: adult.id,
            adultName: adult.name,
            amount: careValue,
            description: `Care work stipend for ${this.period.label}`
          });
          
          result.auditTrail.push(`${adult.name}: ${careValue.toFixed(2)} ${this.household.currency} stipend payment`);
        }
      });
      
      result.auditTrail.push(`Total stipend payments: ${totalCareValue.toFixed(2)} ${this.household.currency}`);
      result.auditTrail.push(`Next month's core total will increase by: ${totalCareValue.toFixed(2)} ${this.household.currency}`);
      
      result.summary.model = "stipend";
      result.summary.description = "Care work stipends are paid from core budget";
    }

    // Calculate next period core preview
    result.summary.nextPeriodCorePreview = this._calculateNextPeriodCorePreview(unitResult, result);

    return result;
  }

  /**
   * Calculate next period core preview
   * @param {Object} unitResult - Unit method result
   * @param {Object} careResult - Care ledger result
   * @returns {Object} Next period preview
   * @private
   */
  _calculateNextPeriodCorePreview(unitResult, careResult) {
    const preview = {
      estimatedCoreTotal: this.period.coreTotal,
      adultShares: {},
      totalShares: 0,
      notes: []
    };

    // Start with current period's core total
    if (this.household.careModel === "stipend") {
      preview.estimatedCoreTotal += careResult.nextMonthCoreIncrease;
      preview.notes.push(`Core total increased by ${careResult.nextMonthCoreIncrease.toFixed(2)} ${this.household.currency} for care stipends`);
    }

    // Calculate estimated shares for next period
    unitResult.adults.forEach(adult => {
      let estimatedShare = adult.finalShare;
      
      if (this.household.careModel === "credit") {
        const careCredit = careResult.nextMonthCoreCredit[adult.id] || 0;
        estimatedShare += careCredit;
        
        if (careCredit < 0) {
          preview.notes.push(`${adult.adultName}: Share reduced by ${Math.abs(careCredit).toFixed(2)} ${this.household.currency} for care credit`);
        }
      }
      
      preview.adultShares[adult.adultId] = {
        adultName: adult.adultName,
        baseShare: adult.finalShare,
        careAdjustment: this.household.careModel === "credit" ? (careResult.nextMonthCoreCredit[adult.id] || 0) : 0,
        estimatedShare: Math.max(0, estimatedShare) // Ensure share doesn't go negative
      };
      
      preview.totalShares += preview.adultShares[adult.adultId].estimatedShare;
    });

    // Check for balance
    const difference = preview.totalShares - preview.estimatedCoreTotal;
    if (Math.abs(difference) > 0.01) {
      preview.notes.push(`Note: Total shares (${preview.totalShares.toFixed(2)}) differs from estimated core (${preview.estimatedCoreTotal.toFixed(2)}) by ${difference.toFixed(2)} ${this.household.currency}`);
    }

    return preview;
  }

  /**
   * Get care ledger summary
   * @param {Object} result - Care ledger result
   * @returns {string} Human-readable summary
   */
  getSummary(result) {
    let summary = `Care Ledger Summary\n`;
    summary += `==================\n\n`;
    
    summary += `Model: ${result.summary.model.toUpperCase()}\n`;
    summary += `Period: ${this.period.label}\n`;
    summary += `Care Rate: ${this.household.careRatePerHour.toFixed(2)} ${this.household.currency}/hour\n\n`;
    
    summary += `Care Values by Adult:\n`;
    Object.entries(result.careValues).forEach(([adultId, careValue]) => {
      const adult = this.household.adults.find(a => a.id === adultId);
      summary += `  ${adult.name}: ${careValue.toFixed(2)} ${this.household.currency}\n`;
    });
    
    summary += `\n`;
    
    if (result.summary.model === "credit") {
      summary += `Next Month Core Credits:\n`;
      Object.entries(result.nextMonthCoreCredit).forEach(([adultId, credit]) => {
        const adult = this.household.adults.find(a => a.id === adultId);
        if (credit < 0) {
          summary += `  ${adult.name}: ${Math.abs(credit).toFixed(2)} ${this.household.currency} credit\n`;
        }
      });
    } else if (result.summary.model === "stipend") {
      summary += `Stipend Payments:\n`;
      result.payees.forEach(payee => {
        summary += `  ${payee.adultName}: ${payee.amount.toFixed(2)} ${this.household.currency}\n`;
      });
      summary += `\nNext month's core total will increase by: ${result.nextMonthCoreIncrease.toFixed(2)} ${this.household.currency}\n`;
    }
    
    summary += `\nNext Period Preview:\n`;
    summary += `  Estimated Core Total: ${result.summary.nextPeriodCorePreview.estimatedCoreTotal.toFixed(2)} ${this.household.currency}\n`;
    summary += `  Total Estimated Shares: ${result.summary.nextPeriodCorePreview.totalShares.toFixed(2)} ${this.household.currency}\n`;
    
    if (result.summary.nextPeriodCorePreview.notes.length > 0) {
      summary += `\nNotes:\n`;
      result.summary.nextPeriodCorePreview.notes.forEach(note => {
        summary += `  ${note}\n`;
      });
    }
    
    return summary;
  }

  /**
   * Validate care ledger data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];
    
    // Validate care entries
    this.period.careEntries.forEach((entry, index) => {
      if (!entry.adultId || !entry.date || !entry.task || typeof entry.hours !== 'number') {
        errors.push(`Care entry ${index + 1} missing required fields`);
      }
      if (entry.hours <= 0) {
        errors.push(`Care entry ${index + 1} has invalid hours: ${entry.hours}`);
      }
      if (entry.hours > 24) {
        errors.push(`Care entry ${index + 1} has unrealistic hours: ${entry.hours}`);
      }
    });
    
    // Validate care model
    if (!["credit", "stipend"].includes(this.household.careModel)) {
      errors.push(`Invalid care model: ${this.household.careModel}`);
    }
    
    // Validate care rate
    if (this.household.careRatePerHour <= 0) {
      errors.push(`Care rate must be positive: ${this.household.careRatePerHour}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
