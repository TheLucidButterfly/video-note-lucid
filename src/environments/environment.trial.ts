export enum uploadModes {
    pathed = 'pathed',
    saved = 'saved'
}

export const environment = {
    production: true,
    appTitle: 'Vide-note (Trial)',
    enableSettingsPage: false,
    uploadMode: uploadModes.pathed,
    allowUrlInput: false,
    fullLimits: {
        maxVideos: 100,
    },
    trialMode: true,
    trialLimits: {
        maxVideos: 2,
        maxNotesPerVideo: 30,
    },
    payment: {
        checkoutUrl: 'https://buy.stripe.com/test_14A14p3w2e8IdDm5my8Ra00',
        entitlementApiBaseUrl: '',
        revalidateIntervalDays: 7,
        offlineGraceDays: 30,
    },
    devFlagNoteInjectorStressTest: {
        enabled: false,
        mockNotesTargetCount: 120,
    },
};
