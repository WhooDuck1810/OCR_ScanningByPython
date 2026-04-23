🚀 Release Notes: QuizAuto v2.0 (Official)
Timeline: March 27, 2026 – April 24, 2026

Status: Production Ready (Sprint 3 & 4 Completion)

🏁 Sprint 3 & 4 Milestone Summary
Sprint 3 (Completed April 10): Focus on the Enhanced Quiz Engine. This included the implementation of the synchronized timer, the "Mark for Review" feature, and the final transition from SQLite to MongoDB for high-volume data handling.

Sprint 4 (Completing Tomorrow, April 24): Focus on Stability & Security. This sprint saw the integration of Google Gemini 1.5 for high-accuracy parsing, repository cleanup (removing sensitive keys), and finalizing the CI/CD pipeline for the EC2 deployment.

🌟 Key Feature Updates
🧠 Intelligent OCR & Parsing (Gemini 1.5)
AI-Assisted Scanning: Replaced legacy OCR with a Gemini-powered engine that better understands complex PDF layouts and Vietnamese characters.

Dynamic Formatting: Backend now handles diverse question types (MCQ, true/false) with better accuracy via enhanced_parser.py.

⏱️ Competitive Testing Environment
Enhanced Runner: A new, distraction-free UI featuring a server-side timer to prevent cheating and ensure test integrity.

Shuffle 2.0: Deep-shuffling logic that randomizes both the question pool and the internal choice order (A, B, C, D) for every unique user session.

📊 Advanced Analytics
Enhanced Results: Users can now see a side-by-side comparison of their answers against the database records, including detailed feedback on performance.

🛠 Technical Improvements
Database: Full migration to MongoDB to support the storage of JSON-based quiz structures.

Deployment: Configured EC2 production environment with tmux session management for 24/7 uptime of both frontend and backend.

Security: * Hardened .gitignore to prevent leakage of API keys.

Cleaned repository history of sensitive .env and .pem files.

Updated Azure Pipelines for automated builds and testing.

👥 Team Contributions
Duc: Architecture lead, Gemini API integration, and server deployment (EC2/tmux).

Nhan: Core logic for shuffle utilities and quiz runner state management.

Thanh: Lead developer for the Enhanced Results engine and DB comparison logic.

📁 Version Control Note
This release marks the final shift away from Azure DevOps as the primary remote to the new GitHub organization structure, ensuring better collaboration and open-source standard practices.