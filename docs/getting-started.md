# Getting Started

## Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google Cloud Platform account
- Git

## Local Development Setup

### 1. Clone Repository
git clone <your-repo-url>
cd ai-interviewer

text

### 2. Install Dependencies
cd app
npm install

text

### 3. Environment Variables
Create `.env` file in `/app` directory:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-interviewer
JWT_SECRET=your-256-bit-secret-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
OLLAMA_URL=https://your-ollama-service.run.app
PORT=8081
NODE_ENV=development

text

### 4. Run Locally
npm start

text

### 5. Access Application
- Frontend: http://localhost:8081
- API Health: http://localhost:8081/api/v1/healthz

## Project Structure
app/
├── src/
│ ├── app.js # Express server entry
│ ├── middleware/ # Auth, CORS, logging
│ ├── models/ # MongoDB schemas
│ ├── routes/ # API route handlers
│ └── services/ # Business logic
├── public/ # Static frontend files
│ ├── index.html # Login page
│ ├── dashboard.html # Main dashboard
│ ├── interview.html # Interview interface
│ ├── css/ # Stylesheets
│ └── js/ # Frontend JavaScript
├── package.json
└── Dockerfile

text

## Quick Test
1. Visit http://localhost:8081
2. Complete Google OAuth login
3. Click "Start Interview Session"
4. Verify interview interface loads

## Troubleshooting

### MongoDB Connection Failed
- Check MONGODB_URI format
- Verify network access in MongoDB Atlas
- Ensure IP whitelist includes your IP

### JWT Authentication Errors
- Verify JWT_SECRET is set
- Check token expiration
- Clear localStorage and re-login

### Google OAuth Issues
- Verify GOOGLE_CLIENT_ID matches your OAuth app
- Check redirect URIs in Google Console

## Next Steps
- [Set up authentication](authentication.md)
- [Deploy to production](deployment.md)
- [Explore API endpoints](api-reference.md)
