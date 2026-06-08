type SignOutFormProps = {
  className?: string;
  buttonClassName?: string;
};

export function SignOutForm({ buttonClassName, className }: SignOutFormProps) {
  return (
    <form action="/account/logout" className={className} method="post">
      <button className={buttonClassName} type="submit">
        Sign out / 登出
      </button>
    </form>
  );
}
