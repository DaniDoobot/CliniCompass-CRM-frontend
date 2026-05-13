import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function SpeechAnalyticsPage() {
  return (
    <AppLayout>
      <PageHeader 
        title="Speech Analytics" 
        description="Analiza las conversaciones de tus agentes con IA para mejorar la calidad del servicio."
      />
      
      <div className="grid gap-6">
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-5 w-5" />
              Próximamente
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-blue-50 text-blue-600">
              <Activity size={40} className="animate-pulse" />
            </div>
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-foreground">Speech Analytics Lab</h3>
              <p className="text-muted-foreground mt-2">
                Estamos trabajando en una potente herramienta de análisis de voz que permitirá transcribir, 
                detectar sentimientos y evaluar el desempeño de las llamadas de forma automática.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
