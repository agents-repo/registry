import { buildQualifiedId } from '../namespace';

export function printCreateSuccess(namespace: string, packageId: string): void {
  const qualifiedId = buildQualifiedId(namespace, packageId);
  console.log('\nPackage created successfully\n');
  console.log(`Location: packages/${namespace}/${packageId}/\n`);
  console.log('Next steps:');
  console.log(`  1. npm run package:build -- --package ${qualifiedId}`);
  console.log(`  2. npm run package:validate-artifacts -- --package ${qualifiedId}\n`);
}
