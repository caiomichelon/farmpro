import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const BUCKET = 'attachments';

/** 10 anos em segundos — na prática um link "permanente" pro app, mas que
 * continua exigindo uma URL assinada de verdade (não adivinhável) e que
 * pode ser revogada na hora (apagando o arquivo) se precisar. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

/** Sobe o arquivo dentro de uma pasta com o id da fazenda na frente
 * (`${farmId}/${folder}/...`) — isso é o que permite a trava de segurança
 * do bucket (RLS em storage.objects) restringir o acesso só a quem é
 * membro dessa fazenda. O bucket é privado, então devolvemos uma URL
 * ASSINADA (não a `getPublicUrl`, que não funciona mais em bucket
 * privado) — só quem tem a URL assinada (gerada aqui, com o usuário já
 * autenticado e verificado pela RLS) consegue abrir a foto. */
async function uploadBase64(base64: string, farmId: string, folder: string): Promise<string> {
  const fileName = `${farmId}/${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, decode(base64), {
    contentType: 'image/jpeg',
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS);
  if (signError || !data) throw signError ?? new Error('Não foi possível gerar o link da foto.');
  return data.signedUrl;
}

/** Abre a galeria de fotos, e se o usuário escolher uma imagem, já sobe pro
 * Supabase Storage e devolve a URL (assinada, funciona em bucket privado).
 * `farmId` decide em qual fazenda o arquivo fica "guardado" (trava de
 * acesso); `folder` só organiza dentro dela (ex.: "employee-documents",
 * "cattle-health"). Retorna `null` se o usuário cancelar. */
export async function pickAndUploadFromLibrary(farmId: string, folder: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão de acesso às fotos negada.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;

  return uploadBase64(result.assets[0].base64, farmId, folder);
}

/** Mesma coisa, mas abrindo a câmera direto (útil pra fotografar um
 * documento físico na hora). */
export async function pickAndUploadFromCamera(farmId: string, folder: string): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão de câmera negada.');

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    base64: true,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;

  return uploadBase64(result.assets[0].base64, farmId, folder);
}
