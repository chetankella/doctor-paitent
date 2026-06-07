# Digital Health Platform API Documentation

This document outlines all currently exposed API endpoints across the application. Base URL depends on deployment, but locally runs at `http://localhost:5000`.

## Table of Contents
1. [Admin APIs](#admin-apis)
2. [Auth APIs](#auth-apis)
3. [Department APIs](#department-apis)
4. [Doctor APIs](#doctor-apis)
5. [Organization APIs](#organization-apis)
6. [Patient APIs](#patient-apis)
7. [Staff APIs](#staff-apis)
8. [Super Admin APIs](#super-admin-apis)

---

## 1. Admin APIs
Base Path: `/api/admin`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **POST** | `/setup-first-admin` | Bootstrap the first admin user in an empty DB. | `name`, `email`, `password` | No (Requires 0 admins in DB) |
| **POST** | `/create-admin` | Create additional platform admins. | `name`, `email`, `password` | Yes (Admin) |
| **GET** | `/dashboard` | Get overall platform statistics. | None | Yes (Admin) |
| **GET** | `/organization-requests` | List all organization requests. | Optional query: `?status=...&search=...` | Yes (Admin) |
| **GET** | `/organization-requests/:id` | Details of a specific org request. | `id` (URL Param) | Yes (Admin) |
| **PATCH** | `/organization-requests/:id/approve`| Approve org request, convert to Organization, update fields, and email invite. | Optional `req.body` to update org fields | Yes (Admin) |
| **PATCH** | `/organization-requests/:id/reject` | Reject org request. | `rejectionReason` (min 10 chars) | Yes (Admin) |
| **GET** | `/organization-requests-stats` | Gets count of Pending, Approved, and Rejected requests. | None | Yes (Admin) |


## 2. Auth APIs
Base Path: `/api/auth`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **POST** | `/login` | Authenticates User, retrieves unified role memberships. | `email`, `password` | No |

*Returns JSON containing a `token` and an `organizations` array mapping out memberships.*


## 3. Department APIs
Base Path: `/api/department` or `/api/department-admin`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **POST** | `/` (department) | Create a department under the tenant org. | `departmentName`, `departmentEmail`, `description`, `adminEmail` | Yes (Owner/Admin) |
| **GET** | `/` (department) | List departments under the tenant org. | None | Yes (Owner/Admin) |
| **GET** | `/verify-token/:token` | Verify Department Admin invite token. | `token` (URL Param) | No |
| **POST** | `/setup` | Complete department admin setup. | `token`, `name`, `password` | No |


## 4. Doctor APIs
Base Path: `/api/doctor`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **GET** | `/verify-token/:token` | Verify invite token for new doctors. | `token` (URL Param) | No |
| **POST** | `/SetPassword/:token` | Set user password from invitation. | `token` (URL), `name`, `password` | No |
| **POST** | `/setup` | Upload license and set profile data. | `licenseNumber`, `specialization`, `experience`, `licenseDocument`(File) | Yes (Doctor) |
| **GET** | `/Profile` | Retrieve the doctor profile and organization list. | None | Yes (Doctor) |


## 5. Organization APIs
Base Path: `/api/organization`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **POST** | `/request` | Submit a public request to register a new Clinic/Hospital. | clinic details, `superAdminEmail`, `GSTNumber`, etc. | No |
| **GET** | `/request/status` | Check the status of submitted request. | `email` (Query Param) | No |
| **GET** | `/my` | List organizations the authenticated user is an admin of. | None | Yes |
| **GET** | `/:organizationId` | Get data for a specific organization. | `organizationId` (URL Param) | Yes (Owner/Admin) |
| **PUT** | `/:organizationId` | Update basic organization configuration. | `name`, `contactPhone`, `contactEmail`, `addressLine1`, etc | Yes (Owner/Admin) |
| **POST** | `/:organizationId/verify` | Mark organization as verified from Platform. | `verificationNotes` | Yes (Platform Admin) |
| **POST** | `/:organizationId/suspend` | Suspend the organization immediately. | `suspensionReason` | Yes (Platform Admin) |
| **POST** | `/:organizationId/invite-doctor`| Invite a new doctor to the org. | `email`, `departmentId`, `role` | Yes (Owner/Admin) |
| **POST** | `/:organizationId/invite-staff` | Invite a new staff member to the org. | `email`, `departmentId`, `designation` | Yes (Owner/Admin) |


## 6. Patient APIs
Base Path: `/api/patient`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **POST** | `/register` | Register a new patient account (Sends OTP). | `name`, `email`, `password` | No |
| **POST** | `/verify-otp` | Verify the registration OTP to unlock account. | `email`, `otp` | No |
| **POST** | `/resend-otp` | Resend the registration OTP. | `email` | No |
| **POST** | `/createProfile` | Create/Update medical demographic data. | Medical payload (`dateOfBirth`, `bloodGroup`, `allergies`, etc). | Yes (Patient) |
| **GET** | `/profile` | Retrieve own full profile. | None | Yes (Patient) |
| **POST** | `/generate-emergency-qr`| Generates Emergency QR token to share. | None | Yes (Patient) |
| **POST** | `/generate-access-token`| Generates token allowing a doctor temporary DB access. | `doctorEmail`, `scope`, `expiryDays` | Yes (Patient) |
| **GET** | `/access/token` | Retrieve profile data scoped strictly via patient's access token. | Bearer access token | Yes (Doctor) |
| **GET** | `/access/qr` | Retrieve emergency data scoped strictly via QR Token. | QR Bearer Token | No |
| **POST** | `/access/by-email` | Retrieve data if the doctor has an active explicit access lease. | `patientEmail` | Yes (Doctor) |


## 7. Staff APIs
Base Path: `/api/staff`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **GET** | `/verify-token/:token` | Check if a staff invite token is valid. | `token` (URL Param) | No |
| **POST** | `/setup/:token` | Creates staff user from invite. | `token` (URL), `name`, `password`, `designation` | No |


## 8. Super Admin APIs
Base Path: `/api/superadmin`

| Method | Endpoint | Description | Payloads / Parameters | Auth Required |
| --- | --- | --- | --- | --- |
| **GET** | `/verify-token/:token` | Verifies Super Admin set up token from approved Org Request. | `token` (URL Param) | No |
| **POST** | `/setup` | Complete Super admin registration, automatically linking them as OWNER. | `token`, `name`, `password`, `licenseNumber` (if CLINIC), `specialization` | No |
