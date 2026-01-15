/**
 * LLC Governance Dashboard - Main Application
 * Entry point for the governance and finance hub
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Household } from './models/household.js';
import { Period } from './models/period.js';
import { UnitMethodCalculator } from './core/unitMethod.js';
import { CareLedgerCalculator } from './core/careLedger.js';
import { VisionAndBuffersPlanner } from './core/visionAndBuffers.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// In-memory storage (in production, use a proper database)
let currentHousehold = null;
let currentPeriod = null;

// Routes

/**
 * GET / - Main application entry point
 * Shows onboarding options or current household status
 */
app.get('/', (req, res) => {
  if (!currentHousehold) {
    res.json({
      message: "Welcome to LLC Governance Dashboard",
      status: "onboarding_required",
      nextSteps: [
        "Run the onboarding wizard to create your household",
        "Import a prior JSON configuration",
        "Start with household basics, incomes, and settings"
      ]
    });
  } else {
    res.json({
      message: "LLC Governance Dashboard",
      status: "household_configured",
      household: currentHousehold.name,
      adults: currentHousehold.adults.length,
      children: currentHousehold.childrenCount,
      nextSteps: [
        "Create a new period",
        "Run monthly calculations",
        "Generate reports and exports"
      ]
    });
  }
});

/**
 * POST /api/household/onboard - Onboarding wizard endpoint
 * Creates a new household with all required settings
 */
app.post('/api/household/onboard', (req, res) => {
  try {
    const householdData = req.body;
    
    // Create and validate household
    const household = new Household(householdData);
    const validation = household.validate();
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Household validation failed",
        details: validation.errors
      });
    }
    
    // Store household
    currentHousehold = household;
    
    // Create initial period
    const currentDate = new Date();
    const periodLabel = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    currentPeriod = new Period({
      label: periodLabel,
      coreTotal: 0,
      assignedChildUnits: {}
    });
    
    // Initialize assigned child units
    if (household.childrenCount > 0) {
      const unitsPerAdult = household.childrenCount * household.childUnitWeight / household.adults.length;
      household.adults.forEach(adult => {
        currentPeriod.assignedChildUnits[adult.id] = unitsPerAdult;
      });
    }
    
    res.json({
      message: "Household created successfully",
      household: household.toJSON(),
      period: currentPeriod.toJSON(),
      nextSteps: [
        "Set core total for current period",
        "Adjust assigned child units if needed",
        "Add care entries and run calculations"
      ]
    });
    
  } catch (error) {
    res.status(500).json({
      error: "Failed to create household",
      details: error.message
    });
  }
});

/**
 * POST /api/period/calculate - Calculate unit method shares
 * Runs the complete calculation including unit method, care ledger, and vision planning
 */
app.post('/api/period/calculate', (req, res) => {
  try {
    if (!currentHousehold || !currentPeriod) {
      return res.status(400).json({
        error: "Household and period must be configured first"
      });
    }
    
    const { coreTotal, assignedChildUnits, overrides } = req.body;
    
    // Update period with new data
    if (coreTotal !== undefined) currentPeriod.coreTotal = coreTotal;
    if (assignedChildUnits !== undefined) currentPeriod.assignedChildUnits = assignedChildUnits;
    if (overrides !== undefined) currentPeriod.overrides = overrides;
    
    // Validate period
    const periodValidation = currentPeriod.validate(currentHousehold);
    if (!periodValidation.isValid) {
      return res.status(400).json({
        error: "Period validation failed",
        details: periodValidation.errors
      });
    }
    
    // Calculate unit method shares
    const unitCalculator = new UnitMethodCalculator(currentHousehold, currentPeriod);
    const unitResult = unitCalculator.calculate();
    
    // Apply care ledger
    const careCalculator = new CareLedgerCalculator(currentHousehold, currentPeriod);
    const careResult = careCalculator.applyCareLedger(unitResult);
    
    // Plan vision and buffers
    const visionPlanner = new VisionAndBuffersPlanner(currentHousehold);
    const visionResult = visionPlanner.planVisionAndBuffers();
    
    // Generate council agenda
    const councilAgenda = generateCouncilAgenda(currentPeriod, unitResult, careResult, visionResult);
    
    res.json({
      periodLabel: currentPeriod.label,
      unitMethod: unitResult,
      careLedger: careResult,
      visionAndBuffers: visionResult,
      councilAgendaMd: councilAgenda,
      exports: {
        charterDocx: `download://charter_${currentPeriod.label}.docx`,
        calculatorXlsx: `download://calculator_${currentPeriod.label}.xlsx`,
        minutesCsv: `download://minutes_${currentPeriod.label}.csv`,
        decisionsCsv: `download://decisions_${currentPeriod.label}.csv`,
        amendmentsCsv: `download://amendments_${currentPeriod.label}.csv`,
        councilIcs: `download://council_${currentPeriod.label}.ics`
      },
      nextSteps: [
        "Review calculations and adjust if needed",
        "Lock period to prevent further changes",
        "Generate exports and schedule council meeting"
      ]
    });
    
  } catch (error) {
    res.status(500).json({
      error: "Calculation failed",
      details: error.message
    });
  }
});

/**
 * POST /api/period/close - Close month and lock period
 * Locks the period and generates final exports
 */
