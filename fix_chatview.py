import re

with open('src/components/ChatView.tsx', 'r') as f:
    content = f.read()

# Replace input element with conditional
old_input = """                <input
                  ref={messageInputRef}
                  id="message-input-field"
                  type="text"
                  placeholder="Pesan"
                  value={inputText}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (settings.sendWithEnter && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      } else if (!settings.sendWithEnter && e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }
                  }}
                  className="flex-1 bg-[#242f3d] border border-transparent focus:border-[#5288c1] rounded-xl py-2 px-3.5 text-sm outline-none text-white placeholder-[#7f91a4] transition-all"
                />"""

new_input = """                <input
                  ref={messageInputRef}
                  id="message-input-field"
                  type="text"
                  placeholder={canSendText ? "Pesan" : "Mengirim pesan teks tidak diizinkan di grup ini"}
                  value={inputText}
                  onChange={(e) => handleTyping(e.target.value)}
                  disabled={!canSendText}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (settings.sendWithEnter && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      } else if (!settings.sendWithEnter && e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }
                  }}
                  className={`flex-1 bg-[#242f3d] border border-transparent focus:border-[#5288c1] rounded-xl py-2 px-3.5 text-sm outline-none transition-all ${!canSendText ? 'text-slate-500 placeholder-slate-600 bg-[#242f3d]/50 cursor-not-allowed' : 'text-white placeholder-[#7f91a4]'}`}
                />"""

content = content.replace(old_input, new_input)

# Replace attachment button
old_attach = """              <button
                id="attach-file-btn"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className={`text-[#7f91a4] hover:text-[#5288c1] transition-colors cursor-pointer p-1 shrink-0 ${
                  showAttachmentMenu ? 'text-[#5288c1]' : ''
                }`}
                title="Lampirkan File / Foto"
              >"""

new_attach = """              <button
                id="attach-file-btn"
                onClick={() => {
                  if (canSendMedia) setShowAttachmentMenu(!showAttachmentMenu);
                  else showToast('Admin membatasi pengiriman media di grup ini');
                }}
                disabled={!canSendMedia}
                className={`transition-colors p-1 shrink-0 ${
                  !canSendMedia ? 'text-slate-600 cursor-not-allowed' : 'text-[#7f91a4] hover:text-[#5288c1] cursor-pointer'
                } ${showAttachmentMenu ? 'text-[#5288c1]' : ''}`}
                title="Lampirkan File / Foto"
              >"""

content = content.replace(old_attach, new_attach)

# Fix mic button
old_mic = """                <button
                  id="mic-record-btn"
                  onClick={() => setIsRecordingVoice(true)}
                  className="w-10 h-10 rounded-full bg-[#1c2733] hover:bg-[#242f3d] text-[#7f91a4] hover:text-[#5288c1] flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title="Pesan Suara"
                >"""

new_mic = """                <button
                  id="mic-record-btn"
                  onClick={() => {
                    if (canSendMedia) setIsRecordingVoice(true);
                    else showToast('Admin membatasi pengiriman pesan suara');
                  }}
                  disabled={!canSendMedia}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    !canSendMedia ? 'bg-[#1c2733]/50 text-slate-600 cursor-not-allowed' : 'bg-[#1c2733] hover:bg-[#242f3d] text-[#7f91a4] hover:text-[#5288c1] cursor-pointer'
                  }`}
                  title="Pesan Suara"
                >"""

content = content.replace(old_mic, new_mic)

with open('src/components/ChatView.tsx', 'w') as f:
    f.write(content)

print("ChatView Done")
