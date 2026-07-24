import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ServiceStatusCard from '../components/ServiceStatusCard';
import { isValidTrackingId } from '../lib/qrcode-utils';
import { supabase } from '../integrations/supabase/client';
const PublicServiceStatus = () => {
  const {
    serviceId
  } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  useEffect(() => {
    const fetchServiceStatus = async () => {
      setLoading(true);
      setError(null);

      // Validar o ID do serviço
      if (!serviceId || !isValidTrackingId(serviceId)) {
        setError('ID de serviço inválido ou não encontrado');
        setLoading(false);
        return;
      }
      try {
        // Busca apenas as colunas necessárias para a página pública —
        // nunca usar select('*') aqui, pois isso traria dados internos
        // (preço, forma de pagamento, observações internas, etc.) para
        // uma página sem autenticação.
        let serviceDetails = null;
        try {
          const {
            data,
            error
          } = await supabase.from('services').select('id, device_id, technician_id, status, created_at, estimated_completion_date, public_notes').eq('public_tracking_id', serviceId).limit(1).maybeSingle();
          if (error) {
            console.warn('Erro na consulta do serviço:', error);
            throw error;
          }
          serviceDetails = data;
        } catch (queryError) {
          console.error('Exceção na consulta do serviço:', queryError);
        }

        // Se ainda não temos dados, lançar erro
        if (!serviceDetails) {
          throw new Error('Não foi possível encontrar o serviço com o ID fornecido');
        }

        // Tentar buscar informações adicionais separadamente
        let deviceInfo = {};
        try {
          if (serviceDetails.device_id) {
            const {
              data: deviceData
            } = await supabase.from('devices').select('device_type, brand, model').eq('id', serviceDetails.device_id).maybeSingle();
            if (deviceData) {
              deviceInfo = deviceData;
            }
          }
        } catch (deviceError) {
          console.warn('Erro ao buscar informações do dispositivo:', deviceError);
        }
        // technician_id já é o nome do técnico em texto livre (preenchido
        // diretamente no formulário de OS), não uma referência a outra
        // tabela — não há lookup a fazer aqui.
        const technicianName = serviceDetails.technician_id || '';

        // Registrar visualização (opcional, para métricas)
        try {
          await supabase.from('service_status_views').insert([{
            service_id: serviceDetails.id,
            viewed_at: new Date().toISOString()
          }]);
        } catch (viewError) {
          // Apenas logar o erro, não é crítico
          console.warn('Erro ao registrar visualização:', viewError);
        }

        // Formatar dados para o componente
        const formattedData = {
          id: serviceDetails.id,
          status: serviceDetails.status,
          createdAt: serviceDetails.created_at,
          estimatedCompletionDate: serviceDetails.estimated_completion_date,
          publicNotes: serviceDetails.public_notes,
          deviceType: deviceInfo?.device_type || '',
          deviceBrand: deviceInfo?.brand || '',
          deviceModel: deviceInfo?.model || '',
          technician: technicianName
        };
        setServiceData(formattedData);
      } catch (err) {
        console.error('Erro ao buscar status do serviço:', err);
        setError('Não foi possível obter informações do serviço');
      } finally {
        setLoading(false);
      }
    };
    fetchServiceStatus();
  }, [serviceId]);
  return <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-white p-4 text-center">
        <h1 className="text-xl font-semibold">GestOS</h1>
        <p className="text-sm">Assistência Técnica de Celulares</p>
      </header>
      
      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        {loading ? <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando informações do serviço...</p>
          </div> : error ? <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-md text-center border border-border">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-foreground mb-2">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Informações para Diagnóstico:</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                ID do Serviço: {serviceId}
              </p>
              <p className="text-xs text-blue-600">
                Formato Válido: {isValidTrackingId(serviceId || '') ? 'Sim' : 'Não'}
              </p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Se você acredita que isso é um erro, entre em contato conosco pelo telefone:
            </p>
            <p className="mt-1">
              <a href="tel:+5500000000000" className="text-primary hover:underline font-medium">
                (00) 00000-0000
              </a>
            </p>
          </div> : serviceData ? <ServiceStatusCard serviceInfo={serviceData} /> : null}
      </main>
      
      <footer className="bg-muted border-t p-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GestOS - Todos os direitos reservados</p>
      </footer>
    </div>;
};
export default PublicServiceStatus;
