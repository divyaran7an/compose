/**
 * Mock for ora spinner library
 * This mock prevents spinner-related issues in tests
 */

module.exports = jest.fn((options = {}) => {
  // Handle both string and object parameters
  let actualOptions = {};
  if (typeof options === 'string') {
    actualOptions = { text: options };
  } else if (typeof options === 'object' && options !== null) {
    actualOptions = { ...options };
  }
  
  const mockSpinner = {
    // Core methods
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
    clear: jest.fn().mockReturnThis(),
    
    // Properties
    color: actualOptions.color || 'cyan',
    spinner: actualOptions.spinner || 'dots',
    isSpinning: false,
    
    // Additional properties that ora has
    indent: 0,
    interval: 80,
    stream: process.stderr,
    id: undefined,
    frameIndex: 0,
    
    // Methods that ora has
    render: jest.fn().mockReturnThis(),
    frame: jest.fn().mockReturnThis(),
    
    // Internal text storage
    _text: actualOptions.text || '',
    
    // Text getter and setter
    get text() {
      return this._text;
    },
    
    set text(value) {
      this._text = value || '';
    }
  };
  
  // Track spinner for cleanup if global tracking is available
  if (global.activeSpinners) {
    global.activeSpinners.add(mockSpinner);
  }
  
  return mockSpinner;
}); 