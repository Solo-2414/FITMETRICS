# 📁 FITMETRICS - Project Structure

*Generated on: 10/14/2026, 8:31:02 AM*

## 📋 Quick Overview

| Metric | Value |
|--------|-------|
| 📄 Total Files | 81 |
| 📁 Total Folders | 12 |
| 🌳 Max Depth | 4 levels |
| 🛠️ Tech Stack | React, CSS, Node.js |

## ⭐ Important Files

- 🟡 🚫 **.gitignore** - Git ignore rules
- 🟡 🔒 **package-lock.json** - Dependency lock
- 🔴 📦 **package.json** - Package configuration
- 🔴 📖 **README.md** - Project documentation
- 🔴 📖 **README.md** - Project documentation

## 📊 File Statistics

### By File Type

- ⚛️ **.jsx** (React JSX files): 36 files (44.4%)
- 🎨 **.css** (Stylesheets): 31 files (38.3%)
- 🖼️ **.png** (PNG images): 4 files (4.9%)
- 📜 **.js** (JavaScript files): 2 files (2.5%)
- ⚙️ **.json** (JSON files): 2 files (2.5%)
- 🖼️ **.jpg** (JPEG images): 2 files (2.5%)
- 📖 **.md** (Markdown files): 2 files (2.5%)
- 🚫 **.gitignore** (Git ignore): 1 files (1.2%)
- 🌐 **.html** (HTML files): 1 files (1.2%)

### By Category

- **React**: 36 files (44.4%)
- **Styles**: 31 files (38.3%)
- **Assets**: 6 files (7.4%)
- **JavaScript**: 2 files (2.5%)
- **Config**: 2 files (2.5%)
- **Docs**: 2 files (2.5%)
- **DevOps**: 1 files (1.2%)
- **Web**: 1 files (1.2%)

### 📁 Largest Directories

- **root**: 81 files
- **frontend**: 80 files
- **frontend\src**: 68 files
- **frontend\src\pages**: 55 files
- **frontend\src\pages\admin**: 20 files

## 🌳 Directory Structure

