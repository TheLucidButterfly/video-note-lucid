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
    devFlagNoteInjectorStressTest: {
        enabled: false,
        mockNotesTargetCount: 120,
    },
};
