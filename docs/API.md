# API Documentation

This document outlines the API endpoints for the Certificate Management Platform.

**Base URL**: `/` (All paths are relative to the worker's root)

## Table of Contents

1.  [User Authentication](#user-authentication)
2.  [Domain Management](#domain-management)
3.  [Certificate Management](#certificate-management)
4.  [ACME HTTP-01 Challenge](#acme-http-01-challenge)
5.  [Certificate Discovery (Placeholder)](#certificate-discovery-placeholder)

---

## 1. User Authentication

### Register User
*   **Endpoint**: `POST /api/users/register`
*   **Description**: Registers a new user.
*   **Authentication**: Public
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123"
    }
    ```
    *   `email` (string, required): User's email address.
    *   `password` (string, required): User's password (min 8 characters).
*   **Response Body (201 Created)**:
    ```json
    {
      "id": "user_uuid",
      "email": "user@example.com"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing fields, password too short. (e.g., `{"error": "Email and password are required"}`)
    *   `409 Conflict`: User with this email already exists. (e.g., `{"error": "User with this email already exists"}`)
    *   `500 Internal Server Error`: Registration failed. (e.g., `{"error": "Failed to register user", "details": "..."}`)

### Login User
*   **Endpoint**: `POST /api/users/login`
*   **Description**: Logs in an existing user.
*   **Authentication**: Public
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123"
    }
    ```
*   **Response Body (200 OK)**:
    ```json
    {
      "token": "session_jwt_or_opaque_token",
      "userId": "user_uuid",
      "email": "user@example.com"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing fields.
    *   `401 Unauthorized`: Invalid credentials. (e.g., `{"error": "Invalid credentials"}`)
    *   `500 Internal Server Error`: Login failed.

---

## 2. Domain Management

All endpoints under `/api/domains` require Bearer Token authentication in the `Authorization` header.
`Authorization: Bearer <your_token>`

### Add New Domain
*   **Endpoint**: `POST /api/domains`
*   **Description**: Adds a new domain for the authenticated user.
*   **Authentication**: Bearer Token
*   **Request Body**:
    ```json
    {
      "fqdn": "example.com"
    }
    ```
    *   `fqdn` (string, required): The fully qualified domain name.
*   **Response Body (201 Created)**: Full domain object.
    ```json
    {
        "id": "domain_uuid",
        "user_id": "user_uuid",
        "fqdn": "example.com",
        "status": "pending_validation", // Or initial status
        "created_at": "YYYY-MM-DD HH:MM:SS",
        "updated_at": "YYYY-MM-DD HH:MM:SS",
        "validated_at": null
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: FQDN missing or invalid. (e.g., `{"error": "Valid FQDN is required"}`)
    *   `401 Unauthorized`: Invalid or missing token.
    *   `409 Conflict`: Domain already added by user. (e.g., `{"error": "Domain already added"}`)
    *   `500 Internal Server Error`.

### List User Domains
*   **Endpoint**: `GET /api/domains`
*   **Description**: Retrieves a list of all domains added by the authenticated user.
*   **Authentication**: Bearer Token
*   **Response Body (200 OK)**: Array of domain objects.
    ```json
    [
      {
        "id": "domain_uuid_1",
        "user_id": "user_uuid",
        "fqdn": "example.com",
        "status": "active",
        // ... other fields ...
      },
      {
        "id": "domain_uuid_2",
        "user_id": "user_uuid",
        "fqdn": "another.example.org",
        "status": "pending_validation",
        // ... other fields ...
      }
    ]
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `500 Internal Server Error`.

### Get Domain Details
*   **Endpoint**: `GET /api/domains/:id`
*   **Description**: Retrieves details for a specific domain by its ID.
*   **Authentication**: Bearer Token
*   **URL Parameters**:
    *   `id` (string, required): The ID of the domain to retrieve.
*   **Response Body (200 OK)**: Full domain object (similar to Add New Domain response).
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `404 Not Found`: Domain not found or user does not have access.
    *   `500 Internal Server Error`.

### Delete Domain
*   **Endpoint**: `DELETE /api/domains/:id`
*   **Description**: Deletes a specific domain by its ID.
*   **Authentication**: Bearer Token
*   **URL Parameters**:
    *   `id` (string, required): The ID of the domain to delete.
*   **Response Body (200 OK)**:
    ```json
    {
      "message": "Domain deleted successfully"
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `404 Not Found`: Domain not found or user does not have access.
    *   `500 Internal Server Error`.

---

## 3. Certificate Management

These endpoints are nested under a specific domain and require Bearer Token authentication.

### Issue New Certificate
*   **Endpoint**: `POST /api/domains/:domainId/issue-certificate`
*   **Description**: Initiates the ACME DV certificate issuance process for the specified domain. Uses Let's Encrypt Staging by default.
*   **Authentication**: Bearer Token
*   **URL Parameters**:
    *   `domainId` (string, required): The ID of the domain for which to issue the certificate.
*   **Response Body (201 Created)**:
    ```json
    {
      "message": "Certificate issued successfully.", // Or "Issuance process started."
      "certificateId": "cert_uuid"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Domain ID missing.
    *   `401 Unauthorized`.
    *   `404 Not Found`: Domain not found or user does not have access.
    *   `500 Internal Server Error`: Issuance process failed (e.g., ACME error, D1 error). (e.g., `{"error": "Failed to issue certificate...", "details":"..."}`)

### List Certificates for a Domain
*   **Endpoint**: `GET /api/domains/:domainId/certificates`
*   **Description**: Retrieves a list of issued certificates for a specific domain.
*   **Authentication**: Bearer Token
*   **URL Parameters**:
    *   `domainId` (string, required): The ID of the domain.
*   **Response Body (200 OK)**: Array of certificate summary objects.
    ```json
    [
      {
        "id": "cert_uuid",
        "common_name": "example.com",
        "issued_at": "YYYY-MM-DD HH:MM:SS",
        "expires_at": "YYYY-MM-DD HH:MM:SS",
        "status": "issued" // e.g., issued, pending_validation, issuance_error
      }
      // ... more certificates ...
    ]
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `404 Not Found`: Domain not found or user does not have access.
    *   `500 Internal Server Error`.

---

## 4. ACME HTTP-01 Challenge

### Serve HTTP-01 Challenge Token
*   **Endpoint**: `GET /.well-known/acme-challenge/:token`
*   **Description**: Serves the content for an ACME HTTP-01 challenge. This endpoint is used by the ACME Certificate Authority (CA) to verify domain ownership.
*   **Authentication**: Public
*   **URL Parameters**:
    *   `token` (string, required): The challenge token provided by the ACME server.
*   **Response Body (200 OK)**: Plain text response with the challenge content.
    ```text
    challenge_content_string
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Token not provided.
    *   `404 Not Found`: Challenge not found or expired.
    *   `500 Internal Server Error`: Error processing challenge.

---

## 5. Certificate Discovery (Placeholder)

These endpoints are placeholders for a future certificate discovery feature.

### Start Discovery Scan
*   **Endpoint**: `POST /api/discovery/start`
*   **Description**: Initiates a certificate discovery process (e.g., by scanning CT logs or specified domains). **(Placeholder - Not Implemented)**
*   **Authentication**: Bearer Token
*   **Request Body (Optional)**:
    ```json
    {
      "domainsToScan": ["example.com", "another.com"] // Optional: specific domains
    }
    ```
*   **Response Body (200 OK)**:
    ```json
    {
      "message": "Certificate discovery process initiated (Placeholder - Not Implemented)",
      "userId": "user_uuid" // Or a jobId
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.

### Get Discovery Results
*   **Endpoint**: `GET /api/discovery/results`
*   **Description**: Retrieves results from certificate discovery processes. **(Placeholder - Returns Mock Data)**
*   **Authentication**: Bearer Token
*   **Response Body (200 OK)**: Array of discovered certificate objects.
    ```json
    {
      "results": [
        {
            "id": "disc_cert_1",
            "fqdn": "example.com",
            "issuer_common_name": "Mock CA",
            "not_after": "YYYY-MM-DD HH:MM:SS",
            "discovery_source": "mock_scan",
            "status": "active"
        },
        // ... more mock results ...
      ]
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
```
