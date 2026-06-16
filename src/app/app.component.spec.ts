import { AppComponent } from './app.component';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

describe('AppComponent', () => {
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;
  let cookieServiceSpy: jasmine.SpyObj<CookieService>;

  beforeEach(async () => {
    translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'addLangs', 'use', 'getBrowserLang', 'setDefaultLang',
    ], {
      onLangChange: { subscribe: () => {} },
    });
    translateServiceSpy.getBrowserLang.and.returnValue('en');

    cookieServiceSpy = jasmine.createSpyObj('CookieService', ['get', 'set']);
    cookieServiceSpy.get.and.returnValue('');

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: CookieService, useValue: cookieServiceSpy },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
