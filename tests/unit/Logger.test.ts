import { Logger, LogLevel } from '../../src/common/utils/Logger';

describe('Logger Unit Tests', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods before each test
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods after each test
    jest.restoreAllMocks();
  });

  test('should create logger with correct name and level', () => {
    const logger = new Logger('TestLogger', LogLevel.DEBUG);

    // Access the private property for testing (using any to bypass TypeScript)
    const loggerAny = logger as any;

    expect(loggerAny.context).toBe('TestLogger');
    expect(loggerAny.level).toBe(LogLevel.DEBUG);
  });

  test('should log at DEBUG level when level is DEBUG', () => {
    const logger = new Logger('TestLogger', LogLevel.DEBUG);

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    // All levels should be logged
    expect(console.debug).toHaveBeenCalledWith('[TestLogger] Debug message');
    expect(console.info).toHaveBeenCalledWith('[TestLogger] Info message');
    expect(console.warn).toHaveBeenCalledWith('[TestLogger] Warning message');
    expect(console.error).toHaveBeenCalledWith('[TestLogger] Error message');
  });

  test('should not log DEBUG when level is INFO', () => {
    const logger = new Logger('TestLogger', LogLevel.INFO);

    logger.debug('Debug message');
    logger.info('Info message');

    // Debug should be skipped, info should be logged
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
  });

  test('should include additional data in log messages when provided', () => {
    const logger = new Logger('TestLogger', LogLevel.DEBUG);
    const testData = { user: 'test', id: 123 };

    logger.info('Message with data', testData);

    expect(console.info).toHaveBeenCalledWith('[TestLogger] Message with data', testData);
  });

  test('should respect log level hierarchy', () => {
    const logger = new Logger('TestLogger', LogLevel.WARN);

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    // Only warn and error should be logged
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
