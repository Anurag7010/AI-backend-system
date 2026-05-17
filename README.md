# AI Product

A production-level AI-powered full-stack product.

## Architecture

\`\`\`
┌─────────────────────────────────────────────────┐
│ Browser │
│ Next.js App (web-app/) │
│ Components → Hooks → Services → API Routes │
└─────────────────────┬───────────────────────────┘
│ HTTP
┌─────────────────────▼───────────────────────────┐
│ Python AI Backend │
│ (ai-backend/) port 8000 │
│ LLM Client → RAG Interface → Prompt Engine │
└─────────────────────────────────────────────────┘
\`\`\`

## Quick Start

\`\`\`bash

# AI Backend

cd ai-backend
pip install -r requirements.txt
cp .env.example .env # add your OpenAI key
python main.py

# Web App (new terminal)

cd web-app
npm install
cp .env.example .env.local # fill in values
npm run dev
\`\`\`

## Daily Progress

- [x] Days 1-2: AI backend foundation
- [x] Days 3-8: Observability, evals, hardening
- [x] Days 9-10: Async utilities + service layer
- [x] Days 11-12: HTTP middleware + database
- [x] Days 13-14: TypeScript + React system
- [x] Days 15-16: Next.js + UI component library
- [ ] Days 17-18: Integration layer
- [ ] Day 19: Authentication
- [ ] Day 20: Caching
- [ ] Days 21-24: AI system improvements
- [ ] Days 25-32: Agents, memory, frameworks
- [ ] Days 33-40: Final product

## 40-Day Syllabus

See the full syllabus in the Claude chat history or request it from the tutor.
\`\`\`
