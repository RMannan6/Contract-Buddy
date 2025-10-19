import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Documents table schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  userPartyType: text("user_party_type"), // "drafting" or "adverse"
  party1Name: text("party1_name"), // First party in contract
  party2Name: text("party2_name"), // Second party in contract
  userSelectedParty: text("user_selected_party"), // Which party the user is (party1 or party2)
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Party information update schema
export const PartyInfoSchema = z.object({
  userPartyType: z.enum(["drafting", "adverse"]),
  party1Name: z.string().nullable().optional(),
  party2Name: z.string().nullable().optional(),
  userSelectedParty: z.enum(["party1", "party2"]).optional(),
});

export type PartyInfo = z.infer<typeof PartyInfoSchema>;

// Clauses table schema for the analyzed contract clauses
export const clauses = pgTable("clauses", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  content: text("content").notNull(),
  type: text("type"),
  riskLevel: text("risk_level"),
  position: integer("position").notNull(),
});

export const insertClauseSchema = createInsertSchema(clauses).omit({
  id: true,
});

export type InsertClause = z.infer<typeof insertClauseSchema>;
export type Clause = typeof clauses.$inferSelect;

// Gold standard example clauses for comparison
export const goldStandardClauses = pgTable("gold_standard_clauses", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding"),
  description: text("description"),
  metadata: jsonb("metadata"),
});

export const insertGoldStandardClauseSchema = createInsertSchema(goldStandardClauses).omit({
  id: true,
  embedding: true,
  metadata: true,
});

export type InsertGoldStandardClause = z.infer<typeof insertGoldStandardClauseSchema>;
export type GoldStandardClause = typeof goldStandardClauses.$inferSelect;

// Analysis results schema
export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  negotiationPoints: jsonb("negotiation_points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;

// Analysis negotiation point schema
export const NegotiationPointSchema = z.object({
  title: z.string(),
  originalClause: z.string(),
  explanation: z.string(),
  suggestion: z.string(),
  riskLevel: z.enum(["high", "medium", "low"]),
});

export type NegotiationPoint = z.infer<typeof NegotiationPointSchema>;

// Additional clause schema for the API
export const ClauseTypeSchema = z.enum([
  "limitation_of_liability",
  "termination",
  "intellectual_property",
  "indemnification",
  "payment_terms",
  "confidentiality",
  "governing_law",
  "warranty",
  "assignment",
  "other"
]);

export type ClauseType = z.infer<typeof ClauseTypeSchema>;

// File upload schemas
export const FileUploadSchema = z.object({
  fileType: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  fileData: z.string(),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;
