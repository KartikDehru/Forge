export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: "owner" | "member" | "guest";
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}