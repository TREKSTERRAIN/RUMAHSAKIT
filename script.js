const map = L.map("map").setView([-7.8014, 110.3647], 13);

// Definisikan base map (peta dasar)
const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
});
tileLayer.addTo(map);

// Definisikan LayerGroups untuk menampung setiap layer GeoJSON
const batasSlemanLayer = L.layerGroup();
const batasKecamatanLayer = L.layerGroup();
const garisKecamatanLayer = L.layerGroup();
const batasDesaLayer = L.layerGroup();
const garisDesaLayer = L.layerGroup();
const belumTerjangkauLayer = L.layerGroup();
const kesesuaianLahanLayer = L.layerGroup();
const kesesuaianLahanFixLayer = L.layerGroup();
const rumahSakitLayer = L.layerGroup();

// Atur layer mana saja yang akan aktif saat peta pertama kali dimuat
rumahSakitLayer.addTo(map);
batasSlemanLayer.addTo(map);

// ----- KONTROL LAYER -----
// Definisikan objek untuk peta dasar
const baseMaps = {
    "OpenStreetMap": tileLayer
};

// Definisikan objek untuk semua layer overlay (data GeoJSON)
const overlayMaps = {
    "Rumah Sakit": rumahSakitLayer,
    "Batas Kabupaten Sleman": batasSlemanLayer,
    "Batas Kecamatan": batasKecamatanLayer,
    "Garis Kecamatan": garisKecamatanLayer,
    "Batas Desa": batasDesaLayer,
    "Garis Desa": garisDesaLayer,
    "Wilayah Belum Terjangkau": belumTerjangkauLayer,
    "Kesesuaian Lahan": kesesuaianLahanLayer,
    "Kesesuaian Lahan Fix": kesesuaianLahanFixLayer
};

// Tambahkan kontrol layer ke peta
L.control.layers(baseMaps, overlayMaps).addTo(map);
// -------------------------

let bufferActive = false, measureActive = false, markerActive = false;
let bufferLayer = L.layerGroup().addTo(map);
let markerLayer = L.layerGroup().addTo(map);
let measureLayer = L.layerGroup().addTo(map);
let tempLine = null, pointA = null;

function toggleEditMenu() {
  const menu = document.getElementById("editMenu");
  menu.style.display = menu.style.display === "none" ? "block" : "none";
}

function toggleBuffer() {
  bufferActive = !bufferActive;
  measureActive = markerActive = false;
  updateStatus();
}

function toggleMeasure() {
  measureActive = !measureActive;
  bufferActive = markerActive = false;
  pointA = null;
  if (tempLine) { measureLayer.removeLayer(tempLine); tempLine = null; }
  updateStatus();
}

function toggleMarker() {
  markerActive = !markerActive;
  bufferActive = measureActive = false;
  updateStatus();
}

function updateStatus() {
  document.getElementById("bStatus").innerText = bufferActive ? "ON" : "OFF";
  document.getElementById("mStatus").innerText = measureActive ? "ON" : "OFF";
  document.getElementById("tStatus").innerText = markerActive ? "ON" : "OFF";
}

map.on("click", function (e) {
  if (bufferActive) {
    let radius = prompt("Masukkan radius buffer (meter):", "500");
    if (radius === null || isNaN(radius) || radius < 0) return;
    radius = parseFloat(radius);
    const circle = L.circle(e.latlng, {
      radius: radius,
      color: "red",
      fillColor: "#ffff66",
      fillOpacity: 0.4
    }).addTo(bufferLayer);
    const id = circle._leaflet_id;
    circle.bindPopup(`
      <b>Buffer</b><br>Radius: ${radius} m<br>
      <button onclick="editBuffer(${id})">Edit Radius</button><br>
      <button onclick="deleteBuffer(${id})">Hapus</button>
    `).openPopup();
  } else if (measureActive) {
    if (!pointA) {
      pointA = e.latlng;
      L.marker(pointA).addTo(measureLayer).bindPopup("Titik A").openPopup();
    } else {
      const pointB = e.latlng;
      const distance = pointA.distanceTo(pointB);
      const km = (distance / 1000).toFixed(2);
      const m = Math.round(distance);
      speak(`Jarak antara titik A dan B adalah ${m} meter atau ${km} kilometer.`);

      tempLine = L.polyline([pointA, pointB], { color: "blue" }).addTo(measureLayer)
        .bindPopup(`Jarak: ${m} m (${km} km)<br><button onclick="hapusGaris()">Hapus</button>`).openPopup();
      pointA = null;
    }
  } else if (markerActive) {
    const marker = L.marker(e.latlng, { draggable: true }).addTo(markerLayer);
    const id = marker._leaflet_id;
    marker.bindPopup(`
      <b>Marker</b><br>
      <button onclick="deleteMarker(${id})">Hapus</button>
    `).openPopup();
  }
});

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  speechSynthesis.speak(utterance);
}

