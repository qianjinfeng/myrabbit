export function removeVrMap(obj) {
  if (obj && typeof obj === 'object') {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key === '_vrMap') {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          removeVrMap(obj[key]);
        }
      }
    }
  }
}

export function isObjectEmpty(obj) {
  return Object.keys(obj).length === 0;
}