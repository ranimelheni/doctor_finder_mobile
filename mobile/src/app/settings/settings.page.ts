import { Component } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage {
  isLoggedIn: boolean = false;
  isDarkMode: boolean = true; // Default value, will be overridden by stored preference
  notificationsEnabled: boolean = false;

  constructor(
    private renderer: Renderer2,
    private authService: AuthService,
    private router: Router
  ) {
    // Load saved theme preference on initialization
    this.loadThemePreference();
    this.isLoggedIn = this.authService.isLoggedIn();
    this.applyTheme();
  }
  ionViewWillEnter() {
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  loadThemePreference() {
    const savedTheme = localStorage.getItem('isDarkMode');
    if (savedTheme !== null) {
      this.isDarkMode = savedTheme === 'true';
    }
    // If no saved preference, default to dark mode (isDarkMode = true)
  }

  toggleDarkMode() {
    const appElement = document.querySelector('ion-app');
    if (this.isDarkMode) {
      this.renderer.removeClass(appElement, 'light-theme');
    } else {
      this.renderer.addClass(appElement, 'light-theme');
    }
    // Save the preference to localStorage
    localStorage.setItem('isDarkMode', this.isDarkMode.toString());
    console.log('Dark Mode:', this.isDarkMode);
  }

  applyTheme() {
    const appElement = document.querySelector('ion-app');
    if (!this.isDarkMode) {
      this.renderer.addClass(appElement, 'light-theme');
    } else {
      this.renderer.removeClass(appElement, 'light-theme');
    }
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.router.navigate(['/login']);
  }
}