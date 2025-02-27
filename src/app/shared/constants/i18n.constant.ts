import { I18nLanguage } from '../interfaces/i18n.model';

export class i18nConstant {
  /**
   * @description Supported languages list
   */
  public static readonly LANGUAGES: I18nLanguage[] = [
    {
      code: 'en',
      name: 'English',
    },
    {
      code: 'es',
      name: 'Español',
    },
  ];

  /**
   * @description Default language
   */
  public static readonly DEFAULT_LANGUAGE: I18nLanguage = this.LANGUAGES[0];

  /**
   * @description Language storage key
   */
  public static readonly LANGUAGE_STORAGE_KEY: string = 'lang';
}
