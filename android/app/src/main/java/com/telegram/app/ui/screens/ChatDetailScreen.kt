package com.telegram.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SentimentSatisfiedAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.telegram.app.data.model.Chat
import com.telegram.app.data.model.Message
import com.telegram.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    chat: Chat,
    currentUserId: String,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var messagesList by remember { mutableStateOf(chat.messages) }
    var inputMessage by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    fun sendMessage() {
        if (inputMessage.isBlank()) return
        val timeNow = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
        val newMsg = Message(
            id = UUID.randomUUID().toString(),
            chatId = chat.id,
            senderId = currentUserId,
            senderName = "Saya",
            text = inputMessage.trim(),
            timestamp = timeNow,
            isRead = true,
            isOutgoing = true
        )
        messagesList = messagesList + newMsg
        inputMessage = ""
        coroutineScope.launch {
            listState.animateScrollToItem(messagesList.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(android.graphics.Color.parseColor(chat.color.ifBlank { "#5288C1" }))),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (chat.isSavedMessages) "★" else chat.name.take(1).uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = chat.name,
                                color = TelegramTextPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = if (chat.isSavedMessages) "obrolan pribadi" else if (chat.isOnline) "online" else "terakhir dilihat hari ini",
                                color = if (chat.isOnline) TelegramGreen else TelegramTextSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Kembali",
                            tint = TelegramTextPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { /* Call Action */ }) {
                        Icon(
                            imageVector = Icons.Default.Call,
                            contentDescription = "Panggilan",
                            tint = TelegramTextPrimary
                        )
                    }
                    IconButton(onClick = { /* Options */ }) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Pilihan",
                            tint = TelegramTextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        bottomBar = {
            // Telegram Bottom Input Bar
            Surface(
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { /* Open Emoji */ }) {
                        Icon(
                            imageVector = Icons.Default.SentimentSatisfiedAlt,
                            contentDescription = "Emoji",
                            tint = TelegramTextSecondary
                        )
                    }

                    TextField(
                        value = inputMessage,
                        onValueChange = { inputMessage = it },
                        placeholder = { Text("Pesan...", color = TelegramTextSecondary, fontSize = 15.sp) },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(24.dp))
                            .background(TelegramDarkInput),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = TelegramDarkInput,
                            unfocusedContainerColor = TelegramDarkInput,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = TelegramTextPrimary,
                            unfocusedTextColor = TelegramTextPrimary
                        ),
                        maxLines = 4
                    )

                    IconButton(onClick = { /* Attach */ }) {
                        Icon(
                            imageVector = Icons.Default.AttachFile,
                            contentDescription = "Lampiran",
                            tint = TelegramTextSecondary
                        )
                    }

                    // Dynamic Mic / Send Icon
                    IconButton(
                        onClick = {
                            if (inputMessage.isNotBlank()) sendMessage()
                        }
                    ) {
                        if (inputMessage.isNotBlank()) {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = "Kirim",
                                tint = TelegramLightBlue
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Mic,
                                contentDescription = "Pesan Suara",
                                tint = TelegramTextSecondary
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            state = listState,
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(messagesList, key = { it.id }) { message ->
                MessageBubble(message = message)
            }
        }
    }
}

@Composable
fun MessageBubble(message: Message) {
    val isOut = message.isOutgoing
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isOut) Arrangement.End else Arrangement.Start
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 290.dp)
                .clip(
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isOut) 16.dp else 4.dp,
                        bottomEnd = if (isOut) 4.dp else 16.dp
                    )
                )
                .background(if (isOut) TelegramOutBubble else TelegramInBubble)
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Column {
                Text(
                    text = message.text,
                    color = TelegramTextPrimary,
                    fontSize = 15.sp,
                    lineHeight = 20.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.align(Alignment.End),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = message.timestamp,
                        color = TelegramTextSecondary,
                        fontSize = 11.sp
                    )
                    if (isOut) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = if (message.isRead) Icons.Default.DoneAll else Icons.Default.Check,
                            contentDescription = "Status",
                            tint = TelegramLightBlue,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }
        }
    }
}
