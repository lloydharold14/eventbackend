const password = 'Campus2020$';
const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

console.log('Password:', password);
console.log('Length:', password.length);
console.log('Has lowercase:', /[a-z]/.test(password));
console.log('Has uppercase:', /[A-Z]/.test(password));
console.log('Has digit:', /\d/.test(password));
console.log('Has special char:', /[@$!%*?&]/.test(password));
console.log('Matches pattern:', pattern.test(password));

// Test each requirement individually
console.log('\nDetailed Analysis:');
console.log('1. Length >= 8:', password.length >= 8);
console.log('2. Contains lowercase:', /[a-z]/.test(password));
console.log('3. Contains uppercase:', /[A-Z]/.test(password));
console.log('4. Contains digit:', /\d/.test(password));
console.log('5. Contains special char (@$!%*?&):', /[@$!%*?&]/.test(password));

// Check if it's a common weak password pattern
const commonPatterns = [
  /^[A-Z][a-z]+\d{4}\$/,
  /^[A-Z][a-z]+\d{4}[@$!%*?&]/,
  /^[A-Z][a-z]+\d{4}/,
  /^[A-Z][a-z]+\d{2,4}[@$!%*?&]/
];

console.log('\nCommon weak patterns:');
commonPatterns.forEach((pattern, index) => {
  console.log(`Pattern ${index + 1}:`, pattern.test(password));
});

