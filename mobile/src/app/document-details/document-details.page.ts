import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DoctorService } from '../services/doctor.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-document-details',
  templateUrl: './document-details.page.html',
  styleUrls: ['./document-details.page.scss'],
  standalone: false
})
export class DocumentDetailsPage implements OnInit {
  isDoctor: boolean | null = null;
  document: any = null;
  loading: boolean = true;
  newNote: string = ''; // For adding a new note
  editingNoteId: number | null = null; // Tracks which note is being edited
  editedNoteContent: string = ''; // Content of the note being edited
  actionInProgress: boolean = false; // Tracks adding/editing/deleting state

  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isDoctor = this.authService.isDoctor();
    const documentId = this.route.snapshot.paramMap.get('id');
    if (documentId) {
      this.loadDocument(parseInt(documentId, 10));
    }
  }

  loadDocument(documentId: number) {
    this.loading = true;
    this.doctorService.getDocumentDetails(documentId).subscribe({
      next: (data) => {
        this.document = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading document:', err);
        this.document = null;
        this.loading = false;
      }
    });
  }

  addNote() {
    if (!this.document || !this.isDoctor || !this.newNote.trim()) return;

    this.actionInProgress = true;
    this.doctorService.addDocumentNote(this.document.id, this.newNote).subscribe({
      next: (response) => {
        this.actionInProgress = false;
        this.document.notes.push(response.note);
        this.newNote = '';
      },
      error: (err) => {
        console.error('Error adding note:', err);
        this.actionInProgress = false;
      }
    });
  }

  startEditingNote(note: any) {
    this.editingNoteId = note.id;
    this.editedNoteContent = note.content;
  }

  saveEditedNote(noteId: number) {
    if (!this.isDoctor || !this.editedNoteContent.trim()) return;

    this.actionInProgress = true;
    this.doctorService.editDocumentNote(noteId, this.editedNoteContent).subscribe({
      next: (response) => {
        this.actionInProgress = false;
        this.editingNoteId = null;
        const noteIndex = this.document.notes.findIndex((n: any) => n.id === noteId);
        if (noteIndex !== -1) {
          this.document.notes[noteIndex] = response.note;
        }
      },
      error: (err) => {
        console.error('Error editing note:', err);
        this.actionInProgress = false;
      }
    });
  }

  cancelEditing() {
    this.editingNoteId = null;
    this.editedNoteContent = '';
  }

  deleteNote(noteId: number) {
    if (!this.isDoctor) return;

    this.actionInProgress = true;
    this.doctorService.deleteDocumentNote(noteId).subscribe({
      next: () => {
        this.actionInProgress = false;
        this.document.notes = this.document.notes.filter((n: any) => n.id !== noteId);
      },
      error: (err) => {
        console.error('Error deleting note:', err);
        this.actionInProgress = false;
      }
    });
  }

  downloadFile() {
    if (!this.document || !this.document.content || !this.document.extension) {
      return;
    }

    const byteCharacters = atob(this.document.content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: this.getMimeType(this.document.extension) });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${this.document.name}${this.document.extension}`;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }

  getMimeType(extension: string): string {
    switch (extension.toLowerCase()) {
      case '.pdf': return 'application/pdf';
      case '.doc': return 'application/msword';
      case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.txt': return 'text/plain';
      default: return 'application/octet-stream';
    }
  }

  getProfileUrl(): string {
    if (this.document && this.document.user_id && this.isDoctor) {
      return `/profile?user_id=${this.document.user_id}`;
    }
    return '/profile';
  }
}