import { colors, fontAssets, fontFamilies, textStyle } from './index';

describe('theme', () => {
  it('re-exports the shared brand tokens', () => {
    expect(colors.sunny).toBe('#FFC93C');
    expect(colors.night).toBe('#160C3A');
  });

  it('loads a font asset for every font family', () => {
    for (const family of Object.values(fontFamilies)) {
      expect(fontAssets[family]).toBeDefined();
    }
  });

  it('builds text styles from roles', () => {
    expect(textStyle('label')).toEqual({
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      letterSpacing: 12 * 0.07,
      textTransform: 'uppercase',
    });
    expect(textStyle('wordmark').lineHeight).toBe(56);
  });
});
