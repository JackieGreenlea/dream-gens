import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, hint, className, children }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-3", className)}>
      <div className="space-y-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-11 rounded-lg border border-fieldBorder bg-field px-3.5 text-sm text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-32 rounded-lg border border-fieldBorder bg-field px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "min-h-11 rounded-lg border border-fieldBorder bg-field px-3.5 text-sm text-foreground focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}
