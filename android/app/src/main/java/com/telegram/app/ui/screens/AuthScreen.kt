package com.telegram.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.telegram.app.data.model.User
import com.telegram.app.ui.theme.*

@Composable
fun AuthScreen(
    onLoginSuccess: (User) -> Unit,
    modifier: Modifier = Modifier
) {
    var isRegister by remember { mutableStateOf(false) }
    var username by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val adminUser = remember {
        User(
            id = "user-admin",
            username = "nabilassihidiqi",
            name = "Nabil Assihidiqi",
            phone = "+62 812-3456-7890",
            color = "#5288C1",
            bio = "Telegram Administrator",
            isVerified = true
        )
    }

    val guestUser = remember {
        User(
            id = "user-guest",
            username = "guest",
            name = "Tamu Telegram",
            phone = "+62 888-0000-1111",
            color = "#4FAE4E",
            bio = "Pengguna Tamu"
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Telegram Logo
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(TelegramBlue),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Telegram Logo",
                    tint = Color.White,
                    modifier = Modifier.size(44.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Telegram",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = TelegramTextPrimary
            )

            Text(
                text = if (isRegister) "Daftar akun Telegram baru" else "Masuk ke akun Telegram Anda",
                fontSize = 14.sp,
                color = TelegramTextSecondary
            )

            Spacer(modifier = Modifier.height(28.dp))

            if (isRegister) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Lengkap") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Nomor Telepon (+62...)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = TelegramTextSecondary) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Kata Sandi") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TelegramTextSecondary) },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    val u = if (username.lowercase() == "nabilassihidiqi") adminUser else {
                        User(
                            id = "user-${System.currentTimeMillis()}",
                            username = username.ifBlank { "pengguna" },
                            name = name.ifBlank { username.ifBlank { "Pengguna Telegram" } },
                            phone = phone.ifBlank { "+62 812-0000-0000" }
                        )
                    }
                    onLoginSuccess(u)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TelegramBlue)
            ) {
                Text(
                    text = if (isRegister) "Daftar & Masuk" else "Masuk",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            TextButton(onClick = { isRegister = !isRegister }) {
                Text(
                    text = if (isRegister) "Sudah punya akun? Masuk di sini" else "Belum punya akun? Daftar gratis",
                    color = TelegramLightBlue,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            HorizontalDivider(color = TelegramDarkDivider)
            Spacer(modifier = Modifier.height(16.dp))

            // 1-Click Fast Access Buttons
            OutlinedButton(
                onClick = { onLoginSuccess(adminUser) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("⚡ Masuk Instan Admin (@nabilassihidiqi)", color = TelegramLightBlue)
            }

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedButton(
                onClick = { onLoginSuccess(guestUser) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Masuk Langsung sebagai Tamu", color = TelegramTextSecondary)
            }
        }
    }
}
