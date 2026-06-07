# ANH Frontend - Digital Health Platform

A React-based frontend for the Digital Health Platform with support for multiple user roles: Admin, Doctor, Staff, and Patient.

## Features

### Authentication & Authorization
- **Login**: Email and password-based authentication with JWT tokens
- **Multi-role Support**: Admin, Doctor, Staff, and Patient roles
- **Protected Routes**: Role-based access control for all routes

### Patient Features
- Patient registration with OTP verification
- Email-based OTP verification
- Resend OTP functionality
- Account verification flow

### Doctor Features
- Doctor registration request with document upload
- License number validation
- Hospital information
- Staff management (add staff members)
- Staff role assignment and permission management

### Admin Features
- View pending doctor requests
- Approve/reject doctor requests
- Create new admin accounts
- Dashboard with statistics:
  - Total doctors
  - Pending requests
  - Approved doctors
  - Total patients

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── PatientRegister.js
│   │   ├── DoctorRequest.js
│   │   ├── AdminCreate.js
│   │   ├── AdminDashboard.js
│   │   ├── DoctorDashboard.js
│   │   ├── PatientDashboard.js
│   │   ├── ProtectedRoute.js
│   │   ├── Auth.css
│   │   └── Dashboard.css
│   ├── context/
│   │   └── AuthContext.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── .env
├── .gitignore
└── package.json
```

## Installation

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   Edit `.env` file to set your API URL:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

3. **Start development server**
   ```bash
   npm start
   ```
   The app will open at `http://localhost:3000`

## API Integration

The frontend communicates with the backend through the following endpoints:

### Authentication
- `POST /api/auth/login` - User login

### Patient
- `POST /api/patient/register` - Patient registration
- `POST /api/patient/verify-otp` - Verify OTP
- `POST /api/patient/resend-otp` - Resend OTP

### Doctor
- `POST /api/doctor/RequestToAdd` - Submit doctor request (with file upload)
- `POST /api/doctor/AddStaff` - Add staff member
- `POST /api/doctor/SetPassword/:token` - Set password after approval

### Admin
- `POST /api/admin/create-admin` - Create new admin
- `GET /api/admin/pending-doctors` - Get pending doctor requests
- `PATCH /api/admin/approve-doctor/:id` - Approve doctor request
- `PATCH /api/admin/reject-doctor/:id` - Reject doctor request
- `GET /api/admin/dashboard` - Get dashboard statistics

## User Flows

### Patient Registration Flow
1. Visit `/patient/register`
2. Enter personal information
3. Submit registration
4. Verify email with OTP
5. Login with email

### Doctor Registration Flow
1. Visit `/doctor/request`
2. Enter doctor information
3. Upload license document
4. Submit request
5. Admin approves/rejects request
6. Receive setup email with password setup link
7. Login with credentials

### Admin Access
1. Visit `/admin/create` to create first admin account
2. Login with credentials
3. Access `/admin/dashboard`
4. Review and manage pending doctor requests
5. View statistics

## Key Components

### AuthContext
Manages global authentication state:
- User information
- JWT token
- Login/Logout functions
- Authentication status

### API Service
Centralized axios instance with:
- Base URL configuration
- Automatic token injection in headers
- Role-specific API endpoints

### Protected Routes
Route wrapper that:
- Checks authentication
- Verifies user role
- Redirects unauthorized users

## Styling

The application uses a gradient color scheme:
- Primary: `#667eea` to `#764ba2` (purple gradient)
- Success: `#4caf50` (green)
- Error: `#f44336` (red)
- Warning: `#ff9800` (orange)

## Development Tips

1. **Testing**: Use Postman or curl to test backend before frontend
2. **Token Storage**: Tokens are stored in localStorage, clear for logout
3. **Error Handling**: All API errors display user-friendly messages
4. **Loading States**: All async operations show loading indicators
5. **CORS**: Ensure backend has proper CORS configuration

## Build for Production

```bash
npm run build
```

The optimized build will be created in the `build/` directory.

## Connected Backend

This frontend is designed to work with the ANH backend. Ensure the backend is running on `http://localhost:5000` or update the `.env` file accordingly.

Backend repository structure:
- Authentication (login)
- Patient management (registration, OTP)
- Doctor management (requests, staff)
- Admin operations (approval, statistics)

## Future Enhancements

- Staff dashboard and functionalities
- Appointment scheduling
- Medical records management
- Patient health history
- Doctor profile management
- Consultation features
- Payment integration
