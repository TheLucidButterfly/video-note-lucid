import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CentralService } from './services/central.service';
import { LoadingNotificationService } from './services/loading-notification/loading-notification.service';
import { environment } from 'src/environments/environment';
import { EntitlementService } from './services/entitlement.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly environment = environment;
  isHomePage = false;
  showUnsavedDialog = false;
  private readonly displayedPathLength = 50;

  constructor(
    private router: Router,
    public centralService: CentralService,
    private entitlementService: EntitlementService,
    public LoadingService: LoadingNotificationService
  ) { }

  ngOnInit(): void { 
    this.LoadingService.show();
    this.entitlementService.bootstrapAuthorization()
      .catch((error) => {
        console.error('bootstrapAuthorization failed', error);
      })
      .finally(() => {
        this.LoadingService.hide();
      });

    this.isHomePage = this.router.url === '/home';
    this.router.events.subscribe(() => {
      this.LoadingService.hide();
      this.isHomePage = this.router.url === '/home'; // Check if URL is '/'
    });
  }

  navigateHome() {
    if (this.centralService.hasUnsavedChanges) {
      this.showUnsavedDialog = true;
      return;
    }
    this.doNavigateHome();
  }

  onUnsavedDialogConfirmed(save: boolean) {
    this.showUnsavedDialog = false;
    if (save) {
      this.centralService.requestSave();
    }
    this.centralService.hasUnsavedChanges = false;
    this.doNavigateHome();
  }

  private doNavigateHome() {
    this.router.navigate(['/home']);
    this.centralService.setTitle('');
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
