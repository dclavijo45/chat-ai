import { HttpClient } from "@angular/common/http";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

/**
 * @description This function is used to load the translations from the assets folder
 * @param http HttpClient instance to make the request
 */
export const httpLoaderFactory: (http: HttpClient) => TranslateHttpLoader = (
    http: HttpClient
) => new TranslateHttpLoader(http, './assets/i18n/', '.json');
