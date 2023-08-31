import {
  AfterContentInit,
  ChangeDetectorRef,
  ContentChild,
  DestroyRef,
  Directive,
  ElementRef,
  Input,
  Output,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NgModel, FormControlName, FormControlDirective } from "@angular/forms";
import { BehaviorSubject, Observable, from, fromEvent, map, tap } from "rxjs";

@Directive({
  selector: "[ivuValueChangedHook]",
  standalone: true,
  exportAs: "ivuValueChangedHook",
})
export class ValueChangedHookDirective implements AfterContentInit {
  // We get the NgModel injected when the user uses [(ngModel)]="...".
  @ContentChild(NgModel)
  private ngModel: NgModel | undefined;

  // We get the FormControlName injected when the user uses formControlName="...".
  @ContentChild(FormControlName)
  private formControlName: FormControlName | undefined;

  // We get the FormControlDirective injected when the user uses [formControl]="...".
  @ContentChild(FormControlDirective)
  private formControl: FormControlDirective | undefined;

  private valueChangesSubject = new BehaviorSubject<string>("");
  @Output()
  valueChange = this.valueChangesSubject.asObservable();

  @Input()
  set value(value: string) {
    if (this.input === undefined) {
      return;
    }
    this.input.value = value;
    this.valueChangesSubject.next(value);
    this.verifyInput(value);
  }

  private elementRef = inject(ElementRef);
  private input: HTMLInputElement | undefined;
  private inputObserver: MutationObserver | undefined;
  private destroyRef = inject(DestroyRef);
  private cdRef = inject(ChangeDetectorRef);
  private takeUntilDestroyed$ = takeUntilDestroyed();

  // We need to use a protected property here, because we want to use it in the template.
  disabled = false;

  // This is a derived property based on the input value.
  inputHasValue = false;

  ngAfterContentInit(): void {
    // Instead of using ContentChild we query the DOM directly.
    this.input = this.elementRef.nativeElement.querySelector("input, textarea");
    if (this.input) {
      this.input.classList.add("ivu-input-v1");

      this.disabled = this.input.disabled;
      this.inputHasValue = this.input.value !== "";

      // We need to hook into the value changes of the input element.
      // For the initial value we need to use the value of the input element.
      // Only valid for ReactiveForms, TemplateDrivenForms (ngModel) are delayed by one tick
      // so the will call the valueChanges$ observable with their initial value.
      this.valueChangesSubject.next(this.input.value);
      this.verifyInput(this.input.value);
      this.hookIntoValueChanges();

      // We need to hook into the disabled changes of the input element.
      this.inputObserver = new MutationObserver((mutationList, observer) => {
        this.mutationCallback(mutationList, observer);
      });

      this.inputObserver.observe(this.input, {
        attributeFilter: ["disabled", "ng-reflect-is-disabled"],
      });

      this.destroyRef.onDestroy(() => {
        this.inputObserver?.disconnect();
      });
    }
  }

  /**
   * This method hooks into the value changes of the input element.
   * We need to use the valueChanges$ observable of the NgModel, FormControl or FormControlName.
   */
  private hookIntoValueChanges() {
    let valueChanges: Observable<unknown> | null | undefined = null;
    if (
      this.ngModel === undefined &&
      this.formControl === undefined &&
      this.formControlName === undefined &&
      this.input !== undefined
    ) {
      valueChanges = fromEvent(this.input, "keyup").pipe(
        map((event) => (event.target as HTMLInputElement).value)
      );
    } else {
      valueChanges =
        this.ngModel?.valueChanges ||
        this.formControl?.valueChanges ||
        this.formControlName?.valueChanges;
    }

    valueChanges
      ?.pipe(
        this.takeUntilDestroyed$,
        tap((value) => {
          if (typeof value === "string") {
            this.valueChangesSubject.next(value);
          }
        })
      )
      .subscribe((value) => this.verifyInput(value));
  }

  /**
   * This method is called when the user clicks on the clear icon.
   * Its import that we dispatch an input event, so Angular knows that the value has changed.
   */
  clearContent() {
    if (this.input) {
      this.input.value = "";
      this.valueChangesSubject.next("");
      this.input.dispatchEvent(new Event("input"));
    }
  }

  /**
   * Here we verify the input value and set the showClearIcon and textCounter properties.
   * @param value The value of the input element.
   */
  private verifyInput(value: unknown) {
    this.inputHasValue = value !== "";
    this.cdRef.markForCheck();
  }

  private mutationCallback(
    mutationList: MutationRecord[],
    observer: MutationObserver
  ) {
    for (const mutation of mutationList) {
      this.disabled = false;
      if (mutation.attributeName === "disabled") {
        this.disabled = this.input?.disabled === true;
        // Reactive forms do not use the disabled state see --> https://github.com/angular/angular/issues/48350
        // We need to use the attribute "ng-reflect-is-disabled" instead.
      } else if (mutation.attributeName === "ng-reflect-is-disabled") {
        this.disabled =
          this.input?.getAttribute("ng-reflect-is-disabled") === "true";
      }

      if (this.disabled) {
        this.input?.classList.add("ivu-textfield-disabled");
      } else {
        this.input?.classList.remove("ivu-textfield-disabled");
      }
    }
    this.cdRef.markForCheck();
  }
}
