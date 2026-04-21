import { openPath } from "@tauri-apps/plugin-opener";
import { useUnmount } from "ahooks";
import { Flex } from "antd";
import type { HookAPI } from "antd/es/modal/useModal";
import clsx from "clsx";
import { type FC, type MouseEvent as ReactMouseEvent, useContext } from "react";
import { Marker } from "react-mark.js";
import { useSnapshot } from "valtio";
import SafeHtml from "@/components/SafeHtml";
import UnoIcon from "@/components/UnoIcon";
import { LISTEN_KEY } from "@/constants";
import { useContextMenu } from "@/hooks/useContextMenu";
import { MainContext } from "@/pages/Main";
import { pasteToClipboard } from "@/plugins/clipboard";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";
import Files from "../Files";
import Header from "../Header";
import Image from "../Image";
import Rtf from "../Rtf";
import Text from "../Text";

export interface ItemProps {
  index: number;
  data: DatabaseSchemaHistory;
  deleteModal: HookAPI;
  handleNote: () => void;
}

const Item: FC<ItemProps> = (props) => {
  const { index, data, handleNote } = props;
  const { id, type, note, value } = data;
  const { rootState } = useContext(MainContext);
  const { content } = useSnapshot(clipboardStore);

  useUnmount(() => {
    clearTimeout(rootState.hoverPreviewTimer);

    if (rootState.hoverPreview?.data.id === id) {
      rootState.hoverPreview = void 0;
    }
  });

  const handlePreview = () => {
    if (type !== "image") return;

    openPath(value);
  };

  const handleNext = () => {
    const { list } = rootState;

    const nextItem = list[index + 1] ?? list[index - 1];

    rootState.activeId = nextItem?.id;
  };

  const handlePrev = () => {
    if (index === 0) return;

    rootState.activeId = rootState.list[index - 1].id;
  };

  rootState.eventBus?.useSubscription((payload) => {
    if (payload.id !== id) return;

    const { handleDelete, handleFavorite } = rest;

    switch (payload.action) {
      case LISTEN_KEY.CLIPBOARD_ITEM_PREVIEW:
        return handlePreview();
      case LISTEN_KEY.CLIPBOARD_ITEM_PASTE:
        return pasteToClipboard(data);
      case LISTEN_KEY.CLIPBOARD_ITEM_DELETE:
        return handleDelete();
      case LISTEN_KEY.CLIPBOARD_ITEM_SELECT_PREV:
        return handlePrev();
      case LISTEN_KEY.CLIPBOARD_ITEM_SELECT_NEXT:
        return handleNext();
      case LISTEN_KEY.CLIPBOARD_ITEM_FAVORITE:
        return handleFavorite();
    }
  });

  const { handleContextMenu, ...rest } = useContextMenu({
    ...props,
    handleNext,
  });

  const handleClick = (type: typeof content.autoPaste) => {
    rootState.activeId = id;

    if (content.autoPaste !== type) return;

    pasteToClipboard(data);
  };

  const handleMouseEnter = (event: ReactMouseEvent<HTMLDivElement>) => {
    clearTimeout(rootState.hoverPreviewTimer);

    const rect = event.currentTarget.getBoundingClientRect();

    rootState.hoverPreview = {
      data,
      rect: {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      },
      visible: true,
    };
  };

  const handleMouseLeave = () => {
    clearTimeout(rootState.hoverPreviewTimer);

    rootState.hoverPreviewTimer = setTimeout(() => {
      if (rootState.hoverPreview?.data.id === id) {
        rootState.hoverPreview = void 0;
      }
    }, 60);
  };

  const renderContent = () => {
    switch (type) {
      case "text":
        return <Text {...data} />;
      case "rtf":
        return <Rtf {...data} />;
      case "html":
        return <SafeHtml {...data} />;
      case "image":
        return <Image {...data} />;
      case "files":
        return <Files {...data} />;
    }
  };

  return (
    <Flex
      className={clsx(
        "group b b-color-2 relative mx-3 max-h-28 overflow-hidden rounded-xl bg-color-1 px-3 py-2.5 shadow-black/4 shadow-sm transition",
        {
          "b-primary bg-primary-1 shadow-primary/12": rootState.activeId === id,
          "hover:b-primary-4 hover:shadow-black/6": rootState.activeId !== id,
        },
      )}
      gap={4}
      onClick={() => handleClick("single")}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => handleClick("double")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      vertical
    >
      <span
        className={clsx(
          "absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-primary transition",
          {
            "opacity-0 group-hover:opacity-60": rootState.activeId !== id,
            "opacity-100": rootState.activeId === id,
          },
        )}
      />

      <Header {...rest} data={data} handleNote={handleNote} />

      <div className="relative flex-1 select-auto overflow-hidden break-words children:transition">
        <div
          className={clsx(
            "pointer-events-none absolute inset-0 line-clamp-3 children:inline opacity-0",
            {
              "group-hover:opacity-0": content.showOriginalContent,
              "opacity-100": note,
            },
          )}
        >
          <UnoIcon
            className="mr-0.5 translate-y-0.5"
            name="i-hugeicons:task-edit-01"
          />

          <Marker mark={rootState.search}>{note}</Marker>
        </div>

        <div
          className={clsx("h-full text-[13px] leading-5", {
            "group-hover:opacity-100": content.showOriginalContent,
            "opacity-0": note,
          })}
        >
          {renderContent()}
        </div>
      </div>
    </Flex>
  );
};

export default Item;
