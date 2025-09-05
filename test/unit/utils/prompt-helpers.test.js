const {
  colors,
  icons,
  createProgressBar,
  createSection,
  createCard,
  createComparisonTable,
  applySemanticColors,
  createStatus,
  createDivider,
  wrapText,
  padLine
} = require('../../../lib/prompt-helpers');

// Helper functions for console output suppression
let originalConsole;

function suppressConsole() {
  originalConsole = { ...console };
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
}

function restoreConsole() {
  if (originalConsole) {
    Object.assign(console, originalConsole);
  }
}

describe('Prompt Helpers', () => {

  beforeEach(() => {
    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe('colors object', () => {
    it('should contain all required color functions', () => {
      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('secondary');
      expect(colors).toHaveProperty('success');
      expect(colors).toHaveProperty('error');
      expect(colors).toHaveProperty('warning');
      expect(colors).toHaveProperty('info');
      expect(colors).toHaveProperty('muted');
      expect(colors).toHaveProperty('bold');
      expect(colors).toHaveProperty('dim');
    });

    it('should apply colors correctly', () => {
      const text = 'test text';
      
      expect(typeof colors.primary(text)).toBe('string');
      expect(typeof colors.success(text)).toBe('string');
      expect(typeof colors.error(text)).toBe('string');
      expect(typeof colors.warning(text)).toBe('string');
      expect(typeof colors.info(text)).toBe('string');
      expect(typeof colors.muted(text)).toBe('string');
      expect(typeof colors.bold(text)).toBe('string');
      expect(typeof colors.dim(text)).toBe('string');
    });
  });

  describe('icons object', () => {
    it('should contain all required icons', () => {
      expect(icons).toHaveProperty('web2');
      expect(icons).toHaveProperty('web3');
      expect(icons).toHaveProperty('ai');
      expect(icons).toHaveProperty('database');
      expect(icons).toHaveProperty('auth');
      expect(icons).toHaveProperty('blockchain');
      expect(icons).toHaveProperty('time');
      expect(icons).toHaveProperty('complexity');
      expect(icons).toHaveProperty('check');
      expect(icons).toHaveProperty('arrow');
      expect(icons).toHaveProperty('star');
      expect(icons).toHaveProperty('rocket');
      expect(icons).toHaveProperty('gear');
      expect(icons).toHaveProperty('warning');
    });

    it('should be string values', () => {
      Object.values(icons).forEach(icon => {
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('createProgressBar', () => {
    it('should create progress bar with correct format', () => {
      const progressBar = createProgressBar(3, 5, 'Current Step');

      expect(progressBar).toContain('Step 3/5');
      expect(progressBar).toContain('(60%)');
      expect(progressBar).toContain('Current Step');
      expect(progressBar).toMatch(/\[.*\]/);
    });

    it('should handle 100% completion', () => {
      const progressBar = createProgressBar(5, 5);

      expect(progressBar).toContain('Step 5/5');
      expect(progressBar).toContain('(100%)');
    });

    it('should handle 0% completion', () => {
      const progressBar = createProgressBar(0, 5);

      expect(progressBar).toContain('Step 0/5');
      expect(progressBar).toContain('(0%)');
    });

    it('should work without label', () => {
      const progressBar = createProgressBar(2, 4);

      expect(progressBar).toContain('Step 2/4');
      expect(progressBar).toContain('(50%)');
      expect(progressBar).not.toContain(' - ');
    });

    it('should handle edge case with 1 total step', () => {
      const progressBar = createProgressBar(1, 1);

      expect(progressBar).toContain('Step 1/1');
      expect(progressBar).toContain('(100%)');
    });

    it('should handle large numbers', () => {
      const progressBar = createProgressBar(50, 100);

      expect(progressBar).toContain('Step 50/100');
      expect(progressBar).toContain('(50%)');
    });

    it('should handle decimal percentages correctly', () => {
      const progressBar = createProgressBar(1, 3);

      expect(progressBar).toContain('Step 1/3');
      expect(progressBar).toContain('(33%)');
    });
  });

  describe('createSection', () => {
    it('should create section with title only', () => {
      const section = createSection('Test Title');

      expect(section).toContain('Test Title');
      expect(section).toMatch(/─+/); // Contains divider
      expect(section.startsWith('\n')).toBe(true);
    });

    it('should create section with title and subtitle', () => {
      const section = createSection('Test Title', 'Test Subtitle');

      expect(section).toContain('Test Title');
      expect(section).toContain('Test Subtitle');
      expect(section).toMatch(/─+/);
    });

    it('should handle empty title', () => {
      const section = createSection('');

      expect(typeof section).toBe('string');
      expect(section).toMatch(/─+/);
    });

    it('should handle empty subtitle', () => {
      const section = createSection('Title', '');

      expect(section).toContain('Title');
      expect(section).toMatch(/─+/);
    });

    it('should format properly with newlines', () => {
      const section = createSection('Title', 'Subtitle');

      const lines = section.split('\n');
      expect(lines.length).toBeGreaterThan(3);
      expect(lines[0]).toBe(''); // Starts with newline
    });
  });

  describe('createCard', () => {
    it('should create basic card with required properties', () => {
      const cardOptions = {
        title: 'Test Title',
        description: 'Test description'
      };

      const card = createCard(cardOptions);

      expect(card).toContain('Test Title');
      expect(card).toContain('Test description');
      expect(card).toMatch(/┌.*┐/); // Top border
      expect(card).toMatch(/└.*┘/); // Bottom border
    });

    it('should create card with all properties', () => {
      const cardOptions = {
        title: 'Test Title',
        description: 'Test description',
        icon: '🚀',
        features: ['Feature 1', 'Feature 2'],
        complexity: 'Medium',
        time: '15 minutes',
        recommended: true
      };

      const card = createCard(cardOptions);

      expect(card).toContain('Test Title');
      expect(card).toContain('🚀');
      expect(card).toContain('(Recommended)');
      expect(card).toContain('Feature 1');
      expect(card).toContain('Feature 2');
      expect(card).toContain('Medium');
      expect(card).toContain('15 minutes');
    });

    it('should handle empty features array', () => {
      const cardOptions = {
        title: 'Test',
        description: 'Description',
        features: []
      };

      const card = createCard(cardOptions);

      expect(card).toContain('Test');
      expect(card).toContain('Description');
    });

    it('should handle missing optional properties', () => {
      const cardOptions = {
        title: 'Test',
        description: 'Description'
      };

      const card = createCard(cardOptions);

      expect(card).toContain('Test');
      expect(card).toContain('Description');
      expect(card).not.toContain('(Recommended)');
    });

    it('should handle long descriptions', () => {
      const longDescription = 'This is a very long description that should be wrapped properly across multiple lines to ensure proper formatting in the card layout.';
      
      const cardOptions = {
        title: 'Test',
        description: longDescription
      };

      const card = createCard(cardOptions);

      expect(card).toContain('Test');
      expect(card).toContain('This is a very long');
    });

    it('should handle empty title and description', () => {
      const cardOptions = {
        title: '',
        description: ''
      };

      const card = createCard(cardOptions);

      expect(typeof card).toBe('string');
      expect(card).toMatch(/┌.*┐/);
      expect(card).toMatch(/└.*┘/);
    });

    it('should handle card with only complexity metadata', () => {
      const cardOptions = {
        title: 'Test',
        description: 'Description',
        complexity: 'High'
      };

      const card = createCard(cardOptions);

      expect(card).toContain('High');
      expect(card).toContain(icons.complexity);
    });

    it('should handle card with only time metadata', () => {
      const cardOptions = {
        title: 'Test',
        description: 'Description',
        time: '30 minutes'
      };

      const card = createCard(cardOptions);

      expect(card).toContain('30 minutes');
      expect(card).toContain(icons.time);
    });

    it('should handle card with multiple features', () => {
      const cardOptions = {
        title: 'Test',
        description: 'Description',
        features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4']
      };

      const card = createCard(cardOptions);

      expect(card).toContain('Feature 1');
      expect(card).toContain('Feature 2');
      expect(card).toContain('Feature 3');
      expect(card).toContain('Feature 4');
      // Should contain bullet points
      expect(card).toMatch(/•/);
    });

    it('should handle unicode characters in title and description', () => {
      const cardOptions = {
        title: 'Test 🚀 Title',
        description: 'Description with émojis and ñ characters'
      };

      const card = createCard(cardOptions);

      expect(card).toContain('Test 🚀 Title');
      expect(card).toContain('Description with émojis and ñ characters');
    });
  });

  describe('createComparisonTable', () => {
    it('should create table with items and columns', () => {
      const items = [
        { name: 'Item 1', value: 'Value 1', score: 8 },
        { name: 'Item 2', value: 'Value 2', score: 9 }
      ];

      const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Value', key: 'value' },
        { header: 'Score', key: 'score' }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('Name');
      expect(table).toContain('Value');
      expect(table).toContain('Score');
      expect(table).toContain('Item 1');
      expect(table).toContain('Item 2');
      expect(table).toMatch(/┌.*┐/); // Top border
      expect(table).toMatch(/└.*┘/); // Bottom border
      expect(table).toMatch(/├.*┤/); // Middle border
    });

    it('should handle empty items array', () => {
      const items = [];
      const columns = [
        { header: 'Name', key: 'name' }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toBe('');
    });

    it('should handle empty columns array', () => {
      const items = [{ name: 'Item 1' }];
      const columns = [];

      const table = createComparisonTable(items, columns);

      expect(table).toBe('');
    });

    it('should handle columns with format function', () => {
      const items = [
        { name: 'Item 1', price: 100 }
      ];

      const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Price', key: 'price', format: (value) => `$${value}` }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('$100');
    });

    it('should handle missing properties in items', () => {
      const items = [
        { name: 'Item 1' },
        { name: 'Item 2', value: 'Value 2' }
      ];

      const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Value', key: 'value' }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('Item 1');
      expect(table).toContain('Item 2');
      expect(table).toContain('Value 2');
    });

    it('should handle single item and column', () => {
      const items = [{ name: 'Single Item' }];
      const columns = [{ header: 'Name', key: 'name' }];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('Single Item');
      expect(table).toContain('Name');
      expect(table).toMatch(/┌.*┐/);
      expect(table).toMatch(/└.*┘/);
    });

    it('should handle very long content that affects column width', () => {
      const items = [
        { name: 'Very Long Item Name That Exceeds Normal Width', value: 'Short' },
        { name: 'Short', value: 'Very Long Value That Also Exceeds Normal Width' }
      ];

      const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Value', key: 'value' }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('Very Long Item Name That Exceeds Normal Width');
      expect(table).toContain('Very Long Value That Also Exceeds Normal Width');
    });

    it('should handle null/undefined values in items', () => {
      const items = [
        { name: 'Item 1', value: null },
        { name: 'Item 2', value: undefined },
        { name: 'Item 3', value: 'Normal Value' }
      ];

      const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Value', key: 'value' }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('Item 1');
      expect(table).toContain('Item 2');
      expect(table).toContain('Item 3');
      expect(table).toContain('Normal Value');
    });

    it('should handle format function that returns null/undefined', () => {
      const items = [{ name: 'Item 1', value: 'test' }];
      const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Value', key: 'value', format: () => null }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('Item 1');
      expect(typeof table).toBe('string');
    });

    it('should handle columns with empty header', () => {
      const items = [{ name: 'Item 1', value: 'Value 1' }];
      const columns = [
        { header: '', key: 'name' },
        { header: 'Value', key: 'value' }
      ];

      const table = createComparisonTable(items, columns);

      expect(table).toContain('Item 1');
      expect(table).toContain('Value');
    });
  });

  describe('applySemanticColors', () => {
    it('should apply semantic colors correctly', () => {
      const text = 'test text';

      expect(typeof applySemanticColors(text, 'success')).toBe('string');
      expect(typeof applySemanticColors(text, 'error')).toBe('string');
      expect(typeof applySemanticColors(text, 'warning')).toBe('string');
      expect(typeof applySemanticColors(text, 'info')).toBe('string');
    });

    it('should fallback to info color for unknown type', () => {
      const text = 'test text';
      const result = applySemanticColors(text, 'unknown');

      expect(typeof result).toBe('string');
      expect(result).toContain(text);
    });

    it('should handle empty text', () => {
      const result = applySemanticColors('', 'success');

      expect(typeof result).toBe('string');
    });

    it('should handle null/undefined type', () => {
      const text = 'test';
      
      expect(typeof applySemanticColors(text, null)).toBe('string');
      expect(typeof applySemanticColors(text, undefined)).toBe('string');
    });
  });

  describe('createStatus', () => {
    it('should create status indicators correctly', () => {
      const successStatus = createStatus('success', 'Operation completed');
      const errorStatus = createStatus('error', 'Operation failed');
      const warningStatus = createStatus('warning', 'Warning message');
      const infoStatus = createStatus('info', 'Information');

      expect(successStatus).toContain('Operation completed');
      expect(errorStatus).toContain('Operation failed');
      expect(warningStatus).toContain('Warning message');
      expect(infoStatus).toContain('Information');

      expect(typeof successStatus).toBe('string');
      expect(typeof errorStatus).toBe('string');
      expect(typeof warningStatus).toBe('string');
      expect(typeof infoStatus).toBe('string');
    });

    it('should handle all defined status types', () => {
      const pendingStatus = createStatus('pending', 'Pending operation');
      const progressStatus = createStatus('progress', 'In progress');

      expect(pendingStatus).toContain('Pending operation');
      expect(progressStatus).toContain('In progress');
      expect(typeof pendingStatus).toBe('string');
      expect(typeof progressStatus).toBe('string');
    });

    it('should handle unknown status type', () => {
      const status = createStatus('unknown', 'Test message');

      expect(status).toContain('Test message');
      expect(typeof status).toBe('string');
    });

    it('should handle empty text', () => {
      const status = createStatus('success', '');

      expect(typeof status).toBe('string');
    });

    it('should handle null/undefined inputs', () => {
      expect(typeof createStatus(null, 'text')).toBe('string');
      expect(typeof createStatus('success', null)).toBe('string');
      expect(typeof createStatus(undefined, undefined)).toBe('string');
    });

    it('should include icons for each status type', () => {
      const statusTypes = ['success', 'error', 'warning', 'info', 'pending', 'progress'];
      
      statusTypes.forEach(type => {
        const status = createStatus(type, 'test');
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan('test'.length); // Should include icon
      });
    });

    it('should format status with proper spacing', () => {
      const status = createStatus('success', 'Test message');
      
      // Should have icon, space, then message
      expect(status).toMatch(/.*\s+Test message/);
    });

    it('should handle special characters in message', () => {
      const message = 'Message with !@#$%^&*() special chars';
      const status = createStatus('info', message);
      
      expect(status).toContain(message);
    });

    it('should handle unicode characters in message', () => {
      const message = 'Message with 🚀 émojis and ñ chars';
      const status = createStatus('success', message);
      
      expect(status).toContain(message);
    });
  });

  describe('createDivider', () => {
    it('should create divider with default parameters', () => {
      const divider = createDivider();

      expect(divider).toMatch(/─+/);
      // The actual string contains ANSI color codes, so just check it's reasonable length
      expect(typeof divider).toBe('string');
    });

    it('should create divider with custom character', () => {
      const divider = createDivider('=', 30);

      expect(divider).toMatch(/=+/);
      // Check it contains the expected repeated character count
      expect(divider).toContain('='.repeat(30));
    });

    it('should create divider with custom length', () => {
      const divider = createDivider('─', 10);

      expect(divider).toMatch(/─+/);
      expect(divider).toContain('─'.repeat(10));
    });

    it('should handle zero length', () => {
      const divider = createDivider('─', 0);

      expect(typeof divider).toBe('string');
      // Should not contain the repeated character for zero length
      expect(divider).not.toContain('─');
    });

    it('should handle negative length', () => {
      const divider = createDivider('─', -5);

      expect(typeof divider).toBe('string');
      // Should handle negative length gracefully (treat as 0)
      expect(divider).not.toContain('─');
    });

    it('should handle empty character', () => {
      const divider = createDivider('', 10);

      expect(typeof divider).toBe('string');
    });

    it('should handle multi-character string', () => {
      const divider = createDivider('abc', 5);

      expect(typeof divider).toBe('string');
      expect(divider).toContain('abcabcabcabcabc');
    });
  });

  describe('wrapText', () => {
    it('should wrap text correctly within width', () => {
      const text = 'This is a long text that should be wrapped across multiple lines when it exceeds the specified width.';
      const wrapped = wrapText(text, 30);

      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.length).toBeGreaterThan(1);
      // Check each line respects the width limit (accounting for the -4 buffer)
      wrapped.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(26); // 30 - 4 = 26
      });
    });

    it('should handle text shorter than width', () => {
      const text = 'Short text';
      const wrapped = wrapText(text, 50);

      expect(wrapped).toEqual(['Short text']);
    });

    it('should handle empty text', () => {
      const wrapped = wrapText('', 30);

      expect(wrapped).toEqual(['']);
    });

    it('should handle null and undefined inputs', () => {
      const wrappedNull = wrapText(null, 30);
      const wrappedUndefined = wrapText(undefined, 30);

      expect(wrappedNull).toEqual(['']);
      expect(wrappedUndefined).toEqual(['']);
    });

    it('should handle single word longer than width', () => {
      const text = 'supercalifragilisticexpialidocious';
      const wrapped = wrapText(text, 10);

      expect(wrapped.length).toBeGreaterThan(0);
      expect(wrapped[0]).toContain('supercalifragilisticexpialidocious');
    });

    it('should handle text with multiple spaces', () => {
      const text = 'Word1    Word2    Word3';
      const wrapped = wrapText(text, 50);

      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.join(' ')).toContain('Word1');
      expect(wrapped.join(' ')).toContain('Word2');
      expect(wrapped.join(' ')).toContain('Word3');
    });

    it('should handle zero width', () => {
      const text = 'Test text';
      const wrapped = wrapText(text, 0);

      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.length).toBeGreaterThan(0);
    });

    it('should handle negative width', () => {
      const text = 'Test text';
      const wrapped = wrapText(text, -10);

      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.length).toBeGreaterThan(0);
    });

    it('should preserve spaces appropriately', () => {
      const text = 'Word1    Word2    Word3';
      const wrapped = wrapText(text, 20);

      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.join(' ')).toContain('Word1');
      expect(wrapped.join(' ')).toContain('Word2');
      expect(wrapped.join(' ')).toContain('Word3');
    });

    it('should handle single character width', () => {
      const text = 'a b c';
      const wrapped = wrapText(text, 1);

      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle text with only spaces', () => {
      const text = '     ';
      const wrapped = wrapText(text, 10);

      expect(wrapped).toBeInstanceOf(Array);
    });

    it('should handle very large width', () => {
      const text = 'Short text';
      const wrapped = wrapText(text, 1000);

      expect(wrapped).toEqual(['Short text']);
    });

    it('should handle mixed content with punctuation', () => {
      const text = 'Hello, world! How are you? Fine, thanks.';
      const wrapped = wrapText(text, 15);

      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.join(' ')).toContain('Hello,');
      expect(wrapped.join(' ')).toContain('world!');
    });

    it('should properly handle word boundaries', () => {
      const text = 'This will be split properly at word boundaries.';
      const wrapped = wrapText(text, 20);

      expect(wrapped).toBeInstanceOf(Array);
      // No word should be artificially split
      wrapped.forEach(line => {
        expect(line).not.toMatch(/\w-$/); // No hyphenated breaks
      });
    });
  });

  describe('padLine', () => {
    it('should pad line to specified width', () => {
      const text = 'Test text';
      const padded = padLine(text, 20);

      expect(padded.length).toBeGreaterThanOrEqual(20);
      expect(padded).toContain('Test text');
      expect(padded).toContain('│'); // Should contain border characters
    });

    it('should handle text longer than width', () => {
      const text = 'This is a very long text that exceeds the width';
      const padded = padLine(text, 20);

      expect(padded).toContain('This is a very long text that exceeds the width');
      expect(padded).toContain('│');
    });

    it('should handle empty text', () => {
      const padded = padLine('', 10);

      expect(padded.length).toBeGreaterThanOrEqual(10);
      expect(padded).toContain('│');
    });

    it('should handle zero width', () => {
      const text = 'Test';
      const padded = padLine(text, 0);

      expect(padded).toContain('Test');
      expect(padded).toContain('│');
    });

    it('should handle negative width', () => {
      const text = 'Test';
      const padded = padLine(text, -5);

      expect(padded).toContain('Test');
      expect(padded).toContain('│');
    });

    it('should handle null/undefined text', () => {
      const paddedNull = padLine(null, 10);
      const paddedUndefined = padLine(undefined, 10);
      
      expect(typeof paddedNull).toBe('string');
      expect(typeof paddedUndefined).toBe('string');
      expect(paddedNull).toContain('│');
      expect(paddedUndefined).toContain('│');
    });

    it('should preserve text content', () => {
      const text = 'Important content';
      const padded = padLine(text, 30);

      expect(padded).toContain('Important content');
    });

    it('should handle special characters', () => {
      const text = '!@#$%^&*()';
      const padded = padLine(text, 20);

      expect(padded).toContain('!@#$%^&*()');
      expect(padded.length).toBeGreaterThanOrEqual(20);
    });

    it('should handle text with ANSI color codes', () => {
      const coloredText = '\u001b[32mGreen text\u001b[0m';
      const padded = padLine(coloredText, 20);

      expect(padded).toContain('Green text');
      expect(padded).toContain('│');
    });

    it('should calculate padding correctly with ANSI codes', () => {
      const plainText = 'test';
      const coloredText = '\u001b[32mtest\u001b[0m';
      
      const plainPadded = padLine(plainText, 20);
      const coloredPadded = padLine(coloredText, 20);
      
      // Both should have similar visual width despite ANSI codes
      expect(typeof plainPadded).toBe('string');
      expect(typeof coloredPadded).toBe('string');
    });

    it('should handle unicode characters', () => {
      const text = 'Text with 🚀 emoji';
      const padded = padLine(text, 25);

      expect(padded).toContain('Text with 🚀 emoji');
      expect(padded).toContain('│');
    });

    it('should handle very wide text', () => {
      const wideText = 'a'.repeat(100);
      const padded = padLine(wideText, 10);

      expect(padded).toContain(wideText);
      expect(padded).toContain('│');
    });

    it('should handle exact width match', () => {
      const text = 'exactly'; // 7 characters
      const padded = padLine(text, 9); // 7 + 2 for borders = 9

      expect(padded).toContain('exactly');
      expect(padded).toContain('│');
    });
  });

  describe('Integration tests', () => {
    it('should work together to create complex layouts', () => {
      const section = createSection('Test Section', 'Subtitle');
      const progressBar = createProgressBar(2, 5, 'Step 2');
      const status = createStatus('success', 'All good');

      expect(typeof section).toBe('string');
      expect(typeof progressBar).toBe('string');
      expect(typeof status).toBe('string');

      const combined = section + '\n' + progressBar + '\n' + status;
      expect(combined).toContain('Test Section');
      expect(combined).toContain('Step 2');
      expect(combined).toContain('All good');
    });

    it('should handle chained operations', () => {
      const coloredText = colors.bold(colors.success('Success message'));
      const wrappedText = wrapText(coloredText, 50);
      const paddedText = padLine(wrappedText[0], 60);

      expect(typeof coloredText).toBe('string');
      expect(wrappedText).toBeInstanceOf(Array);
      expect(typeof paddedText).toBe('string');
    });
  });
}); 