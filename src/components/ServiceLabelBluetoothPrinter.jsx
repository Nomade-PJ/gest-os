import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Bluetooth, Loader2 } from "lucide-react";
export const ServiceLabelBluetoothPrinter = React.forwardRef(({
  service
}, _ref) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const connectAndPrintLabel = async () => {
    setIsConnecting(true);
    try {
      // Verificar suporte Bluetooth
      if (!navigator.bluetooth) {
        throw new Error("Bluetooth não suportado neste navegador. Use Chrome, Edge ou Opera.");
      }

      // Mapear tipos de serviço
      const serviceTypes = {
        screen_repair: "Troca de Tela",
        battery_replacement: "Troca de Bateria",
        water_damage: "Dano por Água",
        software_issue: "Problema de Software",
        charging_port: "Porta de Carregamento",
        button_repair: "Reparo de Botões",
        camera_repair: "Reparo de Câmera",
        mic_speaker_repair: "Reparo de Microfone/Alto-falante",
        diagnostics: "Diagnóstico Completo",
        unlocking: "Desbloqueio",
        data_recovery: "Recuperação de Dados"
      };
      const serviceName = service.service_type === 'other' ? service.other_service_description : serviceTypes[service.service_type] || service.service_type;
      const price = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(service.price || 0);
      const createdDate = new Date(service.created_at).toLocaleDateString('pt-BR');
      const orderNumber = service.id ? service.id.substring(0, 8).toUpperCase() : "N/A";
      const devicePassword = service.devices?.password || "—";

      // Solicitar dispositivo Bluetooth
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{
          services: ['000018f0-0000-1000-8000-00805f9b34fb']
        }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      // Conectar ao GATT Server
      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error("Não foi possível conectar ao servidor GATT");

      // Obter serviço e característica
      const bluetoothService = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await bluetoothService.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Comandos ESC/POS para etiqueta
      const encoder = new TextEncoder();
      const ESC = 0x1B;
      const GS = 0x1D;

      // Construir comandos para impressão
      const commands = [];

      // Inicializar impressora
      commands.push(ESC, 0x40);

      // Configurar largura para etiqueta (60mm)
      commands.push(GS, 0x57, 0x00, 0x02); // Largura de papel

      // Linha 1: OS e DATA (negrito, tamanho médio)
      commands.push(ESC, 0x45, 0x01); // Negrito ON
      commands.push(GS, 0x21, 0x11); // Tamanho médio
      const line1 = `OS. ${orderNumber}  DATA: ${createdDate}\n`;
      commands.push(...Array.from(encoder.encode(line1)));
      commands.push(ESC, 0x45, 0x00); // Negrito OFF

      // Espaço
      commands.push(0x0A);

      // Cliente
      commands.push(GS, 0x21, 0x00); // Tamanho normal
      const clienteLine = `Cliente: ${service.customers?.name || "N/A"}\n`;
      commands.push(...Array.from(encoder.encode(clienteLine)));

      // Modelo
      const modelLine = `Modelo: ${service.devices ? `${service.devices.brand} ${service.devices.model}` : "N/A"}\n`;
      commands.push(...Array.from(encoder.encode(modelLine)));

      // Defeito
      const defectLine = `Defeito: ${serviceName}\n`;
      commands.push(...Array.from(encoder.encode(defectLine)));

      // Espaço maior
      commands.push(0x0A, 0x0A);

      // SENHA (negrito e grande)
      commands.push(ESC, 0x45, 0x01); // Negrito ON
      commands.push(GS, 0x21, 0x22); // Tamanho grande
      const senhaLine = `SENHA: ${devicePassword}\n`;
      commands.push(...Array.from(encoder.encode(senhaLine)));
      commands.push(ESC, 0x45, 0x00); // Negrito OFF

      // Espaço
      commands.push(0x0A);

      // VALOR (negrito)
      commands.push(ESC, 0x45, 0x01); // Negrito ON
      commands.push(GS, 0x21, 0x00); // Tamanho normal
      const valorLine = `VALOR: ${price}\n`;
      commands.push(...Array.from(encoder.encode(valorLine)));
      commands.push(ESC, 0x45, 0x00); // Negrito OFF

      // Espaços finais e corte
      commands.push(0x0A, 0x0A, 0x0A);
      commands.push(GS, 0x56, 0x00); // Cortar papel

      // Converter para Uint8Array
      const data = new Uint8Array(commands);

      // Enviar para impressora
      await characteristic.writeValue(data);
      toast({
        title: "Etiqueta impressa!",
        description: "A etiqueta foi enviada para a impressora Bluetooth."
      });

      // Desconectar
      if (server.connected) {
        server.disconnect();
      }
    } catch (error) {
      console.error("Erro na impressão Bluetooth:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível imprimir via Bluetooth.";
      toast({
        variant: "destructive",
        title: "Erro na impressão",
        description: errorMessage
      });
    } finally {
      setIsConnecting(false);
    }
  };
  return <Button variant="ghost" size="sm" onClick={connectAndPrintLabel} disabled={isConnecting} className="flex items-center gap-2 w-full justify-start px-2 py-1.5 h-9">
      {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bluetooth className="mr-2 h-4 w-4" />}
      <span>{isConnecting ? "Conectando..." : "Imprimir Etiqueta Bluetooth"}</span>
    </Button>;
});
ServiceLabelBluetoothPrinter.displayName = "ServiceLabelBluetoothPrinter";
export default ServiceLabelBluetoothPrinter;
