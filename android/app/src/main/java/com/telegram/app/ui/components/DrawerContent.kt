package com.telegram.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
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
    modifier: Modifier = Modifier
) {
    ModalDrawerSheet(
        modifier = modifier.width(300.dp),
        drawerContainerColor = MaterialTheme.colorScheme.surface
    ) {
        // User Profile Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(TelegramDarkInput)
                .padding(16.dp)
        ) {
            Column {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(TelegramBlue),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = user.name.take(1).uppercase(),
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = user.name,
                    color = TelegramTextPrimary,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = user.phone,
                    color = TelegramTextSecondary,
                    fontSize = 13.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Drawer Menu Items
        DrawerItem(
            icon = Icons.Outlined.BookmarkBorder,
            label = "Pesan Tersimpan",
            onClick = {
                onCloseDrawer()
                onSavedMessagesClick()
            }
        )
        DrawerItem(
            icon = Icons.Outlined.Group,
            label = "Grup Baru",
            onClick = { onCloseDrawer() }
        )
        DrawerItem(
            icon = Icons.Outlined.PersonOutline,
            label = "Kontak",
            onClick = { onCloseDrawer() }
        )
        DrawerItem(
            icon = Icons.Outlined.Call,
            label = "Panggilan",
            onClick = { onCloseDrawer() }
        )
        DrawerItem(
            icon = Icons.Outlined.Settings,
            label = "Pengaturan",
            onClick = { onCloseDrawer() }
        )

        HorizontalDivider(color = TelegramDarkDivider, thickness = 1.dp, modifier = Modifier.padding(vertical = 8.dp))

        // Night Mode Toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onToggleDarkTheme() }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Outlined.DarkMode,
                    contentDescription = "Mode Malam",
                    tint = TelegramTextSecondary
                )
                Spacer(modifier = Modifier.width(24.dp))
                Text(
                    text = "Mode Malam",
                    color = TelegramTextPrimary,
                    fontSize = 15.sp
                )
            }
            Switch(
                checked = isDarkTheme,
                onCheckedChange = { onToggleDarkTheme() },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = TelegramBlue
                )
            )
        }
    }
}

@Composable
private fun DrawerItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = TelegramTextSecondary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(24.dp))
        Text(
            text = label,
            color = TelegramTextPrimary,
            fontSize = 15.sp
        )
    }
}
