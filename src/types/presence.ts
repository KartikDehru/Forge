export interface PresenceCursor {
  blockId?: string;
  /** Caret / selection start inside the block's text. */
  offset?: number;
  /** Selection end; equals `offset` when the selection is collapsed. */
  selectionEnd?: number;
}

export interface PresenceUser {
  clientId: string;
  userId: string;
  name: string;
  avatarColor: string;
  cursor?: PresenceCursor;
  lastSeen: number;
}
