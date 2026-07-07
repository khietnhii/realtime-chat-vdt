export type {
  UserDTO as User,
  MessageDTO,
  ConversationDTO as Conversation,
  ConversationMemberLite,
} from "@chat/shared";

import type { MessageDTO } from "@chat/shared";

export type SendStatus = "sending" | "sent" | "failed";

export interface Message extends MessageDTO {
  status?: SendStatus;
}
