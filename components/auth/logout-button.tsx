export function LogoutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button
        className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
        type="submit"
      >
        Log out
      </button>
    </form>
  );
}

