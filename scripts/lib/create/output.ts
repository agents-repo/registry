export function printCreateSuccess(packageId: string): void {
  console.log('\nPackage created successfully\n');
  console.log(`Location: packages/${packageId}/\n`);
  console.log('Next steps:');
  console.log(`  1. npm run package:build -- --package ${packageId}`);
  console.log(`  2. npm run package:validate-artifacts -- --package ${packageId}\n`);
}
