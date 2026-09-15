import { Select } from 'reshaped';
import * as m from '../../../paraglide/messages.js';
import { getLocale, setLocale } from '../../../paraglide/runtime.js';
import styles from './Shell.module.css';

type LanguageChange = {
  name: string;
  value: string;
};

export function LanguageSwitcher() {
  const currentLocale = getLocale();
  const changeLanguage = ({ value }: LanguageChange) => {
    if (value === 'en' || value === 'ru') {
      void setLocale(value);
    }
  };

  return (
    <Select
      className={styles['languageSelect']}
      inputAttributes={{ 'aria-label': m.language() }}
      name="language"
      onChange={changeLanguage}
      size="medium"
      value={currentLocale}
    >
      <option value="en">🇬🇧 English</option>
      <option value="ru">🇷🇺 Русский</option>
    </Select>
  );
}
