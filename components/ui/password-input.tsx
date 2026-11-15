"use client";

import * as React from "react";
import { Ornament } from "@/components/site/ornament";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const { t } = useI18n();

    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-pressed={showPassword}
        >
          {/* Spectacles: read the password; struck through while it is shown, to hide it again. */}
          <span className="relative inline-flex" aria-hidden="true">
            <Ornament name="spectacles" className="h-[0.85rem] [--ornament-ink:currentColor]" />
            {showPassword && (
              <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-[25deg] bg-current" />
            )}
          </span>
          <span className="sr-only">
            {showPassword ? t.common.hidePassword : t.common.showPassword}
          </span>
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };