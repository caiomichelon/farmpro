import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { darkenHex } from '../lib/colorUtils';
import { radius } from '../theme';

export interface MapPlot {
  id: string;
  name: string;
  areaHectares: number;
  /** Pontos lat/lng que formam o contorno do talhão/piquete. */
  boundary: { lat: number; lng: number }[];
  /** Cor de preenchimento do polígono (ex.: cor do farol de status) — a
   * borda sai automaticamente um pouco mais escura que essa cor, pra
   * separar um talhão do outro sem precisar escolher uma segunda cor. */
  color?: string;
}

function number(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function buildMapHtml(plots: MapPlot[], defaultColor: string): string {
  const polygonsJs = plots
    .map((plot) => {
      const latLngs = plot.boundary.map((p) => `[${p.lat},${p.lng}]`).join(',');
      const label = `${plot.name}<br/>${number(plot.areaHectares, 1)} ha`;
      const fillColor = plot.color ?? defaultColor;
      const borderColor = darkenHex(fillColor, 0.25);
      return `(function(){
        var poly = L.polygon([${latLngs}], { color: ${JSON.stringify(borderColor)}, weight: 2, fillColor: ${JSON.stringify(fillColor)}, fillOpacity: 0.85 }).addTo(map);
        poly.bindPopup(${JSON.stringify(label)});
        layers.push(poly);
      })();`;
    })
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
    var map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    var layers = [];
    ${polygonsJs}
    if (layers.length > 0) {
      map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [16, 16] });
    } else {
      map.setView([0, 0], 2);
    }
  </script>
</body>
</html>`;
}

/**
 * Mapa com os talhões/piquetes desenhados como polígonos coloridos,
 * clicáveis (mostra nome + área ao tocar) — mesmo padrão WebView/Leaflet do
 * LocationMap, só que com áreas em vez de pinos. Ajusta o zoom pra caber
 * todos os talhões de uma vez.
 */
export function PlotsMap({ plots, height = 400, color = '#2E5B3B' }: { plots: MapPlot[]; height?: number; color?: string }) {
  const plotsWithBoundary = plots.filter((p) => p.boundary.length > 0);
  if (plotsWithBoundary.length === 0) return null;

  const html = buildMapHtml(plotsWithBoundary, color);

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
