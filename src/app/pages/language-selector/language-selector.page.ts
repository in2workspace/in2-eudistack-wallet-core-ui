import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule,TranslateService } from '@ngx-translate/core';
import { StorageService } from 'src/app/services/storage.service';
import { BehaviorSubject, distinctUntilChanged, map, shareReplay } from 'rxjs';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.page.html',
  styleUrls: ['./language-selector.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule,TranslateModule]
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class LanguageSelectorPage implements OnInit {
  public translate = inject(TranslateService);

  public selected = { name: '', code: '' };
  public language = { name: '', code: '' };
  public languages = new BehaviorSubject<unknown>('');

  public languageList = [
    {
      name: 'English',
      code: 'en',
    },
    {
      name: 'Castellano',
      code: 'es',
    },
    {
      name: 'Català',
      code: 'ca',
    },
  ];

  public languageSelected = this.languages.pipe(
    map((device) => {
      let lang = {};
      this.languageList.forEach((language) => {
        if (language.code === device) {
          lang = language;
        }
      });
      return lang;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  private storageService = inject(StorageService);


  public ngOnInit() {
    this.storageService.get('language').then((datos) => {
      this.languages.next(datos);
    });
    const lang = this.languageList.forEach((language) => {
      if (language.code === this.translate.currentLang) {
        this.selected = language;
      }
    });
    if (lang != undefined) this.selected = lang;
    if (this.translate.currentLang == undefined)
      this.selected = this.languageList[2];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public languageChange(code: any) {
    this.translate.use(code.code);
    this.storageService.set('language', code.code);
  }
}
