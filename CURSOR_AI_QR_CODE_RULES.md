# 🎫 Cursor AI Rules: QR Code Generation & Attendee Validation

## 🎯 **Project Context**
You are working on an Event Management Platform backend that needs QR code generation and attendee validation functionality. The platform uses AWS Lambda, DynamoDB, and API Gateway.

## 📋 **Core Requirements**

### **QR Code Generation**
- Generate unique QR codes for each booking/attendee
- QR codes should contain encrypted booking data
- Support multiple QR code formats (text, URL, JSON)
- Include expiration and validation logic
- Generate both digital and printable formats

### **Attendee Validation**
- Scan and validate QR codes at event entry
- Real-time validation against booking database
- Support offline validation with cached data
- Track entry/exit times and attendance
- Handle multiple validation scenarios

---

## 🏗️ **Architecture Rules**

### **1. Service Structure**
```typescript
// Always create separate services for QR and validation
src/domains/
├── qr-codes/
│   ├── services/
│   │   ├── QRCodeService.ts
│   │   └── QRCodeValidationService.ts
│   ├── models/
│   │   ├── QRCode.ts
│   │   └── QRCodeData.ts
│   ├── repositories/
│   │   └── QRCodeRepository.ts
│   └── handlers/
│       └── qrCodeHandlers.ts
└── validation/
    ├── services/
    │   └── AttendeeValidationService.ts
    ├── models/
    │   └── ValidationResult.ts
    └── handlers/
        └── validationHandlers.ts
```

### **2. Database Schema**
```typescript
// QR Code Table Structure
interface QRCodeRecord {
  PK: string; // `QR#${bookingId}`
  SK: string; // `EVENT#${eventId}`
  qrCodeId: string;
  bookingId: string;
  eventId: string;
  attendeeId: string;
  qrCodeData: string; // Encrypted data
  qrCodeUrl: string; // Generated QR image URL
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  usedBy?: string; // Validator ID
  validationCount: number;
  lastValidatedAt?: string;
}

// Validation Log Table
interface ValidationLog {
  PK: string; // `VALIDATION#${validationId}`
  SK: string; // `QR#${qrCodeId}`
  validationId: string;
  qrCodeId: string;
  bookingId: string;
  eventId: string;
  attendeeId: string;
  validatorId: string;
  validationResult: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'ALREADY_USED';
  validationTime: string;
  location?: string;
  deviceInfo?: string;
  notes?: string;
}
```

---

## 🔐 **Security Rules**

### **1. QR Code Encryption**
```typescript
// Always encrypt sensitive data in QR codes
interface QRCodeData {
  bookingId: string;
  eventId: string;
  attendeeId: string;
  eventName: string;
  attendeeName: string;
  ticketType: string;
  validFrom: string;
  validUntil: string;
  checksum: string; // For integrity verification
}

// Use AES-256-GCM for encryption
const encryptQRData = (data: QRCodeData, secretKey: string): string => {
  const cipher = crypto.createCipher('aes-256-gcm', secretKey);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted + ':' + cipher.getAuthTag().toString('hex');
};
```

### **2. Validation Security**
```typescript
// Always validate QR codes server-side
// Never trust client-side validation alone
// Implement rate limiting for validation requests
// Log all validation attempts for audit
```

---

## 📱 **QR Code Generation Rules**

### **1. QR Code Service Implementation**
```typescript
export class QRCodeService {
  // Generate QR code for booking
  async generateQRCode(bookingId: string): Promise<QRCode>
  
  // Generate QR code URL for validation
  async generateValidationURL(qrCodeId: string): Promise<string>
  
  // Regenerate QR code (for lost/stolen tickets)
  async regenerateQRCode(bookingId: string): Promise<QRCode>
  
  // Revoke QR code
  async revokeQRCode(qrCodeId: string): Promise<void>
  
