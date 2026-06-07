# API Review Report

This report summarizes all the API endpoints found in the backend application, their purpose, required inputs, authentication, and potential bugs.

## Summary
There are a total of **39 API endpoints** across 9 different modules (Auth, Super Admin, Admin, Organization Request, Organization, Department, Department Admin, Doctor, Patient, Staff).

---

## 1. Auth APIs
### `POST /api/auth/login`
- **Use:** Authenticate users and return JWT token and organization memberships.
- **Input:** Body: `{ email, password }`
- **Auth:** Public
- **Bugs/Issues:** None major. Just a note: When populating memberships, if an organization is deleted without clearing memberships, `m.organizationId` might be null, but the code handles it with `.filter(m => m.organizationId)`.

---

## 2. Super Admin APIs
### `GET /api/superadmin/verify-token/:token`
- **Use:** Verify the setup token sent via email to a new super admin.
- **Input:** Params: `token`
- **Auth:** Public
- **Bugs/Issues:** None observed.

### `POST /api/superadmin/setup`
- **Use:** Complete the setup for the super admin account (sets password and creates doctor profile if clinic).
- **Input:** Body: `{ token, name, password, licenseNumber, specialization, experience }`
- **Auth:** Public
- **Bugs/Issues:** The route uses transactions which is great, but if `experience` is not provided, it defaults to `0` and depends on the schema allowing it.

---

## 3. Admin APIs (Platform Admin)
### `POST /api/admin/create-admin`
- **Use:** Create a new platform admin user.
- **Input:** Body: `{ name, email, password }`
- **Auth:** **Public** 
- **CRITICAL BUG:** This route `router.post("/create-admin", createAdmin)` has NO authentication middleware. Anyone who finds this endpoint can create a platform admin account and take over the system.

### `GET /api/admin/dashboard`
- **Use:** Get platform-level statistics (total doctors, orgs, requests).
- **Input:** None
- **Auth:** Required `admin` role

### `GET /api/admin/organization-requests`
- **Use:** List pending/approved organization requests.
- **Input:** Query: `status` (optional), `search` (optional)
- **Auth:** Required `admin` role

### `GET /api/admin/organization-requests/:id`
- **Use:** Get details of a specific organization request.
- **Input:** Params: `id`
- **Auth:** Required `admin` role

### `PATCH /api/admin/organization-requests/:id/approve`
- **Use:** Approve an org request and trigger org creation.
- **Input:** Params: `id`
- **Auth:** Required `admin` role

### `PATCH /api/admin/organization-requests/:id/reject`
- **Use:** Reject an org request with a reason.
- **Input:** Params: `id`, Body: `{ rejectionReason }` (Min 10 chars)
- **Auth:** Required `admin` role

### `GET /api/admin/organization-requests-stats`
- **Use:** Get stats on organization requests.
- **Input:** None
- **Auth:** Required `admin` role

---

## 4. Organization Request APIs (Public facing)
### `POST /api/organization/request` (Mounted via [organizationRequest.routes.js](file:///home/chetan/ANH/backend/routes/organizationRequest.routes.js))
- **Use:** Submit a request to register a new organization on the platform.
- **Input:** Body: `{ name, type, description, contactPhone, contactEmail, website, addressLine1, addressLine2, city, state, country, pincode, clinicalEstablishmentNumber, GSTNumber, PANNumber, NABHAccreditationNumber, superAdminEmail, superAdminPhone, superAdminName }`
- **Auth:** Public
- **Bugs/Issues:** None observed.

### `GET /api/organization/request/status`
- **Use:** Check the status of submitted organization requests.
- **Input:** Query: `email`
- **Auth:** Public
- **Bugs/Issues:** Allows anyone to query the status of a request just using the email address. This is a minor privacy issue (information leakage of who is registering).

---

## 5. Organization APIs (Tenant scoped)
### `GET /api/organization/my`
- **Use:** Get a list of organizations where the user is an admin.
- **Input:** None
- **Auth:** Required (Any authenticated user, resolves roles internally)

### `GET /api/organization/:organizationId`
- **Use:** Get details of a specific organization.
- **Input:** Params: `organizationId`
- **Auth:** Required. Roles: `OWNER`, `ADMIN`, `MANAGER` inside the org.

### `PUT /api/organization/:organizationId`
- **Use:** Update organization details.
- **Input:** Params: `organizationId`, Body: up to 11 allowed fields (name, address, etc.)
- **Auth:** Required. Roles: `OWNER`, `ADMIN` inside the org.

### `POST /api/organization/:organizationId/verify`
- **Use:** Platform admin verifying an organization.
- **Input:** Params: `organizationId`, Body: `{ verificationNotes }`
- **Auth:** Required `admin` role (Platform admin)

### `POST /api/organization/:organizationId/suspend`
- **Use:** Platform admin suspending an organization.
- **Input:** Params: `organizationId`, Body: `{ suspensionReason }`
- **Auth:** Required `admin` role (Platform admin)

### `POST /api/organization/:organizationId/invite-doctor`
- **Use:** Invite a doctor to the organization.
- **Input:** Params/Body/Query: `organizationId`, Body: `{ email, departmentId, role }`
- **Auth:** Required. Roles: `OWNER`, `ADMIN`, `MANAGER` inside the org.
- **Bugs/Issues:** `organizationId` can be passed in params, query, body, or `req.organizationId`.

### `POST /api/organization/:organizationId/invite-staff`
- **Use:** Invite a staff to the organization.
- **Input:** Params/Body/Query: `organizationId`, Body: `{ email, departmentId, designation }`
- **Auth:** Required. Roles: `OWNER`, `ADMIN` inside the org.

