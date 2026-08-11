import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CentralService } from './central.service';

describe('CentralService', () => {
  let service: CentralService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CentralService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts with no unsaved changes', () => {
    expect(service.hasUnsavedChanges).toBeFalse();
  });

  it('setTitle emits the new title to title$', async () => {
    service.setTitle('My Video');
    const title = await firstValueFrom(service.title$);
    expect(title).toBe('My Video');
  });

  it('requestSave emits on saveRequest$', async () => {
    const promise = firstValueFrom(service.saveRequest$);
    service.requestSave();
    await expectAsync(promise).toBeResolved();
  });
});
