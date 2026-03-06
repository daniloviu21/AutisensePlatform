import jwt from "jsonwebtoken";

type JwtPayload = {
  sub: string;
  role: string;
  clinicId: number | null;
};

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;

const accessTtlMin = Number(process.env.ACCESS_TOKEN_TTL_MIN ?? 15);
const refreshTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, accessSecret, { expiresIn: `${accessTtlMin}m` });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: `${refreshTtlDays}d` });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as JwtPayload;
}