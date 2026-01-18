export interface PresenceUser {
  clientId: string;
  userId: string;
  name: string;
  avatarColor: string;
  cursor?: { blockId?: string; offset?: number };
  lastSeen: number;
}

export interface AwarenessState {
  roomId: string;
  peers: PresenceUser[];
}