# 📊 ATS Resume Auditor & Score Tool

A fully client-side React + Vite web application that parses resumes (PDF/DOCX/TXT), analyzes them using the Google Gemini API, and provides a professional, brutally honest Applicant Tracking System (ATS) score with actionable feedback.

This tool is built to run entirely in the browser with **zero server-side dependencies**. It comes pre-configured with a secure Gemini API Key, so you can upload or paste your resume and get immediate evaluations without any API key setup!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-github-username%2Fats-resume-analyser)

---

## ✨ Features

- **📂 Client-Side Parsing:** Extract text directly from PDF, DOCX, and TXT files in-browser using `pdfjs-dist` and `mammoth.js`.
- **🔑 Zero Configuration Setup:** The Gemini API Key is pre-configured in the code, meaning you can audit resumes instantly.
- **📊 Rich Scoring Dashboard:** 
  - An animated, color-coded circular gauge showing your overall ATS score.
  - A color-coded verdict badge (**Excellent**, **Good**, **Needs Work**, or **Poor**).
  - Detailed score breakdown for Keywords (25 pts), Formatting (20 pts), Work Experience (25 pts), Skills Match (20 pts), and Education (10 pts).
  - Categorized reports detailing: Key Strengths, Critical Improvements, Missing Keywords, Red Flags, and Quick Wins.
- **🎯 Optional Job Description Matching:** Paste a target job description to run a role-specific keyword matching and relevance evaluation.
- **⚡ Fast and Lightweight:** Powered by `gemini-2.5-flash` for rapid analyses with client-side JSON formatting constraints.
- **🎨 Premium Dev Tool Aesthetic:** Built with a professional, dark recruitment-meets-developer palette (deep navy, electric cyan, and clean white cards for report pages).

---

## 🚀 Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- `npm` or `yarn`

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ats-resume-analyser.git
   cd ats-resume-analyser
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the local development server:**
   ```bash
   npm run dev
   ```
   *Open [http://localhost:5173](http://localhost:5173) in your browser.*

4. **Build the production bundle:**
   ```bash
   npm run build
   ```
   *The built static assets will be located in the `dist/` directory, ready to deploy.*

---

## ⚡ Deployment to Vercel

This app is configured as a fully static application and can be deployed to Vercel with zero serverless functions or backend setups:

1. Install Vercel CLI (optional):
   ```bash
   npm install -g vercel
   ```
2. Run the deployment command:
   ```bash
   vercel
   ```
3. Follow the CLI prompt instructions. Vercel will automatically detect the Vite React structure and deploy the `dist` folder.

Alternatively, connect your GitHub repository to the Vercel dashboard for automatic deployments on push.

---

## 📂 Tech Stack

- **Framework:** React 19 (Vite)
- **Document Parsers:** `pdfjs-dist` (PDF parsing), `mammoth` (DOCX parsing)
- **Icons:** `lucide-react`
- **Styling:** Vanilla CSS (Responsive Flexbox and Grid layouts)
- **AI Engine:** Google Gemini API (`gemini-2.5-flash`)

---

## 🛡️ License

Built by **Dhruv Gupta** - [thedhruvguptawork@gmail.com](mailto:thedhruvguptawork@gmail.com).

*Built for Digital Heroes* - [https://digitalheroesco.com](https://digitalheroesco.com)
# Resume-ATS-Score
