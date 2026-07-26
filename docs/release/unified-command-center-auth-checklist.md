# Unified Command Center verification checklist

- `/commandcenter` shows only the dedicated Command Center email/password form when signed out.
- Successful dedicated authentication opens the full Command Center without `/login`, `/control-login`, MFA enrollment, or a second password prompt.
- `/admin`, `/control`, `/control-login`, and `/control-invite` redirect to `/commandcenter`.
- Wrong credentials and inactive/non-owner dedicated accounts fail closed.
- The bridge accepts only an allowed JALVORO origin and a valid dedicated owner token.
- The production Admin session resolves to the same normalized email.
- Global Overview, Global Operations, Organizations, and Icon System render through `/commandcenter` paths.
- Private responses remain no-store and noindex.
- Normal public website and customer authentication continue to work unchanged.
