import { jest } from '@jest/globals';
import { formatSuccessResponse, formatErrorResponse } from '../../../../src/shared/utils/responseUtils';

describe('Response Utils', () => {
  describe('formatSuccessResponse', () => {
    it('should format success response correctly', () => {
      // Arrange
      const data = { message: 'Success' };
      const statusCode = 200;

      // Act
      const response = formatSuccessResponse(data, statusCode);

      // Assert
      expect(response.statusCode).toBe(statusCode);
      expect(response.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      });
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: data,
        timestamp: expect.any(String)
      });
    });

    it('should use default status code 200', () => {
      // Arrange
      const data = { message: 'Success' };

      // Act
      const response = formatSuccessResponse(data);

      // Assert
      expect(response.statusCode).toBe(200);
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error response correctly', () => {
      // Arrange
      const message = 'Test error';
      const statusCode = 400;

      // Act
      const response = formatErrorResponse(message, statusCode);

      // Assert
      expect(response.statusCode).toBe(statusCode);
      expect(response.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      });
      expect(JSON.parse(response.body)).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Test error'
        },
        timestamp: expect.any(String)
      });
    });

    it('should use default status code 500', () => {
      // Arrange
      const message = 'Test error';

      // Act
      const response = formatErrorResponse(message);

      // Assert
      expect(response.statusCode).toBe(500);
    });
  });
});
