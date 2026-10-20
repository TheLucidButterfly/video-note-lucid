import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/services/storage-service.service';
import { environment } from 'src/environments/environment';

interface AppSettingsModel {
  apiKey: string;
  providerNotes: string;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  settings: AppSettingsModel = {
    apiKey: '',
    providerNotes: ''
  };

  loading = false;
  showSavedToast = false;

  constructor(
    private storageService: StorageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!environment.enableSettingsPage) {
      this.router.navigate(['/home']);
      return;
    }

    this.loading = true;
    this.storageService.getAppSettings().subscribe({
      next: (savedSettings: Partial<AppSettingsModel>) => {
        this.settings = {
          apiKey: typeof savedSettings?.apiKey === 'string' ? savedSettings.apiKey : '',
          providerNotes: typeof savedSettings?.providerNotes === 'string' ? savedSettings.providerNotes : ''
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load app settings', error);
        this.loading = false;
      }
    });
  }

  saveSettings() {
    this.loading = true;
    this.storageService.saveAppSettings(this.settings).subscribe({
      next: () => {
        this.loading = false;
        this.showSavedConfirmationToast();
      },
      error: (error) => {
        console.error('Failed to save app settings', error);
        this.loading = false;
      }
    });
  }

  navigateHome() {
    this.router.navigate(['/home']);
  }

  hideSavedToast() {
    this.showSavedToast = false;
  }

  private showSavedConfirmationToast() {
    this.showSavedToast = false;
    setTimeout(() => {
      this.showSavedToast = true;
    }, 0);
  }
}
