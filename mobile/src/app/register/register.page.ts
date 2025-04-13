import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const userData = {
      first_name: this.firstName,
      last_name: this.lastName,
      email: this.email,
      password: this.password
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('Registration successful:', response);
        this.authService.setLoggedIn(true, response.user , response.access_token);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error.message || 'Registration failed. Please try again.';
        console.error('Registration error:', err);
      }
    });
  }
}