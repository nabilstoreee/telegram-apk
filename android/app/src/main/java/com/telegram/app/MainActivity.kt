package com.telegram.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.telegram.app.data.model.*
import com.telegram.app.ui.components.TelegramDrawerContent
import com.telegram.app.ui.screens.AuthScreen
import com.telegram.app.ui.screens.ChatDetailScreen
import com.telegram.app.ui.screens.ChatListScreen
import com.telegram.app.ui.theme.TelegramTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            var isDarkTheme by remember { mutableStateOf(true) }
            var currentUser by remember {
                mutableStateOf<User?>(
                    User(
                        id = "user-admin",
                        username = "nabilassihidiqi",
                        name = "Nabil Assihidiqi",
                        phone = "+62 812-3456-7890",
                        color = "#5288C1",
                        bio = "Telegram Administrator",
                        isVerified = true
                    )
                )
            }

            // Seed initial chats matching Telegram Web
            val defaultChats = remember {
                mutableStateListOf(
                    Chat(
                        id = "chat-saved",
                        name = "Pesan Tersimpan",
                        type = ChatType.SAVED,
                        folder = ChatFolder.PERSONAL,
                        isSavedMessages = true,
                        isPinned = true,
                        lastMessage = "Selamat datang di Telegram Android!",
                        lastMessageTime = "12:00",
                        unreadCount = 0,
                        messages = listOf(
                            Message(
                                id = "msg-1",
                                chatId = "chat-saved",
                                senderId = "user-admin",
                                senderName = "Saya",
                                text = "Selamat datang di Telegram Android! Simpan pesan, media, dan catatan Anda di sini.",
                                timestamp = "12:00",
                                isOutgoing = true
                            )
                        )
                    ),
                    Chat(
                        id = "chat-telegram-official",
                        name = "Telegram",
                        type = ChatType.CHANNEL,
                        folder = ChatFolder.CHANNELS,
                        color = "#5288C1",
                        lastMessage = "Akun Anda telah berhasil diverifikasi.",
                        lastMessageTime = "11:45",
                        unreadCount = 1,
                        messages = listOf(
                            Message(
                                id = "msg-2",
                                chatId = "chat-telegram-official",
                                senderId = "system",
                                senderName = "Telegram",
                                text = "Selamat datang! Akun Anda siap digunakan di semua perangkat.",
                                timestamp = "11:45",
                                isOutgoing = false
                            )
                        )
                    ),
                    Chat(
                        id = "chat-community",
                        name = "Komunitas Telegram Indonesia",
                        type = ChatType.GROUP,
                        folder = ChatFolder.GROUPS,
                        color = "#4FAE4E",
                        isOnline = true,
                        lastMessage = "Halo semuanya! Selamat bergabung!",
                        lastMessageTime = "10:30",
                        unreadCount = 3,
                        messages = listOf(
                            Message(
                                id = "msg-3",
                                chatId = "chat-community",
                                senderId = "user-member",
                                senderName = "Budi",
                                text = "Halo semuanya! Selamat bergabung!",
                                timestamp = "10:30",
                                isOutgoing = false
                            )
                        )
                    )
                )
            }

            TelegramTheme(darkTheme = isDarkTheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    if (currentUser == null) {
                        AuthScreen(
                            onLoginSuccess = { user ->
                                currentUser = user
                            }
                        )
                    } else {
                        val navController = rememberNavController()
                        val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
                        val scope = rememberCoroutineScope()

                        ModalNavigationDrawer(
                            drawerState = drawerState,
                            drawerContent = {
                                TelegramDrawerContent(
                                    user = currentUser!!,
                                    isDarkTheme = isDarkTheme,
                                    onToggleDarkTheme = { isDarkTheme = !isDarkTheme },
                                    onSavedMessagesClick = {
                                        val savedChat = defaultChats.find { it.isSavedMessages }
                                        if (savedChat != null) {
                                            navController.navigate("chat/${savedChat.id}")
                                        }
                                    },
                                    onCloseDrawer = {
                                        scope.launch { drawerState.close() }
                                    }
                                )
                            }
                        ) {
                            NavHost(navController = navController, startDestination = "chat_list") {
                                composable("chat_list") {
                                    ChatListScreen(
                                        chats = defaultChats,
                                        onChatClick = { chat ->
                                            navController.navigate("chat/${chat.id}")
                                        },
                                        onOpenDrawer = {
                                            scope.launch { drawerState.open() }
                                        }
                                    )
                                }
                                composable("chat/{chatId}") { backStackEntry ->
                                    val chatId = backStackEntry.arguments?.getString("chatId")
                                    val selectedChat = defaultChats.find { it.id == chatId }
                                    if (selectedChat != null) {
                                        ChatDetailScreen(
                                            chat = selectedChat,
                                            currentUserId = currentUser!!.id,
                                            onBackClick = { navController.popBackStack() }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
