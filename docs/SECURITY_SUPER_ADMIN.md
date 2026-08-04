# Super Admin Security Architecture

## Overview
The Super Admin protection system introduces specialized security layers for critical administrative accounts while maintaining the existing `Admin` role architecture. This document outlines the security policies, configuration, and implementation details.

## Environment Variables & Configuration
Super Admin protection is configured via environment variables in the `.env` file (or `.env.production` in production):

- `SUPER_ADMIN_IDS`: A comma-separated list of MongoDB ObjectIds that should be treated as protected Super Admins.
- `SUPER_ADMIN_EMAILS`: A comma-separated list of email addresses that should be treated as protected Super Admins.
- `SUPER_ADMIN_MASTER_CONFIRMATION_PASSWORD`: A master password required for sensitive actions against protected Super Admins. It can be a plaintext string or a bcrypt hash.
- `MIN_ACTIVE_SUPERADMINS`: An integer specifying the minimum number of active (not banned/suspended/deleted) protected Super Admins that must exist in the system (default 1).
- `SUPER_ADMIN_ALLOW_SELF_DEMOTION`: A boolean (`true` or `false`) that controls whether a protected Super Admin can demote themselves.

### Configuration Validation
During application startup in production, the system validates that at least one protected Super Admin is configured (via emails or IDs). If neither is provided, startup will fail to prevent a silent misconfiguration. 

### Protected Account Rules
The `isProtectedSuperAdmin(user)` function determines if an account is protected. The system checks `SUPER_ADMIN_IDS` first, followed by `SUPER_ADMIN_EMAILS`. **If both are configured, IDs take priority** because they are immutable.

Protected Super Admins are subject to strict rules:
1. They cannot change their email, password, or role via the standard profile update endpoints.
2. They cannot request self-service account deletion.
3. They cannot be suspended, banned, or force-deleted without the `SUPER_ADMIN_MASTER_CONFIRMATION_PASSWORD`.

### Last Super Admin Protection
The system ensures that the number of active, non-suspended, non-deleted protected Super Admins never falls below the value of `MIN_ACTIVE_SUPERADMINS` (default 1). Attempting to ban, suspend, or delete the last active protected Super Admin will be blocked unconditionally, even with the correct master password.

## Master Confirmation Workflow
When taking a protected action (ban, suspend, or force-delete) against a protected Super Admin:
1. The frontend (reacting to the `isProtectedAdmin` flag sent by the backend) prompts the user for the Master Confirmation Password.
2. The password is submitted securely in the JSON request body (e.g., `{"masterPassword": "..."}`).
3. The backend validates the password using a constant-time comparison for plaintext, or `bcrypt.compare()` for hashed passwords.
4. Regardless of success or failure, the frontend immediately clears the password from state and closes the dialog to ensure it is not cached in memory.

## Rate Limiting
To prevent brute-force attacks against the Master Confirmation Password, the backend employs a rate limiter using the key `${actorId}_${ipAddress}`. This ensures that multiple failed attempts from one admin will lock them out without affecting other admins on the same NAT network. After 5 consecutive failed attempts, the actor/IP is locked out for 15 minutes.

## Audit Logging
All critical actions affecting protected Super Admins are recorded in the `super_admin_audit_logs` MongoDB collection.
The log includes `actorId`, `actorEmail`, `targetId`, `targetEmail`, `action`, `reason`, `ipAddress`, `userAgent`, and `success`.
The audit logging is wrapped in a `try/catch` block so that logging failures do not block business logic.
**Retention Policy:** The collection includes a TTL index on `createdAt` that automatically deletes logs after 365 days (1 year).

## Seeder Behavior
The database seeder (`seedAll.js`) uses a strict identifier (`seedSource: 'seedAll'`) for all seeded documents. When re-running the seeder (`npm run seed:all`), the system uses this identifier to find and update only the previously seeded demo data. It **does not** touch user-generated posts, likes, comments, reports, notifications, or actual registered user accounts.

## Recovery Procedure
If all Super Admins are locked out, or the master password is lost:
1. Access the production server via SSH or the cloud provider console.
2. Update the `.env.production` file:
   - Add a new trusted email to `SUPER_ADMIN_EMAILS`.
   - Update `SUPER_ADMIN_MASTER_CONFIRMATION_PASSWORD` to a newly generated bcrypt hash or secure plaintext string.
3. Restart the Node.js application process for the new environment variables to take effect.
4. Log in with the newly added email to perform necessary administrative recovery actions.

## Password Rotation Procedure
To rotate the Master Confirmation Password:
1. Generate a new bcrypt hash of the desired password (e.g., using `node -e "console.log(require('bcrypt').hashSync('new_password', 10))"`).
2. Update the `SUPER_ADMIN_MASTER_CONFIRMATION_PASSWORD` in `.env.production` with the new hash.
3. Restart the backend service.
4. Verify the new password works via the Admin panel.

## How to Add/Remove a Protected Super Admin
1. Open `.env.production`.
2. Locate `SUPER_ADMIN_EMAILS` or `SUPER_ADMIN_IDS`.
3. To **add**, append the new email or ID to the comma-separated list.
4. To **remove**, delete the email or ID from the list.
5. Restart the backend service for the changes to apply.
