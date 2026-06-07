# ANH Project Study Notes

This document explains the current project structure, how the files connect, and the available API groups.

## 1. Project Overview

This is a MERN-style healthcare access platform.

- Frontend: React app in `frontend/`
- Backend: Express + MongoDB API in `backend/`
- Database: MongoDB using Mongoose models
- Auth: JWT-based login
- Main domain: patients control medical profile access, doctors request/view patient data through grants, emergency QR exposes limited emergency data, organizations manage doctors/staff/departments.

High-level flow:

```text
React pages
  -> frontend/src/services/api.js
  -> backend/index.js
  -> backend/routes/*.routes.js
  -> backend/middleware/*
  -> backend/controllers/*.controller.js
  -> backend/services/*
  -> backend/models/*
  -> MongoDB
```

## 2. Root Folders

```text
ANH/
  backend/       Express API, MongoDB models, services, middleware
  frontend/      React application
  node_modules/  root dependency folder, currently present
```

## 3. Backend Structure

### `backend/index.js`

Main backend entry file.

Responsibilities:

- Loads environment variables with `dotenv`
- Creates Express app
- Enables CORS
- Enables JSON body parsing
- Adds Helmet security headers
- Connects to MongoDB using `MONGO_URI`
- Mounts all API route files under `/api/...`
- Starts server on `PORT` or `5000`

Mounted routes:

```text
/api/patients
/api/doctors
/api/emergency
/api/doctor       legacy alias
/api/patient      legacy alias
/api/admin
/api/auth
/api/organization
/api/superadmin
/api/department
/api/department-admin
/api/staff
```

### `backend/routes/`

Route files define API URLs and attach middleware/controllers.

Examples:

- `auth.routes.js`: login
- `patient.routes.js`: patient register, OTP, profile, grants, logs, emergency QR
- `doctor.routes.js`: doctor patient access, notes, access requests
- `admin.routes.js`: platform admin APIs
- `organization.routes.js`: organization management and invites
- `organizationRequest.routes.js`: public organization request form/status
- `department.routes.js`: department create/list
- `departmentAdmin.routes.js`: department admin setup/invites
- `staff.routes.js`: staff invite setup
- `superAdmin.routes.js`: organization owner setup
- `emergency.routes.js`: public emergency QR scan

### `backend/controllers/`

Controllers contain API request logic.

Important controllers:

- `auth.controller.js`: login and JWT creation
- `patient.controller.js`: patient registration, OTP, profile, legacy access APIs
- `accessGrant.controller.js`: patient-created access grants
- `accessRequest.controller.js`: doctor access requests and patient responses
- `doctorPatient.controller.js`: doctor views granted patient data
- `clinicalNote.controller.js`: doctor clinical notes
- `emergency.controller.js`: emergency QR generation/scanning
- `admin.controller.js`: platform admin dashboard and organization approvals
- `organizationRequest.controller.js`: public organization request submission/status
- `organization.controller.js`: org profile, invites, analytics, team, activity
- `department.controller.js`: departments and department admin invite acceptance
- `superAdmin.controller.js`: organization owner setup
- `staff.controller.js`: staff invite onboarding

### `backend/models/`

Mongoose schemas. These define MongoDB collections.

Important models:

- `user.js`: all login users and roles
- `patientProfile.js`: patient medical profile
- `doctor.js`: doctor profile and license data
- `organizations .js`: organization/hospital/clinic profile
- `organizationRequest.js`: public request before admin approval
- `organizationAdmin.js`: organization admin/owner/manager membership
- `department.js`: departments inside organization
- `departmentAdminInvite.js`: legacy department admin invite
- `doctorInvite.js`: doctor/staff invites
- `invite.js`: newer unified invite model
- `doctorOrganization.js`: doctor membership in organization/department
- `staff.js`: staff profile and org/department membership
- `accessGrant.js`: patient-granted doctor access
- `accessRequest.js`: doctor asks patient for access
- `accessLog.js`: logs patient data access
- `clinicalNote.js`: doctor notes for a patient
- `emergencyQR.js`: emergency reference codes and QR records
- `auditLog.js`: organization/admin activity logs
- `patientAccess.js`: older/legacy access model

Important note: `backend/models/organizations .js` contains a space before `.js`. The code imports it as `require("../models/organizations ")`, so it currently works, but this is fragile.

### `backend/middleware/`

Middleware runs before controllers.

