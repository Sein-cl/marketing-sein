# Cloudflare D1 Database Setup

This project uses Cloudflare D1 as its database.

## Prerequisites

*   Cloudflare Account
*   Node.js and npm installed
*   Wrangler CLI installed and configured (`npm install -g wrangler`)

## Steps:

1.  **Create a D1 Database in Cloudflare Dashboard**:
    *   Navigate to your Cloudflare Dashboard.
    *   Go to **Workers & Pages** -> **D1**.
    *   Click **Create database**.
    *   Enter a database name (e.g., `certificate-manager-db`) and select a location.
    *   Note down the **Database ID** and the **Database Name**.

2.  **Update `wrangler.toml`**:
    *   Open the `wrangler.toml` file located in the project root.
    *   Locate or add the `[[d1_databases]]` section.
    *   Update it as follows, replacing placeholders with your actual D1 database details:

        ```toml
        [[d1_databases]]
        binding = "DB" # This is how your Worker will access the DB (e.g., env.DB)
        database_name = "YOUR_DATABASE_NAME" # e.g., certificate-manager-db
        database_id = "YOUR_ACTUAL_DATABASE_ID"
        preview_database_id = "YOUR_PREVIEW_DATABASE_ID" # Often same as database_id or a separate one for previews
        migrations_dir = "src/worker/migrations"
        ```

3.  **Update `package.json` Database Scripts (If Necessary)**:
    *   Open `package.json`.
    *   In the `"scripts"` section, review `db:migrate` and `db:migrate:prod`.
    *   If your D1 database name (from step 1) is different from `certificate-manager-db` used in the scripts, update them accordingly:
        ```json
        "db:migrate": "wrangler d1 migrations apply YOUR_DATABASE_NAME --local",
        "db:migrate:prod": "wrangler d1 migrations apply YOUR_DATABASE_NAME"
        ```

4.  **Run Database Migrations**:
    *   Migrations define the database schema. They are located in `src/worker/migrations/`.
    *   To apply migrations to your **local development D1 database** (simulated by Wrangler when you run `npm run dev`):
        ```bash
        npm run db:migrate
        ```
    *   To apply migrations to your **production D1 database** (the actual one on Cloudflare):
        ```bash
        npm run db:migrate:prod
        ```
        (Ensure you are logged into Wrangler and have selected the correct Cloudflare account).

## Development Workflow

*   Run `npm run dev` to start the local development server. Wrangler will use a local version of your D1 database (persisted in `.wrangler/state/d1/`) and apply migrations from `src/worker/migrations/`.
*   Any changes to migration files require re-running `npm run db:migrate` for local development if the local D1 instance was already created.
