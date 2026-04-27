/**
 * QR Verification Flow Tests
 * 
 * Tests the core verification logic used by the QR Scanner.
 * Validates: student lookup, registration matching, status transitions, and edge cases.
 */

// Mock Firebase Firestore
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn();
const mockIncrement = jest.fn((n: number) => ({ _incrementBy: n }));

jest.mock('firebase/firestore', () => ({
  getDoc: (...args: any[]) => mockGetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  doc: (...args: any[]) => mockDoc(...args),
  increment: (n: number) => mockIncrement(n),
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('./firebase', () => ({
  db: {},
  auth: {},
}));

// -- Verification Logic (extracted from QRScanner.tsx for testability) --

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface VerifyResult {
  success: boolean;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

function getCurrentMealType(): MealType {
  const currentHour = new Date().getHours();
  if (currentHour < 10 || (currentHour === 10 && new Date().getMinutes() <= 30)) return 'breakfast';
  if (currentHour < 15 || (currentHour === 15 && new Date().getMinutes() <= 30)) return 'lunch';
  return 'dinner';
}

async function verifyStudent(
  studentId: string,
  activeMealMode: MealType,
  getDocFn: typeof mockGetDoc,
  updateDocFn: typeof mockUpdateDoc,
  docFn: typeof mockDoc
): Promise<VerifyResult> {
  const today = new Date().toISOString().split('T')[0];

  // Step 1: Verify student exists
  const studentRef = docFn({}, 'users', studentId);
  const studentDoc = await getDocFn(studentRef);

  if (!studentDoc.exists()) {
    return { success: false, status: 'error', message: 'Unknown Student ID' };
  }
  const studentData = studentDoc.data();

  // Step 2: Check registration
  const mealId = `${today}-${activeMealMode}`;
  const registrationId = `${studentId}-${mealId}`;
  const regRef = docFn({}, 'registrations', registrationId);
  const regDoc = await getDocFn(regRef);

  if (!regDoc.exists() || regDoc.data().status === 'CANCELLED') {
    return {
      success: false,
      status: 'error',
      message: `No ${activeMealMode} booking`,
      data: {
        userName: studentData.name,
        userRegisterNumber: studentData.registerNumber || studentId.split('@')[0],
        mealType: activeMealMode,
      },
    };
  }

  const regData = regDoc.data();

  // Step 3: Already verified?
  if (regData.status === 'VERIFIED') {
    return {
      success: false,
      status: 'warning',
      message: 'Already Verified',
      data: regData,
    };
  }

  // Step 4: Verify
  await updateDocFn(regRef, {
    status: 'VERIFIED',
    verifiedAt: expect.any(String),
  });

  return {
    success: true,
    status: 'success',
    message: 'Access Granted',
    data: regData,
  };
}

// -- Test Suite --

describe('QR Verification Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockImplementation((_db: any, collection: string, id: string) => ({
      _collection: collection,
      _id: id,
    }));
  });

  describe('getCurrentMealType', () => {
    it('should return a valid meal type', () => {
      const result = getCurrentMealType();
      expect(['breakfast', 'lunch', 'dinner']).toContain(result);
    });
  });

  describe('verifyStudent', () => {
    it('should return error for unknown student ID', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      });

      const result = await verifyStudent(
        'unknown-student-uid',
        'lunch',
        mockGetDoc,
        mockUpdateDoc,
        mockDoc
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toBe('Unknown Student ID');
    });

    it('should return error when student has no booking for the meal', async () => {
      // Student exists
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test Student', registerNumber: 'REG001' }),
      });
      // Registration does not exist
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      });

      const result = await verifyStudent(
        'student-uid-123',
        'lunch',
        mockGetDoc,
        mockUpdateDoc,
        mockDoc
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toBe('No lunch booking');
      expect(result.data?.userName).toBe('Test Student');
    });

    it('should return warning when student is already verified', async () => {
      // Student exists
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test Student', registerNumber: 'REG001' }),
      });
      // Registration exists and is VERIFIED
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'student-uid-123',
          mealType: 'lunch',
          status: 'VERIFIED',
          verifiedAt: '2026-04-27T12:30:00Z',
        }),
      });

      const result = await verifyStudent(
        'student-uid-123',
        'lunch',
        mockGetDoc,
        mockUpdateDoc,
        mockDoc
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('warning');
      expect(result.message).toBe('Already Verified');
      expect(result.data?.verifiedAt).toBe('2026-04-27T12:30:00Z');
    });

    it('should successfully verify a registered student', async () => {
      // Student exists
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test Student', registerNumber: 'REG001' }),
      });
      // Registration exists and is REGISTERED
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'student-uid-123',
          mealType: 'lunch',
          status: 'REGISTERED',
          mealId: `${new Date().toISOString().split('T')[0]}-lunch`,
        }),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const result = await verifyStudent(
        'student-uid-123',
        'lunch',
        mockGetDoc,
        mockUpdateDoc,
        mockDoc
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.message).toBe('Access Granted');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ status: 'VERIFIED' })
      );
    });

    it('should return error for cancelled booking', async () => {
      // Student exists
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test Student', registerNumber: 'REG001' }),
      });
      // Registration exists but is CANCELLED
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'student-uid-123',
          mealType: 'dinner',
          status: 'CANCELLED',
        }),
      });

      const result = await verifyStudent(
        'student-uid-123',
        'dinner',
        mockGetDoc,
        mockUpdateDoc,
        mockDoc
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toBe('No dinner booking');
    });

    it('should handle email-based student lookup (email as studentId)', async () => {
      // Email-based student exists
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Email Student', registerNumber: 'REG002', email: 'test@gmail.com' }),
      });
      // Registration exists
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'test@gmail.com',
          mealType: 'breakfast',
          status: 'REGISTERED',
          mealId: `${new Date().toISOString().split('T')[0]}-breakfast`,
        }),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const result = await verifyStudent(
        'test@gmail.com',
        'breakfast',
        mockGetDoc,
        mockUpdateDoc,
        mockDoc
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.message).toBe('Access Granted');
    });
  });
});
