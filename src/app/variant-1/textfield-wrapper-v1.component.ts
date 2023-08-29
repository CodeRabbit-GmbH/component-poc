import { NgClass, NgIf } from "@angular/common";
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DestroyRef,
  ElementRef,
  Input,
  ViewEncapsulation,
  inject,
} from "@angular/core";
import { FormControlDirective, FormControlName, NgModel } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: "ivu-textfield-wrapper-v1",
  template: `
    <div [class]="uiState">
      <label
        *ngIf="!hideLabel"
        class="ivu-label-v1"
        [class.disabled]="disabled"
        >{{ label }}</label
      >
      <div class="relative mt-0">
        <ng-content select="input"></ng-content>
        <div
          *ngIf="showClearIcon && !disabled"
          (click)="clearContent()"
          class="ivu-clear-icon"
        >
          X
        </div>

        <span
          *ngIf="showTextCounter"
          class="absolute right-0 text-xs pr-0.5 text-gray-400"
          >{{ textCounter }}</span
        >
      </div>
      <p *ngIf="validationMessage" class="text-sm text-red-600">
        {{ validationMessage }}
      </p>
    </div>
  `,
  styles: [
    `
      .ivu-clear-icon {
        @apply absolute
          inset-y-0
          right-0
          flex
          items-center
          pr-3
          cursor-pointer
          select-none;
      }
      .ivu-label-v1 {
        @apply block
          text-sm
          font-medium
          leading-6
          text-gray-900
          select-none;
      }
      .ivu-label-v1.disabled {
        @apply text-gray-400;
      }
      .ivu-input-v1 {
        @apply block
          w-full
          border
          border-gray-700
          py-1.5
          px-3
          text-gray-900
          bg-gray-50
          placeholder:text-gray-400;
      }
      .ivu-input-v1:hover {
        @apply bg-blue-100;
      }
      .ivu-input-v1:disabled,
      input[ng-reflect-is-disabled="true"] {
        @apply bg-gray-300 text-gray-400 border-gray-400 select-none;
      }
      div.error label,
      div.error .ivu-input-v1:not(.ivu-textfield-disabled) {
        @apply border-red-600 text-red-600;
      }
      div.success label,
      div.success .ivu-input-v1:not(.ivu-textfield-disabled) {
        @apply border-green-600 text-green-600;
      }
    `,
  ],
  standalone: true,
  imports: [NgIf, NgClass],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextfieldWrapperV1Component implements AfterContentInit {
  // We get the NgModel injected when the user uses [(ngModel)]="...".
  @ContentChild(NgModel) ngModel: NgModel | undefined;

  // We get the FormControlName injected when the user uses formControlName="...".
  @ContentChild(FormControlName) formControlName: FormControlName | undefined;

  // We get the FormControlDirective injected when the user uses [formControl]="...".
  @ContentChild(FormControlDirective) formControl:
    | FormControlDirective
    | undefined;

  @Input() label: string | undefined;
  @Input() hideLabel: boolean | undefined;
  @Input() showTextCounter: boolean | undefined = true;
  @Input() textCounter: string | undefined;
  @Input() maxLength = 100;
  @Input() validationMessage: string | undefined;
  @Input() uiState: undefined | "error" | "success";

  // We need to use a protected property here, because we want to use it in the template.
  protected disabled = false;

  // This is a derived property based on the input value.
  protected showClearIcon = false;

  private elementRef = inject(ElementRef);
  private input: HTMLInputElement | undefined;
  private inputObserver: MutationObserver | undefined;
  private destroyRef = inject(DestroyRef);
  private cdRef = inject(ChangeDetectorRef);
  private takeUntilDestroyed$ = takeUntilDestroyed();

  ngAfterContentInit(): void {
    // Instead of using ContentChild we query the DOM directly.
    this.input = this.elementRef.nativeElement.querySelector("input, textarea");
    if (this.input) {
      this.input.classList.add("ivu-input-v1");

      this.disabled = this.input.disabled;
      this.showClearIcon = this.input.value !== "";

      // We need to hook into the value changes of the input element.
      // For the initial value we need to use the value of the input element.
      // Only valid for ReactiveForms, TemplateDrivenForms (ngModel) are delayed by one tick
      // so the will call the valueChanges$ observable with their initial value.
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
   * This method is called when the user clicks on the clear icon.
   * Its import that we dispatch an input event, so Angular knows that the value has changed.
   */
  protected clearContent() {
    if (this.input) {
      this.input.value = "";
      this.input.dispatchEvent(new Event("input"));
    }
  }

  /**
   * This method hooks into the value changes of the input element.
   * We need to use the valueChanges$ observable of the NgModel, FormControl or FormControlName.
   */
  private hookIntoValueChanges() {
    const valueChanges =
      this.ngModel?.valueChanges ||
      this.formControl?.valueChanges ||
      this.formControlName?.valueChanges;
    valueChanges
      ?.pipe(this.takeUntilDestroyed$)
      .subscribe((value) => this.verifyInput(value));
  }

  /**
   * Here we verify the input value and set the showClearIcon and textCounter properties.
   * @param value The value of the input element.
   */
  private verifyInput(value: unknown) {
    this.showClearIcon = value !== "";

    if (typeof value === "string") {
      this.textCounter =
        value.length + (this.maxLength > 0 ? " / " + this.maxLength : "");
    }
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
