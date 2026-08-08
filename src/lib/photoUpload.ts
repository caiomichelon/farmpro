import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const BUCKET = 'attachments';

async function uploadBase64(base64: string, folder: string): Promise<string> {
  const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, decode(base64), {
    contentType: 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/** Abre a galeria de fotos, e se o usuário escolher uma imagem, já sobe pro
 * Supabase Storage e devolve a URL pública. `folder` organiza os arquivos
 * (ex.: "employee-documents", "cattle-health"). Retorna `null` se o usuário
 * cancelar. */
export async function pickAndUploadFromLibrary(folder: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão de acesso às fotos negada.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;

  return uploadBase64(result.assets[0].base64, folder);
}

/** Mesma coisa, mas abrindo a câmera direto (útil pra fotografar um
 * documento físico na hora). */
export async function pickAndUploadFromCamera(folder: string): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão de câmera negada.');

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    base64: true,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;

  return uploadBase64(result.assets[0].base64, folder);
}