- `authorize.js`: verifies `Authorization: Bearer <token>` JWT and sets `req.user`
- `auth.js`: checks role permission, for example `authorize("admin")`
- `tenantContext.js`: reads `x-organization-id`, checks user belongs to that organization
- `organizationGuard.js`: checks organization role like `OWNER`, `ADMIN`, `MANAGER`
- `verifyGrant.js`: verifies a doctor has a valid patient access grant
- `logAccess.js`: writes medical data access logs
- `validate.js`: validates request body with Joi schemas
- `rateLimiter.js`: rate limits OTP/doctor request endpoints
- `upload.js`: handles file upload with Multer
- `authorizeByToken.js`: legacy token-based patient access
- `authorizePatientAccess.js`: legacy doctor-patient access check

### `backend/services/`.

Services contain reusable business logic.

- `accessGrant.service.js`: create/list/update/revoke access grants
- `accessLog.service.js`: fetch access logs
- `audit.service.js`: writes audit logs
- `department.service.js`: creates departments and department admin invites
- `emergencyQR.service.js`: generate/revoke/scan emergency QR
- `invite.service.js`: unified doctor/staff/department invite logic
- `organizationRequest.service.js`: create/approve/reject organization requests
- `patientAccess.service.js`: legacy patient access creation
- `projection.service.js`: filters patient data by access scope
- `qrcode.service.js`: legacy QR/token generator
- `tenantQuery.service.js`: helper for tenant-scoped DB queries

### `backend/utils/`

- `sendEmail.js`: sends emails using Gmail/Nodemailer
- `token.utils.js`: JWT and legacy access token utilities
- `licCrypto.js`: encrypts/decrypts doctor license number

### `backend/validations/`

Joi schemas used by `validate.js`.

- `auth.validation.js`
- `patient.validation.js`
- `doctor.validation.js`
- `department.validation.js`
- `org.validation.js`

## 4. Frontend Structure

### `frontend/src/App.js`

Main React routing file.

Defines browser routes for:

- login
- patient dashboard/profile/grants/requests/logs/emergency QR
- doctor dashboard/patient view/clinical notes/access requests/logs
- platform admin dashboard/org requests
- org super admin dashboard/invites/team/activity
- department admin dashboard
- public organization request/status
- public invite setup flows
- public emergency access

### `frontend/src/services/api.js`

Central Axios API layer.

Responsibilities:

- Sets base API URL from `REACT_APP_API_URL` or `http://localhost:5000/api`
- Adds JWT token to requests
- Normalizes errors
- Provides grouped API helpers:
  - `authAPI`
  - `patientAPI`
  - `doctorAPI`
  - `staffAPI`
  - `superAdminAPI`
  - `orgAPI`
  - `departmentAPI`
  - `deptAdminAPI`
  - `adminAPI`
  - `emergencyAPI`

### `frontend/src/store/authStore.js`

Zustand authentication store.

Responsibilities:

- Stores JWT in cookie
- Decodes JWT
- Stores current user and organizations
- Provides login/logout
- Redirects users by role

Role dashboard mapping:

```text
patient           -> /patient/dashboard
doctor            -> /doctor/dashboard
admin             -> /admin/dashboard
staff             -> /staff/dashboard
org_super_admin   -> /org/dashboard
department_admin  -> /dept/dashboard
```

Important note: `/staff/dashboard` is mapped in auth store, but no matching route exists in `App.js`.

### `frontend/src/modules/`

Newer page organization.

```text
modules/auth
modules/patient
modules/doctor
modules/admin
modules/org
modules/department
modules/onboarding
modules/emergency
```

### `frontend/src/components/`

Older components and shared UI.

Contains dashboards/setup forms that may be legacy or reused.

## 5. User Roles

### `admin`

Platform-level administrator.

Can:

- create first admin
- create more admins
- view platform dashboard
- view organization requests
- approve/reject organization requests

### `patient`

Can:

- register with OTP
- create/update medical profile
- generate emergency QR
- create/revoke access grants for doctors
- respond to doctor access requests
- view access logs

### `doctor`

Can:

- view patients only if a valid access grant exists
- request patient access
- view patient emergency/profile data according to scope
- create/list/update/delete clinical notes
- view own access logs

### `org_super_admin`

Organization owner/admin.

Can:

- view organization dashboard
- create departments
- invite doctors/staff
- manage invites
- view team
- view organization activity logs

### `department_admin`

Department-level admin.

Can:

- invite doctors/staff into their department
- bulk invite using CSV

### `staff`

Can:

- accept staff invite and create staff account

The staff frontend dashboard route appears incomplete.

## 6. API Reference

All backend APIs are under `/api`.

