import { jest } from '@jest/globals';
import { initializeTracing, getCurrentSegment, createSubsegment } from '../../../../src/shared/utils/tracing';

// Mock AWS X-Ray SDK
jest.mock('aws-xray-sdk-core', () => ({
  captureHTTPsGlobal: jest.fn(),
  captureAWS: jest.fn(),
  capturePromise: jest.fn(),
  getSegment: jest.fn(),
  setContextMissingStrategy: jest.fn(),
}));

describe('Tracing Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeTracing', () => {
    it('should initialize tracing when enabled', () => {
      // Act
      initializeTracing({ enableTracing: true });

      // Assert
      expect(require('aws-xray-sdk-core').captureHTTPsGlobal).toHaveBeenCalled();
      expect(require('aws-xray-sdk-core').captureAWS).toHaveBeenCalled();
      expect(require('aws-xray-sdk-core').capturePromise).toHaveBeenCalled();
    });

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
      const mockGetSegment = require('aws-xray-sdk-core').getSegment;
      mockGetSegment.mockReturnValue(undefined);

      // Act
      const result = getCurrentSegment();

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('createSubsegment', () => {
    it('should return undefined when no current segment', () => {
      // Arrange
      const mockGetSegment = require('aws-xray-sdk-core').getSegment;
      mockGetSegment.mockReturnValue(undefined);

      // Act
      const result = createSubsegment('test-segment');

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
