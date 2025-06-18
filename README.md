# Digital Certificate Management Platform

## 1. Project Overview

This project is a Digital Certificate Management Platform built using a modern, serverless-first technology stack. It allows users to manage their domains, issue DV (Domain Validated) certificates via ACME (Let's Encrypt), and provides a foundation for future certificate discovery and monitoring features. The backend is powered by Cloudflare Workers and Hono, with D1 for database storage, while the frontend is a React application built with Vite.

This template was initially based on the "React + Vite + Hono + Cloudflare Workers" template but has been significantly extended.

## 2. Key Features

*   **User Authentication**: Secure user registration and login.
*   **Domain Management**: Users can add, view, and delete their domains.
*   **DV Certificate Issuance**: Automated DV certificate issuance using ACME protocol (Let's Encrypt Staging environment) for managed domains.
*   **Certificate Listing**: View issued certificates for managed domains.
*   **Modern Frontend**: A React-based UI built with Vite for a smooth user experience.
*   **Serverless Backend**: Scalable and efficient backend using Cloudflare Workers and Hono.
*   **Database**: Data persistence using Cloudflare D1.
*   **Testing**: Unit and integration tests for both backend and frontend using Vitest.
*   **Placeholder Features**:
    *   Certificate Discovery (`/api/discovery/*`): Endpoints and database table are set up as placeholders for future implementation of discovering publicly visible certificates.

## 3. Tech Stack

*   **Backend**:
    *   Cloudflare Workers: Serverless execution environment.
    *   Hono: Ultrafast web framework for Cloudflare Workers.
    *   Cloudflare D1: Serverless SQL database.
    *   `acme-client`: For interacting with ACME CAs (e.g., Let's Encrypt).
    *   `bcryptjs`: For password hashing.
*   **Frontend**:
    *   React: JavaScript library for building user interfaces.
    *   Vite: Fast build tool and development server for modern web projects.
    *   `react-router-dom`: For client-side routing.
*   **Testing**:
    *   Vitest: Next-generation testing framework.
    *   `@testing-library/react`: For testing React components.
    *   `miniflare`: For local Cloudflare Workers simulation during tests (optional, as Hono testing utilities are also used).
*   **General**:
    *   TypeScript: For static typing in both frontend and backend.
    *   Node.js & npm: For package management and scripting.
    *   Wrangler CLI: For Cloudflare Workers development and deployment.

## 4. Prerequisites

To develop and run this project locally, you will need:

*   **Node.js**: Version 18.x or later recommended.
*   **npm**: Usually comes with Node.js.
*   **Wrangler CLI**: The command-line interface for Cloudflare Workers. Install globally with `npm install -g wrangler`.
*   **Cloudflare Account**: Required for D1 database setup and eventual deployment.

## 5. Setup Instructions

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Cloudflare D1 Database Setup**:
    *   This project requires a Cloudflare D1 database for storing user data, domains, certificates, etc.
    *   Detailed instructions for creating the D1 database and configuring it in `wrangler.toml` are provided in:
        **[`docs/D1_SETUP.md`](./docs/D1_SETUP.md)**
    *   Please follow those instructions carefully. You will need to update `wrangler.toml` with your specific D1 database IDs and name.

4.  **Environment Variables**:
    *   Currently, the ACME account email (`ACME_ACCOUNT_EMAIL` in `src/worker/acmeService.ts`) is hardcoded for simplicity in the staging environment. For production, this should be configured via environment variables or Worker secrets.
    *   No other specific environment variables are required for local development at this stage, beyond the D1 configuration in `wrangler.toml`.

5.  **Running the Application Locally**:
    *   The application consists of a Cloudflare Worker backend and a Vite-powered React frontend.
    *   The `npm run dev` script uses `wrangler dev` to start the Worker locally and typically serves it on `http://localhost:8787`.
    *   Vite's dev server (usually on `http://localhost:5173`) will proxy API requests starting with `/api` to the local Wrangler worker, as configured in `vite.config.ts`.
    *   Start the development environment:
        ```bash
        npm run dev
        ```
    *   Open your browser and navigate to `http://localhost:5173` (or the port Vite announces).

## 6. Available Scripts

*   `npm run dev`: Starts the local development server (Wrangler for worker, Vite for frontend with proxy).
*   `npm run build`: Builds both the frontend (Vite) and the worker (tsc).
*   `npm run deploy`: Deploys the worker to Cloudflare (ensure you've run `npm run build` first and are logged into Wrangler).
*   `npm run cf-typegen`: Generates TypeScript types from `wrangler.toml` for bindings.
*   `npm run lint`: Lints the project files using ESLint.
*   `npm run db:migrate`: Applies D1 database migrations locally (uses `.wrangler/state/d1` for local D1 simulation).
*   `npm run db:migrate:prod`: Applies D1 database migrations to your production D1 database on Cloudflare.
*   `npm run test`: Runs all Vitest tests (both worker and UI).
*   `npm run test:worker`: Runs only backend (worker) tests.
*   `npm run test:ui`: Runs only frontend (UI) tests.
*   `npm run coverage`: Runs all tests and generates a coverage report.
*   `npm run preview`: Builds the project and previews the production build locally (frontend only).

## 7. Project Structure

```
.
├── docs/                  # Project documentation (D1 Setup, API docs)
├── public/                # Static assets for Vite frontend
├── src/
│   ├── react-app/         # Frontend React application (Vite)
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/      # API service helpers
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── setupTests.ts  # Vitest setup for frontend
│   ├── worker/            # Backend Cloudflare Worker (Hono)
│   │   ├── migrations/    # D1 SQL migration files
│   │   ├── acmeService.ts
│   │   ├── discoveryService.ts (placeholder)
│   │   ├── index.ts       # Worker entry point
│   │   ├── index.test.ts  # Worker tests
│   │   └── utils.ts
├── package.json
├── tsconfig.json          # Main TypeScript config
├── tsconfig.app.json      # TypeScript config for React app
├── tsconfig.worker.json   # TypeScript config for Worker
├── vite.config.ts         # Vite configuration (includes Vitest config)
├── wrangler.toml          # Wrangler configuration (D1 bindings, worker name)
└── README.md              # This file
```

## 8. API Overview

The backend exposes a set of RESTful API endpoints for managing users, domains, and certificates.
For detailed information on each endpoint, including request/response formats and authentication requirements, please refer to:
**[`docs/API.md`](./docs/API.md)**

## 9. Testing

This project uses [Vitest](https://vitest.dev/) for both backend (Worker) and frontend (React components) testing.

*   **Backend Tests**: Located in `src/worker/**/*.test.ts`. These tests typically mock D1 interactions and test Hono route handlers.
*   **Frontend Tests**: Located in `src/react-app/**/*.test.tsx`. These tests use `@testing-library/react` for component testing and mock API service calls.
*   **Setup**: Frontend tests use `src/react-app/setupTests.ts` for global mocks (like `localStorage`, `fetch`).

Run tests using the scripts mentioned in the "Available Scripts" section (e.g., `npm test`, `npm run test:worker`, `npm run test:ui`).
Coverage reports can be generated with `npm run coverage`.

## 10. Security Considerations

**IMPORTANT: Private Key Management**

This project, for demonstration and development purposes, stores sensitive cryptographic private keys (such as ACME account keys and certificate private keys) directly in the Cloudflare D1 database.

**This is NOT a secure practice for production environments.**

In a production system, you should NEVER store unencrypted private keys directly in a database. Instead, use a dedicated secrets management service, such as:

*   [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
*   [HashiCorp Vault](https://www.vaultproject.io/)
*   AWS Key Management Service (KMS)
*   Google Cloud Key Management Service (KMS)

These services are designed to securely store, manage, and control access to sensitive data like private keys. Ensure that your production deployment strategy incorporates a robust secrets management solution.

## 11. Contribution Guidelines (Placeholder)

This is primarily a demonstration project. If it were an open-source project, we would include guidelines here on how to contribute, such as:
*   Forking the repository.
*   Creating feature branches.
*   Writing tests for new features.
*   Following coding style guidelines (e.g., ESLint).
*   Submitting Pull Requests.

---

A live deployment of the original base template (before these features) is available at:
[https://react-vite-template.templates.workers.dev](https://react-vite-template.templates.workers.dev)
```
