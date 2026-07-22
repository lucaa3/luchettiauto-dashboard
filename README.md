# Luchetti Auto - Admin Dashboard

This is the private Content Management System (CMS) for the Luchetti Auto platform. It provides a secure interface for authorized users to manage the live vehicle inventory.

For the public storefront and full architecture details, check out the [Main Luchetti Auto Repository](https://github.com/lucaa3/luchettiauto).

## Tech Stack
* **Frontend:** HTML5, CSS3 (Bootstrap), Vanilla JavaScript
* **Backend & Database:** Supabase (PostgreSQL)
* **Authentication:** Supabase Auth

## Features
* **Authentication:** Protected login gateway. Public sign-ups are disabled at the database level.
* **Inventory Management:** Full CRUD operations (Create, Read, Update, Delete) to manage vehicles in the live PostgreSQL database.
* **Live Sync:** Database changes reflect instantly on the public-facing website.

## Security
Security is handled at the database level rather than relying on frontend obscurity:
* **Row Level Security (RLS):** Write, update, and delete actions require a valid authentication token.
* **Parameterized Queries:** All database interactions happen via Supabase's PostgREST API, preventing SQL injection.

## Local Setup
To run this dashboard locally, link it to your own Supabase instance:
1. Clone the repository.
2. Create a configuration file (e.g., `config.js`) in your root directory.
3. Add your Supabase environment variables:
   ```javascript
   const SUPABASE_URL = 'your-project-url';
   const SUPABASE_KEY = 'your-anon-key';
   ```
4. Open index.html in your browser or run it via a local development server.
