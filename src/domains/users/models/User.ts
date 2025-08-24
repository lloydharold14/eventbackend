import { UserRole, UserStatus } from '../../../shared/types/common';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePictureUrl?: string;
  bio?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  preferences: UserPreferences;
  address?: UserAddress;
  socialLinks?: UserSocialLinks;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  language: string;
  timezone: string;
  currency: string;
  privacySettings: PrivacySettings;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showPhone: boolean;
  showDateOfBirth: boolean;
  allowDirectMessages: boolean;
}

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
}

export interface UserSocialLinks {
  website?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  role?: UserRole;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePictureUrl?: string;
  bio?: string;
  preferences?: Partial<UserPreferences>;
  address?: UserAddress;
  socialLinks?: UserSocialLinks;
}

export interface UserRegistrationRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface UserLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserLoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationConfirmRequest {
  token: string;
}

export interface PhoneVerificationRequest {
  phoneNumber: string;
}

export interface PhoneVerificationConfirmRequest {
  phoneNumber: string;
  code: string;
}

export interface UserSearchFilters {
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  searchTerm?: string;
}

export interface UserListResponse {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
