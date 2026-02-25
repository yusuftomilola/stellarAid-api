import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { TokenValidationMiddleware } from '../middleware/token-validation.middleware';
import { JwtPayload } from '../interfaces/auth.interface';
import type { Request, Response } from 'express';
import { IS_PUBLIC_KEY, Public } from '../decorators/public.decorator';
import { UserRole } from '../../users/entities/user.entity';

function mockContext(isPublic = false): ExecutionContext {
  const handler = isPublic
    ? Object.assign(() => {}, { [IS_PUBLIC_KEY]: true })
    : () => {};
  return {
    getHandler: () => handler,
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: 'Bearer a.b.c' } }),
    }),
  } as unknown as ExecutionContext;
}

const validPayload: JwtPayload = {
  sub: 'user-uuid',
  email: 'user@test.com',
  role: UserRole.USER,
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  it('returns true immediately for @Public() routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(guard.canActivate(mockContext(true))).toBe(true);
  });

  it('delegates to passport for protected routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superSpy = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
    guard.canActivate(mockContext(false));
    expect(superSpy).toHaveBeenCalled();
  });

  it('checks IS_PUBLIC_KEY on both handler and class', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(false);
    jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
    guard.canActivate(mockContext());
    expect(spy).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.arrayContaining([expect.any(Function), expect.any(Object)]),
    );
  });
});

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'test-secret' },
        },
      ],
    }).compile();
    strategy = module.get(JwtStrategy);
  });

  it('returns payload when sub is present', async () => {
    const result = await strategy.validate(validPayload);
    expect(result).toEqual(validPayload);
  });

  it('throws UnauthorizedException when sub is missing', async () => {
    await expect(strategy.validate({ sub: '' } as JwtPayload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when payload is empty', async () => {
    await expect(strategy.validate({} as JwtPayload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('@Public() decorator', () => {
  it('sets IS_PUBLIC_KEY metadata to true', () => {
    class TestController {
      @Public()
      testRoute() {}
    }
    const meta = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.testRoute,
    );
    expect(meta).toBe(true);
  });

  it('does not affect methods without @Public()', () => {
    class TestController {
      undecorated() {}
    }
    const meta = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.undecorated,
    );
    expect(meta).toBeUndefined();
  });
});

describe('TokenValidationMiddleware', () => {
  let middleware: TokenValidationMiddleware;
  const next = jest.fn();
  const res = {} as Response;

  beforeEach(() => {
    middleware = new TokenValidationMiddleware();
    next.mockClear();
  });

  it('passes through when no Authorization header present', () => {
    middleware.use({ headers: {} } as Request, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes through for a well-formed Bearer token', () => {
    middleware.use(
      { headers: { authorization: 'Bearer aaa.bbb.ccc' } } as Request,
      res,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('throws 401 for non-Bearer scheme', () => {
    expect(() =>
      middleware.use(
        { headers: { authorization: 'Basic dXNlcjpwYXNz' } } as Request,
        res,
        next,
      ),
    ).toThrow(UnauthorizedException);
  });

  it('throws 401 for one-segment token', () => {
    expect(() =>
      middleware.use(
        { headers: { authorization: 'Bearer onlyone' } } as Request,
        res,
        next,
      ),
    ).toThrow(UnauthorizedException);
  });

  it('throws 401 for two-segment token', () => {
    expect(() =>
      middleware.use(
        { headers: { authorization: 'Bearer aaa.bbb' } } as Request,
        res,
        next,
      ),
    ).toThrow(UnauthorizedException);
  });

  it('throws 401 for four-segment token', () => {
    expect(() =>
      middleware.use(
        { headers: { authorization: 'Bearer a.b.c.d' } } as Request,
        res,
        next,
      ),
    ).toThrow(UnauthorizedException);
  });
});
