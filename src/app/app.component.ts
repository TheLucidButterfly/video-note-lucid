import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CentralService } from './services/central.service';
import { StorageService } from './services/storage-service.service';
import { LoadingNotificationService } from './services/loading-notification/loading-notification.service';
import { switchMap } from 'rxjs';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isHomePage = false;
  private readonly displayedPathLength = 50;

  constructor(
    private router: Router,
    public centralService: CentralService,
    private storageService: StorageService,
    public LoadingService: LoadingNotificationService
  ) { }

  ngOnInit(): void { 
    this.LoadingService.show();
    this.storageService.loadPremiumStatus()
    .pipe(
      switchMap((isPremiumStatus: boolean) => {
        this.centralService.isPremium = isPremiumStatus;
        return this.router.events;
      })
    )
    .subscribe(() => {
      this.LoadingService.hide();
      this.isHomePage = this.router.url === '/home'; // Check if URL is '/'
    });
  }

  navigateHome() {
    this.router.navigate(['/home']);
    this.centralService.setTitle('')
  }

  formatDisplayPath(path: string | null | undefined): string {
    if (!path) {
      return '';
    }

    if (path.length <= this.displayedPathLength) {
      return path;
    }

    return `...${path.slice(-this.displayedPathLength)}`;
  }
}