function editBuffer(id) {
  const layer = bufferLayer.getLayer(id);
  let newRadius = prompt("Radius baru (meter):", layer.getRadius());
  if (newRadius === null || isNaN(newRadius) || newRadius < 0) return;
  layer.setRadius(parseFloat(newRadius));
  layer.setPopupContent(`
    <b>Buffer</b><br>Radius: ${newRadius} m<br>
    <button onclick="editBuffer(${id})">Edit Radius</button><br>
    <button onclick="deleteBuffer(${id})">Hapus</button>
  `);
}

function deleteBuffer(id) {
  bufferLayer.removeLayer(bufferLayer.getLayer(id));
}

function deleteMarker(id) {
  markerLayer.removeLayer(markerLayer.getLayer(id));
}

function hapusGaris() {
  measureLayer.clearLayers();
  tempLine = null;
  pointA = null;
}

function locateUser() {
  if (!navigator.geolocation) return alert("Browser tidak mendukung geolokasi.");
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    L.marker([latitude, longitude]).addTo(map)
      .bindPopup("📍 Lokasi Anda").openPopup();
    map.setView([latitude, longitude], 16);
  });
}

// ===== Memuat Layer GeoJSON dan Menambahkannya ke LayerGroup yang Sesuai =====
fetch("batasleman.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#000000", weight: 2 }})
      .bindPopup("Batas Kabupaten Sleman").addTo(batasSlemanLayer);
  });

fetch("bataskecamatan.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#FF0000", weight: 2 }})
      .bindPopup("Batas Kecamatan").addTo(batasKecamatanLayer);
  });

fetch("bataskabupaten.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#FF6600", weight: 2 }})
      .bindPopup("Garis Kecamatan").addTo(garisKecamatanLayer);
  });

fetch("bataskecamatan.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#008000", weight: 2 }})
      .bindPopup("Batas Desa").addTo(batasDesaLayer);
  });

fetch("batasdesa.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#00CC66", weight: 2 }})
      .bindPopup("Garis Desa").addTo(garisDesaLayer);
  });

fetch("belumterjangkau.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#FFFF00", weight: 2 }})
      .bindPopup("Wilayah Belum Terjangkau").addTo(belumTerjangkauLayer);
  });

fetch("lahandesa.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#00BFFF", weight: 2 }})
      .bindPopup("Kesesuaian Lahan").addTo(kesesuaianLahanLayer);
  });

fetch("kesesuaianlahanrumahsakit.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "#4B0082", weight: 2 }})
      .bindPopup("Kesesuaian Lahan Fix").addTo(kesesuaianLahanFixLayer);
  });

fetch("rumahsakit.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        const { Nama, Kategori, Kelas, Alamat } = feature.properties;
        const popupContent = `
          <b>${Nama}</b><br>
          <b>Kategori:</b> ${Kategori}<br>
          <b>Kelas:</b> ${Kelas}<br>
          <b>Alamat:</b> ${Alamat}
        `;
        layer.bindPopup(popupContent);
      },
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'https://png.pngtree.com/png-clipart/20200701/original/pngtree-hospital-icon-design-illustration-png-image_5345011.jpg',
            iconSize: [25, 25]
          })
        });
      }
    }).addTo(rumahSakitLayer);
  });
