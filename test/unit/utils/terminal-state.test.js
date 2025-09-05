const { TerminalState, getState, resetState, createState } = require('../../../lib/terminal-state');

// Mock dependencies
jest.mock('../../../lib/prompt-helpers', () => ({
  createProgressBar: jest.fn((current, total, stepName) => 
    `[${current}/${total}] ${stepName}`
  ),
  colors: {
    primary: jest.fn(text => text),
    bold: jest.fn(text => text)
  }
}));

describe('TerminalState', () => {
  let terminalState;

  beforeEach(() => {
    terminalState = new TerminalState();
    jest.clearAllMocks();
  });

  describe('constructor and reset', () => {
    test('should initialize with default values', () => {
      expect(terminalState.currentStep).toBe(0);
      expect(terminalState.totalSteps).toBe(6);
      expect(terminalState.stepNames).toHaveLength(6);
      expect(terminalState.selections.projectType).toBeNull();
      expect(terminalState.metadata.errors).toEqual([]);
      expect(terminalState.visualState.cursorPosition).toEqual({ row: 1, col: 1 });
    });

    test('should reset to initial state', () => {
      terminalState.currentStep = 3;
      terminalState.selections.projectType = 'web3';
      terminalState.metadata.errors.push({ message: 'test error' });
      
      terminalState.reset();
      
      expect(terminalState.currentStep).toBe(0);
      expect(terminalState.selections.projectType).toBeNull();
      expect(terminalState.metadata.errors).toEqual([]);
    });
  });

  describe('step navigation', () => {
    test('nextStep should advance current step', () => {
      const result = terminalState.nextStep();
      
      expect(result).toBe(1);
      expect(terminalState.currentStep).toBe(1);
      expect(terminalState.metadata.stepHistory).toHaveLength(1);
      expect(terminalState.metadata.stepHistory[0].step).toBe(0);
    });

    test('nextStep should record step history with custom name', () => {
      const customName = 'Custom Step';
      terminalState.nextStep(customName);
      
      expect(terminalState.metadata.stepHistory[0].name).toBe(customName);
    });

    test('nextStep should update metadata lastUpdate', () => {
      const beforeTime = Date.now();
      terminalState.nextStep();
      
      expect(terminalState.metadata.lastUpdate).toBeGreaterThanOrEqual(beforeTime);
    });

    test('previousStep should go back when possible', () => {
      terminalState.nextStep();
      terminalState.nextStep();
      
      const result = terminalState.previousStep();
      
      expect(result).toBe(1);
      expect(terminalState.currentStep).toBe(1);
    });

    test('previousStep should not go below 0', () => {
      const result = terminalState.previousStep();
      
      expect(result).toBe(0);
      expect(terminalState.currentStep).toBe(0);
    });

    test('previousStep should restore previous selections when history exists', () => {
      terminalState.updateSelection('projectType', 'web3');
      terminalState.nextStep(); // Step 0 -> 1, stores step 0 state in history[0]
      terminalState.updateSelection('blockchain', 'ethereum');
      terminalState.nextStep(); // Step 1 -> 2, stores step 1 state in history[1]
      
      terminalState.previousStep(); // Step 2 -> 1, restore from history[0] (step 0 state)
      
      expect(terminalState.selections.projectType).toBe('web3');
      expect(terminalState.selections.blockchain).toBeNull();
    });

    test('previousStep should handle case when no previous history exists', () => {
      // Manually set currentStep without using nextStep to avoid creating history
      terminalState.currentStep = 1;
      terminalState.selections.projectType = 'web3';
      
      const result = terminalState.previousStep();
      
      expect(result).toBe(0);
      expect(terminalState.currentStep).toBe(0);
      // Selections should remain unchanged since no history exists
      expect(terminalState.selections.projectType).toBe('web3');
    });

    test('previousStep should handle accessing history beyond bounds', () => {
      terminalState.currentStep = 2;
      terminalState.metadata.stepHistory = []; // Empty history
      
      const result = terminalState.previousStep();
      
      expect(result).toBe(1);
      expect(terminalState.currentStep).toBe(1);
    });
  });

  describe('selection management', () => {
    test('updateSelection should update selections and metadata', () => {
      const beforeTime = Date.now();
      
      terminalState.updateSelection('projectType', 'web3');
      
      expect(terminalState.selections.projectType).toBe('web3');
      expect(terminalState.metadata.lastUpdate).toBeGreaterThanOrEqual(beforeTime);
    });

    test('updateSelection should handle different data types', () => {
      terminalState.updateSelection('typescript', true);
      terminalState.updateSelection('plugins', ['supabase', 'vercel-ai']);
      
      expect(terminalState.selections.typescript).toBe(true);
      expect(terminalState.selections.plugins).toEqual(['supabase', 'vercel-ai']);
    });
  });

  describe('progress tracking', () => {
    test('getProgress should return correct percentage', () => {
      expect(terminalState.getProgress()).toBe(0);
      
      terminalState.currentStep = 3;
      expect(terminalState.getProgress()).toBe(50);
      
      terminalState.currentStep = 6;
      expect(terminalState.getProgress()).toBe(100);
    });

    test('getCurrentStepName should return correct step name', () => {
      expect(terminalState.getCurrentStepName()).toBe('Project Type Selection');
      
      terminalState.currentStep = 2;
      expect(terminalState.getCurrentStepName()).toBe('Plugin Selection');
    });

    test('getCurrentStepName should handle invalid step', () => {
      terminalState.currentStep = 10;
      expect(terminalState.getCurrentStepName()).toBe('Unknown Step');
    });

    test('getProgressBar should call createProgressBar with correct parameters', () => {
      const { createProgressBar } = require('../../../lib/prompt-helpers');
      
      terminalState.currentStep = 2;
      const result = terminalState.getProgressBar();
      
      expect(createProgressBar).toHaveBeenCalledWith(2, 6, 'Plugin Selection');
      expect(result).toBe('[2/6] Plugin Selection');
    });
  });

  describe('summary and preserved info', () => {
    test('getSummary should return complete summary', () => {
      terminalState.currentStep = 2;
      terminalState.selections.projectType = 'web3';
      terminalState.selections.blockchain = 'ethereum';
      terminalState.selections.plugins = ['supabase'];
      
      const summary = terminalState.getSummary();
      
      expect(summary.step).toBe('2/6');
      expect(summary.stepName).toBe('Plugin Selection');
      expect(summary.progress).toBe(33);
      expect(summary.projectType).toBe('web3');
      expect(summary.blockchain).toBe('ethereum');
      expect(summary.plugins).toEqual(['supabase']);
      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });

    test('getPreservedInfo should return formatted info', () => {
      terminalState.selections.projectType = 'web3';
      terminalState.selections.blockchain = 'ethereum';
      terminalState.selections.plugins = ['supabase', 'vercel-ai'];
      terminalState.currentStep = 1;
      
      const info = terminalState.getPreservedInfo();
      
      expect(info.projectType).toBe('WEB3');
      expect(info.blockchain).toBe('ETHEREUM');
      expect(info.plugins).toEqual(['supabase', 'vercel-ai']);
      expect(info.step).toBe('Blockchain Selection');
    });

    test('getPreservedInfo should handle empty selections', () => {
      const info = terminalState.getPreservedInfo();
      
      expect(info.projectType).toBeUndefined();
      expect(info.blockchain).toBeUndefined();
      expect(info.plugins).toBeUndefined();
      expect(info.step).toBe('Project Type Selection');
    });

    test('getPreservedInfo should handle empty plugins array', () => {
      terminalState.selections.plugins = [];
      
      const info = terminalState.getPreservedInfo();
      
      expect(info.plugins).toBeUndefined();
    });
  });

  describe('error and warning tracking', () => {
    test('addError should record error with metadata', () => {
      const message = 'Test error';
      const context = { field: 'projectType' };
      
      terminalState.addError(message, context);
      
      expect(terminalState.metadata.errors).toHaveLength(1);
      expect(terminalState.metadata.errors[0].message).toBe(message);
      expect(terminalState.metadata.errors[0].context).toEqual(context);
      expect(terminalState.metadata.errors[0].step).toBe(0);
      expect(terminalState.metadata.errors[0].timestamp).toBeGreaterThan(0);
    });

    test('addError should handle missing context', () => {
      terminalState.addError('Test error');
      
      expect(terminalState.metadata.errors[0].context).toEqual({});
    });

    test('addWarning should record warning with metadata', () => {
      const message = 'Test warning';
      const context = { suggestion: 'use lowercase' };
      
      terminalState.addWarning(message, context);
      
      expect(terminalState.metadata.warnings).toHaveLength(1);
      expect(terminalState.metadata.warnings[0].message).toBe(message);
      expect(terminalState.metadata.warnings[0].context).toEqual(context);
      expect(terminalState.metadata.warnings[0].step).toBe(0);
      expect(terminalState.metadata.warnings[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('visual state management', () => {
    test('updateVisualState should merge visual state and update metadata', () => {
      const beforeTime = Date.now();
      const visualInfo = {
        cursorPosition: { row: 5, col: 10 },
        terminalSize: { width: 120, height: 30 }
      };
      
      terminalState.updateVisualState(visualInfo);
      
      expect(terminalState.visualState.cursorPosition).toEqual({ row: 5, col: 10 });
      expect(terminalState.visualState.terminalSize).toEqual({ width: 120, height: 30 });
      expect(terminalState.visualState.lastClearTime).toBeNull(); // preserved original values
      expect(terminalState.metadata.lastUpdate).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('step skipping logic', () => {
    test('canSkipStep should return true for blockchain step when not web3', () => {
      terminalState.selections.projectType = 'web2';
      
      expect(terminalState.canSkipStep(1)).toBe(true);
    });

    test('canSkipStep should return false for blockchain step when web3', () => {
      terminalState.selections.projectType = 'web3';
      
      expect(terminalState.canSkipStep(1)).toBe(false);
    });

    test('canSkipStep should return true for package manager step when not installing deps', () => {
      terminalState.selections.installDependencies = false;
      
      expect(terminalState.canSkipStep(4)).toBe(true);
    });

    test('canSkipStep should return false for non-skippable steps', () => {
      expect(terminalState.canSkipStep(0)).toBe(false);
      expect(terminalState.canSkipStep(2)).toBe(false);
      expect(terminalState.canSkipStep(3)).toBe(false);
    });

    test('getNextRequiredStep should skip optional steps', () => {
      terminalState.currentStep = 0;
      terminalState.selections.projectType = 'web2';
      
      const nextStep = terminalState.getNextRequiredStep();
      
      expect(nextStep).toBe(2); // Should skip blockchain step (1)
    });

    test('getNextRequiredStep should not skip when at max steps', () => {
      terminalState.currentStep = 5;
      
      const nextStep = terminalState.getNextRequiredStep();
      
      expect(nextStep).toBe(6);
    });
  });

  describe('validation', () => {
    test('validate should return errors for missing required selections', () => {
      const result = terminalState.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project type must be selected');
    });

    test('validate should require blockchain for web3 projects', () => {
      terminalState.selections.projectType = 'web3';
      
      const result = terminalState.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Blockchain must be selected for Web3 projects');
    });

    test('validate should warn about no plugins', () => {
      terminalState.selections.projectType = 'web2';
      
      const result = terminalState.validate();
      
      expect(result.warnings).toContain('No plugins selected - basic Next.js app will be created');
    });

    test('validate should limit plugin count', () => {
      terminalState.selections.projectType = 'web2';
      terminalState.selections.plugins = ['plugin1', 'plugin2', 'plugin3', 'plugin4', 'plugin5', 'plugin6', 'plugin7'];
      
      const result = terminalState.validate();
      
      expect(result.valid).toBe(false);
              expect(result.errors).toContain('Maximum 6 plugins allowed');
    });

    test('validate should pass for valid configuration', () => {
      terminalState.selections.projectType = 'web3';
      terminalState.selections.blockchain = 'ethereum';
      terminalState.selections.plugins = ['supabase'];
      
      const result = terminalState.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('export and import', () => {
    test('export should return complete state object', () => {
      terminalState.currentStep = 2;
      terminalState.selections.projectType = 'web3';
      terminalState.addError('test error');
      
      const exported = terminalState.export();
      
      expect(exported.currentStep).toBe(2);
      expect(exported.totalSteps).toBe(6);
      expect(exported.stepNames).toHaveLength(6);
      expect(exported.selections.projectType).toBe('web3');
      expect(exported.metadata.errors).toHaveLength(1);
      expect(exported.visualState.cursorPosition).toEqual({ row: 1, col: 1 });
    });

    test('import should restore state from exported object', () => {
      const stateData = {
        currentStep: 3,
        totalSteps: 8,
        stepNames: ['Custom Step 1'],
        selections: { projectType: 'web3', blockchain: 'ethereum' },
        metadata: { errors: [{ message: 'imported error' }] },
        visualState: { cursorPosition: { row: 5, col: 5 } }
      };
      
      terminalState.import(stateData);
      
      expect(terminalState.currentStep).toBe(3);
      expect(terminalState.totalSteps).toBe(8);
      expect(terminalState.stepNames).toEqual(['Custom Step 1']);
      expect(terminalState.selections.projectType).toBe('web3');
      expect(terminalState.selections.blockchain).toBe('ethereum');
      expect(terminalState.metadata.errors).toEqual([{ message: 'imported error' }]);
      expect(terminalState.visualState.cursorPosition).toEqual({ row: 5, col: 5 });
    });

    test('import should handle partial state data', () => {
      const originalSelections = { ...terminalState.selections };
      
      terminalState.import({
        currentStep: 2,
        selections: { projectType: 'web3' }
      });
      
      expect(terminalState.currentStep).toBe(2);
      expect(terminalState.selections.projectType).toBe('web3');
      expect(terminalState.selections.blockchain).toBe(originalSelections.blockchain);
    });

    test('import should handle missing stepNames fallback', () => {
      const originalStepNames = [...terminalState.stepNames];
      
      terminalState.import({
        currentStep: 2,
        // No stepNames provided, should use original
      });
      
      expect(terminalState.stepNames).toEqual(originalStepNames);
    });

    test('import should handle empty state data', () => {
      const originalState = terminalState.export();
      
      terminalState.import({});
      
      expect(terminalState.currentStep).toBe(0);
      expect(terminalState.totalSteps).toBe(6);
      expect(terminalState.stepNames).toEqual(originalState.stepNames);
    });
  });

  describe('global state management', () => {
    afterEach(() => {
      // Reset global state after each test
      resetState();
    });

    test('getState should return singleton instance', () => {
      const state1 = getState();
      const state2 = getState();
      
      expect(state1).toBe(state2);
      expect(state1).toBeInstanceOf(TerminalState);
    });

    test('resetState should create new global instance', () => {
      const originalState = getState();
      originalState.currentStep = 3;
      
      const newState = resetState();
      
      expect(newState).not.toBe(originalState);
      expect(newState.currentStep).toBe(0);
      expect(getState()).toBe(newState);
    });

    test('createState should return new isolated instance', () => {
      const globalState = getState();
      const isolatedState = createState();
      
      expect(isolatedState).not.toBe(globalState);
      expect(isolatedState).toBeInstanceOf(TerminalState);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle concurrent step updates', () => {
      const steps = [];
      
      for (let i = 0; i < 5; i++) {
        steps.push(terminalState.nextStep(`Step ${i}`));
      }
      
      expect(steps).toEqual([1, 2, 3, 4, 5]);
      expect(terminalState.metadata.stepHistory).toHaveLength(5);
    });

    test('should handle large number of errors and warnings', () => {
      for (let i = 0; i < 100; i++) {
        terminalState.addError(`Error ${i}`);
        terminalState.addWarning(`Warning ${i}`);
      }
      
      expect(terminalState.metadata.errors).toHaveLength(100);
      expect(terminalState.metadata.warnings).toHaveLength(100);
    });

    test('should handle invalid step names gracefully', () => {
      terminalState.currentStep = -1;
      expect(terminalState.getCurrentStepName()).toBe('Unknown Step');
      
      terminalState.currentStep = 999;
      expect(terminalState.getCurrentStepName()).toBe('Unknown Step');
    });

    test('should maintain timestamp consistency', (done) => {
      const startTime = Date.now();
      
      setTimeout(() => {
        terminalState.updateSelection('projectType', 'web3');
        terminalState.nextStep();
        terminalState.addError('test error');
        
        expect(terminalState.metadata.lastUpdate).toBeGreaterThan(startTime);
        expect(terminalState.metadata.stepHistory[0].timestamp).toBeGreaterThan(startTime);
        expect(terminalState.metadata.errors[0].timestamp).toBeGreaterThan(startTime);
        
        done();
      }, 10);
    });

    test('should handle null plugins selection in validation', () => {
      terminalState.selections.projectType = 'web2';
      terminalState.selections.plugins = null;
      
      const result = terminalState.validate();
      
      expect(result.warnings).toContain('No plugins selected - basic Next.js app will be created');
    });

    test('should handle undefined plugins selection in validation', () => {
      terminalState.selections.projectType = 'web2';
      delete terminalState.selections.plugins;
      
      const result = terminalState.validate();
      
      expect(result.warnings).toContain('No plugins selected - basic Next.js app will be created');
    });
  });
}); 