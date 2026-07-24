/**
 * Módulo para gerenciar a impressão térmica via Bluetooth
 * 
 * Este módulo fornece funções para descobrir, conectar e imprimir
 * em impressoras térmicas usando a Web Bluetooth API.
 */

// Interface para representar uma impressora Bluetooth

// Interface para opções de impressão

// Armazena a impressora conectada atualmente
let connectedPrinter = null;
let characteristic = null;

// Verifica se o navegador suporta Bluetooth
export const isBluetoothSupported = () => {
  return typeof navigator !== 'undefined' && navigator.bluetooth !== undefined;
};

/**
 * Solicita permissão e escaneia por impressoras térmicas disponíveis
 * @returns Promise com a lista de impressoras encontradas
 */
export const scanForPrinters = async () => {
  if (!isBluetoothSupported()) {
    throw new Error('Bluetooth não é suportado neste navegador ou dispositivo');
  }
  try {
    // Solicitar dispositivo Bluetooth - filtrando por impressoras térmicas comuns
    // Muitas impressoras térmicas usam o serviço de Perfil Serial
    const device = await navigator.bluetooth.requestDevice({
      filters: [{
        services: ['000018f0-0000-1000-8000-00805f9b34fb']
      },
      // Perfil Impressora Térmica Genérica
      {
        services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2']
      },
      // Impressoras ESC/POS
      {
        namePrefix: 'Printer'
      }, {
        namePrefix: 'POS'
      }, {
        namePrefix: 'Thermal'
      }],
      optionalServices: ['battery_service', 'device_information']
    });
    if (!device) {
      throw new Error('Nenhuma impressora encontrada');
    }
    return [{
      id: device.id,
      name: device.name || 'Impressora Desconhecida',
      device
    }];
  } catch (error) {
    console.error('Erro ao escanear impressoras:', error);
    throw error;
  }
};

/**
 * Conecta a uma impressora Bluetooth específica
 * @param printer A impressora para conectar
 * @returns Promise que resolve quando a conexão for estabelecida
 */
export const connectToPrinter = async printer => {
  try {
    // Conectar ao GATT server
    const server = await printer.device.gatt?.connect();
    if (!server) {
      throw new Error('Não foi possível conectar ao servidor GATT');
    }

    // Obter serviço primário para impressão
    // O serviço exato pode variar dependendo do modelo da impressora
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');

    // Obter característica de escrita
    characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    if (!characteristic) {
      throw new Error('Característica de escrita não encontrada');
    }

    // Armazenar impressora conectada
    connectedPrinter = printer;
    return;
  } catch (error) {
    console.error('Erro ao conectar à impressora:', error);
    connectedPrinter = null;
    characteristic = null;
    throw error;
  }
};

/**
 * Desconecta da impressora atual
 */
export const disconnectPrinter = async () => {
  if (connectedPrinter && connectedPrinter.device.gatt?.connected) {
    await connectedPrinter.device.gatt.disconnect();
  }
  connectedPrinter = null;
  characteristic = null;
};

/**
 * Converte texto para os bytes adequados para impressão
 * @param text Texto a ser convertido
 * @param options Opções de formatação
 * @returns Array de bytes para enviar à impressora
 */
const textToBytes = (text, options = {}) => {
  const encoder = new TextEncoder();
  const bytes = [];

  // Sequência de inicialização da impressora (ESC @)
  bytes.push(0x1B, 0x40);

  // Configurar tamanho da fonte se especificado
  if (options.fontSize) {
    bytes.push(0x1D, 0x21, options.fontSize);
  }

  // Configurar texto em negrito se especificado
  if (options.bold) {
    bytes.push(0x1B, 0x45, 0x01);
  }

  // Centralizar texto se especificado
  if (options.centered) {
    bytes.push(0x1B, 0x61, 0x01);
  } else {
    bytes.push(0x1B, 0x61, 0x00);
  }

  // Adicionar o texto
  const textBytes = encoder.encode(text);
  textBytes.forEach(byte => bytes.push(byte));

  // Adicionar avanço de linha
  bytes.push(0x0A, 0x0A);

  // Cortar papel (se suportado pela impressora)
  bytes.push(0x1D, 0x56, 0x41, 0x10);
  return new Uint8Array(bytes);
};

