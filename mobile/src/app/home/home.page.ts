import { Component, OnInit } from '@angular/core';
import { DoctorService } from '../services/doctor.service';
import { AuthService } from '../services/auth.service';
import { Geolocation } from '@capacitor/geolocation';
import { InfiniteScrollCustomEvent } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  isLoggedIn: boolean = false;
  isDoctor: boolean = false;
  userName: string = '';
  searchQuery: string = '';
  selectedSpecialty: string = '';
  selectedCity: string = '';
  userGovernorate: string = '';
  allDoctors: any[] = [];
  allUsers: any[] = [];
  displayedDoctors: any[] = [];
  displayedUsers: any[] = [];
  loading: boolean = false;
  doctorPage: number = 1;
  userPage: number = 1;
  pageSize: number = 5;
  totalDoctors: number = 0;
  totalUsers: number = 0;
  hasMoreDoctors: boolean = true;
  hasMoreUsers: boolean = true;

  private governorates = [
    { name: 'Ariana', lat: 36.8667, lon: 10.2000 },
    { name: 'Béja', lat: 36.7333, lon: 9.1833 },
    { name: 'Ben Arous', lat: 36.7500, lon: 10.2333 },
    { name: 'Bizerte', lat: 37.2744, lon: 9.8739 },
    { name: 'Gabès', lat: 33.8819, lon: 10.0982 },
    { name: 'Gafsa', lat: 34.4167, lon: 8.7833 },
    { name: 'Jendouba', lat: 36.5011, lon: 8.7803 },
    { name: 'Kairouan', lat: 35.6744, lon: 10.1000 },
    { name: 'Kasserine', lat: 35.1676, lon: 8.8365 },
    { name: 'Kebili', lat: 33.7044, lon: 8.9690 },
    { name: 'Kef', lat: 36.1680, lon: 8.7090 },
    { name: 'Mahdia', lat: 35.5047, lon: 11.0622 },
    { name: 'Manouba', lat: 36.8100, lon: 10.1000 },
    { name: 'Medenine', lat: 33.3549, lon: 10.5055 },
    { name: 'Monastir', lat: 35.7833, lon: 10.8333 },
    { name: 'Nabeul', lat: 36.4561, lon: 10.7376 },
    { name: 'Sfax', lat: 34.7406, lon: 10.7603 },
    { name: 'Sidi Bouzid', lat: 35.0382, lon: 9.4849 },
    { name: 'Siliana', lat: 36.0833, lon: 9.3667 },
    { name: 'Sousse', lat: 35.8256, lon: 10.6411 },
    { name: 'Tataouine', lat: 32.9297, lon: 10.4518 },
    { name: 'Tozeur', lat: 33.9197, lon: 8.1335 },
    { name: 'Tunis', lat: 36.8065, lon: 10.1815 },
    { name: 'Zaghouan', lat: 36.4029, lon: 10.1429 }
  ];

  constructor(
    private doctorService: DoctorService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkLoginStatus();
    this.loadInitialData();
    this.getUserLocation();
  }

  checkLoginStatus() {
    this.isLoggedIn = this.authService.isLoggedIn();
    const user = this.authService.getUser();
    this.userName = user?.first_name || 'User';
    this.isDoctor = user?.is_doctor || false;
  }

  loadInitialData() {
    this.loading = true;
    if (this.isDoctor) {
      this.loadUsers();
    } else {
      this.loadDoctors();
    }
  }

  loadDoctors(page: number = 1) {
    this.doctorService.getDoctors(page, this.pageSize).subscribe({
      next: (data) => {
        const newDoctors = data.doctors;
        this.allDoctors = page === 1 ? newDoctors : [...this.allDoctors, ...newDoctors];
        this.displayedDoctors = [...this.allDoctors];
        this.totalDoctors = data.total;
        this.doctorPage = data.page;
        this.hasMoreDoctors = this.displayedDoctors.length < this.totalDoctors;
        this.loading = false;
        this.applyLocationFilter();
      },
      error: (err) => {
        console.error('Error loading doctors:', err);
        this.loading = false;
      }
    });
  }

  filterDoctorsRealTime() {
    this.displayedDoctors = this.allDoctors.filter(doctor => {
      const matchesQuery = this.searchQuery
        ? doctor.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        : true;
      const matchesSpecialty = this.selectedSpecialty
        ? doctor.specialty === this.selectedSpecialty
        : true;
      const matchesCity = this.selectedCity
        ? doctor.city === this.selectedCity
        : true;
      return matchesQuery && matchesSpecialty && matchesCity;
    });
  }

  filterUsersRealTime() {
    this.displayedUsers = this.allUsers.filter(user => {
      const matchesQuery = this.searchQuery
        ? `${user.first_name} ${user.last_name}`.toLowerCase().includes(this.searchQuery.toLowerCase())
        : true;
      return matchesQuery;
    });
  }

  searchDoctors() {
    this.loading = true;
    this.doctorPage = 1;
    this.doctorService.getDoctors(this.doctorPage, this.pageSize, this.searchQuery, this.selectedSpecialty, this.selectedCity).subscribe({
      next: (data) => {
        this.allDoctors = data.doctors;
        this.displayedDoctors = [...this.allDoctors];
        this.totalDoctors = data.total;
        this.hasMoreDoctors = this.displayedDoctors.length < this.totalDoctors;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error searching doctors:', err);
        this.loading = false;
      }
    });
  }

  loadUsers(page: number = 1) {
    this.doctorService.getAllUsers(page, this.pageSize).subscribe({
      next: (data) => {
        console.log('Users data from API:', data.users); // Add this
        const newUsers = data.users;
        this.allUsers = page === 1 ? newUsers : [...this.allUsers, ...newUsers];
        this.displayedUsers = [...this.allUsers];
        this.totalUsers = data.total;
        this.userPage = data.page;
        this.hasMoreUsers = this.displayedUsers.length < this.totalUsers;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.loading = false;
      }
    });
  }
  
  searchUsers() {
    this.loading = true;
    this.userPage = 1;
    this.doctorService.getAllUsers(this.userPage, this.pageSize, this.searchQuery).subscribe({
      next: (data) => {
        console.log('Search users data from API:', data.users); // Add this
        this.allUsers = data.users;
        this.displayedUsers = [...this.allUsers];
        this.totalUsers = data.total;
        this.hasMoreUsers = this.displayedUsers.length < this.totalUsers;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error searching users:', err);
        this.loading = false;
      }
    });
  }

  applyQuickFilter(filter: string) {
    if (filter === 'Nearby') {
      this.selectedCity = this.userGovernorate || 'Tunis';
    } else {
      this.selectedSpecialty = filter;
    }
    this.searchDoctors();
  }

  async getUserLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      this.userGovernorate = this.findNearestGovernorate(userLat, userLon);
      console.log('Detected governorate:', this.userGovernorate);
      this.applyLocationFilter();
    } catch (error) {
      console.error('Error getting location:', error);
      this.userGovernorate = 'Tunis';
    }
  }

  findNearestGovernorate(lat: number, lon: number): string {
    let closestGov = this.governorates[0];
    let minDistance = this.calculateDistance(lat, lon, closestGov.lat, closestGov.lon);

    for (const gov of this.governorates) {
      const distance = this.calculateDistance(lat, lon, gov.lat, gov.lon);
      if (distance < minDistance) {
        minDistance = distance;
        closestGov = gov;
      }
    }
    return closestGov.name;
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(value: number): number {
    return value * Math.PI / 180;
  }

  applyLocationFilter() {
    if (this.selectedCity === this.userGovernorate || this.selectedCity === 'Nearby') {
      this.selectedCity = this.userGovernorate;
      this.searchDoctors();
    }
  }

  doRefresh(event: any) {
    this.doctorPage = 1;
    this.userPage = 1;
    this.loadInitialData();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  loadMoreDoctors(event: InfiniteScrollCustomEvent) {
    this.doctorPage++;
    this.doctorService.getDoctors(this.doctorPage, this.pageSize, this.searchQuery, this.selectedSpecialty, this.selectedCity).subscribe({
      next: (data) => {
        this.allDoctors = [...this.allDoctors, ...data.doctors];
        this.displayedDoctors = [...this.allDoctors];
        this.totalDoctors = data.total;
        this.hasMoreDoctors = this.displayedDoctors.length < this.totalDoctors;
        event.target.complete();
      },
      error: (err) => {
        console.error('Error loading more doctors:', err);
        event.target.complete();
      }
    });
  }

  loadMoreUsers(event: InfiniteScrollCustomEvent) {
    this.userPage++;
    this.doctorService.getAllUsers(this.userPage, this.pageSize, this.searchQuery).subscribe({
      next: (data) => {
        this.allUsers = [...this.allUsers, ...data.users];
        this.displayedUsers = [...this.allUsers];
        this.totalUsers = data.total;
        this.hasMoreUsers = this.displayedUsers.length < this.totalUsers;
        event.target.complete();
      },
      error: (err) => {
        console.error('Error loading more users:', err);
        event.target.complete();
      }
    });
  }
}