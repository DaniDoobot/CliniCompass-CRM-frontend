/**
 * Hook para acciones de gestión de conversación en doobot.
 * (manager, campaña, bot, timezone, contacto, alias)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getManagerList,
  changeManager as apiChangeManager,
  changeCampaign as apiChangeCampaign,
  changeBot as apiChangeBot,
  changeTimeZone as apiChangeTimeZone,
  changeContact as apiChangeContact,
  changeAlias as apiChangeAlias,
  type ManagerItem,
} from "@/lib/doobotApi";

export function useDoobotManagers() {
  return useQuery<ManagerItem[]>({
    queryKey: ["doobot-managers"],
    queryFn: getManagerList,
    staleTime: 60_000,
  });
}

export function useDoobotConversationActions(conversationId: string | null) {
  const qc = useQueryClient();
  const invalidateChats = () => qc.invalidateQueries({ queryKey: ["doobot-chats"] });

  const assignManager = useMutation({
    mutationFn: () => {
      if (!conversationId) throw new Error("No conversation");
      return apiChangeManager(conversationId);
    },
    onSuccess: invalidateChats,
  });

  const setCampaign = useMutation({
    mutationFn: (campaign: string) => {
      if (!conversationId) throw new Error("No conversation");
      return apiChangeCampaign(conversationId, campaign);
    },
    onSuccess: invalidateChats,
  });

  const setBot = useMutation({
    mutationFn: (bot: string) => {
      if (!conversationId) throw new Error("No conversation");
      return apiChangeBot(conversationId, bot);
    },
    onSuccess: invalidateChats,
  });

  const setTimeZone = useMutation({
    mutationFn: (tz: string) => {
      if (!conversationId) throw new Error("No conversation");
      return apiChangeTimeZone(conversationId, tz);
    },
    onSuccess: invalidateChats,
  });

  const setContact = useMutation({
    mutationFn: (contact: string) => {
      if (!conversationId) throw new Error("No conversation");
      return apiChangeContact(conversationId, contact);
    },
    onSuccess: invalidateChats,
  });

  const setAlias = useMutation({
    mutationFn: (alias: string) => {
      if (!conversationId) throw new Error("No conversation");
      return apiChangeAlias(conversationId, alias);
    },
    onSuccess: invalidateChats,
  });

  return { assignManager, setCampaign, setBot, setTimeZone, setContact, setAlias };
}
