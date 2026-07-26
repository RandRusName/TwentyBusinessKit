/**
 * Commercial Proposals public API.
 *
 * Stable repository contracts used by other app layers. Most proposal domain
 * code still lives in legacy `src/domain` / `src/services` folders during
 * incremental migration — see docs/architecture/migration-plan.md.
 */

export type {
  ProposalDraftRepository,
  ProposalGenerationRepository,
} from './application/proposal-repositories';
