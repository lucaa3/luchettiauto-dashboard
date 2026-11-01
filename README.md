# Luchetti Auto Admin Dashboard

Private inventory-management dashboard for the Luchetti Auto platform. The administrator can create, edit, publish, unpublish, and delete vehicle listings, including managing their photos.

For the public storefront and full architecture details, check out the [Main Luchetti Auto Repository](https://github.com/lucaa3/luchettiauto).

## Built with

- HTML, CSS, and vanilla JavaScript
- Supabase Auth, PostgreSQL, and Storage

## Features

- Password-authenticated admin access
- Vehicle inventory management, including visibility controls and image uploads
- Supabase-backed data used by the public storefront

## Security

Vehicle access is enforced with Supabase Row Level Security. In the current deployment, public sign-ups are disabled and only the administrator account is provisioned; write policies apply to authenticated accounts. The dashboard can view hidden listings, while the public storefront displays only vehicles marked visible.

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
