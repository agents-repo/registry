import crypto from 'node:crypto';
import fs from 'node:fs';

export class Checksum {
  static sha256(filePath: string): string {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
