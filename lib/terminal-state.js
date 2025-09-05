/**
 * Terminal State Management System
 * Tracks the current state of the CLI interaction including user selections,
 * current step, and visual state for proper terminal management
 */

class TerminalState {
  constructor() {
    this.reset();
  }
  
  /**
   * Reset state to initial values
   */
  reset() {
    this.currentStep = 0;
    this.totalSteps = 6;
    this.stepNames = [
      'Project Type Selection',
      'Blockchain Selection', 
      'Plugin Selection',
      'Configuration Options',
      'Configuration Summary',
      'Complete'
    ];
    
    this.selections = {
      projectType: null,
      blockchain: null,
      plugins: [],
      typescript: null,
      tailwind: null,
      eslint: null,
      installDependencies: null,
      packageManager: null
    };
    
    this.metadata = {
      startTime: Date.now(),
      lastUpdate: Date.now(),
      stepHistory: [],
      errors: [],
      warnings: []
    };
    
    this.visualState = {
      lastClearTime: null,
      preservedContent: null,
      cursorPosition: { row: 1, col: 1 },
      terminalSize: { width: 80, height: 24 }
    };
  }
  
  /**
   * Advance to next step
   * @param {string} stepName - Optional custom step name
   */
  nextStep(stepName = null) {
    this.currentStep++;
    this.metadata.lastUpdate = Date.now();
    
    // Record step history
    this.metadata.stepHistory.push({
      step: this.currentStep - 1,
      name: stepName || this.stepNames[this.currentStep - 1],
      timestamp: Date.now(),
      selections: { ...this.selections }
    });
    
    return this.currentStep;
  }
  
  /**
   * Go back to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.metadata.lastUpdate = Date.now();
      
      // Restore previous selections if available
      const previousHistory = this.metadata.stepHistory[this.currentStep - 1];
      if (previousHistory) {
        this.selections = { ...previousHistory.selections };
      }
    }
    return this.currentStep;
  }
  
  /**
   * Update user selection
   * @param {string} key - Selection key
   * @param {any} value - Selection value
   */
  updateSelection(key, value) {
    this.selections[key] = value;
    this.metadata.lastUpdate = Date.now();
  }
  
  /**
   * Get current progress percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgress() {
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }
  
  /**
   * Get current step name
   * @returns {string} Current step name
   */
  getCurrentStepName() {
    return this.stepNames[this.currentStep] || 'Unknown Step';
  }
  
  /**
   * Get progress bar representation
   * @returns {string} Visual progress bar
   */
  getProgressBar() {
    const { createProgressBar } = require('./prompt-helpers');
    return createProgressBar(this.currentStep, this.totalSteps, this.getCurrentStepName());
  }
  
  /**
   * Get compact summary of current state
   * @returns {Object} State summary for display
   */
  getSummary() {
    return {
      step: `${this.currentStep}/${this.totalSteps}`,
      stepName: this.getCurrentStepName(),
      progress: this.getProgress(),
      projectType: this.selections.projectType,
      blockchain: this.selections.blockchain,
      plugins: this.selections.plugins,
      duration: Date.now() - this.metadata.startTime
    };
  }
  
  /**
   * Get preserved information for smart clear
   * @returns {Object} Information to preserve during screen clear
   */
  getPreservedInfo() {
    const info = {};
    
    if (this.selections.projectType) {
      info.projectType = this.selections.projectType.toUpperCase();
    }
    
    if (this.selections.blockchain) {
      info.blockchain = this.selections.blockchain.toUpperCase();
    }
    
    if (this.selections.plugins && this.selections.plugins.length > 0) {
      info.plugins = this.selections.plugins;
    }
    
    info.step = this.getCurrentStepName();
    
    return info;
  }
  
  /**
   * Record an error
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   */
  addError(message, context = {}) {
    this.metadata.errors.push({
      message,
      context,
      timestamp: Date.now(),
      step: this.currentStep
    });
  }
  
  /**
   * Record a warning
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  addWarning(message, context = {}) {
    this.metadata.warnings.push({
      message,
      context,
      timestamp: Date.now(),
      step: this.currentStep
    });
  }
  
  /**
   * Update visual state information
   * @param {Object} visualInfo - Visual state information
   */
  updateVisualState(visualInfo) {
    this.visualState = { ...this.visualState, ...visualInfo };
    this.metadata.lastUpdate = Date.now();
  }
  
  /**
   * Check if step can be skipped based on current selections
   * @param {number} stepIndex - Step to check
   * @returns {boolean} Whether step can be skipped
   */
  canSkipStep(stepIndex) {
    switch (stepIndex) {
      case 1: // Blockchain Selection
        return this.selections.projectType !== 'web3';
      case 4: // Package Manager
        return this.selections.installDependencies === false;
      default:
        return false;
    }
  }
  
  /**
   * Get next required step (skipping optional ones)
   * @returns {number} Next step index
   */
  getNextRequiredStep() {
    let nextStep = this.currentStep + 1;
    
    while (nextStep < this.totalSteps && this.canSkipStep(nextStep)) {
      nextStep++;
    }
    
    return nextStep;
  }
  
  /**
   * Validate current state
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];
    
    // Required selections validation
    if (!this.selections.projectType) {
      errors.push('Project type must be selected');
    }
    
    if (this.selections.projectType === 'web3' && !this.selections.blockchain) {
      errors.push('Blockchain must be selected for Web3 projects');
    }
    
    if (!this.selections.plugins || this.selections.plugins.length === 0) {
      warnings.push('No plugins selected - basic Next.js app will be created');
    }
    
    // Plugin combination validation
    if (this.selections.plugins && this.selections.plugins.length > 6) {
      errors.push('Maximum 6 plugins allowed');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Export state for debugging or persistence
   * @returns {Object} Complete state object
   */
  export() {
    return {
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      stepNames: this.stepNames,
      selections: { ...this.selections },
      metadata: { ...this.metadata },
      visualState: { ...this.visualState }
    };
  }
  
  /**
   * Import state from exported object
   * @param {Object} stateData - Previously exported state
   */
  import(stateData) {
    this.currentStep = stateData.currentStep || 0;
    this.totalSteps = stateData.totalSteps || 6;
    this.stepNames = stateData.stepNames || this.stepNames;
    this.selections = { ...this.selections, ...stateData.selections };
    this.metadata = { ...this.metadata, ...stateData.metadata };
    this.visualState = { ...this.visualState, ...stateData.visualState };
  }
}

// Global state instance
let globalState = null;

/**
 * Get or create global terminal state instance
 * @returns {TerminalState} Global state instance
 */
function getState() {
  if (!globalState) {
    globalState = new TerminalState();
  }
  return globalState;
}

/**
 * Reset global state
 */
function resetState() {
  globalState = new TerminalState();
  return globalState;
}

/**
 * Create a new isolated state instance
 * @returns {TerminalState} New state instance
 */
function createState() {
  return new TerminalState();
}

module.exports = {
  TerminalState,
  getState,
  resetState,
  createState
}; 