### Auth

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login user and return JWT |

### Patient Auth/Profile

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/patients/register` | No | Register patient and send OTP |
| POST | `/api/patients/verify-otp` | No | Verify OTP and return JWT |
| POST | `/api/patients/resend-otp` | No | Send new OTP |
| GET | `/api/patients/me/profile` | Patient | Get own patient profile |
| PUT | `/api/patients/me/profile` | Patient | Create/update own patient profile |

### Patient Access Grants

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/patients/me/access-grants` | Patient | Grant doctor access |
| GET | `/api/patients/me/access-grants` | Patient | List grants |
| PATCH | `/api/patients/me/access-grants/:grantId` | Patient | Update grant scope/expiry |
| DELETE | `/api/patients/me/access-grants/:grantId` | Patient | Revoke grant |

### Patient Access Requests

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/patients/me/access-requests` | Patient | List doctor access requests |
| PATCH | `/api/patients/me/access-requests/:requestId` | Patient | Approve/reject access request |

### Patient Logs

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/patients/me/access-logs` | Patient | View who accessed patient data |

### Emergency QR

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/patients/me/emergency-qr` | Patient | Generate emergency QR |
| GET | `/api/patients/me/emergency-qr` | Patient | Get active QR |
| DELETE | `/api/patients/me/emergency-qr` | Patient | Revoke active QR |
| GET | `/api/patients/me/emergency-qr/scans` | Patient | View QR scan logs |
| GET | `/api/emergency/access/:referenceCode` | No | Public emergency scan endpoint |

### Doctor

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/doctors/me/patients` | Doctor | List granted patients |
| GET | `/api/doctors/me/patients/:grantId/profile` | Doctor + grant | View patient profile by grant scope |
| GET | `/api/doctors/me/patients/:grantId/emergency` | Doctor + grant | View emergency subset |
| POST | `/api/doctors/me/access-requests` | Doctor | Request patient access |
| GET | `/api/doctors/me/access-logs` | Doctor | View own access logs |

### Doctor Clinical Notes

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/doctors/me/patients/:grantId/notes` | Doctor + grant | Create note |
| GET | `/api/doctors/me/patients/:grantId/notes` | Doctor + grant | List notes |
| PUT | `/api/doctors/me/patients/:grantId/notes/:noteId` | Doctor + grant | Update note |
| DELETE | `/api/doctors/me/patients/:grantId/notes/:noteId` | Doctor + grant | Soft delete note |

### Organization Request

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/organization/request` | No | Submit organization request |
| GET | `/api/organization/request/status?email=...` | No | Check request status |

### Platform Admin

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/admin/setup-first-admin` | No | Create first platform admin if none exists |
| POST | `/api/admin/create-admin` | Admin | Create another admin |
| GET | `/api/admin/dashboard` | Admin | Platform statistics |
| GET | `/api/admin/organization-requests` | Admin | List org requests |
| GET | `/api/admin/organization-requests/:id` | Admin | Get org request details |
| PATCH | `/api/admin/organization-requests/:id/approve` | Admin | Approve org request |
| PATCH | `/api/admin/organization-requests/:id/reject` | Admin | Reject org request |
| GET | `/api/admin/organization-requests-stats` | Admin | Org request stats |

### Organization

Most organization APIs require:

- JWT auth
- `x-organization-id` header
- valid organization membership

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/organization/my` | User | List organizations for user |
| GET | `/api/organization/:organizationId` | Org admin/member | Get organization details |
| PUT | `/api/organization/:organizationId` | Owner/Admin | Update organization |
| POST | `/api/organization/:organizationId/verify` | Platform Admin | Verify organization |
| POST | `/api/organization/:organizationId/suspend` | Platform Admin | Suspend organization |
| POST | `/api/organization/:organizationId/invite-doctor` | Owner/Admin/Manager | Invite doctor |
| POST | `/api/organization/:organizationId/invite-staff` | Owner/Admin | Invite staff |
| GET | `/api/organization/:organizationId/analytics/summary` | Org admin/member | Analytics counts |
| GET | `/api/organization/:organizationId/invites` | Org admin/member | List invites |
| POST | `/api/organization/:organizationId/invites/:inviteId/resend` | Org admin/member | Resend invite |
| DELETE | `/api/organization/:organizationId/invites/:inviteId` | Owner/Admin | Cancel invite |
| GET | `/api/organization/:organizationId/audit-logs` | Owner/Admin | Org activity logs |
| GET | `/api/organization/:organizationId/doctors` | Org admin/member | List doctors |
| GET | `/api/organization/:organizationId/staff` | Org admin/member | List staff |

