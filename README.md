# Luchetti Auto Admin Dashboard

Private inventory-management dashboard for the Luchetti Auto platform. The administrator can create, edit, publish, unpublish, and delete vehicle listings, including managing their photos.

For the public storefront and full architecture details, check out the [Main Luchetti Auto Repository](https://github.com/lucaa3/luchettiauto).

## Built with

- HTML, CSS, and vanilla JavaScript
- Supabase Auth, PostgreSQL, and Storage

## Features

- Password-authenticated admin access with TOTP MFA
- Vehicle inventory management, including visibility controls and image uploads
- Supabase-backed data used by the public storefront

## Security

Vehicle access is enforced with Supabase Row Level Security. In the current deployment, public sign-ups are disabled and only trusted administrator accounts are provisioned; write policies apply to authenticated accounts. The dashboard can view hidden listings, while the public storefront displays only vehicles marked visible.

Vehicle changes can be recorded in the private dashboard activity feed. To enable it, run [`audit-log.sql`](./audit-log.sql) in the Supabase SQL Editor. The database trigger records inserts, updates, and deletes, including changed vehicle fields and the acting account's email; the log table denies anonymous access and allows authenticated reads. Since this policy treats every authenticated account as an administrator, keep public sign-ups disabled and only provision trusted accounts.

To add another manager, keep public sign-ups disabled and invite or create a separate user for their email in Supabase Auth. Have them set their own password through the invitation rather than sharing credentials. Dashboard users must enroll in TOTP MFA on first sign-in. Remove their Auth user to revoke their dashboard access. This dashboard does not currently provide a password-reset form; use Supabase Auth's account recovery tools.

### Multi-factor authentication

Enable TOTP (App Authenticator) and verification in Supabase Auth settings. The dashboard prompts the admin to enroll an authenticator at the next sign-in, and challenges for a code on subsequent sign-ins. First run [`audit-log.sql`](./audit-log.sql), then run [`mfa-enforcement.sql`](./mfa-enforcement.sql) in the Supabase SQL Editor to require AAL2 for authenticated access to the dashboard's vehicle data, preview session, audit log, and vehicle image bucket. The migration adds restrictive policies and keeps existing policies in place; anonymous storefront reads remain unaffected. Test admin CRUD, preview, and image uploads after applying it.

## Local Setup

To run the dashboard with your own Supabase project:

1. Clone this repository.
2. In `dashboard.js`, set `supabaseUrl` and `supabaseKey` to your project URL and browser-safe publishable (or anon) key:
   ```javascript
   const supabaseUrl = "your-project-url"
   const supabaseKey = "your-publishable-or-anon-key"
   ```
3. Configure Supabase Auth, the database and Storage policies, and Turnstile for your project. Do not put a service-role or secret key in browser code.
4. Serve `index.html` from a local development server.
