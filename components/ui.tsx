export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }) {
  const { className = '', variant = 'primary', ...rest } = props;
  const base = 'btn';
  const variantCls = variant === 'primary' ? 'btn-primary' : '';
  return <button className={`${base} ${variantCls} ${className}`} {...rest} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`input ${className}`} {...rest} />;
}
