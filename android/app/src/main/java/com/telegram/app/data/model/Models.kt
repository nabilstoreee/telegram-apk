package com.telegram.app.data.model

data class User(
    val id: String,
    val username: String,
    val name: String,
    val phone: String,
    val avatar: String = "",
    val color: String = "#5288C1",
    val bio: String = "",
    val isOnline: Boolean = true,
    val lastSeen: String = "online",
    val isVerified: Boolean = false
)

enum class ChatType {
    DIRECT, GROUP, CHANNEL, SAVED, BOT
}

enum class ChatFolder(val title: String) {
    ALL("Semua"),
    PERSONAL("Pribadi"),
    GROUPS("Grup"),
    CHANNELS("Saluran")
}

data class Message(
    val id: String,
    val chatId: String,
    val senderId: String,
    val senderName: String,
    val text: String,
    val timestamp: String,
    val isRead: Boolean = true,
    val isOutgoing: Boolean = false
)

data class Chat(
    val id: String,
    val name: String,
    val type: ChatType,
    val folder: ChatFolder = ChatFolder.ALL,
    val avatar: String = "",
    val color: String = "#5288C1",
    val lastMessage: String = "",
    val lastMessageTime: String = "",
    val unreadCount: Int = 0,
    val isPinned: Boolean = false,
    val isOnline: Boolean = false,
    val isMuted: Boolean = false,
    val isVerified: Boolean = false,
    val isSavedMessages: Boolean = false,
    val messages: List<Message> = emptyList()
)
