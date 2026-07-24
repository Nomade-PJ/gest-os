import React from 'react';
import { formatEstimatedDate, statusToColorScheme, translateStatusForPublic } from '../lib/qrcode-utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
/**
 * Componente para exibir informações de status de serviço em um cartão
 * Usado principalmente na página pública de status acessada via QR Code
 */
const ServiceStatusCard = ({
  serviceInfo
}) => {
  // Determinar esquema de cores baseado no status
  const colorScheme = statusToColorScheme(serviceInfo.status);
  const statusText = translateStatusForPublic(serviceInfo.status);

  // Classes para o status baseadas no esquema de cores
  const getStatusClasses = () => {
    switch (colorScheme) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Obter a data de criação formatada
  const formattedCreationDate = new Date(serviceInfo.createdAt).toLocaleDateString('pt-BR');

  // Obter a data estimada de conclusão formatada
  const estimatedDate = formatEstimatedDate(serviceInfo.estimatedCompletionDate || null);

  // Descrição do dispositivo
  const deviceDescription = [serviceInfo.deviceType, serviceInfo.deviceBrand, serviceInfo.deviceModel].filter(Boolean).join(' • ');
  return <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Status do Serviço</CardTitle>
            <CardDescription>
              Ordem #{serviceInfo.id.substring(0, 8)}
            </CardDescription>
          </div>
          <Badge variant="outline" className={`${getStatusClasses()} px-3 py-1 font-medium`}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {deviceDescription && <div className="flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <span className="font-medium">{deviceDescription}</span>
          </div>}
        
        <div className="flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <span className="text-muted-foreground">Recebido em:</span>{' '}
            <span className="font-medium">{formattedCreationDate}</span>
          </div>
        </div>
        
        {serviceInfo.estimatedCompletionDate && <div className="flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div>
              <span className="text-muted-foreground">Previsão:</span>{' '}
              <span className="font-medium">{estimatedDate}</span>
            </div>
          </div>}
        
        {serviceInfo.technician && <div className="flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <div>
              <span className="text-muted-foreground">Técnico:</span>{' '}
              <span className="font-medium">{serviceInfo.technician}</span>
            </div>
          </div>}
        
        {serviceInfo.publicNotes && <div className="bg-muted/50 p-3 rounded-md border mt-3">
            <div className="flex gap-2 text-sm mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span className="font-medium">Observações:</span>
            </div>
            <p className="text-sm">{serviceInfo.publicNotes}</p>
          </div>}
      </CardContent>
      
      <CardFooter className="flex-col items-start pt-2 border-t">
        <p className="text-sm text-muted-foreground mb-2">
          Para mais informações, entre em contato conosco.
        </p>
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <a href="tel:+5598984031640" className="text-sm text-primary hover:underline">
            (98) 8403-1640
          </a>
        </div>
      </CardFooter>
    </Card>;
};
export default ServiceStatusCard;
