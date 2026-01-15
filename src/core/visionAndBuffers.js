/**
 * Vision and Buffers planner for LLC Governance Dashboard
 * Manages emergency funds, sinking funds, and long-term financial goals
 */

export class VisionAndBuffersPlanner {
  constructor(household) {
    this.household = household;
  }

  /**
   * Plan vision allocation and buffer targets
   * @returns {Object} Vision and buffers plan
   */
  planVisionAndBuffers() {
    const result = {
      emergencyTarget: 0,
      monthlyVisionAllocation: 0,
      sinkingFunds: [],
      summary: {},
      guidance: []
    };

    // Calculate emergency fund target
    const monthlyCore = this._estimateMonthlyCore();
    result.emergencyTarget = monthlyCore * this.household.emergencyMonths;
    
    result.guidance.push(`Emergency fund target: ${this.household.emergencyMonths} months × ${monthlyCore.toFixed(2)} ${this.household.currency} = ${result.emergencyTarget.toFixed(2)} ${this.household.currency}`);

    // Calculate monthly vision allocation
    const totalNetIncome = this.household.getTotalNetIncome();
    result.monthlyVisionAllocation = totalNetIncome * this.household.visionAllocPercent / 12;
    
    result.guidance.push(`Monthly vision allocation: ${(this.household.visionAllocPercent * 100).toFixed(1)}% of ${totalNetIncome.toFixed(2)} ${this.household.currency} = ${result.monthlyVisionAllocation.toFixed(2)} ${this.household.currency}/month`);

    // Plan sinking funds
    result.sinkingFunds = this._planSinkingFunds(result.monthlyVisionAllocation);

    // Generate summary
    result.summary = this._generateSummary(result);

    return result;
  }

  /**
   * Estimate monthly core expenses
   * @returns {number} Estimated monthly core amount
   * @private
   */
  _estimateMonthlyCore() {
    // This would typically use historical data or user input
    // For now, use a reasonable estimate based on household size
    const baseAmount = 2000; // Base monthly amount
    const adultMultiplier = this.household.adults.length * 0.8;
    const childMultiplier = this.household.childrenCount * 0.4;
    
    return Math.round((baseAmount * (adultMultiplier + childMultiplier)) * 100) / 100;
  }

  /**
   * Plan sinking funds with monthly transfers
   * @param {number} monthlyVisionAllocation - Monthly vision allocation amount
   * @returns {Array} Array of sinking fund plans
   * @private
   */
  _planSinkingFunds(monthlyVisionAllocation) {
    const sinkingFunds = [];
    let remainingAllocation = monthlyVisionAllocation;

    this.household.sinkingFunds.forEach(fund => {
      const monthlyTransfer = fund.annualTarget / 12;
      const priority = this._calculateFundPriority(fund);
      
      sinkingFunds.push({
        name: fund.name,
        annualTarget: fund.annualTarget,
        monthlyTransfer: Math.round(monthlyTransfer * 100) / 100,
        currentBalance: fund.currentBalance || 0,
        account: fund.account || "HYSA",
        priority,
        monthsToTarget: this._calculateMonthsToTarget(fund.currentBalance || 0, fund.annualTarget, monthlyTransfer),
        guidance: this._generateFundGuidance(fund, monthlyTransfer)
      });
    });

    // Sort by priority
    sinkingFunds.sort((a, b) => a.priority - b.priority);

    // Calculate total monthly transfers
    const totalMonthlyTransfers = sinkingFunds.reduce((sum, fund) => sum + fund.monthlyTransfer, 0);
    
    // Check if we can afford all funds
    if (totalMonthlyTransfers > monthlyVisionAllocation) {
      // Add warning to guidance array
      sinkingFunds.push({
        name: "WARNING",
        annualTarget: 0,
        monthlyTransfer: 0,
        currentBalance: 0,
        account: "N/A",
        priority: 999,
        monthsToTarget: 0,
        guidance: `Warning: Total sinking fund transfers (${totalMonthlyTransfers.toFixed(2)} ${this.household.currency}/month) exceed monthly vision allocation (${monthlyVisionAllocation.toFixed(2)} ${this.household.currency}/month). Consider reducing annual targets or increasing vision allocation percentage.`
      });
    } else {
      // Add remaining allocation info
      sinkingFunds.push({
        name: "REMAINING",
        annualTarget: 0,
        monthlyTransfer: 0,
        currentBalance: 0,
        account: "N/A",
        priority: 999,
        monthsToTarget: 0,
        guidance: `Total sinking fund transfers: ${totalMonthlyTransfers.toFixed(2)} ${this.household.currency}/month. Remaining vision allocation: ${(monthlyVisionAllocation - totalMonthlyTransfers).toFixed(2)} ${this.household.currency}/month.`
      });
    }

    return sinkingFunds;
  }

