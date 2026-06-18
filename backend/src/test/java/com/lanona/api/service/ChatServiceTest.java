package com.lanona.api.service;

import com.lanona.api.entity.ChatThread;
import com.lanona.api.entity.User;
import com.lanona.api.exception.ForbiddenException;
import com.lanona.api.exception.ResourceNotFoundException;
import com.lanona.api.repository.ChatMessageRepository;
import com.lanona.api.repository.ChatThreadRepository;
import com.lanona.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatThreadRepository chatThreadRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatService chatService;

    @Test
    void sendMessage_clienteCannotSendToAnotherUsersThread() {
        UUID threadUserId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID(); // diferente da thread, e nao e' admin

        assertThatThrownBy(() -> chatService.sendMessage(threadUserId, senderId, false, "oi"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void sendMessage_adminCanSendToAnyThread() {
        UUID threadUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        ChatThread thread = ChatThread.builder()
                .userId(threadUserId)
                .user(User.builder().id(threadUserId).build())
                .build();
        when(chatThreadRepository.findById(threadUserId)).thenReturn(Optional.of(thread));
        lenient().when(userRepository.getReferenceById(adminId)).thenReturn(User.builder().id(adminId).build());
        lenient().when(chatMessageRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        chatService.sendMessage(threadUserId, adminId, true, "ola, posso ajudar?");
        // nao lanca excecao -> RBAC permitiu o admin
    }

    @Test
    void getMessages_clienteCannotReadAnotherUsersThread() {
        UUID threadUserId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();

        assertThatThrownBy(() -> chatService.getMessages(threadUserId, requesterId, false, PageRequest.of(0, 10)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void markAsRead_onlyAdminCanResetAdminUnreadCount() {
        UUID threadUserId = UUID.randomUUID();

        assertThatThrownBy(() -> chatService.markAsRead(threadUserId, threadUserId, false, "admin"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void markAsRead_userCanOnlyResetOwnThread() {
        UUID threadUserId = UUID.randomUUID();
        UUID someoneElse = UUID.randomUUID();

        assertThatThrownBy(() -> chatService.markAsRead(threadUserId, someoneElse, false, "user"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void markAsRead_throwsNotFound_whenThreadDoesNotExistYet() {
        UUID threadUserId = UUID.randomUUID();
        when(chatThreadRepository.findById(threadUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.markAsRead(threadUserId, threadUserId, false, "user"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
