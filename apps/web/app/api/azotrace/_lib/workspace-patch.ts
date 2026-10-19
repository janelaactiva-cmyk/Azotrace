import { mergeWorkspaceState } from '../../../dashboard/_lib/workspace-merge';
export { WorkspaceConflict } from '../../../dashboard/_lib/workspace-merge';
const permissions: Record<string, string> = {
  records: 'production.write', qualityRecords: 'production.write', imports: 'production.write',
  batches: 'lots.manage', products: 'products.manage', fields: 'products.manage',
  productType: 'products.manage', stages: 'business.manage', units: 'business.manage',
  business: 'business.manage', completed: 'business.manage', onboardingStep: 'business.manage',
  publicSite: 'traceability.manage', publications: 'traceability.manage', qrCodes: 'traceability.manage',
};
export function mergeWorkspace<T extends object>(current: T, base: T, next: T, allowed: string[]): T {
  return mergeWorkspaceState(current, base, next, key => {
    if (!Object.hasOwn(permissions, key) || !allowed.includes(permissions[key]!)) throw new Error('Sem permissão para alterar: ' + key);
  });
}
