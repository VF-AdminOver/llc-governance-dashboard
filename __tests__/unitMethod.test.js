const { UnitMethodCalculator } = require('../src/core/unitMethod.js');

describe('UnitMethodCalculator', () => {
  test('validates household has 3-5 adults', () => {
    const household = {
      adults: [],
      children: [],
      childUnitWeight: 0.6
    };
    const period = {
      coreTotal: 1000,
      assignedChildUnits: {}
    };

    const calculator = new UnitMethodCalculator(household, period);

    expect(() => {
      calculator.calculate();
    }).toThrow('Household must have 3-5 adults, found 0');
  });

  test('calculates unit cost correctly', () => {
    const household = {
      adults: [
        { id: 1, netIncome: 1000 },
        { id: 2, netIncome: 2000 },
        { id: 3, netIncome: 3000 }
      ],
      children: [],
      childUnitWeight: 0.6,
      childrenCount: 0,
      capPercent: 0.3,
      getTotalUnits: () => 3,
      getTotalChildUnits: () => 0
    };
    const period = {
      coreTotal: 1000,
      assignedChildUnits: {},
      overrides: {}
    };

    const calculator = new UnitMethodCalculator(household, period);
    const result = calculator.calculate();

    expect(result.unitCost).toBeCloseTo(333.33); // 1000 / 3
  });
});