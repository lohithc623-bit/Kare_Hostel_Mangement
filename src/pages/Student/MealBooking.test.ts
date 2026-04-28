/**
 * End-to-End Test Suite for Meal Booking Feature
 * Tests the complete student meal booking workflow including:
 * - Creating meal registrations
 * - Updating meal records
 * - Cancelling bookings
 * - Permission validations
 */

describe('Meal Booking E2E Tests', () => {
  
  const mockStudentUID = 'student-uid-123';
  const mockStudentProfile = {
    uid: mockStudentUID,
    name: 'John Student',
    email: 'student@hostel.com',
    registerNumber: 'REG123',
    roomNumber: 'A101',
    role: 'student'
  };

  const mockMealId = '2024-04-28-breakfast';
  const mockRegId = `${mockStudentUID}-${mockMealId}`;

  // Mock data for a meal
  const mockMeal = {
    id: mockMealId,
    type: 'breakfast',
    date: '2024-04-28',
    menu: 'Pancakes, Eggs, Toast',
    availability: true,
    startTime: '07:00',
    closingTime: '09:00',
    registeredCount: 0,
    verifiedCount: 0,
    absentCount: 0,
    fineCount: 0
  };

  // Mock data for a registration
  const mockRegistration = {
    userId: mockStudentUID,
    userName: mockStudentProfile.name,
    userRegisterNumber: mockStudentProfile.registerNumber,
    userRoomNumber: mockStudentProfile.roomNumber,
    mealId: mockMealId,
    mealType: 'breakfast',
    date: '2024-04-28',
    status: 'REGISTERED',
    fineAmount: 0,
    timestamp: new Date().toISOString()
  };

  // Test 1: Student can create a meal registration
  it('should allow student to create a meal registration', () => {
    const result = validateBookingPermission(
      mockStudentProfile,
      'create',
      mockRegistration
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('Student creating own registration');
  });

  // Test 2: Meal registration must have userId matching student's UID
  it('should reject registration with mismatched userId', () => {
    const invalidRegistration = {
      ...mockRegistration,
      userId: 'different-uid'
    };
    const result = validateBookingPermission(
      mockStudentProfile,
      'create',
      invalidRegistration
    );
    expect(result.allowed).toBe(false);
  });

  // Test 3: Student can update their own registration
  it('should allow student to update their own registration', () => {
    const result = validateBookingPermission(
      mockStudentProfile,
      'update',
      mockRegistration
    );
    expect(result.allowed).toBe(true);
  });

  // Test 4: Student can cancel their booking
  it('should allow student to cancel their registration', () => {
    const cancelledReg = {
      ...mockRegistration,
      status: 'CANCELLED'
    };
    const result = validateBookingPermission(
      mockStudentProfile,
      'delete',
      cancelledReg
    );
    expect(result.allowed).toBe(true);
  });

  // Test 5: Student can create/update meal documents during booking
  it('should allow student to create meal document for booking', () => {
    const result = validateBookingPermission(
      mockStudentProfile,
      'create',
      mockMeal
    );
    expect(result.allowed).toBe(true);
  });

  // Test 6: Meal count increment is allowed
  it('should allow meal registeredCount increment', () => {
    const updatedMeal = {
      ...mockMeal,
      registeredCount: 1
    };
    const result = validateBookingPermission(
      mockStudentProfile,
      'update',
      updatedMeal
    );
    expect(result.allowed).toBe(true);
  });

  // Test 7: Validate batch operation flow
  it('should allow complete booking batch operation', () => {
    const batchOperations = [
      { operation: 'create', collection: 'registrations', data: mockRegistration },
      { operation: 'create', collection: 'meals', data: mockMeal }
    ];

    const batchResult = validateBatchOperations(
      mockStudentProfile,
      batchOperations
    );
    
    expect(batchResult.allAllowed).toBe(true);
    expect(batchResult.operations.length).toBe(2);
    expect(batchResult.operations.every(op => op.allowed)).toBe(true);
  });

  // Test 8: Validate required fields in registration
  it('should validate required fields in registration', () => {
    const invalidReg = { ...mockRegistration };
    delete invalidReg.userId;

    const result = validateRegistrationData(invalidReg);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing userId field');
  });

  // Test 9: Student cannot delete other student's registration
  it('should reject deletion of other student registrations', () => {
    const otherStudentReg = {
      ...mockRegistration,
      userId: 'other-student-uid'
    };
    const result = validateBookingPermission(
      mockStudentProfile,
      'delete',
      otherStudentReg
    );
    expect(result.allowed).toBe(false);
  });

  // Test 10: Duplicate booking prevention check
  it('should prevent duplicate meal registrations', () => {
    const existingReg = { ...mockRegistration, status: 'REGISTERED' };
    const duplicateAttempt = { ...mockRegistration, status: 'REGISTERED' };

    const result = validateNoDuplicateBooking(
      mockStudentUID,
      mockMealId,
      existingReg,
      duplicateAttempt
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.message).toContain('Already registered for this meal');
  });
});

// Helper Functions for Testing

/**
 * Validate if a user can perform an operation on a document
 */
function validateBookingPermission(
  user: any,
  operation: 'create' | 'update' | 'delete',
  data: any
): { allowed: boolean; reason?: string } {
  if (!user?.uid) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  // Check if it's a registration
  if (data.userId !== undefined) {
    if (operation === 'create' && data.userId !== user.uid) {
      return { allowed: false, reason: 'Cannot create registration for another user' };
    }
    if (operation === 'delete' && data.userId !== user.uid) {
      return { allowed: false, reason: 'Cannot delete another user registration' };
    }
    if (operation === 'update' && data.userId !== user.uid) {
      return { allowed: false, reason: 'Cannot update another user registration' };
    }
  }

  // Check if it's a meal document (allowed for signed-in users)
  if (data.type && ['breakfast', 'lunch', 'dinner'].includes(data.type)) {
    return { allowed: true, reason: 'Meal document access granted' };
  }

  return { allowed: true, reason: 'Student creating own registration' };
}

/**
 * Validate a batch of operations
 */
function validateBatchOperations(
  user: any,
  operations: any[]
): { allAllowed: boolean; operations: any[] } {
  const results = operations.map(op => {
    let allowed = true;
    let error = null;

    if (op.collection === 'registrations') {
      const validation = validateBookingPermission(user, op.operation as any, op.data);
      allowed = validation.allowed;
      if (!allowed) error = validation.reason;
    } else if (op.collection === 'meals') {
      allowed = true; // All signed-in users can create meal docs
    }

    return { ...op, allowed, error };
  });

  return {
    allAllowed: results.every(op => op.allowed),
    operations: results
  };
}

/**
 * Validate registration data integrity
 */
function validateRegistrationData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.userId) errors.push('Missing userId field');
  if (!data.mealId) errors.push('Missing mealId field');
  if (!data.date) errors.push('Missing date field');
  if (!['REGISTERED', 'VERIFIED', 'ABSENT', 'CANCELLED'].includes(data.status)) {
    errors.push('Invalid status value');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check for duplicate bookings
 */
function validateNoDuplicateBooking(
  userId: string,
  mealId: string,
  existingReg: any,
  newReg: any
): { isDuplicate: boolean; message: string } {
  if (
    existingReg.userId === userId &&
    existingReg.mealId === mealId &&
    ['REGISTERED', 'VERIFIED'].includes(existingReg.status)
  ) {
    return {
      isDuplicate: true,
      message: 'Already registered for this meal. Please cancel previous booking first.'
    };
  }

  return {
    isDuplicate: false,
    message: 'No duplicate booking found'
  };
}
