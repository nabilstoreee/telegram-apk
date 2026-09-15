package com.telegram.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.telegram.app.data.model.User
import com.telegram.app.ui.theme.*

@Composable
fun TelegramDrawerContent(
    user: User,
    isDarkTheme: Boolean,
    onToggleDarkTheme: () -> Unit,
    onSavedMessagesClick: () -> Unit,
    onCloseDrawer: () -> Unit,
    onLogoutClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    ModalDrawerSheet(
        modifier = modifier.width(310.dp),
        drawerContainerColor = Color(0xFF17212B)
    ) {
        // User Profile Header (Matching Photo 2)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF242F3D))
                .padding(16.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    // Avatar
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(TelegramBlue),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = user.name.take(1).uppercase(),
                            color = Color.White,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Top Right Controls (Moon for theme & Close X)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onToggleDarkTheme, modifier = Modifier.size(36.dp)) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = "Mode Malam",
                                tint = TelegramTextSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        IconButton(onClick = onCloseDrawer, modifier = Modifier.size(36.dp)) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Tutup",
                                tint = TelegramTextSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Name with Verified Blue Checkmark
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = user.name,
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(TelegramLightBlue),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Verified",
                            tint = Color.White,
                            modifier = Modifier.size(11.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                // Phone number with chevron
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = user.phone,
                        color = TelegramTextSecondary,
                        fontSize = 13.sp
                    )
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "Detail Akun",
                        tint = TelegramTextSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Menu Items matching Photo 2
        DrawerItem(
            icon = Icons.Default.Person,
            label = "Profil Saya",
            onClick = { onCloseDrawer() }
        )
        DrawerItem(
            icon = Icons.Default.AccountBox,
            label = "Grup Baru",
            onClick = { onCloseDrawer() }
        )
        DrawerItem(
            icon = Icons.Default.Call,
            label = "Kontak",
            onClick = { onCloseDrawer() }
        )
        DrawerItem(
            icon = Icons.Default.Star,
            label = "Pesan Tersimpan",
            onClick = {
                onCloseDrawer()
                onSavedMessagesClick()
            }
        )
        DrawerItem(
            icon = Icons.Default.Settings,
            label = "Pengaturan",
            onClick = { onCloseDrawer() }
        )

        HorizontalDivider(
            color = Color(0xFF10161D),
            thickness = 1.dp,
            modifier = Modifier.padding(vertical = 6.dp)
        )

        DrawerItem(
            icon = Icons.Default.Add,
            label = "Undang Teman",
            onClick = { onCloseDrawer() }
        )

        // Install Telegram Item with badge
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onCloseDrawer() }
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(TelegramLightBlue),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Telegram",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = "Install Telegram",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Layar Utama / Desktop",
                        color = TelegramTextSecondary,
                        fontSize = 11.sp
                    )
                }
            }
            Icon(
                imageVector = Icons.Default.KeyboardArrowDown,
                contentDescription = "Download",
                tint = TelegramTextSecondary,
                modifier = Modifier.size(18.dp)
            )
        }

        DrawerItem(
            icon = Icons.Default.Info,
            label = "Fitur Telegram",
            onClick = { onCloseDrawer() }
        )

        DrawerItem(
            icon = Icons.Default.ExitToApp,
            label = "Keluar dari Akun",
            tint = Color(0xFFFF595A),
            onClick = {
                onCloseDrawer()
                onLogoutClick()
            }
        )
    }
}

@Composable
private fun DrawerItem(
    icon: ImageVector,
    label: String,
    tint: Color = TelegramTextSecondary,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = tint,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(22.dp))
        Text(
            text = label,
            color = if (tint == TelegramTextSecondary) Color.White else tint,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
