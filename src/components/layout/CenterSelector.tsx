import { Building2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useCenters } from "@/hooks/useCenters";
import { createContext, useContext, useState, ReactNode } from "react";

interface CenterContextType {
  selectedCenterId: string;
  setSelectedCenterId: (id: string) => void;
  selectedCenterName: string;
}

const CenterContext = createContext<CenterContextType>({
  selectedCenterId: "all",
  setSelectedCenterId: () => {},
  selectedCenterName: "Todos los centros",
});

export function useCenterFilter() {
  return useContext(CenterContext);
}

export function CenterProvider({ children }: { children: ReactNode }) {
  const [selectedCenterId, setSelectedCenterId] = useState("all");
  const { data: centers } = useCenters();
  const selectedCenterName =
    selectedCenterId === "all"
      ? "Todos los centros"
      : centers?.find((c) => c.id === selectedCenterId)?.name || "Todos los centros";

  return (
    <CenterContext.Provider value={{ selectedCenterId, setSelectedCenterId, selectedCenterName }}>
      {children}
    </CenterContext.Provider>
  );
}

export function CenterSelector() {
  const { data: centers, isLoading } = useCenters();
  const { selectedCenterId, setSelectedCenterId, selectedCenterName } = useCenterFilter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-primary" />
          {selectedCenterName}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => setSelectedCenterId("all")}
          className={selectedCenterId === "all" ? "bg-primary/10 text-primary" : ""}
        >
          <Building2 className="h-4 w-4 mr-2" />
          Todos los centros
        </DropdownMenuItem>
        {!isLoading &&
          centers?.map((center) => (
            <DropdownMenuItem
              key={center.id}
              onClick={() => setSelectedCenterId(center.id)}
              className={selectedCenterId === center.id ? "bg-primary/10 text-primary" : ""}
            >
              <Building2 className="h-4 w-4 mr-2" />
              {center.name}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
