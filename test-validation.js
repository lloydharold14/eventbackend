const Joi = require('joi');

// Mock the validation schema
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).optional(),
  dateOfBirth: Joi.date().max('now').optional(),
  acceptTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the terms and conditions',
    'any.required': 'Terms and conditions acceptance is required'
  }),
  marketingConsent: Joi.boolean().optional(),
  role: Joi.string().valid('admin', 'organizer', 'attendee').default('organizer')
});

// Test data from mobile app
const mobileRequest = {
  email: 'tkhtechinc@gmail.com',
  username: 'tkhtech',
  password: 'Campus2020$',
  firstName: 'harold ',
  lastName: 'tkh',
  phone: null,
  acceptTerms: true,
  marketingConsent: false
};

console.log('Mobile request data:', JSON.stringify(mobileRequest, null, 2));

// Test validation
const validation = userRegistrationSchema.validate(mobileRequest, { abortEarly: false });

console.log('\nValidation result:');
console.log('Is valid:', !validation.error);
if (validation.error) {
  console.log('Error details:');
  validation.error.details.forEach(detail => {
    console.log(`- ${detail.message} (path: ${detail.path.join('.')})`);
  });
} else {
  console.log('Validation passed!');
}

// Test individual field validation
console.log('\nIndividual field tests:');
console.log('acceptTerms type:', typeof mobileRequest.acceptTerms);
console.log('acceptTerms value:', mobileRequest.acceptTerms);
console.log('acceptTerms === true:', mobileRequest.acceptTerms === true);
console.log('acceptTerms === "true":', mobileRequest.acceptTerms === "true");

// Test with different acceptTerms values
const testCases = [
  { acceptTerms: true, description: 'boolean true' },
  { acceptTerms: "true", description: 'string "true"' },
  { acceptTerms: 1, description: 'number 1' },
  { acceptTerms: "1", description: 'string "1"' },
  { acceptTerms: false, description: 'boolean false' },
  { acceptTerms: null, description: 'null' },
  { acceptTerms: undefined, description: 'undefined' }
];

console.log('\nTesting different acceptTerms values:');
testCases.forEach(testCase => {
  const testData = { ...mobileRequest, acceptTerms: testCase.acceptTerms };
  const testValidation = userRegistrationSchema.validate(testData, { abortEarly: false });
  console.log(`${testCase.description}: ${testValidation.error ? 'FAIL' : 'PASS'}`);
  if (testValidation.error) {
    const acceptTermsError = testValidation.error.details.find(d => d.path.includes('acceptTerms'));
    if (acceptTermsError) {
      console.log(`  Error: ${acceptTermsError.message}`);
    }
  }
});

