/* Produktdaten – Demo-Profile & Beispielpreise aus Matzes Prototypen (ohne Gewähr, nicht live geprüft).
   focus: camera | video | battery | gaming | everyday | value · size: compact | large */
window.PRODUCTS = [
  { id:'s25u',  brand:'Samsung',  name:'Galaxy S25 Ultra',  price:1449, os:'Android', size:'large',   focus:['camera','video','gaming'], color:'#a9a6a0', features:['200-MP-Kamera, 5x Zoom','S Pen integriert','Snapdragon 8 Elite'] },
  { id:'s25',   brand:'Samsung',  name:'Galaxy S25',        price:899,  os:'Android', size:'compact', focus:['everyday','camera','gaming'], color:'#a3b9da', features:['Kompakt mit 6,2"','Galaxy AI','7 Jahre Updates'] },
  { id:'a56',   brand:'Samsung',  name:'Galaxy A56',        price:479,  os:'Android', size:'large',   focus:['everyday','battery'], color:'#b1b8a3', features:['Gutes Preis-Leistungs-Verhältnis','6 Jahre Updates','IP67'] },
  { id:'p10p',  brand:'Google',   name:'Pixel 10 Pro',      price:1099, os:'Android', size:'compact', focus:['camera','everyday'], color:'#d5cebd', features:['KI-Fotobearbeitung','Reines Android','7 Jahre Updates'] },
  { id:'p9a',   brand:'Google',   name:'Pixel 9a',          price:499,  os:'Android', size:'compact', focus:['camera','everyday'], color:'#b7b3d8', features:['Top-Kamera der Mittelklasse','7 Jahre Updates','Reines Android'] },
  { id:'i17pm', brand:'Apple',    name:'iPhone 17 Pro Max', price:1449, os:'iOS',     size:'large',   focus:['video','camera','gaming'], color:'#e1a081', features:['Pro-Kamerasystem','Top-Akkulaufzeit','A19 Pro Chip'] },
  { id:'i17',   brand:'Apple',    name:'iPhone 17',         price:949,  os:'iOS',     size:'compact', focus:['everyday','video'], color:'#a9b7cd', features:['120-Hz-Display','Einfache Bedienung','Lange Updates'] },
  { id:'poco',  brand:'Xiaomi',   name:'POCO X7 Pro',       price:299,  os:'Android', size:'large',   focus:['gaming','battery','value'], color:'#dfc45c', features:['Viel Leistung fürs Geld','Großer Akku','Schnellladen'] },
  { id:'edge',  brand:'Motorola', name:'Edge 50 Neo',       price:399,  os:'Android', size:'compact', focus:['everyday','value'], color:'#c48070', features:['Kompakt & leicht','Tele-Kamera','IP68'] },
  { id:'e15',   brand:'Motorola', name:'Moto E15',          price:79,   os:'Android', size:'large',   focus:['value','everyday'], color:'#84b29b', features:['Sehr günstig','Einfach zu bedienen','Ideal als Zweitgerät'] },
  { id:'note15',brand:'Xiaomi',   name:'Redmi Note 15',     price:189,  os:'Android', size:'large',   focus:['value','battery'], color:'#a1b8cf', features:['Großes Display','Guter Akku','Solide Kamera'] },
  { id:'honor', brand:'Honor',    name:'Magic 8 Pro',       price:899,  os:'Android', size:'large',   focus:['camera','gaming'], color:'#a8a9c3', features:['Starker Akku','Tele-Kamera','Schnellladen'] }
];
