import { MinutesFormatPipe } from './minutes-format.pipe';

describe('MinutesFormatPipe', () => {
  let pipe: MinutesFormatPipe;

  beforeEach(() => { pipe = new MinutesFormatPipe(); });

  it('formats seconds under a minute', () => {
    expect(pipe.transform('45')).toBe('0:45');
  });

  it('pads single-digit seconds with a leading zero', () => {
    expect(pipe.transform('5')).toBe('0:05');
  });

  it('formats seconds over a minute', () => {
    expect(pipe.transform('90')).toBe('1:30');
  });

  it('formats exactly one minute', () => {
    expect(pipe.transform('60')).toBe('1:00');
  });

  it('formats zero', () => {
    expect(pipe.transform('0')).toBe('0:00');
  });
});
