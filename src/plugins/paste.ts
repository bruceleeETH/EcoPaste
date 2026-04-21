import { invoke } from "@tauri-apps/api/core";
import type { ActiveApplication } from "@/types/plugin";

export const COMMAND = {
  GET_ACTIVE_APPLICATION: "plugin:eco-paste|get_active_application",
  PASTE: "plugin:eco-paste|paste",
};

/**
 * 粘贴剪贴板内容
 */
export const paste = () => {
  return invoke(COMMAND.PASTE);
};

/**
 * 获取当前复制来源的应用信息
 */
export const getActiveApplication = () => {
  return invoke<ActiveApplication | null>(COMMAND.GET_ACTIVE_APPLICATION);
};
