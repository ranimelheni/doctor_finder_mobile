import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: false,
})
export class FavoritesPage {
  favorites: any[] = [];
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private router: Router // Add Router for navigation
  ) {}

  // Use ionViewWillEnter to reload favorites each time the page is visited
  ionViewWillEnter() {
    this.loadFavorites();
  }

  loadFavorites() {
    this.loading = true;
    this.doctorService.getFavorites().subscribe({
      next: (data) => {
        this.favorites = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading favorites:', err);
        this.loading = false;
      }
    });
  }

  // Navigate to doctor profile when clicked
  goToDoctorProfile(doctorId: number) {
    this.router.navigate(['/doctor-profile'], { queryParams: { id: doctorId } });
  }
}