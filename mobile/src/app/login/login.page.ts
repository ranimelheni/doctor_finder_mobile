import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone : false,
})
export class LoginPage {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('Login successful:', response);
        this.authService.setLoggedIn(true, response.user, response.access_token);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error.message || 'Login failed. Please try again.';
        console.error('Login error:', err);
      }
    });
  }
}