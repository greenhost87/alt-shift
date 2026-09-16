import { Select } from 'reshaped';
import * as m from '../../../paraglide/messages.js';
import { getLocale, setLocale } from '../../../paraglide/runtime.js';
import styles from './Shell.module.css';

type LanguageChange = {
  name: string;
  value: string;
};

type LanguageValue = {
  value: string;
};

function renderLanguageValue({ value }: LanguageValue) {
  return <span aria-label={m.language()}>{value === 'ru' ? '🇷🇺' : '🇬🇧'}</span>;
}

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
      renderValue={renderLanguageValue}
      size="medium"
      value={currentLocale}
      width="max-content"
    >
      <Select.Option value="en">🇬🇧 English</Select.Option>
      <Select.Option value="ru">🇷🇺 Русский</Select.Option>
    </Select>
  );
}
