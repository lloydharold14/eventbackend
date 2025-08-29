import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, UserLoginRequest, UserLoginResponse, UserRegistrationRequest } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import { UserRole, UserStatus } from '../../../shared/types/common';
import { logger } from '../../../shared/utils/logger';
import { ValidationError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { VerificationService } from './VerificationService';
import { getEmailService } from '../../notifications/services/EmailService';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly verificationService: VerificationService;
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly saltRounds: number;

  constructor(
    userRepository: UserRepository,
    jwtSecret: string,
    jwtExpiresIn: string = '1h',
    refreshTokenExpiresIn: string = '7d',
    saltRounds: number = 12,
    region: string = 'ca-central-1'
  ) {
    this.userRepository = userRepository;
    this.verificationService = new VerificationService(region);
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.refreshTokenExpiresIn = refreshTokenExpiresIn;
    this.saltRounds = saltRounds;
  }

  async registerUser(registrationData: UserRegistrationRequest): Promise<User> {
    try {
      // Validate required fields
      if (!registrationData.acceptTerms) {
        throw new ValidationError('Terms and conditions must be accepted');
      }

      // Check if user already exists
      const existingUserByEmail = await this.userRepository.getUserByEmail(registrationData.email);
      if (existingUserByEmail) {
        throw new ValidationError('User with this email already exists');
      }

      const existingUserByUsername = await this.userRepository.getUserByUsername(registrationData.username);
      if (existingUserByUsername) {
        throw new ValidationError('Username is already taken');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(registrationData.password);

      // Create user object
      const now = new Date().toISOString();
      const user: User = {
        id: uuidv4(),
        email: registrationData.email.toLowerCase(),
        username: registrationData.username.toLowerCase(),
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phoneNumber: registrationData.phoneNumber,
        dateOfBirth: registrationData.dateOfBirth,
        role: UserRole.ATTENDEE, // Default role
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        phoneVerified: false,
        createdAt: now,
        updatedAt: now,
        preferences: {
          emailNotifications: true,
          smsNotifications: registrationData.phoneNumber ? true : false,
          pushNotifications: true,
          marketingEmails: registrationData.marketingConsent || false,
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
          privacySettings: {
            profileVisibility: 'public',
            showEmail: false,
            showPhone: false,
            showDateOfBirth: false,
            allowDirectMessages: true,
          },
        },
      };

      // Store hashed password separately (not in the main user object)
      const userWithPassword = {
        ...user,
        passwordHash: hashedPassword,
      };

      // Create user in database
      const createdUser = await this.userRepository.createUser(userWithPassword as any);

      // Send email verification
      try {
        await this.verificationService.sendEmailVerification({
          userId: createdUser.id,
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName
        });
        
        logger.info('Email verification sent successfully', { 
          userId: createdUser.id, 
          email: createdUser.email 
        });
      } catch (error: any) {
        logger.warn('Failed to send email verification, but user was created', {
          userId: createdUser.id,
          email: createdUser.email,
          error: error.message
        });
        // Don't fail registration if email verification fails
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = createdUser as any;
      
      logger.info('User registered successfully', { userId: createdUser.id, email: createdUser.email });
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Failed to register user', { error: error.message, email: registrationData.email });
      throw error;
    }
  }

  async loginUser(loginData: UserLoginRequest): Promise<UserLoginResponse> {
    try {
      // Find user by email
      const user = await this.userRepository.getUserByEmail(loginData.email);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedError('Account is not active. Please verify your email or contact support.');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(loginData.password, (user as any).passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = await this.generateTokenPair(user);

      // Remove sensitive data from user object
      const { passwordHash, ...userWithoutPassword } = user as any;

      logger.info('User logged in successfully', { userId: user.id, email: user.email });
      
      return {
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error: any) {
      logger.error('Failed to login user', { error: error.message, email: loginData.email });
      throw error;
    }
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      
      // Check if user still exists and is active
      const user = await this.userRepository.getUserById(decoded.userId);
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedError('User account is not active');
      }

      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as JwtPayload;
      
      // Get user to generate new tokens
      const user = await this.userRepository.getUserById(decoded.userId);
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedError('User account is not active');
      }

      return await this.generateTokenPair(user);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password hash
      const user = await this.userRepository.getUserById(userId);
      
      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, (user as any).passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await this.userRepository.updateUser(userId, {
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      } as any);

      logger.info('Password changed successfully', { userId });
    } catch (error: any) {
      logger.error('Failed to change password', { error: error.message, userId });
      throw error;
    }
  }

  async resetPassword(email: string, baseUrl?: string, locale?: string): Promise<void> {
    try {
      const user = await this.userRepository.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        logger.info('Password reset requested for non-existent email', { email });
        return;
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      // Send password reset email
      const emailService = getEmailService();
      const userName = `${user.firstName} ${user.lastName}`;
      const userLocale = locale || user.preferences?.language || 'en-US';
      const resetBaseUrl = baseUrl || process.env.FRONTEND_URL || 'https://eventmanagementplatform.com';

      const emailResult = await emailService.sendPasswordResetEmail(
        user.email,
        userName,
        resetToken,
        resetBaseUrl,
        userLocale
      );

      if (emailResult.success) {
        logger.info('Password reset email sent successfully', { 
          userId: user.id, 
          email,
          messageId: emailResult.messageId
        });
      } else {
        logger.error('Failed to send password reset email', { 
          userId: user.id, 
          email,
          error: emailResult.error
        });
        // Still log the token for development/debugging
        console.log(`Password reset token for ${email}: ${resetToken}`);
      }
    } catch (error: any) {
      logger.error('Failed to initiate password reset', { error: error.message, email });
      throw error;
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      if (decoded.type !== 'password_reset') {
        throw new UnauthorizedError('Invalid reset token');
      }

      const userId = decoded.userId;
      const hashedPassword = await this.hashPassword(newPassword);

      await this.userRepository.updateUser(userId, {
        passwordHash: hashedPassword,
        updatedAt: new Date().toISOString(),
      } as any);

      logger.info('Password reset confirmed successfully', { userId });
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Password reset token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid password reset token');
      }
      logger.error('Failed to confirm password reset', { error: error.message });
      throw error;
    }
  }

  public async generateTokenPair(user: User): Promise<TokenPair> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn as any });
    const refreshToken = jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiresIn as any });

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpirationTime(this.jwtExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 3600; // Default to 1 hour
    }
  }

  /**
   * Verify email verification code
   */
  async verifyEmail(userId: string, code: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      if (user.emailVerified) {
        throw new ValidationError('Email is already verified');
      }

      const isValid = await this.verificationService.verifyEmailCode(userId, code);
      if (!isValid) {
        throw new ValidationError('Invalid verification code');
      }

      // Update user as verified
      const updatedUser = await this.userRepository.updateUser(userId, {
        emailVerified: true,
        status: UserStatus.ACTIVE
      });

      logger.info('Email verified successfully', { userId, email: user.email });
      return updatedUser;
    } catch (error: any) {
      logger.error('Email verification failed', { error: error.message, userId, code });
      throw error;
    }
  }

  /**
   * Send SMS verification code
   */
  async sendSMSVerification(userId: string): Promise<string> {
    try {
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      if (!user.phoneNumber) {
        throw new ValidationError('Phone number not provided');
      }

      const verificationId = await this.verificationService.sendSMSVerification({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName
      });

      logger.info('SMS verification sent successfully', { userId, phoneNumber: user.phoneNumber });
      return verificationId;
    } catch (error: any) {
      logger.error('SMS verification failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Verify SMS OTP code
   */
  async verifySMS(userId: string, code: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      if (user.phoneVerified) {
        throw new ValidationError('Phone is already verified');
      }

      const isValid = await this.verificationService.verifySMSCode(userId, code);
      if (!isValid) {
        throw new ValidationError('Invalid verification code');
      }

      // Update user as verified
      const updatedUser = await this.userRepository.updateUser(userId, {
        phoneVerified: true
      });

      logger.info('SMS verified successfully', { userId, phoneNumber: user.phoneNumber });
      return updatedUser;
    } catch (error: any) {
      logger.error('SMS verification failed', { error: error.message, userId, code });
      throw error;
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(userId: string): Promise<string> {
    try {
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      if (user.emailVerified) {
        throw new ValidationError('Email is already verified');
      }

      const verificationId = await this.verificationService.sendEmailVerification({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });

      logger.info('Email verification resent successfully', { userId, email: user.email });
      return verificationId;
    } catch (error: any) {
      logger.error('Resend email verification failed', { error: error.message, userId });
      throw error;
    }
  }
}
