import * as Joi from 'joi';

export interface ValidationResult {
  error?: Joi.ValidationError;
  value: any;
}

export function validateRequest(data: any, schema: Joi.ObjectSchema): ValidationResult {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  return { error, value };
}

export function validatePartialRequest(data: any, schema: Joi.ObjectSchema): ValidationResult {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  return { error, value };
}
