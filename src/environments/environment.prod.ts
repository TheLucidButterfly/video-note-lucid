export enum uploadModes {
    pathed = 'pathed',
    saved = 'saved'
}

export const environment = {
    production: true,
    appTitle: 'Vide-note',
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
