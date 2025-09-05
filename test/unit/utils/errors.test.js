const {
  EXIT_CODES,
  CreateAIAppError,
  ValidationError,
  FileSystemError,
  NetworkError,
  PermissionError,
  DependencyError,
  TemplateError,
  UserCancelledError,
  handleError,
  asyncErrorHandler,
  formatErrorMessage,
  createValidationError,
  createFileSystemError,
  createNetworkError,
  createPermissionError,
  createDependencyError,
  createTemplateError
} = require('../../../lib/errors');

// Mock console functions
jest.mock('../../../lib/console', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn()
}));

const { logError, logWarning, logInfo } = require('../../../lib/console');

describe('Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.exit to prevent actual exits during tests
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    process.exit.mockRestore();
  });

  describe('Exit Codes', () => {
    test('should have correct exit code values', () => {
      expect(EXIT_CODES.SUCCESS).toBe(0);
      expect(EXIT_CODES.GENERAL_ERROR).toBe(1);
      expect(EXIT_CODES.INVALID_ARGUMENTS).toBe(2);
      expect(EXIT_CODES.FILE_SYSTEM_ERROR).toBe(3);
      expect(EXIT_CODES.NETWORK_ERROR).toBe(4);
      expect(EXIT_CODES.PERMISSION_ERROR).toBe(5);
      expect(EXIT_CODES.VALIDATION_ERROR).toBe(6);
      expect(EXIT_CODES.DEPENDENCY_ERROR).toBe(7);
      expect(EXIT_CODES.TEMPLATE_ERROR).toBe(8);
      expect(EXIT_CODES.USER_CANCELLED).toBe(9);
    });
  });

  describe('CreateAIAppError', () => {
    test('should create error with default values', () => {
      const error = new CreateAIAppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('CreateAIAppError');
      expect(error.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
      expect(error.userMessage).toBe('Test error');
      expect(error.timestamp).toBeDefined();
    });

    test('should create error with custom values', () => {
      const error = new CreateAIAppError('Test error', EXIT_CODES.VALIDATION_ERROR, 'User message');
      
      expect(error.message).toBe('Test error');
      expect(error.exitCode).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(error.userMessage).toBe('User message');
    });
  });

  describe('ValidationError', () => {
    test('should create validation error with field and suggestions', () => {
      const error = new ValidationError('Invalid name', 'projectName', ['Use lowercase', 'No spaces']);
      
      expect(error.message).toBe('Invalid name');
      expect(error.userMessage).toBe('Invalid projectName: Invalid name');
      expect(error.exitCode).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(error.field).toBe('projectName');
      expect(error.suggestions).toEqual(['Use lowercase', 'No spaces']);
    });

    test('should create validation error without field', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.userMessage).toBe('Invalid input: Invalid input');
      expect(error.field).toBeNull();
      expect(error.suggestions).toEqual([]);
    });
  });

  describe('FileSystemError', () => {
    test('should create file system error with path and operation', () => {
      const error = new FileSystemError('Cannot write file', '/path/to/file', 'write');
      
      expect(error.message).toBe('Cannot write file');
      expect(error.userMessage).toBe('File system error at /path/to/file: Cannot write file');
      expect(error.exitCode).toBe(EXIT_CODES.FILE_SYSTEM_ERROR);
      expect(error.path).toBe('/path/to/file');
      expect(error.operation).toBe('write');
    });
  });

  describe('NetworkError', () => {
    test('should create network error with URL and status code', () => {
      const error = new NetworkError('Request failed', 'https://example.com', 404);
      
      expect(error.message).toBe('Request failed');
      expect(error.userMessage).toBe('Network error accessing https://example.com: Request failed');
      expect(error.exitCode).toBe(EXIT_CODES.NETWORK_ERROR);
      expect(error.url).toBe('https://example.com');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('PermissionError', () => {
    test('should create permission error with path and required permission', () => {
      const error = new PermissionError('Access denied', '/restricted/path', 'write');
      
      expect(error.message).toBe('Access denied');
      expect(error.userMessage).toBe('Permission denied for /restricted/path: Access denied');
      expect(error.exitCode).toBe(EXIT_CODES.PERMISSION_ERROR);
      expect(error.path).toBe('/restricted/path');
      expect(error.requiredPermission).toBe('write');
    });
  });

  describe('DependencyError', () => {
    test('should create dependency error with package name and manager', () => {
      const error = new DependencyError('Installation failed', 'react', 'npm');
      
      expect(error.message).toBe('Installation failed');
      expect(error.userMessage).toBe('Dependency error with react: Installation failed');
      expect(error.exitCode).toBe(EXIT_CODES.DEPENDENCY_ERROR);
      expect(error.packageName).toBe('react');
      expect(error.packageManager).toBe('npm');
    });
  });

  describe('TemplateError', () => {
    test('should create template error with template name and path', () => {
      const error = new TemplateError('Template not found', 'react-app', '/templates/react-app');
      
      expect(error.message).toBe('Template not found');
      expect(error.userMessage).toBe('Template error with react-app: Template not found');
      expect(error.exitCode).toBe(EXIT_CODES.TEMPLATE_ERROR);
      expect(error.templateName).toBe('react-app');
      expect(error.templatePath).toBe('/templates/react-app');
    });
  });

  describe('UserCancelledError', () => {
    test('should create user cancelled error with default message', () => {
      const error = new UserCancelledError();
      
      expect(error.message).toBe('Operation cancelled by user');
      expect(error.exitCode).toBe(EXIT_CODES.USER_CANCELLED);
    });

    test('should create user cancelled error with custom message', () => {
      const error = new UserCancelledError('Custom cancellation message');
      
      expect(error.message).toBe('Custom cancellation message');
      expect(error.exitCode).toBe(EXIT_CODES.USER_CANCELLED);
    });
  });

  describe('formatErrorMessage', () => {
    test('should format validation error with suggestions', () => {
      const error = new ValidationError('Invalid name', 'projectName', ['Use lowercase', 'No spaces']);
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('Invalid projectName: Invalid name');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('• Use lowercase');
      expect(formatted).toContain('• No spaces');
    });

    test('should format file system error with operation', () => {
      const error = new FileSystemError('Cannot write', '/path', 'write');
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('File system error at /path: Cannot write');
      expect(formatted).toContain('Failed operation: write');
    });

    test('should format network error with troubleshooting', () => {
      const error = new NetworkError('Request failed', 'https://example.com');
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('Network error accessing https://example.com: Request failed');
      expect(formatted).toContain('Troubleshooting:');
      expect(formatted).toContain('Check your internet connection');
    });

    test('should format permission error with troubleshooting', () => {
      const error = new PermissionError('Access denied', '/path');
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('Permission denied for /path: Access denied');
      expect(formatted).toContain('Troubleshooting:');
      expect(formatted).toContain('Check file/directory permissions');
    });

    test('should format dependency error with troubleshooting', () => {
      const error = new DependencyError('Installation failed', 'react');
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('Dependency error with react: Installation failed');
      expect(formatted).toContain('Troubleshooting:');
      expect(formatted).toContain('Check your internet connection');
    });
  });

  describe('handleError', () => {
    test('should handle CreateAIAppError and exit with correct code', () => {
      const error = new ValidationError('Test error');
      
      handleError(error);
      
      expect(logError).toHaveBeenCalledWith(formatErrorMessage(error));
      expect(process.exit).toHaveBeenCalledWith(EXIT_CODES.VALIDATION_ERROR);
    });

    test('should handle generic error and exit with general error code', () => {
      const error = new Error('Generic error');
      
      handleError(error);
      
      expect(logError).toHaveBeenCalledWith('An unexpected error occurred:');
      expect(logError).toHaveBeenCalledWith('Generic error');
      expect(process.exit).toHaveBeenCalledWith(EXIT_CODES.GENERAL_ERROR);
    });

    test('should handle error silently when silent flag is true', () => {
      const error = new ValidationError('Test error');
      
      handleError(error, true);
      
      expect(logError).not.toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(EXIT_CODES.VALIDATION_ERROR);
    });
  });

  describe('asyncErrorHandler', () => {
    test('should wrap async function and handle errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new ValidationError('Test error'));
      const wrappedFn = asyncErrorHandler(mockFn);
      
      await wrappedFn('arg1', 'arg2');
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(process.exit).toHaveBeenCalledWith(EXIT_CODES.VALIDATION_ERROR);
    });

    test('should return result when no error occurs', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncErrorHandler(mockFn);
      
      const result = await wrappedFn('arg1');
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1');
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Error Creation Helpers', () => {
    test('createValidationError should create ValidationError', () => {
      const error = createValidationError('Invalid input', 'field', ['suggestion']);
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.field).toBe('field');
      expect(error.suggestions).toEqual(['suggestion']);
    });

    test('createFileSystemError should create FileSystemError', () => {
      const error = createFileSystemError('File error', '/path', 'read');
      
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.path).toBe('/path');
      expect(error.operation).toBe('read');
    });

    test('createNetworkError should create NetworkError', () => {
      const error = createNetworkError('Network error', 'https://example.com', 500);
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.url).toBe('https://example.com');
      expect(error.statusCode).toBe(500);
    });

    test('createPermissionError should create PermissionError', () => {
      const error = createPermissionError('Permission error', '/path', 'write');
      
      expect(error).toBeInstanceOf(PermissionError);
      expect(error.path).toBe('/path');
      expect(error.requiredPermission).toBe('write');
    });

    test('createDependencyError should create DependencyError', () => {
      const error = createDependencyError('Dependency error', 'package', 'npm');
      
      expect(error).toBeInstanceOf(DependencyError);
      expect(error.packageName).toBe('package');
      expect(error.packageManager).toBe('npm');
    });

    test('createTemplateError should create TemplateError', () => {
      const error = createTemplateError('Template error', 'template', '/path');
      
      expect(error).toBeInstanceOf(TemplateError);
      expect(error.templateName).toBe('template');
      expect(error.templatePath).toBe('/path');
    });
  });
}); 