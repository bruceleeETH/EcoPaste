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

const normalizeClipboardText = (value?: string | null) => {
  return value?.replace(/\s+/g, " ").trim() ?? "";
};

const getHtmlVisibleText = (value?: string) => {
  if (!value) return "";

  try {
    const document = new DOMParser().parseFromString(value, "text/html");

    return normalizeClipboardText(document.body.textContent);
  } catch {
    return "";
  }
};

const getTextualDedupeSource = (item: DatabaseSchemaHistory) => {
  const search = normalizeClipboardText(item.search);

  if (search) return search;

  if (item.type === "html" && typeof item.value === "string") {
    const visibleText = getHtmlVisibleText(item.value);

    if (visibleText) return visibleText;
  }

  if (typeof item.value === "string") {
    return normalizeClipboardText(item.value);
  }

  return "";
};

const getFilesDedupeSource = (value: DatabaseSchemaHistory["value"]) => {
  if (Array.isArray(value)) {
    return value.map(String).sort().join("\n");
  }

  if (typeof value !== "string") return "";

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.map(String).sort().join("\n");
    }
  } catch {}

  return value;
};

const getHistoryDedupeBucket = (item: DatabaseSchemaHistory) => {
  switch (item.type) {
    case "image":
      return "image";
    case "files":
      return "files";
    default:
      return "textual";
  }
};

const getHistoryDedupeKey = (item: DatabaseSchemaHistory) => {
  const bucket = getHistoryDedupeBucket(item);

  if (bucket === "image") {
    return `image:${typeof item.value === "string" ? item.value : ""}`;
  }

  if (bucket === "files") {
    return `files:${normalizeClipboardText(getFilesDedupeSource(item.value))}`;
  }

  const source = getTextualDedupeSource(item);

  if (source) return `textual:${source}`;

  return `${item.type}:${typeof item.value === "string" ? item.value : ""}`;
};

const findMatchedHistory = async (item: DatabaseSchemaHistory) => {
  const dedupeKey = getHistoryDedupeKey(item);
  const bucket = getHistoryDedupeBucket(item);
  const [matchedByKey] = await selectHistory((qb) => {
    return qb
      .where("dedupeKey", "=", dedupeKey)
      .orderBy("createTime", "desc")
      .limit(1);
  });

  if (matchedByKey) {
    return {
      dedupeKey,
      matched: matchedByKey,
    };
  }

  const fallbackCandidates = await selectHistory((qb) => {
    return qb
      .$if(bucket === "textual", (eb) => eb.where("group", "=", "text"))
      .$if(bucket === "image", (eb) => eb.where("type", "=", "image"))
      .$if(bucket === "files", (eb) => eb.where("type", "=", "files"))
      .orderBy("createTime", "desc")
      .limit(50);
  });

  return {
    dedupeKey,
    matched: fallbackCandidates.find((candidate) => {
      return getHistoryDedupeKey(candidate) === dedupeKey;
    }),
  };
};

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

      const { dedupeKey, matched } = await findMatchedHistory(sqlData);

      data.dedupeKey = dedupeKey;
      sqlData.dedupeKey = dedupeKey;

      const visible = state.group === "all" || state.group === group;

      if (matched) {
        const nextCopyTimes = (matched.copyTimes ?? 1) + 1;
        const nextData = {
          copyTimes: nextCopyTimes,
          count: sqlData.count,
          createTime,
          dedupeKey,
          group: sqlData.group,
          height: sqlData.height,
          lastCopyTime,
          search: sqlData.search,
          sourceAppName,
          sourceAppPath,
          subtype: sqlData.subtype,
          type: sqlData.type,
          value: sqlData.value,
          width: sqlData.width,
        };
        const nextVisibleData = {
          ...matched,
          ...data,
          copyTimes: nextCopyTimes,
          createTime,
          dedupeKey,
          favorite: matched.favorite,
          firstCopyTime: matched.firstCopyTime ?? matched.createTime,
          id: matched.id,
          lastCopyTime,
          note: matched.note,
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
