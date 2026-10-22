/* Produktdaten – Preise aus Matzes Originaldaten (UVP-Stand, ohne Gewähr). */
window.PHONE_SVG = function (c1, c2) {
  return '<svg viewBox="0 0 60 120" aria-hidden="true"><defs><linearGradient id="g' + c1.slice(1) + '" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
    '<rect x="2" y="2" width="56" height="116" rx="10" fill="#1a1a20" stroke="' + c1 + '" stroke-width="2"/>' +
    '<rect x="6" y="10" width="48" height="100" rx="6" fill="url(#g' + c1.slice(1) + ')" opacity=".85"/>' +
    '<rect x="24" y="5" width="12" height="3" rx="1.5" fill="#000"/></svg>';
};
// budget: low (<300), mid (300-700), high (>700)
// use: allround | kamera | gaming | senioren
// os: android | ios | egal
window.PHONES = [
  { id:'s25u', name:'Samsung Galaxy S25 Ultra', price:1449, os:'android', budget:'high', use:['kamera','gaming','allround'], colors:['#4a4a55','#9aa0b0'], features:['200-MP-Kamera, 5x Zoom','S Pen integriert','Snapdragon 8 Elite'] },
  { id:'s25',  name:'Samsung Galaxy S25', price:899, os:'android', budget:'high', use:['allround','kamera'], colors:['#2b3a67','#7d8fd1'], features:['Kompakt mit 6,2"','Galaxy AI','7 Jahre Updates'] },
  { id:'ip17pm', name:'iPhone 17 Pro Max', price:1449, os:'ios', budget:'high', use:['kamera','gaming','allround'], colors:['#c06a2b','#f0a060'], features:['Pro-Kamerasystem','Top-Akkulaufzeit','A19 Pro Chip'] },
  { id:'ip17', name:'iPhone 17', price:949, os:'ios', budget:'high', use:['allround','senioren'], colors:['#6b8fb5','#c5d8ec'], features:['120-Hz-Display','Einfache Bedienung','Lange Updates'] },
  { id:'px10p', name:'Google Pixel 10 Pro', price:1099, os:'android', budget:'high', use:['kamera','allround'], colors:['#3c4a3c','#a6c1a0'], features:['KI-Fotobearbeitung','Reines Android','7 Jahre Updates'] },
  { id:'hm8p', name:'Honor Magic 8 Pro', price:899, os:'android', budget:'high', use:['kamera','gaming'], colors:['#1f4d4a','#6fc2b8'], features:['Starker Akku','Tele-Kamera','Schnellladen'] },
  { id:'a56', name:'Samsung Galaxy A56', price:479, os:'android', budget:'mid', use:['allround','senioren'], colors:['#5b4a7a','#b8a6dc'], features:['Gutes Preis-Leistungs-Verhältnis','6 Jahre Updates','IP67'] },
  { id:'px9a', name:'Google Pixel 9a', price:499, os:'android', budget:'mid', use:['kamera','allround'], colors:['#7a3a4a','#e3a1b0'], features:['Top-Kamera der Mittelklasse','7 Jahre Updates','Reines Android'] },
  { id:'x7p', name:'POCO X7 Pro', price:299, os:'android', budget:'low', use:['gaming','allround'], colors:['#806000','#ffd040'], features:['Viel Leistung fürs Geld','Großer Akku','Schnellladen'] },
  { id:'e50n', name:'Motorola Edge 50 Neo', price:399, os:'android', budget:'mid', use:['allround','kamera'], colors:['#3d5a80','#98c1d9'], features:['Kompakt & leicht','Tele-Kamera','IP68'] },
  { id:'e15', name:'Motorola Moto E15', price:79, os:'android', budget:'low', use:['senioren'], colors:['#444','#999'], features:['Sehr günstig','Einfach zu bedienen','Ideal als Zweitgerät'] },
  { id:'rn15', name:'Xiaomi Redmi Note 15', price:189, os:'android', budget:'low', use:['allround','senioren'], colors:['#2a6f4f','#7fd1a8'], features:['Großes Display','Guter Akku','Solide Kamera'] }
];
