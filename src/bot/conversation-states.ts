export type ConversationStep =
  | 'idle'
  | 'awaiting_service'
  | 'awaiting_day'
  | 'awaiting_time';

export type ConversationState = {
  step: ConversationStep;
  barbershopId: string;
  selectedServiceId?: string;
  selectedDay?: string;
  selectedBarberId?: string;
};

const conversations = new Map<string, ConversationState>();

export const conversationStore = {
  get(phone: string): ConversationState | null {
    return conversations.get(phone) ?? null;
  },

  set(phone: string, state: ConversationState): void {
    conversations.set(phone, state);
  },

  clear(phone: string): void {
    conversations.delete(phone);
  },
};
