/**
 * Hook para cargar y gestionar la lista de chats de doobot.
 * Polling silencioso cada 10 segundos.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllChats,
  changeMode as apiChangeMode,
  changeStatus as apiChangeStatus,
  hideConversation,
  showConversation,
  markAsRead as apiMarkAsRead,
  type ChatItem,
} from "@/lib/doobotApi";

export function useDoobotChats(showArchived: boolean = false) {
  const qc = useQueryClient();
  const key = ["doobot-chats", showArchived ? 1 : 0];

  const query = useQuery<ChatItem[]>({
    queryKey: key,
    queryFn: () => fetchAllChats(showArchived ? 1 : 0),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["doobot-chats"] });

  const toggleMode = useMutation({
    mutationFn: ({ id, currentMode }: { id: string; currentMode: string }) => {
      const target = currentMode.toUpperCase() === "AUTO" ? "MANUAL" : "AUTO";
      return apiChangeMode(id, target);
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiChangeStatus(id, status),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (id: string) => hideConversation(id),
    onSuccess: invalidate,
  });

  const unarchive = useMutation({
    mutationFn: (id: string) => showConversation(id),
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiMarkAsRead(id),
    onSuccess: invalidate,
  });

  return {
    chats: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    toggleMode,
    setStatus,
    archive,
    unarchive,
    markRead,
  };
}
