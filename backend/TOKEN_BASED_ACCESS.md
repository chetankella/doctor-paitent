# Token-Based Patient Data Access System

## Overview
The system now supports secure access to patient data without exposing patient IDs in URLs. Instead, tokens and QR codes are used for authorization.

---

## 🔐 Access Methods

### 1. **Emergency QR Code Access**
**Use Case**: Patient needs emergency access at hospitals

**Endpoint**: `POST /api/patients/generate-emergency-qr`
```bash
# Patient generates QR code
curl -X POST http://localhost:5000/api/patients/generate-emergency-qr \
  -H "Authorization: Bearer <patient-token>"
```

**Response**:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "token": "ABC123XYZ",
  "expiresAt": "2026-03-04T12:00:00Z",
  "type": "EMERGENCY"
}
```

**Hospital Access**:
```bash
# Hospital scans QR code or enters manual token
curl http://localhost:5000/api/patients/access/qr \
  -H "Authorization: Bearer <qr-token>"
```

**Data Returned (Emergency Scope)**:
- Blood Group
- Allergies
- Chronic Conditions
- Current Medications
- Emergency Contact

---

### 2. **Token-Based Doctor Access**
**Use Case**: Patient grants specific doctor access to their data

**Step 1**: Patient generates access token
**Endpoint**: `POST /api/patients/generate-access-token`
```bash
curl -X POST http://localhost:5000/api/patients/generate-access-token \
  -H "Authorization: Bearer <patient-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorEmail": "dr.smith@hospital.com",
    "scope": "FULL_PROFILE",
    "expiryDays": 30
  }'
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "doctorEmail": "dr.smith@hospital.com",
  "scope": "FULL_PROFILE",
  "expiresAt": "2026-04-02T12:00:00Z",
  "shareUrl": "http://localhost:3000/access?token=..."
}
```

**Step 2**: Doctor uses token to access profile
**Endpoint**: `GET /api/patients/access/token`
```bash
curl http://localhost:5000/api/patients/access/token \
  -H "Authorization: Bearer <access-token>"
```

---

### 3. **Email-Based Access**
**Use Case**: Doctor looks up patient by email (requires prior access grant)

**Endpoint**: `POST /api/patients/access/by-email`
```bash
curl -X POST http://localhost:5000/api/patients/access/by-email \
  -H "Authorization: Bearer <doctor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientEmail": "patient@example.com"
  }'
```

**Response**:
```json
{
  "success": true,
  "patientEmail": "patient@example.com",
  "accessScope": "FULL_PROFILE",
  "data": { ... patient data ... }
}
```

---

## 📊 Access Scope Hierarchy

```
SUMMARY (1)
├── Blood Group
├── Allergies
├── Chronic Conditions
├── Current Medications
└── Emergency Contact

FULL_PROFILE (2)
├── All from SUMMARY
├── Vitals (height, weight)
├── Medical History
├── Insurance
├── Lifestyle
└── All personal data

FULL_WITH_WRITE (3)
└── Same as FULL_PROFILE + write permissions
```

---

## 🔑 Token Types

### Emergency Token
- **Type**: JWT
- **Expiry**: 24 hours (default)
- **Scope**: EMERGENCY (limited data)
- **Usage**: Hospital emergencies
- **Claims**: `{ patientId, scope: "EMERGENCY", isEmergency: true }`

### QR Token
- **Type**: 16-char alphanumeric + JWT
- **Expiry**: 24 hours (default)
- **Scope**: EMERGENCY
- **Usage**: QR code scanning
- **Claims**: `{ patientId, qrToken, type: "QR_ACCESS" }`

### Patient Access Token
- **Type**: JWT
- **Expiry**: Configurable (default 7-30 days)
- **Scope**: Configurable (SUMMARY/FULL_PROFILE/FULL_WITH_WRITE)
- **Usage**: Doctor-patient data sharing
- **Claims**: `{ patientId, scope, type: "PATIENT_ACCESS" }`

---

## 🛡️ Security Features

1. **No ID Exposure**: Patient IDs never appear in URLs or public responses
2. **Email Verification**: Doctors identified by email, not ID
3. **Token Expiration**: All tokens have configurable expiry
4. **Scope Validation**: Access automatically filtered based on granted scope
5. **Access Logging**: All accesses logged to audit trail
6. **Emergency Override**: Emergency tokens bypass normal access checks (24h limit)

---

## 📝 Middleware Flow

```
Request → authorizeByToken() → Extract token from header/query
         ↓
         Verify JWT signature
         ↓
         Check token type (EMERGENCY/QR/PATIENT_ACCESS)
         ↓
         For PATIENT_ACCESS: Verify doctor-patient relationship
         ↓
         Apply scope-based filtering
         ↓
         Return filtered data
```

---

## 🚨 Emergency Situation Flow

1. **Patient at Home**:
   - Calls `POST /api/patients/generate-emergency-qr`
   - Receives QR code + short token
   - Saves QR code (prints/screenshots)

2. **Patient at Hospital in Emergency**:
   - Provides QR code to hospital
   - Hospital staff scans code
   - Limited data immediately available
   - No patient ID exposure

3. **Doctor Access**:
   ```bash
   POST /api/patients/access/qr
   ?token=<scanned-token>
   ```

---

## 📋 API Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/generate-emergency-qr` | Patient | Generate emergency QR |
| POST | `/generate-access-token` | Patient | Share data with doctor |
| GET | `/access/token` | Token | Get profile via token |
| GET | `/access/qr` | Token | Get profile via QR code |
| POST | `/access/by-email` | Doctor | Get patient data by email |

---

## 🔄 Token Refresh

Currently, tokens don't automatically refresh. Patient must:
1. Revoke old token
2. Generate new token
3. Share new token with doctor

Future enhancement: Implement refresh token mechanism.

---

## ⚠️ Important Notes

- **Emergency tokens bypass access records** - they work independently
- **Email lookups require prior access grant** - email alone isn't sufficient
- **QR codes are single-use friendly** - same token can be shared across devices
- **Tokens are user-bound** - can't be transferred to different users
