import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing.
 *
 * argon2id with OWASP's 2024 recommended parameters (19 MiB, 2 iterations).
 * The same values are used by the seed script so a seeded admin can log in.
 */
@Injectable()
export class PasswordService {
  private readonly options = {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  } as const;

  hash(plain: string): Promise<string> {
    return hash(plain, this.options);
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain, this.options);
    } catch {
      // A malformed stored hash must read as "wrong password", not as a 500.
      return false;
    }
  }
}
