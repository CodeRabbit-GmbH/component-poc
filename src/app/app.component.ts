import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ngModel';
  disabled = false;

  fb = inject(FormBuilder).nonNullable.group({
    title: ['formControlName'],
  });
  formControl = new FormControl('formControl', {nonNullable: true});
}
