export type UserRole = 'admin' | 'staff' | 'student';
export type MessType = 'Veg' | 'Non-Veg' | 'Special';
export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type RegistrationStatus = 'REGISTERED' | 'VERIFIED' | 'ABSENT';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  registerNumber?: string;
  messType?: MessType;
  roomNumber?: string;
  phone?: string;
  firstLogin?: boolean;
  createdAt: string;
}

export interface Meal {
  id: string; // e.g. "2026-04-25-breakfast"
  type: MealType;
  date: string;
  menu: string;
  availability: boolean;
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
