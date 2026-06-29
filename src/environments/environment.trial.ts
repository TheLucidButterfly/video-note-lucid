export enum uploadModes {
    pathed = 'pathed',
    saved = 'saved'
}

export const environment = {
    production: true,
    appTitle: 'Vide-note (Trial)',
    uploadMode: uploadModes.pathed,
    trialMode: true,
    trialLimits: {
        maxVideos: 2,
        maxNotesPerVideo: 5,
    },
};