app.post('/api/period/close', (req, res) => {
  try {
    if (!currentPeriod) {
      return res.status(400).json({
        error: "No active period to close"
      });
    }
    
    // Lock the period
    currentPeriod.lock();
    
    res.json({
      message: "Period closed successfully",
      period: currentPeriod.toJSON(),
      nextSteps: [
        "Download generated exports",
        "Schedule council meeting using generated calendar file",
        "Begin planning for next period"
      ]
    });
    
  } catch (error) {
    res.status(500).json({
      error: "Failed to close period",
      details: error.message
    });
  }
});

/**
 * GET /api/household/status - Get current household status
 */
app.get('/api/household/status', (req, res) => {
  if (!currentHousehold) {
    return res.status(404).json({
      error: "No household configured"
    });
  }
  
  res.json({
    household: currentHousehold.toJSON(),
    period: currentPeriod ? currentPeriod.toJSON() : null,
    status: {
      isConfigured: true,
      hasActivePeriod: !!currentPeriod,
      periodLocked: currentPeriod ? currentPeriod.isLocked : false
    }
  });
});

/**
 * POST /api/household/import - Import household from JSON
 */
app.post('/api/household/import', (req, res) => {
  try {
    const { household, period } = req.body;
    
    if (household) {
      currentHousehold = Household.fromJSON(household);
    }
    
    if (period) {
      currentPeriod = Period.fromJSON(period);
    }
    
    res.json({
      message: "Household imported successfully",
      household: currentHousehold ? currentHousehold.toJSON() : null,
      period: currentPeriod ? currentPeriod.toJSON() : null
    });
    
  } catch (error) {
    res.status(500).json({
      error: "Failed to import household",
      details: error.message
    });
  }
});

/**
 * GET /api/household/export - Export current household data
 */
app.get('/api/household/export', (req, res) => {
  if (!currentHousehold) {
    return res.status(404).json({
      error: "No household configured"
    });
  }
  
  res.json({
    household: currentHousehold.toJSON(),
    period: currentPeriod ? currentPeriod.toJSON() : null,
    exportedAt: new Date().toISOString()
  });
});

// Helper function to generate council agenda
function generateCouncilAgenda(period, unitResult, careResult, visionResult) {
  let agenda = `# Household Council Agenda - ${period.label}\n\n`;
  agenda += `**Duration:** 60 minutes\n`;
  agenda += `**Date:** [To be scheduled]\n\n`;
  
  agenda += `## 1. Quick Wins (5 min)\n`;
  agenda += `- Review completed tasks and achievements\n`;
  agenda += `- Celebrate financial milestones\n\n`;
  
  agenda += `## 2. Core Account Health (10 min)\n`;
  agenda += `- Core total: ${period.coreTotal.toFixed(2)} ${currentHousehold.currency}\n`;
  agenda += `- Total shares: ${unitResult.totals.sumFinal.toFixed(2)} ${currentHousehold.currency}\n`;
  agenda += `- Balance: ${unitResult.totals.diffFromCore.toFixed(2)} ${currentHousehold.currency}\n\n`;
  
  agenda += `## 3. Care Ledger Adjustments (10 min)\n`;
  agenda += `- Model: ${careResult.summary.model}\n`;
  if (careResult.summary.model === "credit") {
    agenda += `- Credits applied to next month's core shares\n`;
  } else {
    agenda += `- Stipend payments: ${careResult.nextMonthCoreIncrease.toFixed(2)} ${currentHousehold.currency}\n`;
  }
  agenda += `- Next month core preview: ${careResult.summary.nextPeriodCorePreview.estimatedCoreTotal.toFixed(2)} ${currentHousehold.currency}\n\n`;
  
  agenda += `## 4. Upcoming Expenses (10 min)\n`;
  agenda += `- Review planned purchases and their thresholds\n`;
  agenda += `- Discuss any large purchase requests\n`;
  agenda += `- Plan for seasonal expenses\n\n`;
  
  agenda += `## 5. Vision Progress (10 min)\n`;
  agenda += `- Emergency fund target: ${visionResult.emergencyTarget.toFixed(2)} ${currentHousehold.currency}\n`;
  agenda += `- Monthly vision allocation: ${visionResult.monthlyVisionAllocation.toFixed(2)} ${currentHousehold.currency}\n`;
  agenda += `- Sinking fund priorities and progress\n\n`;
  
  agenda += `## 6. Open Floor (10 min)\n`;
  agenda += `- New business and concerns\n`;
  agenda += `- Process improvements and feedback\n`;
  agenda += `- Upcoming decisions and votes\n\n`;
  
  agenda += `## 7. Decision List (5 min)\n`;
  agenda += `- Review pending decisions\n`;
  agenda += `- Schedule votes for next meeting\n`;
  agenda += `- Assign action items and responsibilities\n\n`;
  
  agenda += `---\n`;
  agenda += `*Generated by LLC Governance Dashboard*\n`;
  
  return agenda;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LLC Governance Dashboard server running on port ${PORT}`);
  console.log(`📊 Ready to onboard households and manage LLC governance and finances`);
  console.log(`🌐 Open http://localhost:${PORT} to get started`);
});

export default app;
