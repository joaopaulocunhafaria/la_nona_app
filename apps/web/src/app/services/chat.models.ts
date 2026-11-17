export interface ChatMessageResponse {
	id: string;
	senderId: string;
	text: string;
	isAdmin: boolean;
	sentAt: string;
}

export interface ChatThreadResponse {
	userId: string;
	userName: string;
	lastMessage: string | null;
	updatedAt: string;
	adminUnreadCount: number;
	userUnreadCount: number;
}

export interface ChatMessagePage {
	content: ChatMessageResponse[];
	totalElements: number;
	totalPages: number;
	number: number;
	size: number;
}
