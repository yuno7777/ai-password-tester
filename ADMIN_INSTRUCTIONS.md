# AI Password Tester - Admin Access Instructions

## 🔐 Admin-Only Features

Your AI Password Tester now includes secure admin-only logging that captures actual passwords for security analysis while keeping them hidden from regular users.

## 🚨 SECURITY NOTICE
- **Actual passwords are ONLY visible to admins via API endpoints**
- **Users only see masked passwords (e.g., T**************!)**
- **All admin access requires HTTP Basic Authentication**

## 🔑 Admin Credentials
- **Username:** `admin`
- **Password:** `secure_admin_2024!`

*⚠️ Change these credentials in the backend .env file for production use*

## 📊 Admin API Endpoints

### 1. View Password Analysis Logs
```bash
curl -u admin:secure_admin_2024! "http://localhost:8001/api/admin/password-logs?limit=10"
```

**Response includes:**
- Actual passwords entered by users
- Session IDs and timestamps
- Complete analysis results
- User IP addresses

### 2. Get Password Statistics
```bash
curl -u admin:secure_admin_2024! "http://localhost:8001/api/admin/password-stats"
```

**Response includes:**
- Total analyses count
- Strength distribution (weak/moderate/strong)
- Most common weak password patterns

### 3. Paginated Logs
```bash
curl -u admin:secure_admin_2024! "http://localhost:8001/api/admin/password-logs?limit=20&skip=0"
```

## 📋 Example Admin Workflow

1. **Monitor Weak Passwords:**
   ```bash
   curl -u admin:secure_admin_2024! "http://localhost:8001/api/admin/password-stats"
   ```

2. **View Recent Password Attempts:**
   ```bash
   curl -u admin:secure_admin_2024! "http://localhost:8001/api/admin/password-logs?limit=5"
   ```

3. **Export Data for Security Analysis:**
   ```bash
   curl -u admin:secure_admin_2024! "http://localhost:8001/api/admin/password-logs?limit=1000" > password_analysis_export.json
   ```

## 🛡️ Security Features

- **Dual Database Storage**: Regular users see masked passwords, admin logs store actual passwords
- **HTTP Basic Auth**: Admin endpoints require authentication
- **Separate Collections**: User data and admin logs are stored separately
- **Audit Trail**: Complete timestamp and session tracking
- **IP Logging**: Track user IP addresses (expandable)

## 📈 Use Cases

- **Security Research**: Analyze common password patterns
- **Compliance**: Monitor password strength trends
- **Threat Intelligence**: Identify weak password usage
- **User Education**: Understand areas needing improvement

## ⚙️ Configuration

To change admin credentials, update your backend `.env` file:
```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
```

Then restart the backend service:
```bash
sudo supervisorctl restart backend
```

---

**🔒 Keep admin credentials secure and only share with authorized personnel!**