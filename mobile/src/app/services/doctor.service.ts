import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token || ''}`);
  }

  getDoctors(page: number = 1, limit: number = 5, name: string = '', specialty: string = '', city: string = ''): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (name) params = params.set('name', name);
    if (specialty) params = params.set('specialty', specialty);
    if (city) params = params.set('city', city);
    
    return this.http.get<any>(`${this.apiUrl}/doctors`, { params }).pipe(
      catchError(err => {
        console.error('Error fetching doctors:', err);
        return throwError(() => new Error('Failed to fetch doctors'));
      })
    );
  }

  getDoctorById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/doctors/${id}`).pipe(
      catchError(err => {
        console.error('Error fetching doctor:', err);
        return throwError(() => new Error(`Failed to fetch doctor with ID ${id}`));
      })
    );
  }

  getAppointments(status? : string,appointment_id?: number): Observable<any[]> {
    const user = this.authService.getUser();
    const payload: {user_id:number; status?: string ; appointment_id?: number}={user_id: user.id };
    if (status) {
      payload.status = status;
    }
    if (appointment_id) {
      payload.appointment_id = appointment_id;  // Add appointment_id to payload if provided
    }
    return this.http.post<any[]>(`${this.apiUrl}/appointments`, payload, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching appointments:', err);
        return throwError(() => new Error('Failed to fetch appointments'));
      })
    );
  }

  getDoctorAppointments(doctorId: number, status?: string, appointment_id?: number): Observable<any[]> {
    const payload: { doctor_id: number; status?: string ; appointment_id?: number} = { doctor_id: doctorId };
    if (status) {
      payload.status = status;
    }
    if (appointment_id) {
      payload.appointment_id = appointment_id;  // Add appointment_id to payload if provided
    }
    return this.http.post<any[]>(`${this.apiUrl}/doctor-appointments`, payload, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching doctor appointments:', err);
        return throwError(() => new Error('Failed to fetch doctor appointments'));
      })
    );
  }

  getDoctorAvailableSlots(doctorId: number, weekStart: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/doctor-available-slots`, { doctor_id: doctorId, week_start: weekStart }, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching available slots:', err);
        return throwError(() => new Error('Failed to fetch available slots'));
      })
    );
  }

  bookAppointment(doctorId: number, appointmentDate: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/appointments/book`, { doctor_id: doctorId, appointment_date: appointmentDate }, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error booking appointment:', err);
        return throwError(() => new Error('Failed to book appointment'));
      })
    );
  }

  getFavorites(): Observable<any[]> {
    const user = this.authService.getUser();
    return this.http.post<any[]>(`${this.apiUrl}/favorites`, { user_id: user.id }, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching favorites:', err);
        return throwError(() => new Error('Failed to fetch favorites'));
      })
    );
  }

  addFavorite(doctorId: number): Observable<any> {
    const user = this.authService.getUser();
    return this.http.post<any>(`${this.apiUrl}/favorites/add`, { user_id: user.id, doctor_id: doctorId }, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error adding favorite:', err);
        return throwError(() => new Error('Failed to add favorite'));
      })
    );
  }

  removeFavorite(doctorId: number): Observable<any> {
    const user = this.authService.getUser();
    return this.http.post<any>(`${this.apiUrl}/favorites/remove`, { user_id: user.id, doctor_id: doctorId }, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error removing favorite:', err);
        return throwError(() => new Error('Failed to remove favorite'));
      })
    );
  }

  getUserProfile(userId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/profile`,
      { user_id: userId },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error('Error fetching user profile:', err);
        return throwError(() => new Error(`Failed to fetch profile for user ID ${userId}`));
      })
    );
  }

  deleteAppointment(appointmentId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/appointments/delete`,
      { appointment_id: appointmentId },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error('Error deleting appointment:', err);
        return throwError(() => new Error('Failed to delete appointment'));
      })
    );
  }

  sendMessage(receiverId: number, messageText: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/messages/send`,
      { receiver_id: receiverId, message_text: messageText },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error('Error sending message:', err);
        return throwError(() => new Error('Failed to send message'));
      })
    );
  }

  getMessages(otherUserId: number): Observable<any[]> {
    return this.http.post<any[]>(
      `${this.apiUrl}/messages`,
      { other_user_id: otherUserId },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error('Error fetching messages:', err);
        return throwError(() => new Error('Failed to fetch messages'));
      })
    );
  }

  markMessagesRead(otherUserId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/messages/mark-read`,
      { other_user_id: otherUserId },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error('Error marking messages as read:', err);
        return throwError(() => new Error('Failed to mark messages as read'));
      })
    );
  }

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/messages/conversations`, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching conversations:', err);
        return throwError(() => new Error('Failed to fetch conversations'));
      })
    );
  }

  getUserByDoctorId(doctorId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/user/by-doctor-id`,
      { doctor_id: doctorId },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error('Error fetching user by doctor ID:', err);
        return throwError(() => new Error('Failed to fetch user by doctor ID'));
      })
    );
  }

  getWeeklyAvailability(doctorId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/doctors/${doctorId}/availability/week`, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching weekly availability:', err);
        return throwError(() => new Error('Failed to fetch weekly availability'));
      })
    );
  }

  getDaySchedule(doctorId: number, date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/doctors/${doctorId}/availability/day?date=${date}`, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching day schedule:', err);
        return throwError(() => new Error('Failed to fetch day schedule'));
      })
    );
  }

  getAllUsers(page: number = 1, limit: number = 5, name: string = ''): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (name) params = params.set('name', name);
    
    return this.http.get<any>(`${this.apiUrl}/users/all`, { headers: this.getHeaders(), params }).pipe(
      catchError(err => {
        console.error('Error fetching users:', err);
        return throwError(() => new Error('Failed to fetch users'));
      })
    );
  }
  getConsultationHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/consultations/history`, { headers: this.getHeaders() });
  }

  

  addConsultation(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/consultations`, data, { headers: this.getHeaders() });
  }
  getAttachments(appointmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/attachments/${appointmentId}`, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error fetching attachments:', err);
        return throwError(() => new Error('Failed to fetch attachments'));
      })
    );
  }

  addAttachment(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/attachments`, data, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error adding attachment:', err);
        return throwError(() => new Error('Failed to add attachment'));
      })
    );
  }

  deleteAttachment(attachmentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/attachments/${attachmentId}`, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.error('Error deleting attachment:', err);
        return throwError(() => new Error('Failed to delete attachment'));
      })
    );
  }

  
  getUserDocuments(userId: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/user-documents/${userId}`, { headers });
  }

  uploadDocument(formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/upload-document`, formData, { headers });
  }

  getDocumentDetails(documentId: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/document/${documentId}`, { headers });
  }
  addDocumentNote(documentId: number, content: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json');
    const body = { content };
    return this.http.post(`${this.apiUrl}/document/${documentId}/notes`, body, { headers }).pipe(
      catchError(err => {
        console.error('Error adding note:', err);
        return throwError(() => new Error('Failed to add note'));
      })
    );
  }

  editDocumentNote(noteId: number, content: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json');
    const body = { content };
    return this.http.put(`${this.apiUrl}/document/note/${noteId}`, body, { headers }).pipe(
      catchError(err => {
        console.error('Error editing note:', err);
        return throwError(() => new Error('Failed to edit note'));
      })
    );
  }

  deleteDocumentNote(noteId: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.delete(`${this.apiUrl}/document/note/${noteId}`, { headers }).pipe(
      catchError(err => {
        console.error('Error deleting note:', err);
        return throwError(() => new Error('Failed to delete note'));
      })
    );
  }
}