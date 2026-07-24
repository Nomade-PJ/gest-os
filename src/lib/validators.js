// Utilitários de validação para CPF, CNPJ e CEP

/**
 * Valida CPF
 */
export function validateCPF(cpf) {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - sum % 11;
  if (digit1 >= 10) digit1 = 0;
  if (parseInt(cleanCPF.charAt(9)) !== digit1) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - sum % 11;
  if (digit2 >= 10) digit2 = 0;
  return parseInt(cleanCPF.charAt(10)) === digit2;
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj) {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');

  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;

  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  const digit1 = sum1 % 11 < 2 ? 0 : 11 - sum1 % 11;
  if (parseInt(cleanCNPJ.charAt(12)) !== digit1) return false;

  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  const digit2 = sum2 % 11 < 2 ? 0 : 11 - sum2 % 11;
  return parseInt(cleanCNPJ.charAt(13)) === digit2;
}

/**
 * Valida documento (CPF ou CNPJ) baseado no tipo
 */
export function validateDocument(document, type) {
  if (type === 'cpf') {
    return validateCPF(document);
  } else if (type === 'cnpj') {
    return validateCNPJ(document);
  }
  return false;
}

/**
 * Formata CPF
 */
export function formatCPF(cpf) {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj) {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata documento baseado no tipo
 */
export function formatDocument(document, type) {
  if (type === 'cpf') {
    return formatCPF(document);
  } else if (type === 'cnpj') {
    return formatCNPJ(document);
  }
  return document;
}

/**
 * Valida CEP
 */
export function validateCEP(cep) {
  const cleanCEP = cep.replace(/\D/g, '');
  return /^[0-9]{8}$/.test(cleanCEP);
}

/**
 * Formata CEP
 */
export function formatCEP(cep) {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Busca informações do CEP via API
 */
export async function fetchCEPInfo(cep) {
  const cleanCEP = cep.replace(/\D/g, '');
  if (!validateCEP(cleanCEP)) {
    return null;
  }
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    if (data.erro) {
      return null;
    }
    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

/**
 * Formata telefone brasileiro
 */
export function formatPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Valida telefone brasileiro
 */
export function validatePhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  return /^[1-9]{2}[2-9][0-9]{7,8}$/.test(cleanPhone);
}
