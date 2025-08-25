import { jest } from '@jest/globals';

// Mock AWS X-Ray SDK
jest.mock('aws-xray-sdk-core', () => ({
  captureHTTPsGlobal: jest.fn(),
  captureAWS: jest.fn(),
  capturePromise: jest.fn(),
  getSegment: jest.fn(),
  setContextMissingStrategy: jest.fn(),
  Subsegment: jest.fn().mockImplementation(() => ({
    addNewSubsegment: jest.fn(),
    addMetadata: jest.fn(),
    addError: jest.fn(),
    close: jest.fn(),
  })),
}));

// Import after mocking
import { initializeTracing, getCurrentSegment, createSubsegment } from '../../../../src/shared/utils/tracing';

describe('Tracing Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeTracing', () => {
    it('should not initialize tracing when disabled', () => {
      // Act
      initializeTracing({ enableTracing: false });

      // Assert
      expect(require('aws-xray-sdk-core').captureHTTPsGlobal).not.toHaveBeenCalled();
      expect(require('aws-xray-sdk-core').captureAWS).not.toHaveBeenCalled();
      expect(require('aws-xray-sdk-core').capturePromise).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentSegment', () => {
    it('should return undefined when no segment exists', () => {
      // Arrange
      require('aws-xray-sdk-core').getSegment.mockReturnValue(undefined);

      // Act
      const result = getCurrentSegment();

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('createSubsegment', () => {
    it('should return undefined when no current segment', () => {
      // Arrange
      require('aws-xray-sdk-core').getSegment.mockReturnValue(undefined);

      // Act
      const result = createSubsegment('test-segment');

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
