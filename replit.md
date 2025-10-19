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
- **Snowflake Document AI** for primary document parsing and clause extraction
- Fallback to native PDF/DOCX text extraction when Document AI unavailable
- Automatic cleanup of staged files after processing

**AI Processing**:
- **Snowflake Document AI Model** (`CONTRACTBUDDY.CONTRACTBUDDY_SCHEMA.CONTRACTBUDDY`) for document parsing using PREDICT function with GET_PRESIGNED_URL
- Top 5 clause selection based on risk priority (limitation_of_liability, indemnification, intellectual_property, termination, payment_terms)
- **AIML API** gateway for accessing GPT-5 and 300+ other AI models
- **OpenAI GPT-5** (via AIML API) for advanced clause analysis and generation of actual rewritten clause text
- Contract comparison against gold standard clauses using semantic similarity
- LLM-based generation of complete rewritten clauses (not advice, but actual replacement text)

**Development Features**:
- Vite middleware integration for HMR in development
- Custom logging system with timestamps
- Error handling middleware
- Request/response logging for API routes

### Data Storage

**Database**: Snowflake cloud data warehouse

**Connection**: snowflake-sdk for direct SQL execution and data operations

**Snowflake Stage**: CONTRACT_UPLOADS stage for temporary document storage during Document AI processing

**Tables**:
- `users` - User accounts (currently not actively used for authentication)
- `documents` - Uploaded contract files with expiration timestamps and full text content
- `clauses` - Top 5 extracted clauses from contracts with type, risk level, and position
- `gold_standard_clauses` - Reference clauses for comparison with category and risk ratings
- `analysis_results` - Stored analysis results linking documents to their negotiation points

**Sequences**:
- Explicit named sequences (seq_documents, seq_clauses, seq_analysis_results, etc.) for reliable ID generation
- Replaces Snowflake AUTOINCREMENT for predictable ID management

**Data Lifecycle**:
- Documents automatically expire after 24 hours
- Periodic cleanup job removes expired documents
- Staged files in CONTRACT_UPLOADS are automatically removed after Document AI processing
- Analysis results stored as TEXT with JSON.stringify() for compatibility

**Connection Management**: 
- Snowflake connection pooling with warehouse: COMPUTE_WH
- Database credentials via SNOWFLAKE_* environment variables

**Security**:
- File paths sanitized using MIME type-derived extensions only
- Strict regex validation for stage file paths (doc_\d+\.(pdf|docx|jpg|png|bin))
- Parameterized queries for PREDICT function calls
- No user-controlled data in SQL statements

### External Dependencies

**AI Services**:
- **AIML API** (aimlapi.com) - Unified gateway providing access to 300+ AI models through OpenAI-compatible API
- OpenAI GPT-5 (via AIML API) - Advanced contract analysis and generation of rewritten clause text
- Anthropic Claude SDK (installed but not actively used in current implementation)

**Document Processing**:
- **Snowflake Document AI** - Primary document parsing and clause extraction
- mammoth - DOCX text extraction (fallback)
- pdfjs-dist/legacy - PDF parsing and text extraction (fallback for Node.js environment)
- OpenAI Vision API - Image-based text extraction for JPG/PNG files (fallback)

**File Handling**:
- multer - Multipart form data and file upload processing
- File system operations for temporary file storage

**Database**:
- snowflake-sdk - Snowflake database connection and operations
- Direct SQL execution for database operations (no ORM)

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal - Development error overlay
- @replit/vite-plugin-cartographer - Replit-specific development tooling
- tsx - TypeScript execution for development server

**Build Tools**:
- esbuild - Server-side bundling for production
- Vite - Frontend bundling and development server

## Recent Changes (October 19, 2025)

### Document AI Integration
- Integrated Snowflake Document AI model (CONTRACTBUDDY.CONTRACTBUDDY_SCHEMA.CONTRACTBUDDY) for document parsing
- Replaced traditional OCR/text extraction with Document AI PREDICT function using GET_PRESIGNED_URL
- Created CONTRACT_UPLOADS Snowflake stage for temporary document storage
- Implemented automatic file cleanup after processing
- Added comprehensive security hardening:
  - MIME type-based file extensions (no user-controlled data)
  - Strict regex validation for all file paths
  - Parameterized queries for SQL injection prevention
  - Sanitized temporary file naming using randomUUID only

### Top 5 Clause Analysis
- Modified analysis to select and analyze only the top 5 highest-priority clauses
- Priority ranking: limitation_of_liability (1), indemnification (2), intellectual_property (3), termination (4), payment_terms (5)
- Removed hardcoded fallback clauses - only analyzes clauses actually found in uploaded contracts

### Security Improvements
- Eliminated all SQL injection vulnerabilities in Document AI integration
- File paths use only safe, controlled values (UUID + MIME extension)
- Stage file paths validated with regex: `^doc_\d+\.(pdf|docx|jpg|png|bin)$`
- Local file paths validated to be in tmp directory
- No user-provided filenames used in SQL statements

### AIML API Integration with GPT-5 (October 19, 2025)
- Integrated AIML API gateway for unified access to 300+ AI models
- Configured OpenAI SDK to use AIML API base URL (https://api.aimlapi.com/v1)
- **Using GPT-5** through AIML API for advanced contract analysis
- Updated prompts to generate **actual rewritten clause text** instead of generic advice
- Each "suggestion" field now contains complete replacement clause language
- Fallback system also provides rewritten clauses for all top 5 clause types
- Automatic fallback to OPENAI_API_KEY if AIML_API_KEY not available
- Provides access to models from OpenAI, Anthropic, Google, and other providers

### Clause Rewriting Implementation (October 19, 2025)
- Changed GPT model from GPT-3.5-turbo to **GPT-5** for better quality recommendations
- Updated all analysis prompts to explicitly request complete rewritten clause text
- Fallback analysis now provides actual clause rewrites for:
  - Limitation of Liability (includes carve-outs for gross negligence and data breaches)
  - Termination (balanced notice periods and transition assistance)
  - Intellectual Property (customer ownership of custom work)
  - Indemnification (mutual obligations with proper protections)
  - Payment Terms (30-day terms with dispute provisions)
  - Confidentiality (balanced obligations with clear exclusions)
  - Warranty (performance standards with remedies)
  - Governing Law (customer-favorable jurisdiction)
- "Suggestion" field now contains actual replacement text that can be used directly in contracts