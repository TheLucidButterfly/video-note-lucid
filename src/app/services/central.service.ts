import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CentralService {

  private titleSubject = new BehaviorSubject<string>('');
  title$ = this.titleSubject.asObservable();
  isPremium: boolean = !environment.trialMode;
  hasUnsavedChanges: boolean = false;

  private saveRequestSubject = new Subject<void>();
  saveRequest$ = this.saveRequestSubject.asObservable();

  requestSave() {
    this.saveRequestSubject.next();
  }

  constructor() {  }

  currentVideoTitle: string = '';

  setTitle(newTitle: string) {
    this.titleSubject.next(newTitle)
  }

  isPremiumUser(){
    return this.isPremium;
  }

}
