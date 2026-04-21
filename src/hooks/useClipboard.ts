import { useMount } from "ahooks";
import { cloneDeep } from "es-toolkit";
import { isEmpty, remove } from "es-toolkit/compat";
import { nanoid } from "nanoid";
import {
  type ClipboardChangeOptions,
  onClipboardChange,
  startListening,
} from "tauri-plugin-clipboard-x-api";
import { fullName } from "tauri-plugin-fs-pro-api";
import {
  insertHistory,
  selectHistory,
  updateHistory,
} from "@/database/history";
import type { State } from "@/pages/Main";
import { getClipboardTextSubtype } from "@/plugins/clipboard";
import { getActiveApplication as getSourceApplication } from "@/plugins/paste";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";
import { formatDate } from "@/utils/dayjs";

export const useClipboard = (
  state: State,
  options?: ClipboardChangeOptions,
) => {
  useMount(async () => {
    await startListening();

    onClipboardChange(async (result) => {
      const { files, image, html, rtf, text } = result;
      const now = formatDate();

      if (isEmpty(result) || Object.values(result).every(isEmpty)) return;

      const { copyPlain } = clipboardStore.content;

      const data = {
        copyTimes: 1,
        createTime: now,
        favorite: false,
        firstCopyTime: now,
        group: "text",
        id: nanoid(),
        lastCopyTime: now,
        search: text?.value,
      } as DatabaseSchemaHistory;

      if (files) {
        Object.assign(data, files, {
          group: "files",
          search: files.value.join(" "),
        });
      } else if (html && !copyPlain) {
        Object.assign(data, html);
      } else if (rtf && !copyPlain) {
        Object.assign(data, rtf);
      } else if (text) {
        const subtype = await getClipboardTextSubtype(text.value);

        Object.assign(data, text, {
          subtype,
        });
      } else if (image) {
        Object.assign(data, image, {
          group: "image",
        });
      }

      const sourceApplication = await getSourceApplication().catch(() => null);

      Object.assign(data, {
        sourceAppName: sourceApplication?.name,
        sourceAppPath: sourceApplication?.path,
      });

      const sqlData = cloneDeep(data);

      const {
        type,
        value,
        group,
        createTime,
        lastCopyTime,
        sourceAppName,
        sourceAppPath,
      } = data;

      if (type === "image") {
        sqlData.value = await fullName(value);
      }

      if (type === "files") {
        sqlData.value = JSON.stringify(value);
      }

      const [matched] = await selectHistory((qb) => {
        const { type, value } = sqlData;

        return qb.where("type", "=", type).where("value", "=", value);
      });

      const visible = state.group === "all" || state.group === group;

      if (matched) {
        const nextCopyTimes = (matched.copyTimes ?? 1) + 1;
        const nextData = {
          copyTimes: nextCopyTimes,
          createTime,
          lastCopyTime,
          sourceAppName,
          sourceAppPath,
        };
        const nextVisibleData = {
          ...matched,
          ...data,
          copyTimes: nextCopyTimes,
          createTime,
          firstCopyTime: matched.firstCopyTime ?? matched.createTime,
          id: matched.id,
          lastCopyTime,
          sourceAppName,
          sourceAppPath,
        };

        if (!clipboardStore.content.autoSort) {
          if (visible) {
            const target = state.list.find((item) => item.id === matched.id);

            if (target) {
              Object.assign(target, nextVisibleData);
            }
          }

          return updateHistory(matched.id, nextData);
        }

        const { id } = matched;

        if (visible) {
          remove(state.list, { id });

          state.list.unshift(nextVisibleData);
        }

        return updateHistory(id, nextData);
      }

      if (visible) {
        state.list.unshift(data);
      }

      await insertHistory(sqlData);
    }, options);
  });
};
