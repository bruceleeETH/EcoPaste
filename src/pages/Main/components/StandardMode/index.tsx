import { Flex } from "antd";
import clsx from "clsx";
import { useSnapshot } from "valtio";
import UnoIcon from "@/components/UnoIcon";
import { showWindow } from "@/plugins/window";
import { clipboardStore } from "@/stores/clipboard";
import { isLinux, isWin } from "@/utils/is";
import GroupList from "../GroupList";
import HistoryList from "../HistoryList";
import HoverPreview from "../HoverPreview";
import SearchInput from "../SearchInput";
import WindowPin from "../WindowPin";

const StandardMode = () => {
  const { search } = useSnapshot(clipboardStore);

  return (
    <Flex
      className={clsx("h-screen bg-color-1 px-2 py-2.5", {
        "b b-color-1": isLinux,
        "flex-col-reverse": search.position === "bottom",
        "rounded-2.5": !isWin,
      })}
      data-tauri-drag-region
      gap={8}
      vertical
    >
      <Flex
        className="mx-1 rounded-2xl bg-color-2/50 px-2 py-2 shadow-black/5 shadow-sm"
        gap={8}
        vertical
      >
        <SearchInput />

        <Flex
          align="center"
          className="overflow-hidden px-1"
          data-tauri-drag-region
          gap="small"
          justify="space-between"
        >
          <GroupList />

          <Flex align="center" className="text-color-2 text-lg" gap={4}>
            <WindowPin />

            <UnoIcon
              hoverable
              name="i-lets-icons:setting-alt-line"
              onClick={() => {
                showWindow("preference");
              }}
            />
          </Flex>
        </Flex>
      </Flex>

      <Flex
        className="flex-1 overflow-hidden"
        data-tauri-drag-region
        gap={8}
        vertical
      >
        <HistoryList />
      </Flex>

      <HoverPreview />
    </Flex>
  );
};

export default StandardMode;
