import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Colors } from '@/constants/colors';

interface Props {
  jobId: string;
  onTranscript: (text: string) => void;
}

export const VoiceRecorder: React.FC<Props> = ({ jobId, onTranscript }) => {
  const { master } = useAuthStore();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Engedély szükséges', 'Mikrofon hozzáférés szükséges!'); return; }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e) {
      Alert.alert('Hiba', 'Nem sikerült elindítani a felvételt');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('Nincs felvétel URI');

      // Upload to Supabase Storage
      const fileName = `voice/${master!.id}/${jobId}-${Date.now()}.m4a`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from('recordings').upload(fileName, blob, { contentType: 'audio/m4a' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(fileName);

      // Call Claude API via Edge Function for transcription
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioUrl: publicUrl, jobId, masterId: master!.id },
      });
      if (error) throw error;

      if (data.transcript) {
        onTranscript(data.transcript);
        await supabase.from('jobs').update({ ai_transcript: data.transcript }).eq('id', jobId);
      }
    } catch (e: any) {
      Alert.alert('Hiba', e.message ?? 'Átírás sikertelen');
    } finally {
      setIsProcessing(false);
      setRecording(null);
    }
  };

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, isRecording && styles.btnActive, isProcessing && styles.btnProcessing]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Ionicons
          name={isProcessing ? 'hourglass' : isRecording ? 'stop' : 'mic'}
          size={28}
          color="#fff"
        />
        <Text style={styles.btnText}>
          {isProcessing ? 'Feldolgozás...' : isRecording ? `Leállítás ${formatDuration(duration)}` : 'Hangjegyzet'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14 },
  btnActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  btnProcessing: { backgroundColor: Colors.warning + '40', borderColor: Colors.warning },
  btnText: { color: Colors.text, fontWeight: '600', fontSize: 15 },
});