  /**
   * Calculate fund priority (lower number = higher priority)
   * @param {Object} fund - Sinking fund object
   * @returns {number} Priority score
   * @private
   */
  _calculateFundPriority(fund) {
    let priority = 0;
    
    // Emergency-related funds get highest priority
    if (fund.name.toLowerCase().includes('emergency') || 
        fund.name.toLowerCase().includes('medical') ||
        fund.name.toLowerCase().includes('deductible')) {
      priority = 1;
    }
    // Vehicle and home maintenance get medium priority
    else if (fund.name.toLowerCase().includes('vehicle') ||
             fund.name.toLowerCase().includes('home') ||
             fund.name.toLowerCase().includes('maintenance')) {
      priority = 2;
    }
    // Other funds get lower priority
    else {
      priority = 3;
    }
    
    return priority;
  }

  /**
   * Calculate months to reach target
   * @param {number} currentBalance - Current fund balance
   * @param {number} annualTarget - Annual target amount
   * @param {number} monthlyTransfer - Monthly transfer amount
   * @returns {number} Months to reach target
   * @private
   */
  _calculateMonthsToTarget(currentBalance, annualTarget, monthlyTransfer) {
    if (monthlyTransfer <= 0) return Infinity;
    
    const remaining = annualTarget - currentBalance;
    if (remaining <= 0) return 0;
    
    return Math.ceil(remaining / monthlyTransfer);
  }

  /**
   * Generate guidance for a specific fund
   * @param {Object} fund - Sinking fund object
   * @param {number} monthlyTransfer - Monthly transfer amount
   * @returns {string} Guidance text
   * @private
   */
  _generateFundGuidance(fund, monthlyTransfer) {
    const currentBalance = fund.currentBalance || 0;
    const remaining = fund.annualTarget - currentBalance;
    
    if (remaining <= 0) {
      return `Fund target reached! Consider increasing annual target or redirecting monthly transfer.`;
    }
    
    const monthsToTarget = this._calculateMonthsToTarget(currentBalance, fund.annualTarget, monthlyTransfer);
    
    if (monthsToTarget <= 12) {
      return `On track to reach target in ${monthsToTarget} months.`;
    } else if (monthsToTarget <= 24) {
      return `Will reach target in ${monthsToTarget} months. Consider increasing monthly transfer to reach target sooner.`;
    } else {
      return `Will take ${monthsToTarget} months to reach target. Consider increasing monthly transfer or reducing annual target.`;
    }
  }

  /**
   * Generate summary of vision and buffers plan
   * @param {Object} result - Planning result
   * @returns {Object} Summary object
   * @private
   */
  _generateSummary(result) {
    const totalSinkingFunds = result.sinkingFunds.reduce((sum, fund) => sum + fund.monthlyTransfer, 0);
    const remainingVision = result.monthlyVisionAllocation - totalSinkingFunds;
    
    return {
      emergencyFundStatus: this._getEmergencyFundStatus(result.emergencyTarget),
      visionAllocationBreakdown: {
        total: result.monthlyVisionAllocation,
        sinkingFunds: totalSinkingFunds,
        remaining: remainingVision
      },
      recommendations: this._generateRecommendations(result)
    };
  }