### Super Admin Setup

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/superadmin/verify-token/:token` | No | Verify setup token |
| POST | `/api/superadmin/setup` | No | Create organization owner account |

### Department

Requires JWT and `x-organization-id`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/department` | Owner/Admin/Manager | Create department |
| GET | `/api/department` | Owner/Admin/Manager | List departments |

### Department Admin

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/department-admin/verify-token/:token` | No | Verify department admin invite |
| POST | `/api/department-admin/setup` | No | Create department admin account |
| POST | `/api/department-admin/invite-doctor` | Department Admin | Invite doctor to department |
| POST | `/api/department-admin/invite-staff` | Department Admin | Invite staff to department |
| POST | `/api/department-admin/invite-bulk` | Department Admin | Bulk invite by CSV |

### Staff

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/staff/verify-token/:token` | No | Verify staff invite |
| POST | `/api/staff/setup/:token` | No | Complete staff setup |

## 7. Main Data Flow Examples

### Patient registration

```text
Frontend PatientRegister
  -> authAPI.patientRegister()
  -> POST /api/patients/register
  -> patient.controller.registerPatient
  -> User model creates patient user
  -> sendEmail sends OTP
```

### Patient grants doctor access

```text
Patient page
  -> patientAPI.createGrant()
  -> POST /api/patients/me/access-grants
  -> auth middleware checks patient JWT
  -> accessGrant.controller.createGrant
  -> accessGrant.service.createGrant
  -> AccessGrant model stores grant
```

### Doctor views patient profile

```text
Doctor page
  -> doctorAPI.viewPatientProfile(grantId)
  -> GET /api/doctors/me/patients/:grantId/profile
  -> auth middleware checks doctor JWT
  -> verifyGrant checks grant belongs to doctor and is not expired
  -> logAccess records access
  -> doctorPatient.controller.viewPatientProfile
  -> projection.service filters patient data by scope
```

### Emergency QR scan

```text
Emergency page / public QR scan
  -> emergencyAPI.scanQR(referenceCode)
  -> GET /api/emergency/access/:referenceCode
  -> rate limiter
  -> emergency.controller.scanEmergencyQR
  -> emergencyQR.service.scanQR
  -> EmergencyQR checks status/expiry/max scans
  -> Patient profile emergency fields returned
  -> AccessLog records scan
```

### Organization request approval

```text
Public org request form
  -> POST /api/organization/request
  -> OrganizationRequest saved as PENDING

Platform admin
  -> PATCH /api/admin/organization-requests/:id/approve
  -> OrganizationRequestService.approveRequest
  -> Organization created
  -> request marked APPROVED
  -> super admin invite token created
  -> email sent to superAdminEmail
```

## 8. Access Scopes

Access scopes control how much patient data a doctor can see.

```text
EMERGENCY        limited emergency data only
SUMMARY          basic summary
FULL_PROFILE     full profile fields
FULL_WITH_WRITE  full access, intended for broader/write capability
```

The filtering is handled in `backend/services/projection.service.js`.

## 9. Important Current Issues

### 1. Doctor onboarding route mismatch

Frontend expects:

```text
GET  /api/doctor/verify-token/:token
POST /api/doctor/SetPassword/:token
POST /api/doctor/setup
GET  /api/doctor/Profile
```

The controller has functions for these, but current `backend/routes/doctor.routes.js` does not expose them. Doctor invite/setup flow may fail.

### 2. Staff dashboard route missing

`authStore.js` redirects staff to:

```text
/staff/dashboard
```

But `App.js` does not define this route.

### 3. Organization model filename has a space

Current file:

```text
backend/models/organizations .js
```

This is easy to break and should be renamed carefully later.

### 4. Legacy and new access systems both exist

New system:

```text
AccessGrant
AccessRequest
EmergencyQR
```

Legacy system:

```text
PatientAccess
authorizeByToken
authorizePatientAccess
qrcode.service.js
```

Some old routes are still kept for backward compatibility.

### 5. Git working tree is noisy

There are many deleted/changed old files and `node_modules` changes. Be careful before committing or cleaning.

## 10. Recommended Study Order

1. Read `backend/index.js`
2. Read route files in `backend/routes/`
3. Read the matching controller for each route
4. Read the model used by each controller
5. Read `frontend/src/services/api.js`
6. Read `frontend/src/App.js`
7. Read page files in `frontend/src/modules/`
8. Fix known route mismatches before adding new features

