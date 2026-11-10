// Karşılaştırmada büyük/küçük harf ve fazla boşluklar yok sayılır.
function normalizeText(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
}

module.exports = { normalizeText };