  /**
   * Get emergency fund status
   * @param {number} emergencyTarget - Emergency fund target
   * @returns {Object} Emergency fund status
   * @private
   */
  _getEmergencyFundStatus(emergencyTarget) {
    // This would typically check actual emergency fund balance
    // For now, return a placeholder status
    return {
      target: emergencyTarget,
      currentBalance: 0, // Would be actual balance
      status: "building", // "building", "maintaining", "fully_funded"
      monthsToTarget: 0, // Would be calculated based on current balance
      guidance: "Continue building emergency fund to reach target"
    };
  }

  /**
   * Generate recommendations based on plan
   * @param {Object} result - Planning result
   * @returns {Array} Array of recommendations
   * @private
   */
  _generateRecommendations(result) {
    const recommendations = [];
    
    // Emergency fund recommendations
    if (result.emergencyTarget > 0) {
      recommendations.push({
        type: "emergency_fund",
        priority: "high",
        message: `Build emergency fund to ${result.emergencyTarget.toFixed(2)} ${this.household.currency} (${this.household.emergencyMonths} months of core expenses)`,
        action: "Allocate additional funds to emergency savings"
      });
    }
    
    // Sinking fund recommendations
    result.sinkingFunds.forEach(fund => {
      if (fund.monthsToTarget > 24) {
        recommendations.push({
          type: "sinking_fund",
          priority: "medium",
          message: `${fund.name}: Consider increasing monthly transfer from ${fund.monthlyTransfer.toFixed(2)} to ${(fund.annualTarget / 18).toFixed(2)} ${this.household.currency} to reach target in 18 months`,
          action: `Review and adjust ${fund.name} monthly transfer`
        });
      }
    });
    
    // Vision allocation recommendations
    const totalSinkingFunds = result.sinkingFunds.reduce((sum, fund) => sum + fund.monthlyTransfer, 0);
    const remainingVision = result.monthlyVisionAllocation - totalSinkingFunds;
    
    if (remainingVision < 0) {
      recommendations.push({
        type: "vision_allocation",
        priority: "high",
        message: "Monthly vision allocation insufficient for all sinking funds. Consider increasing allocation percentage or reducing fund targets.",
        action: "Review vision allocation percentage and reducing fund targets"
      });
    }
    
    return recommendations;
  }

  /**
   * Get human-readable summary of vision and buffers plan
   * @param {Object} result - Planning result
   * @returns {string} Human-readable summary
   */
  getSummary(result) {
    let summary = `Vision and Buffers Plan\n`;
    summary += `======================\n\n`;
    
    summary += `Emergency Fund:\n`;
    summary += `  Target: ${result.emergencyTarget.toFixed(2)} ${this.household.currency}\n`;
    summary += `  Status: Building\n`;
    summary += `  Guidance: Continue building emergency fund to reach target\n\n`;
    
    summary += `Vision Allocation:\n`;
    summary += `  Monthly Total: ${result.monthlyVisionAllocation.toFixed(2)} ${this.household.currency}\n`;
    
    const totalSinkingFunds = result.sinkingFunds.reduce((sum, fund) => sum + fund.monthlyTransfer, 0);
    const remainingVision = result.monthlyVisionAllocation - totalSinkingFunds;
    
    summary += `  Sinking Funds: ${totalSinkingFunds.toFixed(2)} ${this.household.currency}\n`;
    summary += `  Remaining: ${remainingVision.toFixed(2)} ${this.household.currency}\n\n`;
    
    summary += `Sinking Funds:\n`;
    result.sinkingFunds.forEach(fund => {
      if (fund.name === "WARNING" || fund.name === "REMAINING") {
        summary += `${fund.guidance}\n\n`;
      } else {
        summary += `  ${fund.name}:\n`;
        summary += `    Annual Target: ${fund.annualTarget.toFixed(2)} ${this.household.currency}\n`;
        summary += `    Monthly Transfer: ${fund.monthlyTransfer.toFixed(2)} ${this.household.currency}\n`;
        summary += `    Current Balance: ${fund.currentBalance.toFixed(2)} ${this.household.currency}\n`;
        summary += `    Months to Target: ${fund.monthsToTarget}\n`;
        summary += `    Guidance: ${fund.guidance}\n\n`;
      }
    });
    
    return summary;
  }
}
