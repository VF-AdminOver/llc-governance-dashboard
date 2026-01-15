/**
 * Unit Method calculation engine for LLC Governance Dashboard
 * Implements fair cost sharing with income caps and optional overrides
 */

export class UnitMethodCalculator {
  constructor(household, period) {
    this.household = household;
    this.period = period;
    this.tolerance = 0.01; // Tolerance for rebalancing
    this.maxIterations = 10; // Maximum rebalancing iterations
  }

  /**
   * Calculate unit method shares with caps and overrides
   * @returns {Object} Complete calculation result with audit trail
   */
  calculate() {
    // Validate inputs
    const validation = this._validateInputs();
    if (!validation.isValid) {
      throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
    }

    // Initialize calculation
    const result = {
      unitCost: 0,
      adults: [],
      totals: {
        sumFinal: 0,
        sumPrelim: 0,
        diffFromCore: 0
      },
      auditTrail: [],
      warnings: []
    };

    // Calculate basic unit values
    const totalUnits = this.household.getTotalUnits();
    const unitCost = this.period.coreTotal / totalUnits;
    result.unitCost = unitCost;

    result.auditTrail.push(`Total units: ${totalUnits} (${this.household.adults.length} adults + ${this.household.getTotalChildUnits()} child units)`);
    result.auditTrail.push(`Unit cost: ${this.period.coreTotal} / ${totalUnits} = ${unitCost.toFixed(2)}`);

    // Calculate preliminary shares for each adult
    this.household.adults.forEach(adult => {
      const adultUnits = 1.0;
      const assignedChildUnits = this.period.assignedChildUnits[adult.id] || 0;
      const totalUnits = adultUnits + assignedChildUnits;
      const prelimShare = unitCost * totalUnits;
      const capAmount = this.household.capPercent * adult.netIncome;
      const override = this.period.overrides[adult.id] || null;
      
      let finalShare;
      let cappedFlag = false;
      
      if (override !== null) {
        finalShare = override;
        result.auditTrail.push(`${adult.name}: Override set to ${finalShare.toFixed(2)}`);
      } else {
        if (prelimShare <= capAmount) {
          finalShare = prelimShare;
        } else {
          finalShare = capAmount;
          cappedFlag = true;
          result.auditTrail.push(`${adult.name}: Capped at ${capAmount.toFixed(2)} (${(this.household.capPercent * 100)}% of income)`);
        }
      }

      result.adults.push({
        adultId: adult.id,
        adultName: adult.name,
        adultUnits,
        assignedChildUnits,
        totalUnits,
        netIncome: adult.netIncome,
        prelimShare: Math.round(prelimShare * 100) / 100,
        capAmount: Math.round(capAmount * 100) / 100,
        override,
        finalShare: Math.round(finalShare * 100) / 100,
        cappedFlag
      });
    });

    // Calculate totals
    result.totals.sumPrelim = result.adults.reduce((sum, adult) => sum + adult.prelimShare, 0);
    result.totals.sumFinal = result.adults.reduce((sum, adult) => sum + adult.finalShare, 0);
    result.totals.diffFromCore = Math.round((result.totals.sumFinal - this.period.coreTotal) * 100) / 100;

    result.auditTrail.push(`Sum of preliminary shares: ${result.totals.sumPrelim.toFixed(2)}`);
    result.auditTrail.push(`Sum of final shares: ${result.totals.sumFinal.toFixed(2)}`);
    result.auditTrail.push(`Difference from Core total: ${result.totals.diffFromCore.toFixed(2)}`);

    // Check if rebalancing is needed
    if (Math.abs(result.totals.diffFromCore) > this.tolerance) {
      const rebalanceResult = this._rebalance(result);
      Object.assign(result, rebalanceResult);
    }

    // Check for deficit after caps
    if (result.totals.diffFromCore < -this.tolerance) {
      const deficitWarning = this._handleDeficitAfterCaps(result);
      result.warnings.push(deficitWarning);
    }

    return result;
  }

