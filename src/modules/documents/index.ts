/**
 * Documents public API.
 *
 * Format-neutral generation contracts and technical adapters. Other modules
 * must import Documents only through this entrypoint.
 */

export type {
  DocumentGenerationPort,
  DocumentGenerationRequest,
} from './domain/document-generation-port';
export { HttpDocumentServiceAdapter } from './infrastructure/http-document-service.adapter';
