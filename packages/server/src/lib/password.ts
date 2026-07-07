import bcrypt from "bcryptjs";

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (hash: string, plain: string) =>
  bcrypt.compare(plain, hash);
