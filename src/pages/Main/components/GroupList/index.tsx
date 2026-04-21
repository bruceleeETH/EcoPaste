import {
  useAsyncEffect,
  useCreation,
  useKeyPress,
  useReactive,
  useUpdateEffect,
} from "ahooks";
import clsx from "clsx";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Scrollbar from "@/components/Scrollbar";
import { countHistory } from "@/database/history";
import type { DatabaseSchemaGroup } from "@/types/database";
import { scrollElementToCenter } from "@/utils/dom";
import { isBlank } from "@/utils/is";
import { MainContext } from "../..";

const GroupList = () => {
  const { rootState } = useContext(MainContext);
  const { t } = useTranslation();
  const state = useReactive<Record<string, number>>({
    all: 0,
    favorite: 0,
    files: 0,
    image: 0,
    text: 0,
  });

  useEffect(() => {
    scrollElementToCenter(rootState.group);
  }, [rootState.group]);

  const countFingerprint = rootState.list
    .map(({ favorite, id }) => `${id}:${Number(favorite)}`)
    .join("|");

  const presetGroups: DatabaseSchemaGroup[] = useCreation(() => {
    return [
      {
        id: "all",
        name: t("clipboard.label.tab.all"),
      },
      {
        id: "text",
        name: t("clipboard.label.tab.text"),
      },
      {
        id: "image",
        name: t("clipboard.label.tab.image"),
      },
      {
        id: "files",
        name: t("clipboard.label.tab.files"),
      },
      {
        id: "favorite",
        name: t("clipboard.label.tab.favorite"),
      },
    ];
  }, [t]);

  const refreshCount = async () => {
    const keyword = rootState.search;
    const createQuery = (group?: string, favorite?: boolean) => {
      return (qb: any) => {
        return qb
          .$if(favorite === true, (eb: any) => eb.where("favorite", "=", true))
          .$if(!!group, (eb: any) => eb.where("group", "=", group))
          .$if(!isBlank(keyword), (eb: any) => {
            return eb.where((eb: any) => {
              return eb.or([
                eb("search", "like", eb.val(`%${keyword}%`)),
                eb("note", "like", eb.val(`%${keyword}%`)),
              ]);
            });
          });
      };
    };

    const [all, text, image, files, favorite] = await Promise.all([
      countHistory(createQuery()),
      countHistory(createQuery("text")),
      countHistory(createQuery("image")),
      countHistory(createQuery("files")),
      countHistory(createQuery(void 0, true)),
    ]);

    Object.assign(state, {
      all,
      favorite,
      files,
      image,
      text,
    });
  };

  useAsyncEffect(async () => {
    await refreshCount();
  }, [rootState.search]);

  useUpdateEffect(() => {
    refreshCount();
  }, [countFingerprint]);

  useKeyPress("tab", (event) => {
    const index = presetGroups.findIndex((item) => item.id === rootState.group);
    const length = presetGroups.length;

    let nextIndex = index;

    if (event.shiftKey) {
      nextIndex = index === 0 ? length - 1 : index - 1;
    } else {
      nextIndex = index === length - 1 ? 0 : index + 1;
    }

    rootState.group = presetGroups[nextIndex].id;
  });

  return (
    <Scrollbar className="flex" data-tauri-drag-region>
      {presetGroups.map((item) => {
        const { id, name } = item;

        const isChecked = id === rootState.group;
        const count = state[id] ?? 0;

        return (
          <div className="shrink-0 py-0.5" id={id} key={id}>
            <button
              className={clsx(
                "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs transition",
                {
                  "bg-color-3 text-color-2 hover:bg-color-2": !isChecked,
                  "bg-primary text-white shadow-primary/25 shadow-sm":
                    isChecked,
                },
              )}
              onClick={() => {
                rootState.group = id;
              }}
              type="button"
            >
              <span className="whitespace-nowrap">{name}</span>
              <span
                className={clsx(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                  {
                    "bg-color-1 text-color-2": !isChecked,
                    "bg-white/18 text-white": isChecked,
                  },
                )}
              >
                {count}
              </span>
            </button>
          </div>
        );
      })}
    </Scrollbar>
  );
};

export default GroupList;
