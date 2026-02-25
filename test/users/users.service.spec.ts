import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../src/users/users.service';
import {
  User,
  UserRole,
  KYCStatus,
} from '../../src/users/entities/user.entity';
import { UpdateUserDto } from '../../src/users/dtos/update-user.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  // Mock Repository
  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      password: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Doe',
      walletAddress:
        'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
      country: 'United States',
      bio: 'Test bio',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: UserRole.USER,
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      resetPasswordTokenSelector: null,
      resetPasswordTokenHash: null,
      resetPasswordTokenExpiry: null,
      refreshTokenHash: null,
      kycStatus: KYCStatus.APPROVED,
      kycSubmittedAt: new Date('2024-01-01'),
      kycVerifiedAt: new Date('2024-01-02'),
      kycDocumentUrl: 'https://example.com/doc.pdf',
      kycRejectionReason: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    };

    describe('success scenarios', () => {
      it('should return user when found by id', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findById(mockUser.id);

        expect(result).toEqual(mockUser);
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { id: mockUser.id },
        });
        expect(repository.findOne).toHaveBeenCalledTimes(1);
      });

      it('should return user with minimal data', async () => {
        const minimalUser: User = {
          ...mockUser,
          walletAddress: null,
          country: null,
          bio: null,
          avatarUrl: null,
          isEmailVerified: false,
          kycStatus: KYCStatus.NONE,
          kycSubmittedAt: null,
          kycVerifiedAt: null,
          kycDocumentUrl: null,
        };
        mockRepository.findOne.mockResolvedValue(minimalUser);

        const result = await service.findById(minimalUser.id);

        expect(result).toEqual(minimalUser);
      });
    });

    describe('error scenarios', () => {
      it('should throw NotFoundException when user not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findById('non-existent-id')).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.findById('non-existent-id')).rejects.toThrow(
          'User not found',
        );
      });

      it('should handle database error during findOne', async () => {
        const dbError = new Error('Database connection failed');
        mockRepository.findOne.mockRejectedValue(dbError);

        await expect(service.findById(mockUser.id)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty string id', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findById('')).rejects.toThrow(NotFoundException);
      });

      it('should handle undefined id', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findById(undefined as any)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should handle special characters in id', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(
          service.findById('id-with-special-chars-!@#'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('findByEmail', () => {
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      password: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Doe',
      walletAddress: null,
      country: null,
      bio: null,
      avatarUrl: null,
      role: UserRole.USER,
      isEmailVerified: false,
      emailVerificationToken: 'token123',
      emailVerificationTokenExpiry: new Date('2024-12-31'),
      resetPasswordTokenSelector: null,
      resetPasswordTokenHash: null,
      resetPasswordTokenExpiry: null,
      refreshTokenHash: null,
      kycStatus: KYCStatus.NONE,
      kycSubmittedAt: null,
      kycVerifiedAt: null,
      kycDocumentUrl: null,
      kycRejectionReason: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    describe('success scenarios', () => {
      it('should return user when found by email', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findByEmail(mockUser.email);

        expect(result).toEqual(mockUser);
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { email: mockUser.email },
        });
        expect(repository.findOne).toHaveBeenCalledTimes(1);
      });

      it('should return null when user not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        const result = await service.findByEmail('nonexistent@example.com');

        expect(result).toBeNull();
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { email: 'nonexistent@example.com' },
        });
      });

      it('should handle email with different cases', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findByEmail('TEST@EXAMPLE.COM');

        expect(result).toEqual(mockUser);
      });
    });

    describe('error scenarios', () => {
      it('should handle database error during findOne', async () => {
        const dbError = new Error('Query failed');
        mockRepository.findOne.mockRejectedValue(dbError);

        await expect(service.findByEmail('test@example.com')).rejects.toThrow(
          'Query failed',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty email string', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        const result = await service.findByEmail('');

        expect(result).toBeNull();
      });

      it('should handle email with leading/trailing spaces', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findByEmail('  test@example.com  ');

        expect(result).toEqual(mockUser);
      });

      it('should handle invalid email format', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        const result = await service.findByEmail('invalid-email-format');

        expect(result).toBeNull();
      });
    });
  });

  describe('updateWalletAddress', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const walletAddress =
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQ5G3LKYVW4R6IGPCBQVZB';
    const mockUser: User = {
      id: userId,
      email: 'test@example.com',
      password: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Doe',
      walletAddress: null,
      country: 'United States',
      bio: null,
      avatarUrl: null,
      role: UserRole.USER,
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      resetPasswordTokenSelector: null,
      resetPasswordTokenHash: null,
      resetPasswordTokenExpiry: null,
      refreshTokenHash: null,
      kycStatus: KYCStatus.PENDING,
      kycSubmittedAt: null,
      kycVerifiedAt: null,
      kycDocumentUrl: null,
      kycRejectionReason: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    describe('success scenarios', () => {
      it('should update wallet address successfully', async () => {
        const updatedUser = { ...mockUser, walletAddress };
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(updatedUser);

        const result = await service.updateWalletAddress(userId, walletAddress);

        expect(result.walletAddress).toBe(walletAddress);
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { id: userId },
        });
        expect(repository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: userId,
            walletAddress: walletAddress,
          }),
        );
      });

      it('should update wallet address when user already has one', async () => {
        const userWithWallet = {
          ...mockUser,
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
        };
        const newWalletAddress =
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQ5G3LKYVW4R6IGPCBQVZB';
        const updatedUser = {
          ...userWithWallet,
          walletAddress: newWalletAddress,
        };

        mockRepository.findOne.mockResolvedValue(userWithWallet);
        mockRepository.save.mockResolvedValue(updatedUser);

        const result = await service.updateWalletAddress(
          userId,
          newWalletAddress,
        );

        expect(result.walletAddress).toBe(newWalletAddress);
      });
    });

    describe('error scenarios', () => {
      it('should throw NotFoundException when user not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updateWalletAddress('non-existent-id', walletAddress),
        ).rejects.toThrow(NotFoundException);
      });

      it('should handle database error during save', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);
        const dbError = new Error('Save failed');
        mockRepository.save.mockRejectedValue(dbError);

        await expect(
          service.updateWalletAddress(userId, walletAddress),
        ).rejects.toThrow('Save failed');
      });
    });

    describe('edge cases', () => {
      it('should handle null wallet address', async () => {
        const updatedUser = { ...mockUser, walletAddress: null };
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(updatedUser);

        const result = await service.updateWalletAddress(userId, null as any);

        expect(result.walletAddress).toBeNull();
      });

      it('should handle empty string wallet address', async () => {
        const updatedUser = { ...mockUser, walletAddress: '' };
        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(updatedUser);

        const result = await service.updateWalletAddress(userId, '');

        expect(result.walletAddress).toBe('');
      });
    });
  });

  describe('updateProfile', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    // Helper function to create a fresh mock user for each test
    const createMockUser = (): User => ({
      id: userId,
      email: 'test@example.com',
      password: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Doe',
      walletAddress: null,
      country: null,
      bio: null,
      avatarUrl: null,
      role: UserRole.USER,
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      resetPasswordTokenSelector: null,
      resetPasswordTokenHash: null,
      resetPasswordTokenExpiry: null,
      refreshTokenHash: null,
      kycStatus: KYCStatus.PENDING,
      kycSubmittedAt: null,
      kycVerifiedAt: null,
      kycDocumentUrl: null,
      kycRejectionReason: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    describe('success scenarios', () => {
      it('should update profile with all fields', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = {
          firstName: 'Jane',
          lastName: 'Smith',
          country: 'Canada',
          bio: 'Updated bio',
          avatarUrl: 'https://example.com/new-avatar.jpg',
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
        };

        const savedUser = {
          ...mockUser,
          ...updateDto,
        };

        mockRepository.findOne
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(savedUser);
        mockRepository.save.mockResolvedValue(savedUser);

        const result = await service.updateProfile(userId, updateDto);

        expect(result.firstName).toBe(updateDto.firstName);
        expect(result.lastName).toBe(updateDto.lastName);
        expect(result.country).toBe(updateDto.country);
        expect(result.bio).toBe(updateDto.bio);
        expect(result.avatarUrl).toBe(updateDto.avatarUrl);
        expect(result.walletAddress).toBe(updateDto.walletAddress);
        expect(repository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: updateDto.firstName,
            lastName: updateDto.lastName,
            country: updateDto.country,
            bio: updateDto.bio,
            avatarUrl: updateDto.avatarUrl,
            walletAddress: updateDto.walletAddress,
          }),
        );
      });

      it('should update only provided fields', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = {
          firstName: 'Jane',
        };

        // First call returns the user to update, second call returns the user for getProfile
        const userAfterUpdate = {
          ...mockUser,
          firstName: 'Jane',
        };

        mockRepository.findOne
          .mockResolvedValueOnce(mockUser) // First call - find user to update
          .mockResolvedValueOnce(userAfterUpdate); // Second call - getProfile after save
        mockRepository.save.mockResolvedValue(userAfterUpdate);

        const result = await service.updateProfile(userId, updateDto);

        expect(result.firstName).toBe('Jane');
        expect(result.lastName).toBe('Doe'); // unchanged
        expect(result.country).toBeNull(); // unchanged
      });

      it('should handle empty DTO (no updates)', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = {};

        mockRepository.findOne
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockUser);
        mockRepository.save.mockResolvedValue(mockUser);

        const result = await service.updateProfile(userId, updateDto);

        expect(result.firstName).toBe(mockUser.firstName);
        expect(result.lastName).toBe(mockUser.lastName);
        expect(repository.save).toHaveBeenCalledWith(mockUser);
      });

      it('should handle undefined values in DTO', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = {
          firstName: undefined,
          lastName: 'Smith',
          country: undefined,
        };

        // When firstName is undefined, it should not be updated
        const userAfterUpdate = {
          ...mockUser,
          lastName: 'Smith',
        };

        mockRepository.findOne
          .mockResolvedValueOnce(mockUser) // First call - find user to update
          .mockResolvedValueOnce(userAfterUpdate); // Second call - getProfile after save
        mockRepository.save.mockResolvedValue(userAfterUpdate);

        const result = await service.updateProfile(userId, updateDto);

        expect(result.firstName).toBe('John'); // unchanged because undefined
        expect(result.lastName).toBe('Smith'); // updated
      });
    });

    describe('error scenarios', () => {
      it('should throw NotFoundException when user not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        await expect(
          service.updateProfile('non-existent-id', updateDto),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ConflictException when wallet address already exists (23505 error)', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = {
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
        };

        mockRepository.findOne.mockResolvedValue(mockUser);
        const conflictError = { code: '23505', message: 'duplicate key value' };
        mockRepository.save.mockRejectedValue(conflictError);

        await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(
          ConflictException,
        );
        await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(
          'Wallet address is already linked to another account',
        );
      });

      it('should rethrow non-23505 errors', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        mockRepository.findOne.mockResolvedValue(mockUser);
        const genericError = new Error('Some database error');
        mockRepository.save.mockRejectedValue(genericError);

        await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(
          'Some database error',
        );
      });

      it('should handle database error during findOne', async () => {
        const updateDto: UpdateUserDto = { firstName: 'Jane' };
        const dbError = new Error('Connection lost');
        mockRepository.findOne.mockRejectedValue(dbError);

        await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(
          'Connection lost',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle setting fields to empty strings', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = {
          bio: '',
          country: '',
        };

        const savedUser = {
          ...mockUser,
          bio: '',
          country: '',
        };

        mockRepository.findOne
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(savedUser);
        mockRepository.save.mockResolvedValue(savedUser);

        const result = await service.updateProfile(userId, updateDto);

        expect(result.bio).toBe('');
        expect(result.country).toBe('');
      });

      it('should handle very long bio', async () => {
        const mockUser = createMockUser();
        const longBio = 'A'.repeat(500);
        const updateDto: UpdateUserDto = {
          bio: longBio,
        };

        const savedUser = {
          ...mockUser,
          bio: longBio,
        };

        mockRepository.findOne
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(savedUser);
        mockRepository.save.mockResolvedValue(savedUser);

        const result = await service.updateProfile(userId, updateDto);

        expect(result.bio).toBe(longBio);
      });

      it('should handle special characters in fields', async () => {
        const mockUser = createMockUser();
        const updateDto: UpdateUserDto = {
          firstName: 'José María',
          lastName: "O'Brien",
          bio: 'Bio with emojis 🎉 and special chars <>&"',
        };

        const savedUser = {
          ...mockUser,
          ...updateDto,
        };

        mockRepository.findOne
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(savedUser);
        mockRepository.save.mockResolvedValue(savedUser);

        const result = await service.updateProfile(userId, updateDto);

        expect(result.firstName).toBe('José María');
        expect(result.lastName).toBe("O'Brien");
        expect(result.bio).toBe('Bio with emojis 🎉 and special chars <>&"');
      });
    });
  });

  describe('getProfile', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    describe('success scenarios', () => {
      it('should return complete profile with 100% completion', async () => {
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
          country: 'United States',
          bio: 'Test bio',
          avatarUrl: 'https://example.com/avatar.jpg',
          role: UserRole.DONOR,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.APPROVED,
          kycSubmittedAt: new Date('2024-01-01'),
          kycVerifiedAt: new Date('2024-01-02'),
          kycDocumentUrl: 'https://example.com/doc.pdf',
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.id).toBe(mockUser.id);
        expect(result.email).toBe(mockUser.email);
        expect(result.firstName).toBe(mockUser.firstName);
        expect(result.lastName).toBe(mockUser.lastName);
        expect(result.role).toBe(mockUser.role);
        expect(result.walletAddress).toBe(mockUser.walletAddress);
        expect(result.country).toBe(mockUser.country);
        expect(result.bio).toBe(mockUser.bio);
        expect(result.avatarUrl).toBe(mockUser.avatarUrl);
        expect(result.isEmailVerified).toBe(mockUser.isEmailVerified);
        expect(result.kycStatus).toBe(mockUser.kycStatus);
        expect(result.kycSubmittedAt).toBe(mockUser.kycSubmittedAt);
        expect(result.kycVerifiedAt).toBe(mockUser.kycVerifiedAt);
        expect(result.createdAt).toBe(mockUser.createdAt);
        expect(result.updatedAt).toBe(mockUser.updatedAt);
        expect(result.profileCompletionPercentage).toBe(100);
      });

      it('should return profile with 50% completion (email, firstName, lastName only)', async () => {
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          walletAddress: null,
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.USER,
          isEmailVerified: false,
          emailVerificationToken: 'token123',
          emailVerificationTokenExpiry: new Date('2024-12-31'),
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.NONE,
          kycSubmittedAt: null,
          kycVerifiedAt: null,
          kycDocumentUrl: null,
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.profileCompletionPercentage).toBe(50);
      });

      it('should return profile with 83% completion (email verified, wallet set)', async () => {
        // 5 out of 6 checkpoints: email, firstName, lastName (always true), emailVerified, walletAddress
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.USER,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.PENDING,
          kycSubmittedAt: null,
          kycVerifiedAt: null,
          kycDocumentUrl: null,
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.profileCompletionPercentage).toBe(83);
      });

      it('should return profile with 100% completion (email verified, wallet set, KYC approved)', async () => {
        // All 6 checkpoints: email, firstName, lastName, emailVerified, walletAddress, KYC approved
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.USER,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.APPROVED,
          kycSubmittedAt: new Date('2024-01-01'),
          kycVerifiedAt: new Date('2024-01-02'),
          kycDocumentUrl: 'https://example.com/doc.pdf',
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.profileCompletionPercentage).toBe(100);
      });

      it('should handle different user roles', async () => {
        const mockUser: User = {
          id: userId,
          email: 'admin@example.com',
          password: 'hashedPassword123',
          firstName: 'Admin',
          lastName: 'User',
          walletAddress: null,
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.ADMIN,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.NONE,
          kycSubmittedAt: null,
          kycVerifiedAt: null,
          kycDocumentUrl: null,
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.role).toBe(UserRole.ADMIN);
      });

      it('should handle CREATOR role', async () => {
        const mockUser: User = {
          id: userId,
          email: 'creator@example.com',
          password: 'hashedPassword123',
          firstName: 'Creator',
          lastName: 'User',
          walletAddress: null,
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.CREATOR,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.NONE,
          kycSubmittedAt: null,
          kycVerifiedAt: null,
          kycDocumentUrl: null,
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.role).toBe(UserRole.CREATOR);
      });
    });

    describe('error scenarios', () => {
      it('should throw NotFoundException when user not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.getProfile('non-existent-id')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should handle database error during findOne', async () => {
        const dbError = new Error('Database error');
        mockRepository.findOne.mockRejectedValue(dbError);

        await expect(service.getProfile(userId)).rejects.toThrow(
          'Database error',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle KYC REJECTED status', async () => {
        // 5 out of 6: email, firstName, lastName, emailVerified, wallet (REJECTED doesn't count)
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.USER,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.REJECTED,
          kycSubmittedAt: new Date('2024-01-01'),
          kycVerifiedAt: null,
          kycDocumentUrl: null,
          kycRejectionReason: 'Document unclear',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.kycStatus).toBe(KYCStatus.REJECTED);
        expect(result.profileCompletionPercentage).toBe(83);
      });

      it('should handle KYC PENDING status', async () => {
        // 5 out of 6: email, firstName, lastName, emailVerified, wallet (PENDING doesn't count)
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          walletAddress:
            'GAA2M7F4E3C4D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.USER,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.PENDING,
          kycSubmittedAt: new Date('2024-01-01'),
          kycVerifiedAt: null,
          kycDocumentUrl: 'https://example.com/doc.pdf',
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        expect(result.kycStatus).toBe(KYCStatus.PENDING);
        expect(result.profileCompletionPercentage).toBe(83);
      });

      it('should handle empty string wallet address as set (not null)', async () => {
        // 6 out of 6: email, firstName, lastName, emailVerified, wallet (empty string !== null), KYC approved
        // Note: The service checks `walletAddress !== null`, so empty string counts as "set"
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          walletAddress: '',
          country: null,
          bio: null,
          avatarUrl: null,
          role: UserRole.USER,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          resetPasswordTokenSelector: null,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpiry: null,
          refreshTokenHash: null,
          kycStatus: KYCStatus.APPROVED,
          kycSubmittedAt: new Date('2024-01-01'),
          kycVerifiedAt: new Date('2024-01-02'),
          kycDocumentUrl: null,
          kycRejectionReason: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.getProfile(userId);

        // Empty string !== null, so wallet check passes
        expect(result.walletAddress).toBe('');
        expect(result.profileCompletionPercentage).toBe(100);
      });
    });
  });
});