/**
 * Imprime um texto na impressora conectada
 * @param text Texto a ser impresso
 * @param options Opções de formatação
 */
export const printText = async (text, options = {}) => {
  if (!connectedPrinter || !characteristic) {
    throw new Error('Nenhuma impressora conectada');
  }
  try {
    const bytes = textToBytes(text, options);

    // Verificar se a característica suporta escrita sem resposta (mais rápida)
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(bytes);
    } else {
      await characteristic.writeValueWithResponse(bytes);
    }
  } catch (error) {
    console.error('Erro ao imprimir:', error);
    throw error;
  }
};

/**
 * Imprime um recibo de serviço
 * @param serviceData Dados do serviço a ser impresso
 */
export const printServiceReceipt = async serviceData => {
  const formatPrice = price => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Montar informações da empresa de forma organizada
  const companySection = serviceData.companyInfo ? `
${serviceData.companyInfo.companyName}
${serviceData.companyInfo.document ? `${serviceData.companyInfo.documentType?.toUpperCase() || 'DOC'}: ${serviceData.companyInfo.document}` : ''}
Tel: ${serviceData.companyInfo.phone || '(98) 12345-6789'}

${serviceData.companyInfo.address && (serviceData.companyInfo.address.street || serviceData.companyInfo.address.city) ? `${serviceData.companyInfo.address.street ? `${serviceData.companyInfo.address.street}${serviceData.companyInfo.address.number ? `, ${serviceData.companyInfo.address.number}` : ''}` : ''}${serviceData.companyInfo.address.complement ? ` - ${serviceData.companyInfo.address.complement}` : ''}
${serviceData.companyInfo.address.neighborhood || ''}
${serviceData.companyInfo.address.city && serviceData.companyInfo.address.state ? `${serviceData.companyInfo.address.city} - ${serviceData.companyInfo.address.state}` : ''}
${serviceData.companyInfo.address.cep ? `CEP: ${serviceData.companyInfo.address.cep}` : ''}` : ''}

==============================
` : `
PAULO CELL - ASSISTÊNCIA TÉCNICA
Tel: (98) 12345-6789

==============================
`;
  const receipt = `
${companySection}
COMPROVANTE DE SERVIÇO

Data: ${serviceData.date}
Cliente: ${serviceData.customerName}
Dispositivo: ${serviceData.deviceInfo}
${serviceData.status ? `Status: ${serviceData.status}` : ''}
${serviceData.paymentMethod ? `Método de Pagamento: ${serviceData.paymentMethod}` : ''}

Serviço Realizado:
${serviceData.serviceName}

Valor: ${formatPrice(serviceData.price)}
${serviceData.warrantyInfo ? `\nGarantia: ${serviceData.warrantyInfo}` : ''}
${serviceData.observations ? `\nObservações: ${serviceData.observations}` : ''}

==============================
Agradecemos a preferência!
${serviceData.companyInfo?.companyName || 'GestOS - Assistência Técnica'}
  `;
  await printText(receipt, {
    fontSize: 0,
    centered: true,
    bold: false,
    width: 32
  });
};

/**
 * Verifica o status atual da impressora
 * @returns Informações sobre o status da impressora
 */
export const getPrinterStatus = async () => {
  if (!connectedPrinter) {
    return {
      connected: false
    };
  }
  try {
    // Tenta obter o nível de bateria se disponível
    let batteryLevel;
    try {
      const server = await connectedPrinter.device.gatt?.connect();
      const batteryService = await server?.getPrimaryService('battery_service');
      if (batteryService) {
        const batteryCharacteristic = await batteryService.getCharacteristic('battery_level');
        const value = await batteryCharacteristic.readValue();
        batteryLevel = value.getUint8(0);
      }
    } catch {
      // Bateria não disponível, ignorar
    }
    return {
      connected: true,
      name: connectedPrinter.name,
      batteryLevel
    };
  } catch (error) {
    console.error('Erro ao verificar status da impressora:', error);
    return {
      connected: false
    };
  }
};
