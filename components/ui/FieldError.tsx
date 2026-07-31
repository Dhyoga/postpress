export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="field__error" role="alert">
      {message}
    </p>
  );
}
