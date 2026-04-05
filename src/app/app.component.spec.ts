import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { CentralService } from './services/central.service';
import { StorageService } from './services/storage-service.service';
import { LoadingNotificationService } from './services/loading-notification/loading-notification.service';
import { Component } from '@angular/core';
import { of } from 'rxjs';

@Component({ selector: 'app-spinner', template: '' })
class MockSpinnerComponent {}

@Component({ selector: 'app-dialog', template: '' })
class MockDialogComponent {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;
  let centralService: CentralService;

  const storageServiceStub = { loadPremiumStatus: () => of(true) };
  const loadingServiceStub = { show: () => {}, hide: () => {}, loading$: of(false) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent, MockSpinnerComponent, MockDialogComponent],
      providers: [
        { provide: StorageService, useValue: storageServiceStub },
        { provide: LoadingNotificationService, useValue: loadingServiceStub }
      ]
    });
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    centralService = TestBed.inject(CentralService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(app).toBeTruthy();
  });

  it('navigateHome navigates directly when no unsaved changes', () => {
    centralService.hasUnsavedChanges = false;
    const spy = spyOn((app as any).router, 'navigate');
    app.navigateHome();
    expect(spy).toHaveBeenCalledWith(['/home']);
    expect(app.showUnsavedDialog).toBeFalse();
  });

  it('navigateHome shows unsaved dialog instead of navigating', () => {
    centralService.hasUnsavedChanges = true;
    const spy = spyOn((app as any).router, 'navigate');
    app.navigateHome();
    expect(app.showUnsavedDialog).toBeTrue();
    expect(spy).not.toHaveBeenCalled();
  });

  it('formatDisplayPath truncates paths over 50 chars', () => {
    const longPath = '/a/b/' + 'x'.repeat(60);
    const result = app.formatDisplayPath(longPath);
    expect(result.startsWith('...')).toBeTrue();
  });

  it('formatDisplayPath returns empty string for null', () => {
    expect(app.formatDisplayPath(null)).toBe('');
  });
});
