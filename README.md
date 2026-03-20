# 🎓 SCOEFLOW CONNECT — Smart Campus AI Platform

> **Saraswati College of Engineering (SCOE), Kharghar, Navi Mumbai**
>
> An AI-powered student management system with campus navigation, personalized AI assistant, and immersive club experiences.

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi) ![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase) ![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-purple?logo=google) ![Hindsight](https://img.shields.io/badge/Hindsight-AI_Memory-red)

---

## ✨ Key Features

### 🤖 AI Campus Assistant (Gemini 2.5 Flash)
- Real-time campus Q&A powered by **Gemini 2.5 Flash**
- SCOE campus knowledge base (floor-wise locations, departments, facilities)
- **Hindsight AI memory** — remembers student preferences across sessions
- **Chat history** persisted in Firestore
- Personality-aware responses based on onboarding quiz

### 💡 AI Recommendations
- **Club matching** with compatibility scores based on personality profile
- Academic tips tailored to learning style
- Career roadmap steps toward student's goals
- Activity suggestions and improvement areas
- Powered by Gemini + Hindsight memory context

### 🎬 Immersive Club Animations (Framer Motion)
- **240-frame smooth animations** for each club (NSS, Rotaract, Student Council)
- Auto-playing at **30fps** with canvas rendering for zero-lag
- Play/pause, replay, and scrub bar controls
- Keyboard shortcuts (Space = play/pause, Esc = close)

### 🏢 Campus Navigation
- Floor-by-floor architecture viewer with high-res images
- Ground Floor → Fifth Floor interactive exploration
- Department locations, lab placements, facilities

### 📚 Know Your College
- Auto-sliding photo gallery of SCOE campus
- Department information (CE, CS AI&ML, DS, ME, CivE, IT, AE)
- Club details with logos
- Campus facilities overview

### 🎓 Student Management (Admin)
- Full CRUD operations for students
- Bulk import/export (Excel/CSV)
- Subject master with component marks (IA, Viva, ESE)
- Mumbai University grading system (SGPA/CGPA)
- Examination event management
- Component-wise passing enforcement
- Result calculation, publishing, and download
- Detailed result sheets

### 👨‍🎓 Student Portal
- 9-step onboarding personality quiz
- Profile with academic data
- Exam notifications & enrollment
- Result download (CSV)
- Password management

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| **Backend** | FastAPI, Python 3.13, Uvicorn |
| **Database** | Firebase Firestore |
| **AI** | Google Gemini 2.5 Flash |
| **Memory** | Hindsight AI Cloud (vectorize.io) |
| **Auth** | Firebase Auth + Custom JWT |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Firebase project with Firestore enabled

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Set GEMINI_API_KEY, HINDSIGHT_API_KEY, FIREBASE_KEY_PATH

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port 8080
```

### Access
- **Student Portal:** http://localhost:8080/student
- **Admin Portal:** http://localhost:8080/admin

---

## 📂 Project Structure

```
PROJECTSCOE2/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/     # API routes (students, chat, results, exams)
│   │   ├── core/                 # Config, Firebase, security
│   │   ├── services/             # Memory service (Hindsight)
│   │   └── main.py               # FastAPI app
│   ├── firebase_key.json         # Firebase service account
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StudentPortal.tsx          # Main student dashboard
│   │   │   ├── ClubFrameAnimation.tsx     # 240-frame club animations
│   │   │   ├── AdminLayout.tsx            # Admin dashboard
│   │   │   ├── ExaminationManagement.tsx  # Exam management
│   │   │   ├── ResultsManager.tsx         # Result calculation
│   │   │   └── ui/                        # shadcn/ui components
│   │   └── types/                         # TypeScript types
│   └── public/
│       ├── college/              # Campus & club images
│       └── frames/               # Animation frames (720 total)
│           ├── nss/              # 240 NSS frames
│           ├── rotaract/         # 240 Rotaract frames
│           └── studentcouncil/   # 240 Student Council frames
│
└── README.md
```

---

## 🔧 API Endpoints

### AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/ask` | Chat with AI assistant |
| GET | `/api/v1/chat/history/{id}` | Get chat history |
| DELETE | `/api/v1/chat/history/{id}` | Clear chat history |
| GET | `/api/v1/chat/recommendations/{id}` | AI recommendations |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/students/` | List students |
| POST | `/api/v1/students/` | Create student |
| PUT | `/api/v1/students/{id}` | Update student |
| DELETE | `/api/v1/students/{id}` | Delete student |
| POST | `/api/v1/students/bulk-upload` | Bulk import |

### Results & Exams
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/results/marks/component/bulk` | Enter marks |
| POST | `/api/v1/results/subject/calculate` | Calculate results |
| POST | `/api/v1/results/publish` | Publish results |
| POST | `/api/v1/exams/events` | Create exam event |

---

## 🎓 Mumbai University Compliance

| Grade | Points | Percentage |
|-------|--------|-----------|
| A+ | 10 | 80-100% |
| A | 9 | 70-79% |
| B+ | 8 | 60-69% |
| B | 7 | 55-59% |
| C | 6 | 50-54% |
| D | 5 | 40-49% |
| F | 0 | 0-39% |

- Component-wise passing (IA, Viva, ESE individually)
- SGPA/CGPA calculation per Mumbai University norms
- Result class: Distinction (≥7.5), First (≥6.0), Second (≥5.0), Pass (≥4.0)

---

## 📝 Environment Variables

```env
# Firebase
FIREBASE_KEY_PATH=firebase_key.json
FIREBASE_PROJECT_ID=scoeflow

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Hindsight Cloud Memory
HINDSIGHT_MODE=cloud
HINDSIGHT_API_KEY=your_hindsight_api_key

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

---

## 👨‍💻 Author

**Pranav Raut** — Saraswati College of Engineering, Kharghar

---

**Version:** 3.0 | **Last Updated:** March 2026 | **Status:** Production Ready ✅
