# Vocabulary Flashcards

A full-blown vocabulary practice site with user login and data persistence.

## Features

- Flashcards with flip to reveal meaning
- Quiz mode
- Manage words
- Import from images/PDFs using AI
- User authentication
- Responsive design

## Setup

1. Install dependencies: `npm install`
2. Set up MongoDB (local or cloud like MongoDB Atlas)
3. Create .env file with MONGODB_URI and JWT_SECRET
4. Run: `npm start`

## Deployment

- For backend: Deploy to Heroku, Vercel, or similar
- For frontend: Served from /public

## Notes

- The import feature requires Anthropic API key for AI processing
- Move AI calls to server-side for security
