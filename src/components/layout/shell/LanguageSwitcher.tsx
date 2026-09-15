import * as m from '../../../paraglide/messages.js';
import { getLocale, setLocale } from '../../../paraglide/runtime.js';
import { Button } from '../../ui/button/Button';
import styles from './Shell.module.css';

export function LanguageSwitcher() {
  const currentLocale = getLocale();
  const nextLocale = currentLocale === 'en' ? 'ru' : 'en';
  const accessibleLabel = nextLocale === 'ru' ? m.switch_to_russian() : m.switch_to_english();
  const switchLanguage = async () => {
    await setLocale(nextLocale);
  };

  return (
    <Button
      ariaLabel={accessibleLabel}
      onClick={() => void switchLanguage()}
      size="icon"
      type="button"
      variant="secondary"
    >
      <span aria-hidden="true" className={styles['languageFlag']}>
        {nextLocale === 'ru' ? '🇷🇺' : '🇬🇧'}
      </span>
    </Button>
  );
}