---

## 6. Department APIs
### `POST /api/department/`
- **Use:** Create a new department inside the organization.
- **Input:** Body: `{ departmentName, departmentEmail, description, adminEmail }`, Headers/Req: Tenant Org ID
- **Auth:** Required. Roles: `OWNER`, `ADMIN`, `MANAGER` inside the org.

### `GET /api/department/`
- **Use:** List departments of the org.
- **Input:** None (Uses tenant context)
- **Auth:** Required. Roles: `OWNER`, `ADMIN`, `MANAGER` inside the org.

---

## 7. Department Admin APIs
### `GET /api/department-admin/verify-token/:token`
- **Use:** Verify the department admin invitation token.
- **Input:** Params: `token`
- **Auth:** Public

### `POST /api/department-admin/setup`
- **Use:** Accept department admin invite and set password.
- **Input:** Body: `{ token, name, password }`
- **Auth:** Public

### `POST /api/department-admin/invite-doctor`
- **Use:** Department admin invites doctor.
- **Input:** Body: `{ email, departmentId, role }`
- **Auth:** Required. Org role: `ADMIN`.

### `POST /api/department-admin/invite-staff`
- **Use:** Department admin invites staff.
- **Input:** Body: `{ email, departmentId, designation }`
- **Auth:** Required. Org role: `ADMIN`.

---

## 8. Doctor APIs
### `GET /api/doctor/Profile`
- **Use:** Get the doctor's profile and organization memberships.
- **Input:** None
- **Auth:** Required [doctor](file:///home/chetan/ANH/backend/controllers/doctor.controller.js#217-261) role

### `GET /api/doctor/verify-token/:token`
- **Use:** Verify doctor invitation token before setup.
- **Input:** Params: `token`
- **Auth:** Public

### `POST /api/doctor/SetPassword/:token`
- **Use:** Set doctor password (Old legacy setup method).
- **Input:** Params: `token`, Body: `{ password }`
- **Auth:** Public

### `POST /api/doctor/setup/:token`
- **Use:** Complete doctor onboarding from an invitation.
- **Input:** Params: `token`, Body: `{ name, password, licenseNumber, specialization, experience }`
- **Auth:** Public

---

## 9. Patient APIs
### `POST /api/patient/verify-otp`
- **Use:** Verify OTP during patient registration.
- **Input:** Body: `{ email, otp }`
- **Auth:** Public
- **Bugs/Issues:** `otpBlockedUntil` logic tracks attempts, which is good security, but is limited to patient role.

### `POST /api/patient/resend-otp`
- **Use:** Resend registration OTP.
- **Input:** Body: `{ email }`
- **Auth:** Public

### `POST /api/patient/register`
- **Use:** Register a new patient account.
- **Input:** Body: `{ name, email, password }`
- **Auth:** Public

### `POST /api/patient/createProfile`
- **Use:** Create or update patient health profile.
- **Input:** Body: 15 specific fields (e.g., `bloodGroup`, `allergies`, etc.)
- **Auth:** Required `patient` role

### `GET /api/patient/profile`
- **Use:** Get own patient profile.
- **Input:** None
- **Auth:** Required `patient` role

### `POST /api/patient/generate-emergency-qr`
- **Use:** Generate emergency QR code for the patient.
- **Input:** None
- **Auth:** Required `patient` role

### `POST /api/patient/generate-access-token`
- **Use:** Generate an access token to share profile with a doctor.
- **Input:** Body: `{ doctorEmail, scope, expiryDays }`
- **Auth:** Required `patient` role

### `GET /api/patient/access/token`
- **Use:** Doctor fetches patient profile using token.
- **Input:** Headers: Requires patient token.
- **Auth:** Required [doctor](file:///home/chetan/ANH/backend/controllers/doctor.controller.js#217-261) role

### `GET /api/patient/access/qr`
- **Use:** Access limited emergency profile via QR token.
- **Input:** Query/Headers: Token from QR code
- **Auth:** Token-based (Effectively public if you have the token)

### `POST /api/patient/access/by-email`
- **Use:** Doctor fetches patient info using email (requires prior access granted).
- **Input:** Body: `{ patientEmail }`
- **Auth:** Required [doctor](file:///home/chetan/ANH/backend/controllers/doctor.controller.js#217-261) role

### `GET /api/patient/patient/:patientId`
- **Use:** Legacy ID-based route to get patient profile.
- **Input:** Params: `patientId`
- **Auth:** Requires specific patient access via `authorizePatientAccess`

---

## 10. Staff APIs
### `GET /api/staff/verify-token/:token`
- **Use:** Verify staff invitation token.
- **Input:** Params: `token`
- **Auth:** Public

### `POST /api/staff/setup/:token`
- **Use:** Complete staff account setup.
- **Input:** Params: `token`, Body: `{ name, password, designation }`
- **Auth:** Public

---

## Note on Critical Bugs:
1. **Unprotected Admin Creation Route:** The `/api/admin/create-admin` endpoint is totally unprotected. There is no `authMiddleware` or `authorize("admin")` check on it. This is a major security flaw that allows unrestricted platform admin creation.
2. **Missing Token Expiry Check:** In `/api/doctor/SetPassword/:token` it correctly filters on `setupTokenExpires: { $gt: Date.now() }`, which is good.
3. Information Disclosure: `GET /api/organization/request/status` allows anyone to input an email and check if an organization requested signup.
