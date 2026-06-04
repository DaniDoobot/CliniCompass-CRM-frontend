import * as React from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ContactSelectorProps {
  contacts: any[];
  value: string;
  onChange: (value: string) => void;
  onQuickCreate: (searchTerm: string) => void;
}

export function ContactSelector({
  contacts,
  value,
  onChange,
  onQuickCreate,
}: ContactSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const selectedContact = React.useMemo(() => {
    return contacts?.find((c) => c.id === value);
  }, [contacts, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9"
        >
          {selectedContact ? (
            <span className="truncate">
              {selectedContact.first_name} {selectedContact.last_name || ""}
              {selectedContact.phone ? ` - ${selectedContact.phone}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar paciente/cliente...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
        <Command filter={(value, search) => {
          // Custom filter since value is ID, we need to filter by name and phone
          if (value === "create_new") return 1;
          const contact = contacts?.find(c => c.id === value);
          if (!contact) return 0;
          
          const searchLower = search.toLowerCase();
          const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.toLowerCase();
          const phone = (contact.phone || "").toLowerCase();
          
          if (fullName.includes(searchLower) || phone.includes(searchLower)) return 1;
          return 0;
        }}>
          <CommandInput 
            placeholder="Buscar por nombre o teléfono..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty className="p-0">
              <div className="flex flex-col items-center justify-center py-6 text-center text-sm">
                <p className="text-muted-foreground mb-3">No se encontraron contactos.</p>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setOpen(false);
                    onQuickCreate(searchTerm);
                  }}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear "{searchTerm}"
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {contacts?.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start cursor-pointer"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col w-full">
                      <span className="font-medium">
                        {contact.first_name} {contact.last_name || ""}
                      </span>
                      {contact.phone && (
                        <span className="text-xs text-muted-foreground">
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            
            {/* Always show create button at the bottom if searching */}
            {searchTerm.length > 0 && contacts?.filter(c => {
               const searchLower = searchTerm.toLowerCase();
               const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
               const phone = (c.phone || "").toLowerCase();
               return fullName.includes(searchLower) || phone.includes(searchLower);
            }).length > 0 && (
              <CommandGroup>
                <CommandItem
                  value="create_new"
                  onSelect={() => {
                    setOpen(false);
                    onQuickCreate(searchTerm);
                  }}
                  className="text-primary cursor-pointer border-t font-medium flex items-center gap-2 mt-1 py-3"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear nuevo cliente "{searchTerm}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