  /**
   * Validate calculation inputs
   * @returns {Object} Validation result
   * @private
   */
  _validateInputs() {
    const errors = [];

    // Validate household
    if (this.household.adults.length < 3 || this.household.adults.length > 5) {
      errors.push(`Household must have 3-5 adults, found ${this.household.adults.length}`);
    }

    // Validate period
    if (this.period.coreTotal <= 0) {
      errors.push(`Core total must be positive, found ${this.period.coreTotal}`);
    }

    // Validate assigned child units
    const totalAssigned = Object.values(this.period.assignedChildUnits).reduce((sum, units) => sum + units, 0);
    const expectedTotal = this.household.childrenCount * this.household.childUnitWeight;
    
    if (Math.abs(totalAssigned - expectedTotal) > this.tolerance) {
      errors.push(`Assigned child units (${totalAssigned}) must equal expected total (${expectedTotal})`);
    }

    // Validate cap percent
    if (this.household.capPercent < 0.05 || this.household.capPercent > 0.6) {
      errors.push(`Cap percent must be between 0.05 and 0.6, found ${this.household.capPercent}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Rebalance shares to match core total
   * @param {Object} result - Current calculation result
   * @returns {Object} Updated result with rebalancing
   * @private
   */
  _rebalance(result) {
    let iteration = 0;
    let currentDiff = result.totals.diffFromCore;

    result.auditTrail.push(`Starting rebalancing process...`);

    while (Math.abs(currentDiff) > this.tolerance && iteration < this.maxIterations) {
      iteration++;
      result.auditTrail.push(`Rebalancing iteration ${iteration}`);

      // Find adults who can be rebalanced (not capped and not overridden)
      const rebalanceableAdults = result.adults.filter(adult => 
        !adult.cappedFlag && adult.override === null
      );

      if (rebalanceableAdults.length === 0) {
        result.auditTrail.push(`No adults available for rebalancing (all capped or overridden)`);
        break;
      }

      // Calculate proportional adjustment
      const totalPrelimRebalanceable = rebalanceableAdults.reduce((sum, adult) => sum + adult.prelimShare, 0);
      const adjustmentRatio = -currentDiff / totalPrelimRebalanceable;

      result.auditTrail.push(`Adjustment ratio: ${adjustmentRatio.toFixed(4)}`);

      // Apply proportional adjustment
      rebalanceableAdults.forEach(adult => {
        const adjustment = adult.prelimShare * adjustmentRatio;
        adult.finalShare = Math.round((adult.finalShare + adjustment) * 100) / 100;
        result.auditTrail.push(`${adult.adultName}: Adjusted by ${adjustment.toFixed(2)} to ${adult.finalShare.toFixed(2)}`);
      });

      // Recalculate totals
      result.totals.sumFinal = result.adults.reduce((sum, adult) => sum + adult.finalShare, 0);
      currentDiff = Math.round((result.totals.sumFinal - this.period.coreTotal) * 100) / 100;
      result.totals.diffFromCore = currentDiff;

      result.auditTrail.push(`After iteration ${iteration}: sumFinal = ${result.totals.sumFinal.toFixed(2)}, diffFromCore = ${currentDiff.toFixed(2)}`);
    }

    if (iteration >= this.maxIterations) {
      result.auditTrail.push(`Warning: Maximum rebalancing iterations reached`);
    }

    return result;
  }

  /**
   * Handle deficit after caps warning
   * @param {Object} result - Current calculation result
   * @returns {Object} Deficit warning with options
   * @private
   */
  _handleDeficitAfterCaps(result) {
    const deficit = Math.abs(result.totals.diffFromCore);
    const deficitPercent = (deficit / this.period.coreTotal * 100).toFixed(1);

    return {
      type: "deficit_after_caps",
      message: `Deficit after caps: ${deficit.toFixed(2)} (${deficitPercent}% of core total)`,
      options: [
        {
          id: "increase_core",
          label: "Increase core total",
          description: `Add ${deficit.toFixed(2)} to core total or reclassify items to Personal/Vision`
        },
        {
          id: "adjust_cap",
          label: "Temporarily adjust cap percent",
          description: `Increase cap percent to ${(this.household.capPercent + 0.05).toFixed(2)} with logged consent`
        },
        {
          id: "use_overrides",
          label: "Enter overrides",
          description: "Set manual overrides for some adults and rebalance remaining"
        }
      ],
      recommended: "increase_core"
    };
  }

  /**
   * Get human-readable summary of calculation
   * @param {Object} result - Calculation result
   * @returns {string} Human-readable summary
   */
  getSummary(result) {
    let summary = `Unit Method Calculation Summary\n`;
    summary += `================================\n\n`;
    
    summary += `Core Total: ${this.period.coreTotal.toFixed(2)} ${this.household.currency}\n`;
    summary += `Total Units: ${this.household.getTotalUnits()}\n`;
    summary += `Unit Cost: ${result.unitCost.toFixed(2)} ${this.household.currency}\n\n`;
    
    summary += `Adult Shares:\n`;
    result.adults.forEach(adult => {
      summary += `  ${adult.adultName}:\n`;
      summary += `    Units: ${adult.adultUnits} + ${adult.assignedChildUnits} = ${adult.totalUnits}\n`;
      summary += `    Preliminary: ${adult.prelimShare.toFixed(2)} ${this.household.currency}\n`;
      summary += `    Cap Amount: ${adult.capAmount.toFixed(2)} ${this.household.currency}\n`;
      if (adult.override !== null) {
        summary += `    Override: ${adult.override.toFixed(2)} ${this.household.currency}\n`;
      }
      summary += `    Final Share: ${adult.finalShare.toFixed(2)} ${this.household.currency}\n`;
      if (adult.cappedFlag) {
        summary += `    [CAPPED]\n`;
      }
      summary += `\n`;
    });
    
    summary += `Totals:\n`;
    summary += `  Sum of Final Shares: ${result.totals.sumFinal.toFixed(2)} ${this.household.currency}\n`;
    summary += `  Difference from Core: ${result.totals.diffFromCore.toFixed(2)} ${this.household.currency}\n`;
    
    if (result.warnings.length > 0) {
      summary += `\nWarnings:\n`;
      result.warnings.forEach(warning => {
        summary += `  ${warning.message}\n`;
      });
    }
    
    return summary;
  }
}
