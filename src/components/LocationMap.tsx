import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { radius } from '../theme';

export interface MapPoint {
  latitude: number;
  longitude: number;
  label: string;
}

function buildMapHtml(points: MapPoint[]): string {
  const center = points[points.length - 1];
  const markersJs = points
    .map(
      (p) =>
        `L.marker([${p.latitude}, ${p.longitude}]).addTo(map).bindPopup(${JSON.stringify(p.label)});`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map').setView([${center.latitude}, ${center.longitude}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    ${markersJs}
  </script>
</body>
</html>`;
}

/**
 * Mapa com pinos, embutido via WebView (Leaflet + OpenStreetMap) — sem
 * depender de uma biblioteca nativa de mapas, que exigiria build customizado
 * e quebraria o app no Expo Go. Só precisa de internet pra carregar os
 * tiles do mapa (igual qualquer app de mapa).
 *
 * `react-native-webview` não tem implementação pra web (só iOS/Android) —
 * no web usamos um <iframe> puro com o mesmo HTML, então o comportamento é
 * o mesmo nas duas plataformas.
 */
export function LocationMap({ points, height = 240 }: { points: MapPoint[]; height?: number }) {
  if (points.length === 0) return null;

  const html = buildMapHtml(points);

  return (
    <View style={[styles.container, { height }]}>
      {Platform.OS === 'web'
        ? createElement('iframe', {
            srcDoc: html,
            style: { border: 0, width: '100%', height: '100%' },
          })
        : <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
