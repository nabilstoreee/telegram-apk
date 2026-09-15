import React, { useState } from 'react';
import { Sparkles, ChevronRight, Check } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { User } from '../types';

interface MediaQualitySettingsSectionProps {
  currentUser?: User;
  onUpdateProfile?: (updated: Partial<User>) => Promise<void>;
  isInModal?: boolean;
}

export const MediaQualitySettingsSection: React.FC<MediaQualitySettingsSectionProps> = ({
  currentUser,
  onUpdateProfile,
  isInModal = true,
}) => {
  const { settings, updateSettings } = useSettings();

  // Active dialog states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Temporary selected states for dialog confirmation
  const [tempUploadQuality, setTempUploadQuality] = useState<'standard' | 'hd'>(
    settings.uploadMediaQuality || currentUser?.uploadMediaQuality || 'hd'
  );
  const [tempDownloadQuality, setTempDownloadQuality] = useState<'auto' | 'standard' | 'hd'>(
    settings.autoDownloadQuality || currentUser?.autoDownloadQuality || 'hd'
  );

  const currentUploadQuality = settings.uploadMediaQuality || currentUser?.uploadMediaQuality || 'hd';
  const currentDownloadQuality = settings.autoDownloadQuality || currentUser?.autoDownloadQuality || 'hd';

  const handleOpenUploadModal = () => {
    setTempUploadQuality(currentUploadQuality);
    setShowUploadModal(true);
  };

  const handleOpenDownloadModal = () => {
    setTempDownloadQuality(currentDownloadQuality);
    setShowDownloadModal(true);
  };

  const handleSaveUploadQuality = async () => {
    updateSettings({ uploadMediaQuality: tempUploadQuality });
    if (onUpdateProfile) {
      await onUpdateProfile({ uploadMediaQuality: tempUploadQuality });
    }
    setShowUploadModal(false);
  };

  const handleSaveDownloadQuality = async () => {
    updateSettings({ autoDownloadQuality: tempDownloadQuality });
    if (onUpdateProfile) {
      await onUpdateProfile({ autoDownloadQuality: tempDownloadQuality });
    }
    setShowDownloadModal(false);
  };

  return (
    <div className="bg-[#17212b] py-2 mb-2 shadow-sm rounded-xl overflow-hidden">
      {/* Section Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#242f3d]/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5288c1]">
            Kualitas Media & Video
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#5288c1]/20 text-[#5288c1]">
            HD
          </span>
        </div>
        <span className="text-[11px] text-[#7f91a4]">Chat & Unduhan</span>
      </div>

      {/* Row 1: Kualitas Media Unggahan */}
      <div
        id="btn-setting-upload-quality"
        onClick={handleOpenUploadModal}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#202b36] transition-colors border-b border-[#242f3d]/40"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#5288c1]/15 flex items-center justify-center text-[#5288c1] shrink-0 font-bold text-xs tracking-tight">
            HD
          </div>
          <div>
            <div className="text-[15px] font-medium text-slate-200">
              Kualitas Media Unggahan
            </div>
            <div className="text-xs text-[#5288c1] mt-0.5 font-medium flex items-center gap-1">
              <span>{currentUploadQuality === 'hd' ? 'Kualitas HD' : 'Kualitas standar'}</span>
              <span className="text-[#7f91a4] font-normal text-[11px]">
                ({currentUploadQuality === 'hd' ? 'Resolusi tinggi / jernih' : 'Hemat kuota'})
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
      </div>

      {/* Row 2: Kualitas unduhan otomatis */}
      <div
        id="btn-setting-download-quality"
        onClick={handleOpenDownloadModal}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#202b36] transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#4fae5e]/15 flex items-center justify-center text-[#4fae5e] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[15px] font-medium text-slate-200">
              Kualitas unduhan otomatis
            </div>
            <div className="text-xs text-[#5288c1] mt-0.5 font-medium">
              {currentDownloadQuality === 'hd'
                ? 'Kualitas HD'
                : currentDownloadQuality === 'standard'
                ? 'Kualitas standar'
                : 'Otomatis'}
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: Kualitas Media Unggahan (Exact match to Photo 2)               */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#202b36] border border-[#2b394a] rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-white">
                Kualitas Media Unggahan
              </h3>
              <p className="text-xs text-[#7f91a4] mt-1.5 leading-relaxed">
                Pilih kualitas untuk foto dan video yang akan dikirim di chat.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Kualitas standar */}
              <label
                onClick={() => setTempUploadQuality('standard')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  tempUploadQuality === 'standard'
                    ? 'border-[#5288c1] bg-[#5288c1]/10'
                    : 'border-[#2b394a] hover:bg-[#242f3d]'
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      tempUploadQuality === 'standard'
                        ? 'border-[#5288c1] bg-[#5288c1]'
                        : 'border-[#7f91a4]'
                    }`}
                  >
                    {tempUploadQuality === 'standard' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">
                    Kualitas standar
                  </div>
                  <div className="text-xs text-[#7f91a4] mt-0.5">
                    Lebih cepat saat dikirim, ukuran file lebih kecil
                  </div>
                </div>
              </label>

              {/* Option 2: Kualitas HD */}
              <label
                onClick={() => setTempUploadQuality('hd')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  tempUploadQuality === 'hd'
                    ? 'border-[#5288c1] bg-[#5288c1]/10'
                    : 'border-[#2b394a] hover:bg-[#242f3d]'
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      tempUploadQuality === 'hd'
                        ? 'border-[#5288c1] bg-[#5288c1]'
                        : 'border-[#7f91a4]'
                    }`}
                  >
                    {tempUploadQuality === 'hd' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <span>Kualitas HD</span>
                    <span className="text-[10px] px-1 py-0.2 rounded font-bold bg-[#5288c1] text-white">
                      Rekomendasi
                    </span>
                  </div>
                  <div className="text-xs text-[#7f91a4] mt-0.5">
                    Lebih lambat dikirim, ukuran bisa 6 kali lebih besar
                  </div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7f91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveUploadQuality}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5288c1] hover:bg-[#4374a8] text-white shadow-md shadow-[#5288c1]/25 transition-all cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 2: Kualitas unduhan otomatis (Exact match to Photo 3)              */}
      {/* ========================================================================= */}
      {showDownloadModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowDownloadModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#202b36] border border-[#2b394a] rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-white">
                Kualitas unduhan otomatis
              </h3>
              <p className="text-xs text-[#7f91a4] mt-1.5 leading-relaxed">
                Foto dan video akan otomatis diunduh dalam kualitas HD. Opsi ini paling banyak menggunakan ruang penyimpanan.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Otomatis */}
              <label
                onClick={() => setTempDownloadQuality('auto')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  tempDownloadQuality === 'auto'
                    ? 'border-[#5288c1] bg-[#5288c1]/10'
                    : 'border-[#2b394a] hover:bg-[#242f3d]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    tempDownloadQuality === 'auto'
                      ? 'border-[#5288c1] bg-[#5288c1]'
                      : 'border-[#7f91a4]'
                  }`}
                >
                  {tempDownloadQuality === 'auto' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="text-sm font-semibold text-white">
                  Otomatis
                </div>
              </label>

              {/* Option 2: Kualitas standar */}
              <label
                onClick={() => setTempDownloadQuality('standard')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  tempDownloadQuality === 'standard'
                    ? 'border-[#5288c1] bg-[#5288c1]/10'
                    : 'border-[#2b394a] hover:bg-[#242f3d]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    tempDownloadQuality === 'standard'
                      ? 'border-[#5288c1] bg-[#5288c1]'
                      : 'border-[#7f91a4]'
                  }`}
                >
                  {tempDownloadQuality === 'standard' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="text-sm font-semibold text-white">
                  Kualitas standar
                </div>
              </label>

              {/* Option 3: Kualitas HD */}
              <label
                onClick={() => setTempDownloadQuality('hd')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  tempDownloadQuality === 'hd'
                    ? 'border-[#5288c1] bg-[#5288c1]/10'
                    : 'border-[#2b394a] hover:bg-[#242f3d]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    tempDownloadQuality === 'hd'
                      ? 'border-[#5288c1] bg-[#5288c1]'
                      : 'border-[#7f91a4]'
                  }`}
                >
                  {tempDownloadQuality === 'hd' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>Kualitas HD</span>
                  <span className="text-[10px] px-1 py-0.2 rounded font-bold bg-[#5288c1] text-white">
                    HD
                  </span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7f91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDownloadQuality}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5288c1] hover:bg-[#4374a8] text-white shadow-md shadow-[#5288c1]/25 transition-all cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
