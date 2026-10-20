import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ActivationResponse } from 'src/app/interfaces/activation-response.interface';
import { environment } from 'src/environments/environment';
import { CentralService } from './central.service';
import { StorageService } from './storage-service.service';

interface EntitlementState {
  plan: 'trial' | 'paid';
  token?: string;
  expiresAt?: string;
  activatedAt?: string;
  lastValidatedAt?: string;
  licenseKeyLast4?: string;
  deviceId?: string;
  revokedAt?: string;
  revocationReason?: string;
}

interface ActivationApiResponse {
  success: boolean;
  message?: string;
  token?: string;
  expiresAt?: string;
  plan?: 'trial' | 'paid';
}

interface ValidateEntitlementApiResponse {
  valid: boolean;
  message?: string;
  token?: string;
  expiresAt?: string;
  plan?: 'trial' | 'paid';
}

@Injectable({
  providedIn: 'root'
})
export class EntitlementService {
  private readonly deviceIdKey = 'videonotes_device_id';
  private revalidationTimerId: number | null = null;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private centralService: CentralService
  ) {}

  async bootstrapAuthorization(): Promise<boolean> {
    if (!environment.trialMode) {
      this.centralService.isPremium = true;
      return true;
    }

    const appSettings = await firstValueFrom(this.storageService.getAppSettings());
    const entitlement = appSettings?.entitlement as EntitlementState | undefined;

    const locallyValid = this.isPaidEntitlementValid(entitlement);
    this.centralService.isPremium = locallyValid;

    if (!entitlement?.token || !this.getEntitlementApiBaseUrl()) {
      this.startOnlineRevalidationWatcher();
      return locallyValid;
    }

    const shouldRevalidate = this.shouldRevalidateNow(entitlement);
    const canUseNetwork = this.isOnline();

    if (!shouldRevalidate || !canUseNetwork) {
      const hasGrace = this.isWithinOfflineGrace(entitlement);
      this.centralService.isPremium = locallyValid && hasGrace;
      if (!hasGrace && locallyValid) {
        await this.downgradeToTrial(entitlement, 'Offline grace period expired. Please connect to the internet to revalidate your license.');
      }

      this.startOnlineRevalidationWatcher();
      return this.centralService.isPremium;
    }

    const validAfterServerCheck = await this.validateWithServer(entitlement);
    this.startOnlineRevalidationWatcher();
    return validAfterServerCheck;
  }

  async refreshAuthorizationIfDue(): Promise<boolean> {
    if (!environment.trialMode) {
      this.centralService.isPremium = true;
      return true;
    }

    const appSettings = await firstValueFrom(this.storageService.getAppSettings());
    const entitlement = appSettings?.entitlement as EntitlementState | undefined;
    if (!entitlement?.token) {
      this.centralService.isPremium = false;
      return false;
    }

    if (!this.shouldRevalidateNow(entitlement) || !this.isOnline() || !this.getEntitlementApiBaseUrl()) {
      this.centralService.isPremium = this.isPaidEntitlementValid(entitlement) && this.isWithinOfflineGrace(entitlement);
      return this.centralService.isPremium;
    }

    return this.validateWithServer(entitlement);
  }

  private async validateWithServer(entitlement: EntitlementState): Promise<boolean> {
    try {
      const validationResponse = await firstValueFrom(
        this.http.post<ValidateEntitlementApiResponse>(
          `${this.getEntitlementApiBaseUrl()}/validate-entitlement`,
          {
            token: entitlement.token,
            deviceId: await this.getOrCreateDeviceId(),
          }
        )
      );

      if (!validationResponse?.valid) {
        await this.downgradeToTrial(entitlement, validationResponse?.message || 'This license was revoked or is no longer valid.');
        return false;
      }

      const updatedEntitlement: EntitlementState = {
        plan: validationResponse.plan || 'paid',
        token: validationResponse.token || entitlement.token,
        expiresAt: validationResponse.expiresAt || entitlement.expiresAt,
        activatedAt: entitlement.activatedAt || new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
        licenseKeyLast4: entitlement.licenseKeyLast4,
        deviceId: entitlement.deviceId || await this.getOrCreateDeviceId(),
      };

      await this.persistEntitlement(updatedEntitlement);
      this.centralService.isPremium = this.isPaidEntitlementValid(updatedEntitlement);
      return this.centralService.isPremium;
    } catch {
      const locallyValid = this.isPaidEntitlementValid(entitlement);
      const hasGrace = this.isWithinOfflineGrace(entitlement);
      this.centralService.isPremium = locallyValid && hasGrace;
      if (!hasGrace && locallyValid) {
        await this.downgradeToTrial(entitlement, 'Offline grace period expired. Please connect to the internet to revalidate your license.');
      }
      return this.centralService.isPremium;
    }
  }

  async activateLicense(licenseKey: string): Promise<ActivationResponse> {
    const trimmedLicenseKey = (licenseKey || '').trim();
    if (!trimmedLicenseKey) {
      return { success: false, message: 'Please enter a license key.' };
    }

    const apiBaseUrl = this.getEntitlementApiBaseUrl();
    if (!apiBaseUrl) {
      return {
        success: false,
        message: 'Activation is not configured yet. Set payment.entitlementApiBaseUrl in environment files.',
      };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ActivationApiResponse>(`${apiBaseUrl}/activate-license`, {
          licenseKey: trimmedLicenseKey,
          deviceId: await this.getOrCreateDeviceId(),
        })
      );

      if (!response?.success) {
        return { success: false, message: response?.message || 'Activation failed.' };
      }

      const entitlement: EntitlementState = {
        plan: response.plan || 'paid',
        token: response.token,
        expiresAt: response.expiresAt,
        activatedAt: new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
        licenseKeyLast4: trimmedLicenseKey.slice(-4),
        deviceId: await this.getOrCreateDeviceId(),
      };

      await this.persistEntitlement(entitlement);
      this.centralService.isPremium = this.isPaidEntitlementValid(entitlement);

      return {
        success: this.centralService.isPremium,
        message: this.centralService.isPremium
          ? 'Activation successful!'
          : 'Activation succeeded but entitlement is not valid.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.error?.message || error?.message || 'Activation request failed.',
      };
    }
  }

  openCheckoutPage() {
    const checkoutUrl = environment.payment?.checkoutUrl;
    if (!checkoutUrl) {
      return;
    }

    window.open(checkoutUrl, '_blank');
  }

  isTrialRestricted(): boolean {
    return environment.trialMode && !this.centralService.isPremium;
  }

  getVideoLimit(): number {
    if (this.isTrialRestricted()) {
      return environment.trialLimits.maxVideos;
    }

    return environment.fullLimits.maxVideos;
  }

  getNotesPerVideoLimit(): number {
    if (this.isTrialRestricted()) {
      return environment.trialLimits.maxNotesPerVideo;
    }

    return Number.MAX_SAFE_INTEGER;
  }

  private async persistEntitlement(entitlement: EntitlementState): Promise<void> {
    const appSettings = await firstValueFrom(this.storageService.getAppSettings());
    const nextSettings = {
      ...(appSettings && typeof appSettings === 'object' ? appSettings : {}),
      entitlement,
    };
    await firstValueFrom(this.storageService.saveAppSettings(nextSettings));
  }

  private isPaidEntitlementValid(entitlement: EntitlementState | undefined): boolean {
    if (!entitlement || entitlement.plan !== 'paid') {
      return false;
    }

    if (!entitlement.expiresAt) {
      return true;
    }

    const expiryTime = Date.parse(entitlement.expiresAt);
    if (Number.isNaN(expiryTime)) {
      return false;
    }

    return expiryTime > Date.now();
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const existingId = localStorage.getItem(this.deviceIdKey);
    if (existingId) {
      return existingId;
    }

    const generatedId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(this.deviceIdKey, generatedId);
    return generatedId;
  }

  private getEntitlementApiBaseUrl(): string {
    return (environment.payment?.entitlementApiBaseUrl || '').trim();
  }

  private shouldRevalidateNow(entitlement: EntitlementState): boolean {
    const revalidateIntervalDays = environment.payment?.revalidateIntervalDays ?? 7;
    const lastValidatedAt = entitlement.lastValidatedAt || entitlement.activatedAt;
    if (!lastValidatedAt) {
      return true;
    }

    const lastValidatedMs = Date.parse(lastValidatedAt);
    if (Number.isNaN(lastValidatedMs)) {
      return true;
    }

    const dueMs = revalidateIntervalDays * 24 * 60 * 60 * 1000;
    return (Date.now() - lastValidatedMs) >= dueMs;
  }

  private isWithinOfflineGrace(entitlement: EntitlementState): boolean {
    const offlineGraceDays = environment.payment?.offlineGraceDays ?? 30;
    const anchorTime = entitlement.lastValidatedAt || entitlement.activatedAt;
    if (!anchorTime) {
      return false;
    }

    const anchorMs = Date.parse(anchorTime);
    if (Number.isNaN(anchorMs)) {
      return false;
    }

    const graceWindowMs = offlineGraceDays * 24 * 60 * 60 * 1000;
    return (Date.now() - anchorMs) <= graceWindowMs;
  }

  private isOnline(): boolean {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  }

  private startOnlineRevalidationWatcher() {
    if (typeof window === 'undefined' || this.revalidationTimerId !== null) {
      return;
    }

    window.addEventListener('online', () => {
      this.refreshAuthorizationIfDue().catch(() => {
        // Keep current mode on background refresh failures.
      });
    });

    const intervalMs = 6 * 60 * 60 * 1000;
    this.revalidationTimerId = window.setInterval(() => {
      this.refreshAuthorizationIfDue().catch(() => {
        // Keep current mode on background refresh failures.
      });
    }, intervalMs);
  }

  private async downgradeToTrial(currentEntitlement: EntitlementState, reason: string): Promise<void> {
    const downgradedEntitlement: EntitlementState = {
      ...currentEntitlement,
      plan: 'trial',
      revokedAt: new Date().toISOString(),
      revocationReason: reason,
    };

    await this.persistEntitlement(downgradedEntitlement);
    this.centralService.isPremium = false;
  }
}
