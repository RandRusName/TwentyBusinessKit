/**
 * Foundation public API.
 *
 * Shared platform primitives. Other modules must import Foundation only through
 * this entrypoint (or `src/modules/foundation`).
 */

export {
  ApplicationError,
  type ApplicationErrorCode,
} from './domain/application-error';
export {
  TWENTY_COMPATIBILITY,
  isSupportedTwentyVersion,
} from 'src/platform/compatibility/twenty-compatibility';
