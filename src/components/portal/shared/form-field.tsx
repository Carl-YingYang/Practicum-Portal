"use client";
import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger } from "@/components/ui/select";
interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}
/** Shared account field with an actual label/control association. */
export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: FieldProps) {
  const id = React.useId();
  let control = children;
  if (
    React.isValidElement<{ id?: string; children?: React.ReactNode }>(children)
  ) {
    if (children.type === Select)
      control = React.cloneElement(
        children,
        {},
        React.Children.map(children.props.children, (child) =>
          React.isValidElement<{ id?: string }>(child) &&
          child.type === SelectTrigger
            ? React.cloneElement(child, { id })
            : child,
        ),
      );
    else control = React.cloneElement(children, { id });
  }
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5">
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {control}
      {hint && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-1 flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