```
FITMETRICS/
├── 📂 frontend/
│   ├── 🟡 🚫 **.gitignore**
│   ├── 📜 eslint.config.js
│   ├── 🌐 index.html
│   ├── 🟡 🔒 **package-lock.json**
│   ├── 🔴 📦 **package.json**
│   ├── 🌐 public/
│   │   ├── 🖼️ AFG_LOGO.jpg
│   │   ├── 🖼️ gym-bg.jpg
│   │   ├── 🖼️ logo-no-bg.png
│   │   ├── 🖼️ logo.png
│   │   └── 🖼️ placeholder.png
│   ├── 🔴 📖 **README.md**
│   ├── 📁 src/
│   │   ├── 🎨 App.css
│   │   ├── ⚛️ App.jsx
│   │   ├── 📦 assets/
│   │   │   └── 🖼️ hero.png
│   │   ├── 🧩 components/
│   │   │   ├── 📂 admin/
│   │   │   │   ├── ⚛️ AdminLayout.jsx
│   │   │   │   └── 🎨 AdminLayout.module.css
│   │   │   ├── 📂 clerk/
│   │   │   │   ├── ⚛️ ClerkLayout.jsx
│   │   │   │   └── 🎨 ClerkLayout.module.css
│   │   │   ├── ⚛️ Footer.jsx
│   │   │   ├── 📂 member/
│   │   │   │   ├── ⚛️ MemberLayout.jsx
│   │   │   │   └── 🎨 MemberLayout.module.css
│   │   │   └── ⚛️ Navbar.jsx
│   │   ├── 🎨 index.css
│   │   ├── ⚛️ main.jsx
│   │   └── 📄 pages/
│   │   │   ├── 📂 admin/
│   │   │   │   ├── ⚛️ AdminAnnouncements.jsx
│   │   │   │   ├── 🎨 AdminAnnouncements.module.css
│   │   │   │   ├── ⚛️ AdminAttendanceAnalysis.jsx
│   │   │   │   ├── 🎨 AdminAttendanceAnalysis.module.css
│   │   │   │   ├── ⚛️ AdminChurnAnalytics.jsx
│   │   │   │   ├── 🎨 AdminChurnAnalytics.module.css
│   │   │   │   ├── ⚛️ AdminDashboard.jsx
│   │   │   │   ├── 🎨 AdminDashboard.module.css
│   │   │   │   ├── ⚛️ AdminManageUsers.jsx
│   │   │   │   ├── 🎨 AdminManageUsers.module.css
│   │   │   │   ├── ⚛️ AdminMembershipPlans.jsx
│   │   │   │   ├── 🎨 AdminMembershipPlans.module.css
│   │   │   │   ├── ⚛️ AdminPredictiveAnalytics.jsx
│   │   │   │   ├── 🎨 AdminPredictiveAnalytics.module.css
│   │   │   │   ├── ⚛️ AdminReports.jsx
│   │   │   │   ├── 🎨 AdminReports.module.css
│   │   │   │   ├── ⚛️ AdminSettings.jsx
│   │   │   │   ├── 🎨 AdminSettings.module.css
│   │   │   │   ├── ⚛️ AdminVideoTutorials.jsx
│   │   │   │   └── 🎨 AdminVideoTutorials.module.css
│   │   │   ├── 📂 clerk/
│   │   │   │   ├── ⚛️ ClerkAttendance.jsx
│   │   │   │   ├── 🎨 ClerkAttendance.module.css
│   │   │   │   ├── ⚛️ ClerkDashboard.jsx
│   │   │   │   ├── 🎨 ClerkDashboard.module.css
│   │   │   │   ├── ⚛️ ClerkMemberInformation.jsx
│   │   │   │   ├── 🎨 ClerkMemberInformation.module.css
│   │   │   │   ├── ⚛️ ClerkMemberRegistration.jsx
│   │   │   │   ├── 🎨 ClerkMemberRegistration.module.css
│   │   │   │   ├── ⚛️ ClerkMembership.jsx
│   │   │   │   ├── 🎨 ClerkMembership.module.css
│   │   │   │   ├── ⚛️ ClerkNotifications.jsx
│   │   │   │   ├── 🎨 ClerkNotifications.module.css
│   │   │   │   ├── ⚛️ ClerkPayments.jsx
│   │   │   │   ├── 🎨 ClerkPayments.module.css
│   │   │   │   ├── ⚛️ ClerkSettings.jsx
│   │   │   │   └── 🎨 ClerkSettings.module.css
│   │   │   ├── ⚛️ ForgotPassword.jsx
│   │   │   ├── ⚛️ LandingPage.jsx
│   │   │   ├── ⚛️ Login.jsx
│   │   │   └── 📂 member/
│   │   │   │   ├── ⚛️ MemberAttendance.jsx
│   │   │   │   ├── 🎨 MemberAttendance.module.css
│   │   │   │   ├── ⚛️ MemberBilling.jsx
│   │   │   │   ├── 🎨 MemberBilling.module.css
│   │   │   │   ├── ⚛️ MemberDashboard.jsx
│   │   │   │   ├── 🎨 MemberDashboard.module.css
│   │   │   │   ├── ⚛️ MemberMembership.jsx
│   │   │   │   ├── 🎨 MemberMembership.module.css
│   │   │   │   ├── ⚛️ MemberNotifications.jsx
│   │   │   │   ├── 🎨 MemberNotifications.module.css
│   │   │   │   ├── ⚛️ MemberProfile.jsx
│   │   │   │   ├── 🎨 MemberProfile.module.css
│   │   │   │   ├── ⚛️ MemberVideoTutorials.jsx
│   │   │   │   ├── 🎨 MemberVideoTutorials.module.css
│   │   │   │   ├── ⚛️ MemberWorkoutPlans.jsx
│   │   │   │   └── 🎨 MemberWorkoutPlans.module.css
│   └── 📜 vite.config.js
└── 🔴 📖 **README.md**
```

## 📖 Legend

### File Types
- 🚫 DevOps: Git ignore
- 📜 JavaScript: JavaScript files
- 🌐 Web: HTML files
- ⚙️ Config: JSON files
- 🖼️ Assets: JPEG images
- 🖼️ Assets: PNG images
- 📖 Docs: Markdown files
- 🎨 Styles: Stylesheets
- ⚛️ React: React JSX files

### Importance Levels
- 🔴 Critical: Essential project files
- 🟡 High: Important configuration files
- 🔵 Medium: Helpful but not essential files
