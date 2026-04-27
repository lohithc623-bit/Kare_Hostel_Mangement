export type UserRole = 'admin' | 'staff' | 'student';
export type MessType = 'Veg' | 'Non-Veg';
export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type RegistrationStatus = 'REGISTERED' | 'VERIFIED' | 'ABSENT' | 'CANCELLED';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  registerNumber?: string;
  messType?: MessType;
  roomNumber?: string;
  phone?: string;
  age?: number;
  firstLogin?: boolean;
  createdAt: string;
}

export interface Meal {
  id: string; // e.g. "2026-04-25-breakfast"
  type: MealType;
  date: string;
  menu: string;
  availability: boolean;
  startTime?: string;
  closingTime: string;
  registeredCount: number;
  verifiedCount: number;
  absentCount: number;
  fineCount: number;
}

export interface MealRegistration {
  id: string;
  userId: string;
  userName: string;
  userRegisterNumber: string;
  mealId: string;
  mealType: MealType;
  date: string;
  status: RegistrationStatus;
  fineAmount: number;
  timestamp: string;
  verifiedAt?: string;
}

export interface AccountSettings {
  hostelName: string;
  inchargeName: string;
  mobile: string;
  address: string;
  updatedAt?: string;
}

export interface StudentVerification {
  isValid: boolean;
  message: string;
  student?: UserProfile & { status?: RegistrationStatus, registeredAt?: string, verifiedAt?: string };
}
