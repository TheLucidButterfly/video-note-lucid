export enum uploadModes {
    pathed = 'pathed',
    saved = 'saved'
}  

export const environment = {
    production: false,
    appTitle: 'My Angular App (Development)',
    enableSettingsPage: false,
    uploadMode: uploadModes.pathed,
    allowUrlInput: false,
    fullLimits: {
        maxVideos: 100,
    },
    trialMode: false,
    trialLimits: {
        maxVideos: Number.MAX_SAFE_INTEGER,
        maxNotesPerVideo: Number.MAX_SAFE_INTEGER,
    },
    devFlagNoteInjectorStressTest: {
        enabled: false,
        mockNotesTargetCount: 120,
    },
};
