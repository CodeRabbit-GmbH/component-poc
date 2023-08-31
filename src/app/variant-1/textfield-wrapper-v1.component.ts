import { NgClass, NgIf } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  ViewEncapsulation,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ValueChangedHookDirective } from "./value-changed-hook.directive";

@Component({
  selector: "ivu-textfield-wrapper-v1",
  templateUrl: "./textfield-wrapper-v1.component.html",
  styleUrls: ["./textfield-wrapper-v1.component.css"],
  standalone: true,
  imports: [NgIf, NgClass],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ValueChangedHookDirective],
})
export class TextfieldWrapperV1Component {
  @Input() label: string | undefined;
  @Input() hideLabel: boolean | undefined;
  @Input() showTextCounter: boolean | undefined = true;
  @Input() textCounter: string | undefined;
  @Input() maxLength = 100;
  @Input() validationMessage: string | undefined;
  @Input() uiState: undefined | "error" | "success";

  protected readonly valueChangedHookDirective = inject(
    ValueChangedHookDirective,
    { self: true }
  );

  @Output()
  valueChange = this.valueChangedHookDirective.valueChange;

  @Input()
  set value(value: string) {
    this.valueChangedHookDirective.value = value;
  }

  protected get showClearIcon(): boolean {
    return (
      this.valueChangedHookDirective.inputHasValue &&
      !this.valueChangedHookDirective.disabled
    );
  }

  constructor() {
    this.valueChangedHookDirective.valueChange
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.verifyInput(value);
      });
  }

  private verifyInput(value: string): void {
    if (typeof value === "string") {
      this.textCounter =
        value.length + (this.maxLength > 0 ? " / " + this.maxLength : "");
    }
  }
}
