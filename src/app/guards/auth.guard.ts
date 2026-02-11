// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { 
  Router, 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot,
  UrlTree, 
  CanActivateChild
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {

    if (!this.auth.isLoggedIn()) {
      this.auth.logout();
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    const requiredRole = route.data['role'];
    const requiredRoles = route.data['roles'];

    if (requiredRole || requiredRoles) {
      const userRole = this.auth.getUserRole();

      if (
        userRole === 'Admin' ||
        userRole === requiredRole ||
        requiredRoles?.includes(userRole)
      ) {
        return true;
      }

      return this.router.createUrlTree(['/unauthorized']);
    }

    return true;
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    return this.canActivate(route, state);
  }
}