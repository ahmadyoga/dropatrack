// Cap on the in-memory chat history. Older messages stay in the database
// but are dropped from the client array so render cost stays flat over
// long sessions.
export const MAX_CHAT_MESSAGES = 200;

export function capMessages<T>(messages: T[], max = MAX_CHAT_MESSAGES): T[] {
  return messages.length > max ? messages.slice(messages.length - max) : messages;
}
