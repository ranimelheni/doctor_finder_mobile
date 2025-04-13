import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api';
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.isLoggedIn());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  private userSubject = new BehaviorSubject<any>(this.getUser());
  private unreadCountSubject = new BehaviorSubject<number>(0); // New: Track unread count
  public unreadCount$ = this.unreadCountSubject.asObservable(); // Observable for unread count

  constructor(private http: HttpClient) {
    this.loadThemePreference();
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        this.setLoggedIn(true, response.user, response.access_token);
        this.userSubject.next(response.user);
        this.loadUnreadCount(); // Load unread count on login
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        this.setLoggedIn(true, response.user, response.access_token);
        this.userSubject.next(response.user);
        this.loadUnreadCount(); // Load unread count on register
      })
    );
  }

  logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    this.isLoggedInSubject.next(false);
    this.userSubject.next(null);
    this.unreadCountSubject.next(0); // Reset unread count on logout
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true' && !!this.getToken();
  }

  getUser(): any {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  setLoggedIn(isLoggedIn: boolean, user?: any, token?: string): void {
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    if (token) {
      localStorage.setItem('access_token', token);
    }
    this.isLoggedInSubject.next(isLoggedIn);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isDoctor(): boolean {
    const user = this.getUser();
    return user.is_doctor || false;
  }

  getDoctorId(): number | null {
    const user = this.getUser();
    return user.doctor_id || null;
  }

  getProfile(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.getToken()}`);
    const user = this.getUser();
    return this.http.post<any>(`${this.apiUrl}/profile`, { user_id: user.id }, { headers }).pipe(
      tap(profile => {
        this.setLoggedIn(true, profile);
        this.userSubject.next(profile);
      })
    );
  }

  getNotifications(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.getToken()}`);
    return this.http.get<any>(`${this.apiUrl}/notifications`, { headers });
  }

  markNotificationAsRead(notificationId: number): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.getToken()}`);
    return this.http.post<any>(`${this.apiUrl}/notifications/${notificationId}/read`, {}, { headers }).pipe(
      tap(() => this.loadUnreadCount()) // Update unread count after marking as read
    );
  }

  addNotification(userId: number, message: string): Observable<any> {
    const token = this.getToken();
    if (!token) {
      console.error('No JWT token found. User is not authenticated.');
      return throwError(() => new Error('No JWT token found. User is not authenticated.'));
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<any>(`${this.apiUrl}/notifications/add`, { user_id: userId, message }, { headers });
  }

  loadThemePreference(): void {
    const savedTheme = localStorage.getItem('isDarkMode');
    const isDarkMode = savedTheme !== null ? savedTheme === 'true' : true;
    const appElement = document.querySelector('ion-app');
    if (!isDarkMode && appElement) {
      appElement.classList.add('light-theme');
    } else if (isDarkMode && appElement) {
      appElement.classList.remove('light-theme');
    }
  }

  toggleTheme(isDarkMode: boolean): void {
    localStorage.setItem('isDarkMode', isDarkMode.toString());
    const appElement = document.querySelector('ion-app');
    if (!isDarkMode && appElement) {
      appElement.classList.add('light-theme');
    } else if (appElement) {
      appElement.classList.remove('light-theme');
    }
  }

  // New method to load and update unread count
  loadUnreadCount() {
    if (!this.isLoggedIn()) {
      this.unreadCountSubject.next(0);
      return;
    }
    this.getNotifications().subscribe({
      next: (data) => {
        const count = data.filter((n: { is_read: any; }) => !n.is_read).length;
        this.unreadCountSubject.next(count);
        console.log('Unread count updated:', count);
      },
      error: (err) => {
        console.error('Error loading unread count:', err);
        this.unreadCountSubject.next(0);
      }
    });
  }
  editProfile(data: any): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token found. Please log in.'));
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put<any>(`${this.apiUrl}/profile/edit`, data, { headers }).pipe(
      tap(response => {
        // Mettre à jour les informations de l'utilisateur dans le stockage local
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          this.userSubject.next(response.user);
        }
      }),
      catchError(err => {
        console.error('Error editing profile:', err);
        return throwError(() => new Error(err.error?.message || 'Failed to edit profile'));
      })
    );
  }
}