  // Get QR code status
  async getQRCodeStatus(qrCodeId: string): Promise<QRCodeStatus>
}
```

### **2. QR Code Data Structure**
```typescript
// QR codes should contain minimal but sufficient data
const qrCodeContent = {
  // For online validation
  url: `https://api.eventplatform.com/validate/${qrCodeId}`,
  
  // For offline validation (encrypted)
  data: encryptQRData({
    bookingId: 'booking-uuid',
    eventId: 'event-uuid',
    attendeeId: 'attendee-uuid',
    eventName: 'Tech Conference 2024',
    attendeeName: 'John Doe',
    ticketType: 'VIP',
    validFrom: '2024-12-15T09:00:00Z',
    validUntil: '2024-12-15T18:00:00Z',
    checksum: 'sha256-hash'
  }, secretKey)
};
```

### **3. QR Code Formats**
```typescript
// Support multiple QR code formats
enum QRCodeFormat {
  URL = 'url',           // Direct validation URL
  JSON = 'json',         // Encrypted JSON data
  TEXT = 'text',         // Simple text format
  HYBRID = 'hybrid'      // Both URL and encrypted data
}

// Generate different formats based on use case
const generateQRCode = async (
  bookingId: string, 
  format: QRCodeFormat = QRCodeFormat.HYBRID
): Promise<QRCode> => {
  // Implementation based on format
};
```

---

## ✅ **Attendee Validation Rules**

### **1. Validation Service Implementation**
```typescript
export class AttendeeValidationService {
  // Validate QR code
  async validateQRCode(qrCodeId: string, validatorId: string): Promise<ValidationResult>
  
  // Validate offline (with cached data)
  async validateOffline(qrCodeData: string): Promise<ValidationResult>
  
  // Batch validation
  async validateMultiple(qrCodeIds: string[]): Promise<ValidationResult[]>
  
  // Get validation history
  async getValidationHistory(qrCodeId: string): Promise<ValidationLog[]>
  
  // Check-in attendee
  async checkInAttendee(qrCodeId: string, validatorId: string): Promise<CheckInResult>
  
  // Check-out attendee
  async checkOutAttendee(qrCodeId: string, validatorId: string): Promise<CheckOutResult>
}
```

### **2. Validation Logic**
```typescript
// Comprehensive validation checks
const validateQRCode = async (qrCodeId: string): Promise<ValidationResult> => {
  // 1. Check if QR code exists
  const qrCode = await qrCodeRepository.getQRCode(qrCodeId);
  if (!qrCode) {
    return { valid: false, reason: 'QR_CODE_NOT_FOUND' };
  }
  
  // 2. Check if QR code is active
  if (qrCode.status !== 'ACTIVE') {
    return { valid: false, reason: 'QR_CODE_INACTIVE', status: qrCode.status };
  }
  
  // 3. Check expiration
  if (new Date() > new Date(qrCode.expiresAt)) {
    return { valid: false, reason: 'QR_CODE_EXPIRED' };
  }
  
  // 4. Check if already used (if single-use)
  if (qrCode.validationCount > 0 && qrCode.singleUse) {
    return { valid: false, reason: 'QR_CODE_ALREADY_USED' };
  }
  
  // 5. Validate booking status
  const booking = await bookingRepository.getBooking(qrCode.bookingId);
  if (booking.status !== 'CONFIRMED') {
    return { valid: false, reason: 'BOOKING_NOT_CONFIRMED' };
  }
  
  // 6. Check event timing
  const event = await eventRepository.getEvent(qrCode.eventId);
  const now = new Date();
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  
  if (now < eventStart || now > eventEnd) {
    return { valid: false, reason: 'EVENT_NOT_ACTIVE' };
  }
  
  return { valid: true, qrCode, booking, event };
};
```

### **3. Validation Scenarios**
```typescript
// Handle different validation scenarios
enum ValidationScenario {
  ENTRY = 'entry',           // First entry
  RE_ENTRY = 're_entry',     // Multiple entries allowed
  EXIT = 'exit',             // Check-out
  TRANSFER = 'transfer',     // Transfer to another person
  REPLACEMENT = 'replacement' // Lost ticket replacement
}

