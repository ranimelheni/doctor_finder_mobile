import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone:false
})
export class EditProfilePage implements OnInit {
  editProfileForm: FormGroup;
  isDoctor: boolean = false;
  user: any;
  showPasswordFields: boolean = false; 

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) {
    this.editProfileForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      old_password: [''],
      password: [''],
      confirm_password: [''],
      city: [''],
      address: [''],
      phone: ['']
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.user = this.authService.getUser();
    if (this.user) {
      this.isDoctor = this.user.is_doctor || false;
      this.loadProfile();
    } else {
      this.presentAlert('Error', 'User not found. Please log in.');
      this.router.navigate(['/login']);
    }
  }

  loadProfile() {
    this.authService.getProfile().subscribe(
      (profile) => {
        this.editProfileForm.patchValue({
          first_name: profile.first_name,
          last_name: profile.last_name
        });

        if (this.isDoctor) {
          this.authService.getProfile().subscribe(
            (doctorProfile) => {
              this.editProfileForm.patchValue({
                city: doctorProfile.doctor?.city || '',
                address: doctorProfile.doctor?.address || '',
                phone: doctorProfile.doctor?.phone || ''
              });
            },
            (error) => {
              console.error('Error loading doctor profile:', error);
            }
          );
        }
      },
      (error) => {
        console.error('Error loading profile:', error);
        this.presentAlert('Error', 'Failed to load profile. Please try again.');
      }
    );
  }


  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirm_password')?.value;
    if (password || confirmPassword) {
      return password === confirmPassword ? null : { mismatch: true };
    }
    return null;
  }


  togglePasswordFields() {
    this.showPasswordFields = !this.showPasswordFields;
    if (!this.showPasswordFields) {
     
      this.editProfileForm.patchValue({
        old_password: '',
        password: '',
        confirm_password: ''
      });
    }
  }

  async onSubmit() {
    if (this.editProfileForm.invalid) {
      this.presentAlert('Error', 'Please fill in all required fields correctly.');
      return;
    }

    const formValue = this.editProfileForm.value;
    const data: any = {
      first_name: formValue.first_name,
      last_name: formValue.last_name
    };

   
    if (this.showPasswordFields) {
      if (!formValue.old_password || !formValue.password || !formValue.confirm_password) {
        this.presentAlert('Error', 'Please fill in all password fields to change your password.');
        return;
      }
      data.old_password = formValue.old_password;
      data.password = formValue.password;
      data.confirm_password = formValue.confirm_password;
    }

    
    if (this.isDoctor) {
      if (formValue.city) data.city = formValue.city;
      if (formValue.address) data.address = formValue.address;
      if (formValue.phone) data.phone = formValue.phone;
    }

    const loading = await this.loadingController.create({
      message: 'Updating profile...',
    });
    await loading.present();

    this.authService.editProfile(data).subscribe(
      async (response) => {
        await loading.dismiss();
        await this.presentAlert('Success', 'Profile updated successfully!');
        this.router.navigate(['/profile']);
      },
      async (error) => {
        await loading.dismiss();
        await this.presentAlert('Error', error.message || 'Failed to update profile. Please try again.');
      }
    );
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}