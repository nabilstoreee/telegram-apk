package com.telegram.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.telegram.app.data.model.Chat
import com.telegram.app.ui.theme.*

@Composable
fun ChatListScreen(
    chats: List<Chat>,
    onChatClick: (Chat) -> Unit,
    onOpenDrawer: () -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }

    val filteredChats = remember(chats, searchQuery) {
        if (searchQuery.isBlank()) chats
        else {
            chats.filter { chat ->
                chat.name.contains(searchQuery, ignoreCase = true) ||
                        chat.lastMessage.contains(searchQuery, ignoreCase = true)
            }
        }
    }

    Scaffold(
        containerColor = Color(0xFF0E1621),
        topBar = {
            // Telegram Search Bar matching Photo 3
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF17212B))
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(Color(0xFF242F3D))
                        .padding(horizontal = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onOpenDrawer,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Menu",
                            tint = TelegramTextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 6.dp)
                    ) {
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = "Cari obrolan, pesan, atau @username...",
                                color = TelegramTextSecondary,
                                fontSize = 14.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        TextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            singleLine = true,
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    IconButton(
                        onClick = { },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Cari",
                            tint = TelegramTextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* New Chat */ },
                containerColor = TelegramBlue,
                contentColor = Color.White,
                shape = CircleShape,
                modifier = Modifier.padding(bottom = 8.dp, end = 8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "Tulis Pesan",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .background(Color(0xFF0E1621))
                .padding(innerPadding)
        ) {
            // Arsip Obrolan (Pesan Tersimpan) Row matching Photo 3
            item(key = "archive_header") {
                ArchiveItemRow(
                    onClick = {
                        val savedChat = chats.find { it.isSavedMessages } ?: chats.firstOrNull()
                        savedChat?.let { onChatClick(it) }
                    }
                )
                HorizontalDivider(
                    color = Color(0xFF10161D),
                    thickness = 0.5.dp,
                    modifier = Modifier.padding(start = 76.dp)
                )
            }

            // Normal Chats (manda, Nabil Assihidiqi, etc.)
            items(
                items = filteredChats.filter { !it.isSavedMessages },
                key = { it.id }
            ) { chat ->
                ChatItemRow(
                    chat = chat,
                    onClick = { onChatClick(chat) }
                )
                HorizontalDivider(
                    color = Color(0xFF10161D),
                    thickness = 0.5.dp,
                    modifier = Modifier.padding(start = 76.dp)
                )
            }
        }
    }
}

@Composable
fun ArchiveItemRow(onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xFF242F3D)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = "Arsip",
                tint = TelegramTextSecondary,
                modifier = Modifier.size(26.dp)
            )
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Arsip Obrolan",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Pesan Tersimpan",
                color = TelegramTextSecondary,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
fun ChatItemRow(
    chat: Chat,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar circle with online indicator dot
        Box(
            modifier = Modifier.size(52.dp),
            contentAlignment = Alignment.Center
        ) {
            val bg = try {
                Color(android.graphics.Color.parseColor(chat.color.ifBlank { "#5288C1" }))
            } catch (e: Exception) {
                TelegramBlue
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape)
                    .background(bg),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = chat.name.take(1).uppercase(),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            }
            if (chat.isOnline) {
                Box(
                    modifier = Modifier
                        .size(13.dp)
                        .align(Alignment.BottomEnd)
                        .clip(CircleShape)
                        .background(Color(0xFF4FAE4E))
                )
            }
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = chat.name,
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (chat.isMuted) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Muted",
                            tint = TelegramTextSecondary,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
                Text(
                    text = chat.lastMessageTime,
                    color = TelegramTextSecondary,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(3.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = chat.lastMessage,
                    color = TelegramTextSecondary,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                // Double check status mark in light blue
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Terkirim",
                        tint = TelegramLightBlue,
                        modifier = Modifier.size(14.dp)
                    )
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Dibaca",
                        tint = TelegramLightBlue,
                        modifier = Modifier
                            .size(14.dp)
                            .offset(x = (-6).dp)
                    )
                }
            }
        }
    }
}
