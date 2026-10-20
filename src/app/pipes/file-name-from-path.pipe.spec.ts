import { FileNameFromPathPipe } from './file-name-from-path.pipe';

describe('FileNameFromPathPipe', () => {
  let pipe: FileNameFromPathPipe;

  beforeEach(() => { pipe = new FileNameFromPathPipe(); });

  it('extracts the file name from a Unix path', () => {
    expect(pipe.transform('/Users/foo/videos/my-video.mp4')).toBe('my-video.mp4');
  });

  it('returns just the name when there is no directory', () => {
    expect(pipe.transform('my-video.mp4')).toBe('my-video.mp4');
  });

  it('returns null for an empty string', () => {
    expect(pipe.transform('')).toBeNull();
  });

  it('handles a path ending with a slash', () => {
    expect(pipe.transform('/Users/foo/')).toBeNull();
  });
});
