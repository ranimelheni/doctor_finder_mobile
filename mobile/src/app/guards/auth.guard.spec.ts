import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard'; // Import should be AuthGuard (capitalized)
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

describe('AuthGuard', () => { // Class name should match AuthGuard
  let guard: AuthGuard;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    const authServiceStub = { isLoggedIn: () => true };
    const routerStub = { navigate: jasmine.createSpy('navigate') };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow navigation if logged in', () => {
    expect(guard.canActivate({} as any, {} as any)).toBeTrue();
  });

  it('should redirect to login if not logged in', () => {
    spyOn(authService, 'isLoggedIn').and.returnValue(false);
    expect(guard.canActivate({} as any, {} as any)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});