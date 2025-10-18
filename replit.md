# ContractBuddy - AI-Powered Contract Analysis Platform

## Overview

ContractBuddy is a web application that helps users analyze legal contracts using AI technology. Users can upload contracts in various formats (PDF, DOCX, images), and the system extracts text, identifies clauses, and compares them against "gold standard" clauses to provide negotiation recommendations. The application generates plain-English explanations of risky terms and suggests improvements to better protect user interests.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS using the "new-york" theme variant

**Routing**: wouter for client-side routing with two main routes:
- Home page (`/`) - Upload interface and landing page
- Analysis page (`/analysis/:id`) - Display contract analysis results

**State Management**: 
- TanStack Query (React Query) for server state management and API data caching
- Local React state for UI interactions and upload progress tracking

**Styling**: Tailwind CSS with custom color scheme featuring a primary blue accent color and neutral base colors, supporting both light and dark themes

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful API with the following key endpoints:
- `POST /api/upload` - File upload and OCR processing
- `POST /api/analyze/:documentId` - Trigger contract analysis
- `GET /api/analysis/:documentId` - Retrieve analysis results
- `GET /api/document/:documentId/revised` - Download revised contract
- `GET /api/document/:documentId/revised-with-changes` - Download contract with tracked changes

**File Processing**:
- Multer for handling multipart file uploads with 10MB size limit
- Support for PDF, DOCX, JPG, and PNG formats
- OCR text extraction for different file types
- Clause extraction and categorization

**AI Processing**:
- OpenAI integration for text analysis and embeddings generation
- Contract comparison against gold standard clauses using semantic similarity
- LLM-based generation of negotiation points and recommendations
- Mock embeddings system for development/demo purposes

**Development Features**:
- Vite middleware integration for HMR in development
- Custom logging system with timestamps
- Error handling middleware
- Request/response logging for API routes

### Data Storage

**Database**: PostgreSQL via Neon serverless database

**ORM**: Drizzle ORM with the following schema:

**Tables**:
- `users` - User accounts (currently not actively used for authentication)
- `documents` - Uploaded contract files with expiration timestamps
- `clauses` - Extracted clauses from contracts with type, risk level, and position
- `gold_standard_clauses` - Reference clauses for comparison with category and risk ratings
- `analysis_results` - Stored analysis results linking documents to their negotiation points

**Data Lifecycle**:
- Documents automatically expire after 24 hours
- Periodic cleanup job removes expired documents
- Analysis results stored as JSONB for flexible negotiation point structure

**Connection Management**: 
- Neon serverless connection pooling with WebSocket support
- Database credentials via `DATABASE_URL` environment variable

### External Dependencies

**AI Services**:
- OpenAI API - Text analysis, embeddings generation, and contract recommendations
- Anthropic Claude SDK (installed but not actively used in current implementation)

**Document Processing**:
- mammoth - DOCX text extraction
- pdfjs-dist - PDF parsing and text extraction
- OpenAI Vision API - Image-based text extraction for JPG/PNG files

**File Handling**:
- multer - Multipart form data and file upload processing
- File system operations for temporary file storage

**Database**:
- @neondatabase/serverless - PostgreSQL connection with serverless optimizations
- drizzle-orm - Type-safe database queries and schema management
- connect-pg-simple - Session store (configured but sessions not actively used)

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal - Development error overlay
- @replit/vite-plugin-cartographer - Replit-specific development tooling
- tsx - TypeScript execution for development server

**Build Tools**:
- esbuild - Server-side bundling for production
- Vite - Frontend bundling and development server
- drizzle-kit - Database migrations and schema management