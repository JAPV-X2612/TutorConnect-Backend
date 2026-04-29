import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('getMe', () => {
    it('returns clerk_id, role, and session_activa=true', () => {
      const result = service.getMe({
        clerk_id: 'user_abc',
        role: UserRole.TUTOR,
      });
      expect(result).toEqual({
        clerk_id: 'user_abc',
        role: UserRole.TUTOR,
        session_activa: true,
      });
    });

    it('defaults role to APRENDIZ when role is null', () => {
      const result = service.getMe({ clerk_id: 'user_xyz', role: null as any });
      expect(result.role).toBe('APRENDIZ');
    });
  });
});
