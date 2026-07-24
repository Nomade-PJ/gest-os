import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
export const ServiceLabelPrinter = React.forwardRef(({
  service,
  children,
  directPrint = false
}, ref) => {
  const printServiceLabel = () => {
    // Mapear tipos de serviço para nomes amigáveis
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

    // Formatar preço
    const price = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(service.price || 0);

    // Formatar data
    const createdDate = new Date(service.created_at).toLocaleDateString('pt-BR');

    // Gerar ID de ordem formatado
    const orderNumber = service.id ? service.id.substring(0, 8).toUpperCase() : "N/A";

    // Obter senha do dispositivo
    const devicePassword = service.devices?.password || "—";

    // HTML da etiqueta - Layout SUPER compacto em linha única
    const label = `
        <html>
        <head>
          <title>Etiqueta</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: 60mm 40mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 60mm;
              height: 40mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            body {
              font-family: Arial, sans-serif;
              background-color: #FFF8DC;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              padding: 1.5mm;
              font-size: 7.5pt;
              line-height: 1.2;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: bold;
              margin-bottom: 3mm;
            }
            .os-text {
              font-size: 11pt;
            }
            .data-text {
              font-size: 9pt;
            }
            .line {
              font-size: 8.5pt;
              margin: 0.5mm 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            b {
              font-weight: bold;
            }
            .senha {
              margin: 3mm 0 1mm 0;
              font-weight: bold;
            }
            .senha-num {
              font-size: 11pt;
              letter-spacing: 1px;
              margin-left: 2mm;
            }
            .valor {
              font-weight: bold;
              font-size: 8.5pt;
              margin-top: 1mm;
            }
            @media print {
              html, body {
                width: 60mm !important;
                height: 40mm !important;
                overflow: hidden !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="row">
            <span class="os-text">OS. ${orderNumber}</span>
            <span class="data-text">DATA: ${createdDate}</span>
          </div>
          <div class="line"><b>Cliente:</b> ${service.customers?.name || "N/A"}</div>
          <div class="line"><b>Modelo:</b> ${service.devices ? `${service.devices.brand} ${service.devices.model}` : "N/A"}</div>
          <div class="line"><b>Defeito:</b> ${serviceName}</div>
          <div class="senha">SENHA:<span class="senha-num">${devicePassword}</span></div>
          <div class="valor">VALOR: ${price}</div>
        </body>
        </html>
      `;

    // Se for impressão direta, usar window.print()
    if (directPrint) {
      const printFrame = window.document.createElement('iframe');
      printFrame.style.display = 'none';
      window.document.body.appendChild(printFrame);
      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.write(label);
        frameDoc.close();

        // Imprimir automaticamente sem janela
        setTimeout(() => {
          try {
            printFrame.contentWindow?.print();
            toast({
              title: "Imprimindo etiqueta...",
              description: "A etiqueta está sendo enviada para a impressora padrão."
            });

            // Remover iframe após impressão
            setTimeout(() => {
              if (window.document.body.contains(printFrame)) {
                window.document.body.removeChild(printFrame);
              }
            }, 1000);
          } catch {
            toast({
              variant: "destructive",
              title: "Erro na impressão",
              description: "Não foi possível imprimir a etiqueta."
            });
            if (window.document.body.contains(printFrame)) {
              window.document.body.removeChild(printFrame);
            }
          }
        }, 500);
      }
      return;
    }

    // Detectar se é dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      // Para dispositivos móveis, abrir em nova janela
      const printWindow = window.open('', '_blank', 'width=400,height=300');
      if (printWindow) {
        printWindow.document.write(label);
        printWindow.document.close();

        // Aguardar carregamento e imprimir
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
        toast({
          title: "Impressão de etiqueta iniciada",
          description: "A etiqueta está sendo impressa."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro na impressão",
          description: "Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados."
        });
      }
    } else {
      // Para desktop, usar iframe
      const printFrame = window.document.createElement('iframe');
      printFrame.style.display = 'none';
      window.document.body.appendChild(printFrame);
      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.write(label);
        frameDoc.close();

        // Aguardar conteúdo carregar antes de imprimir
        printFrame.onload = () => {
          try {
            printFrame.contentWindow?.print();

            // Remover o iframe após impressão
            setTimeout(() => {
              if (window.document.body.contains(printFrame)) {
                window.document.body.removeChild(printFrame);
              }
            }, 1000);
            toast({
              title: "Impressão de etiqueta iniciada",
              description: "A etiqueta está sendo impressa."
            });
          } catch {
            toast({
              variant: "destructive",
              title: "Erro na impressão",
              description: "Não foi possível imprimir a etiqueta."
            });
            if (window.document.body.contains(printFrame)) {
              window.document.body.removeChild(printFrame);
            }
          }
        };
      }
    }
  };
  return <Button ref={ref} variant="ghost" size="sm" onClick={printServiceLabel} className="flex items-center gap-2 w-full justify-start px-2 py-1.5 h-9">
        {children}
      </Button>;
});
ServiceLabelPrinter.displayName = "ServiceLabelPrinter";
export default ServiceLabelPrinter;