// Different validation rules per scenario
const validateByScenario = async (
  qrCodeId: string, 
  scenario: ValidationScenario
): Promise<ValidationResult> => {
  switch (scenario) {
    case ValidationScenario.ENTRY:
      return await validateFirstEntry(qrCodeId);
    case ValidationScenario.RE_ENTRY:
      return await validateReEntry(qrCodeId);
    case ValidationScenario.EXIT:
      return await validateExit(qrCodeId);
    // ... other scenarios
  }
};
```

---

## 🔄 **API Endpoints Rules**

### **1. QR Code Endpoints**
```typescript
// QR Code Management Endpoints
POST /qr-codes/generate/{bookingId}     // Generate QR code
GET /qr-codes/{qrCodeId}                 // Get QR code details
POST /qr-codes/{qrCodeId}/regenerate     // Regenerate QR code
DELETE /qr-codes/{qrCodeId}              // Revoke QR code
GET /qr-codes/booking/{bookingId}        // Get QR codes for booking
POST /qr-codes/batch-generate            // Generate multiple QR codes
```

### **2. Validation Endpoints**
```typescript
// Attendee Validation Endpoints
POST /validation/validate                // Validate QR code
POST /validation/check-in                // Check-in attendee
POST /validation/check-out               // Check-out attendee
GET /validation/history/{qrCodeId}       // Get validation history
POST /validation/batch-validate          // Batch validation
GET /validation/event/{eventId}/stats    // Get validation statistics
POST /validation/offline-validate        // Offline validation
```

### **3. Response Formats**
```typescript
// Standard validation response
interface ValidationResponse {
  success: boolean;
  data?: {
    valid: boolean;
    qrCodeId: string;
    bookingId: string;
    attendeeName: string;
    eventName: string;
    ticketType: string;
    validationTime: string;
    validationId: string;
    message: string;
    warnings?: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

## 📊 **Data Models Rules**

### **1. QR Code Model**
```typescript
export interface QRCode {
  id: string;
  bookingId: string;
  eventId: string;
  attendeeId: string;
  qrCodeData: string; // Encrypted data
  qrCodeUrl: string; // Generated image URL
  qrCodeImage: string; // Base64 image data
  format: QRCodeFormat;
  status: QRCodeStatus;
  singleUse: boolean;
  maxValidations: number;
  validationCount: number;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  usedBy?: string;
  lastValidatedAt?: string;
  metadata?: Record<string, any>;
}

export enum QRCodeStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  PENDING = 'PENDING'
}
```

### **2. Validation Result Model**
```typescript
export interface ValidationResult {
  valid: boolean;
  qrCodeId: string;
  bookingId: string;
  eventId: string;
  attendeeId: string;
  attendeeName: string;
  eventName: string;
  ticketType: string;
  validationTime: string;
  validationId: string;
  reason?: string;
  status?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface CheckInResult extends ValidationResult {
  checkInTime: string;
  checkInLocation?: string;
  validatorId: string;
  deviceInfo?: string;
}
```

---

## 🔧 **Implementation Rules**

### **1. Error Handling**
```typescript
// Always handle these error scenarios
enum QRCodeError {
  QR_CODE_NOT_FOUND = 'QR_CODE_NOT_FOUND',
  QR_CODE_EXPIRED = 'QR_CODE_EXPIRED',
  QR_CODE_ALREADY_USED = 'QR_CODE_ALREADY_USED',
  QR_CODE_REVOKED = 'QR_CODE_REVOKED',
  BOOKING_NOT_CONFIRMED = 'BOOKING_NOT_CONFIRMED',
  EVENT_NOT_ACTIVE = 'EVENT_NOT_ACTIVE',
  INVALID_QR_DATA = 'INVALID_QR_DATA',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  VALIDATION_LIMIT_EXCEEDED = 'VALIDATION_LIMIT_EXCEEDED'
}

// Provide clear error messages
const getErrorMessage = (error: QRCodeError): string => {
  const messages = {
    [QRCodeError.QR_CODE_NOT_FOUND]: 'QR code not found or invalid',
    [QRCodeError.QR_CODE_EXPIRED]: 'QR code has expired',
    [QRCodeError.QR_CODE_ALREADY_USED]: 'QR code has already been used',
    // ... other messages
  };
  return messages[error] || 'Unknown error occurred';
};
```

### **2. Logging and Monitoring**
```typescript
// Always log validation attempts
const logValidation = async (
  qrCodeId: string, 
  result: ValidationResult, 
  validatorId: string
): Promise<void> => {
  await validationLogRepository.create({
    validationId: uuidv4(),
    qrCodeId,
    bookingId: result.bookingId,
    eventId: result.eventId,
    attendeeId: result.attendeeId,
    validatorId,
    validationResult: result.valid ? 'SUCCESS' : 'FAILED',
    validationTime: new Date().toISOString(),
    location: result.location,
    deviceInfo: result.deviceInfo,
    notes: result.reason
  });
};
```

### **3. Performance Optimization**
```typescript
// Implement caching for frequently accessed data
const cacheQRCodeData = async (qrCodeId: string): Promise<void> => {
  const qrCode = await qrCodeRepository.getQRCode(qrCodeId);
  await redis.setex(`qr:${qrCodeId}`, 3600, JSON.stringify(qrCode));
};

// Use batch operations for multiple validations
const batchValidate = async (qrCodeIds: string[]): Promise<ValidationResult[]> => {
  const results = await Promise.all(
    qrCodeIds.map(id => validateQRCode(id))
  );
  return results;
};
```

---

## 🧪 **Testing Rules**

### **1. Unit Tests**
```typescript
// Always test these scenarios
describe('QRCodeService', () => {
  it('should generate QR code for valid booking');
  it('should reject invalid booking ID');
  it('should handle QR code expiration');
  it('should regenerate QR code successfully');
  it('should revoke QR code');
});

describe('AttendeeValidationService', () => {
  it('should validate active QR code');
  it('should reject expired QR code');
  it('should reject already used QR code');
  it('should handle offline validation');
  it('should log validation attempts');
  it('should handle batch validation');
});
```

### **2. Integration Tests**
```typescript
// Test complete workflows
describe('QR Code Workflow', () => {
  it('should complete full validation flow');
  it('should handle concurrent validations');
  it('should work with offline mode');
  it('should handle network failures');
});
```

---

## 📱 **Mobile App Integration Rules**

### **1. QR Code Scanning**
```typescript
// Mobile app should implement
interface QRScanner {
  scanQRCode(): Promise<string>;
  validateQRCode(qrCodeData: string): Promise<ValidationResult>;
  displayValidationResult(result: ValidationResult): void;
  handleOfflineMode(): Promise<void>;
  syncValidationData(): Promise<void>;
}
```

### **2. Offline Support**
```typescript
// Support offline validation
const syncEventData = async (eventId: string): Promise<void> => {
  const event = await eventService.getEvent(eventId);
  const bookings = await bookingService.getEventBookings(eventId);
  const qrCodes = await qrCodeService.getEventQRCodes(eventId);
  
  // Store locally for offline use
  await localStorage.setItem(`event_${eventId}`, JSON.stringify({
    event,
    bookings,
    qrCodes
  }));
};
```

---

## 🚀 **Deployment Rules**

### **1. Environment Variables**
```bash
# Required environment variables
QR_CODE_SECRET_KEY=your-secret-key
QR_CODE_EXPIRY_HOURS=24
QR_CODE_IMAGE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=H
REDIS_URL=redis://localhost:6379
VALIDATION_RATE_LIMIT=100
```

### **2. AWS Services**
```typescript
// Use these AWS services
- DynamoDB: Store QR codes and validation logs
- S3: Store QR code images
- CloudFront: Serve QR code images
- Lambda: Process validation requests
- API Gateway: Expose validation endpoints
- CloudWatch: Monitor validation metrics
```

---

## 📈 **Monitoring Rules**

### **1. Key Metrics**
```typescript
// Track these metrics
interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  qrCodesGenerated: number;
  qrCodesExpired: number;
  offlineValidations: number;
  concurrentValidations: number;
}
```

### **2. Alerts**
```typescript
// Set up alerts for
- High validation failure rate (>5%)
- Slow validation response time (>2s)
- QR code generation failures
- Database connection issues
- API rate limit exceeded
```

---

**🎯 Remember: Always prioritize security, performance, and user experience when implementing QR code generation and attendee validation. Test thoroughly and monitor continuously.**
