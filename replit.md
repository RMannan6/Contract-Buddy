# ContractBuddy - AI-Powered Contract Analysis Platform

## Overview
ContractBuddy is a web application designed to assist users in analyzing legal contracts using artificial intelligence. The platform enables users to upload contracts in various formats (PDF, DOCX, images), whereupon it extracts text, identifies key clauses, and compares them against a repository of "gold standard" clauses. Its primary purpose is to provide negotiation recommendations, generate plain-English explanations of potentially risky terms, and suggest improvements to better safeguard user interests. The project aims to streamline contract review processes, offering a significant advantage in legal and business negotiations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React** and **TypeScript**, using **Vite** for tooling. It leverages **shadcn/ui** (based on Radix UI and styled with **Tailwind CSS** "new-york" theme) for UI components. **wouter** handles client-side routing, primarily for home and analysis pages. **TanStack Query** manages server state and API caching, complemented by local React state for UI interactions. The styling employs a custom Tailwind CSS theme with a blue accent and supports both light and dark modes.

### Backend Architecture
The backend runs on **Node.js** with **Express.js** and **TypeScript**. It provides a **RESTful API** for file uploads, contract analysis, and result retrieval. File processing uses **Multer** for multipart uploads (PDF, DOCX, JPG, PNG, up to 10MB), with **Snowflake Document AI** as the primary text and clause extractor, falling back to native PDF/DOCX extraction or **OpenAI Vision API** for images when necessary. **Snowflake Document AI Model** is used for document parsing. **AIML API** (accessing **OpenAI GPT-5/4o**) performs advanced clause analysis, semantic comparison against gold standards, and generates rewritten clause text. Development features include Vite middleware, custom logging, and error handling.

### Data Storage
**Snowflake** serves as the cloud data warehouse, accessed via `snowflake-sdk`. A dedicated `CONTRACT_UPLOADS` stage handles temporary document storage. Key tables include `documents`, `clauses`, `gold_standard_clauses`, and `analysis_results`. IDs are generated using explicit Snowflake sequences. Documents and staged files have an automatic 24-hour expiration and cleanup. Analysis results are stored as JSON strings. Security measures include sanitized file paths, strict regex validation for stage files, parameterized queries, and environment variable-based database credentials.

### System Design Choices
- **Two-Party Identification**: The system extracts and distinguishes two parties in a contract using GPT-4o, allowing users to select which party they represent for personalized recommendations.
- **Top 5 Clause Analysis**: Analysis focuses on the top 5 highest-priority clauses (limitation_of_liability, indemnification, intellectual_property, termination, payment_terms).
- **Complete Clause Rewrites**: AI-generated "suggestions" are complete, legally sound replacement clauses, not just summaries or advice, with robust fallback templates for detailed clause generation.
- **Tracked Changes Document Generation**: A reliable two-part document generation process clearly outlines suggested changes with explanations, original text, and rewritten text.
- **Optional Document AI**: Integration of Snowflake Document AI is optional via an environment variable, allowing fallback to native OCR methods.

## External Dependencies

**AI Services**:
- **AIML API**: Unified gateway for 300+ AI models, used for advanced contract analysis and text generation.
- **OpenAI GPT-5/4o** (via AIML API): Core AI model for advanced clause analysis and rewritten clause generation.

**Document Processing**:
- **Snowflake Document AI**: Primary service for document parsing and clause extraction.
- **mammoth**: DOCX text extraction (fallback).
- **pdfjs-dist/legacy**: PDF parsing and text extraction (fallback).
- **OpenAI Vision API**: Image-based text extraction for JPG/PNG (fallback).

**File Handling**:
- **multer**: Handles multipart form data and file uploads.

**Database**:
- **snowflake-sdk**: Connects to and operates with the Snowflake cloud data warehouse.
## Recent Changes (October 19, 2025)

### Enhanced Risk Explanations (Latest Update)
- **Detailed "Why This Change" sections**: Significantly improved the depth and clarity of risk explanations for every contract clause
  - Each explanation now covers 3 key points: (1) specific risks and liabilities the user faces, (2) why the current wording is unfavorable or problematic, (3) how the proposed changes reduce risk and better protect the user
  - Explanations are 3-5 sentences with concrete, real-world examples that non-lawyers can understand
  - Enhanced AI prompt to require detailed explanations with specific scenarios of financial loss, legal trouble, or business problems
  - Updated fallback explanations for all clause types with the same level of detail
  - **Example**: Limitation of liability now explains how low caps leave you vulnerable to major data breaches, why excluding gross negligence allows reckless behavior, and how the revised version protects full recovery for serious wrongdoing

### Party Identification System
- **Two-party extraction**: System extracts both parties' names from contracts using GPT-4o via AIML API
- **Database schema**: Added `party1_name`, `party2_name`, and `user_selected_party` columns to documents table
- **Party selection dialog**: Users choose which party they represent and their role (drafting vs. adverse party)
- **Personalized analysis**: Recommendations include specific party names and are tailored to user's role
- **Fixed party persistence bug**: Party names are now properly saved to database after extraction using new `PartyNamesSchema` and `updateDocumentPartyNames()` method

### UI/UX Improvements
- **Upload area reset**: Upload section automatically resets when party dialog is closed, allowing immediate re-upload
- **Error handling**: Enhanced error messages throughout the application with user-friendly explanations
- **Progress indicators**: Upload and analysis progress now reset properly on errors
- **Toaster notifications**: Added toast component for better error and success feedback

### PDF Processing Fixes
- **PDF.js worker**: Changed from HTTPS CDN to local file path for Node.js compatibility
- **Error handling**: Better validation for empty or corrupted PDFs with clear error messages
- **OCR fallback**: Robust fallback system when Document AI is unavailable

### API Endpoints
- `POST /api/upload` - Upload contract file
- `POST /api/document/:documentId/extract-parties` - Extract and save party names using AI
- `GET /api/document/:documentId/party-info` - Retrieve party information
- `POST /api/document/:documentId/party-info` - Save user's party selection and role
- `POST /api/analyze/:documentId` - Analyze contract with personalized recommendations
- `GET /api/analysis/:documentId` - Retrieve analysis results
- `GET /api/document/:documentId/revised` - Download revised contract with all changes
- `GET /api/document/:documentId/revised-with-changes` - Download contract with tracked changes and explanations
