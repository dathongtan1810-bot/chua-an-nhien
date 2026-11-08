import { describe, expect, it } from 'vitest';
import { missingKeys, setLang, t } from '../src/core/i18n';

describe('i18n', () => {
  it('đủ khóa tiếng Anh', () => expect(missingKeys()).toEqual([]));
  it('thay biến và fallback', () => {
    setLang('vi');
    expect(t('hud.online', { n: 12 })).toBe('Đang có 12 người viếng chùa');
    setLang('en');
    expect(t('hud.online', { n: 3 })).toBe('3 people visiting now');
    expect(t('no.such')).toBe('no.such');
    setLang('vi');
  });
});
