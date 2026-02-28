export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}
