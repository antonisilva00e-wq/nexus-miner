const { v4: uuidv4 } = require('uuid');

function generateId() {
  return uuidv4();
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[ch] || ch);
}

function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit) || 20));
  const offset = (p - 1) * l;
  return { limit: l, offset, page: p };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function isValidCNPJ(cnpj) {
  const digits = (cnpj || '').replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  let sum = 0;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (parseInt(digits[12]) !== d1) return false;

  sum = 0;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return parseInt(digits[13]) === d2;
}

function generateCNPJ() {
  const n = Array.from({ length: 8 }, () => Math.floor(Math.random() * 9));
  n.push(0, 0, 0, 1);

  let temp = n[0]*5 + n[1]*4 + n[2]*3 + n[3]*2 + n[4]*9 + n[5]*8 + n[6]*7 + n[7]*6 + n[8]*5 + n[9]*4 + n[10]*3 + n[11]*2;
  let d1 = 11 - (temp % 11);
  if (d1 >= 10) d1 = 0;
  n.push(d1);

  temp = n[0]*6 + n[1]*5 + n[2]*4 + n[3]*3 + n[4]*2 + n[5]*9 + n[6]*8 + n[7]*7 + n[8]*6 + n[9]*5 + n[10]*4 + n[11]*3 + n[12]*2;
  let d2 = 11 - (temp % 11);
  if (d2 >= 10) d2 = 0;
  n.push(d2);

  return `${n[0]}${n[1]}.${n[2]}${n[3]}${n[4]}.${n[5]}${n[6]}${n[7]}/${n[8]}${n[9]}${n[10]}${n[11]}-${n[12]}${n[13]}`;
}

module.exports = { generateId, escapeHTML, paginate, formatCurrency, isValidCNPJ, generateCNPJ };
