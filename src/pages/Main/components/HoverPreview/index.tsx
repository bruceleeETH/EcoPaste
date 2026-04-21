import clsx from "clsx";
import { useContext, useEffect, useMemo, useState } from "react";
import LocalImage from "@/components/LocalImage";
import SafeHtml from "@/components/SafeHtml";
import type { HoverPreviewState } from "@/pages/Main";
import { MainContext } from "@/pages/Main";
import Rtf from "@/pages/Main/components/HistoryList/components/Rtf";

const PREVIEW_GAP = 10;
const PREVIEW_DELAY = 500;
const PREVIEW_MIN_WIDTH = 280;
const PREVIEW_MAX_WIDTH = 420;

const getPreviewPosition = (preview: HoverPreviewState) => {
  const { data, rect } = preview;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxWidth = data.type === "image" ? 560 : PREVIEW_MAX_WIDTH;
  const width = Math.min(maxWidth, viewportWidth - 32);
  const maxHeight = Math.min(
    data.type === "image" ? 520 : 360,
    viewportHeight - 32,
  );
  const enoughRight =
    viewportWidth - rect.right - PREVIEW_GAP >= PREVIEW_MIN_WIDTH;
  const enoughLeft = rect.left - PREVIEW_GAP >= PREVIEW_MIN_WIDTH;

  let left = rect.right + PREVIEW_GAP;
  let top = rect.top;

  if (enoughRight) {
    left = rect.right + PREVIEW_GAP;
    top = rect.top;
  } else if (enoughLeft) {
    left = rect.left - width - PREVIEW_GAP;
    top = rect.top;
  } else {
    left = Math.max(16, (viewportWidth - width) / 2);
    top = rect.bottom + PREVIEW_GAP;
  }

  top = Math.min(Math.max(16, top), viewportHeight - maxHeight - 16);
  left = Math.min(Math.max(16, left), viewportWidth - width - 16);

  return {
    left,
    maxHeight,
    top,
    width,
  };
};

const getFileName = (path: string) => {
  return path.split(/[/\\]/).filter(Boolean).pop() ?? path;
};

const HoverPreview = () => {
  const { rootState } = useContext(MainContext);
  const { hoverPreview } = rootState;
  const [previewReady, setPreviewReady] = useState(false);

  const position = useMemo(() => {
    if (!hoverPreview?.visible) return;

    return getPreviewPosition(hoverPreview);
  }, [hoverPreview]);

  useEffect(() => {
    if (!hoverPreview?.visible) {
      setPreviewReady(false);
      return;
    }

    setPreviewReady(false);

    const timer = setTimeout(() => {
      setPreviewReady(true);
    }, PREVIEW_DELAY);

    return () => {
      clearTimeout(timer);
    };
  }, [hoverPreview]);

  if (!hoverPreview?.visible || !position || !previewReady) return null;

  const { data } = hoverPreview;
  const { type } = data;

  const renderContent = () => {
    switch (type) {
      case "text":
        return (
          <div
            className={clsx(
              "max-h-58 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-color-3/70 px-3 py-2.5 text-sm leading-6",
              {
                "font-mono text-[13px]": /\n|\/|--|=>|\$|\|/.test(data.value),
              },
            )}
          >
            {data.value}
          </div>
        );
      case "html":
        return (
          <div className="max-h-58 overflow-auto rounded-xl bg-color-3/70 px-3 py-2.5 text-sm">
            <SafeHtml value={data.value} />
          </div>
        );
      case "rtf":
        return (
          <div className="max-h-58 overflow-auto rounded-xl bg-color-3/70 px-3 py-2.5 text-sm">
            <Rtf {...data} />
          </div>
        );
      case "image":
        return (
          <div className="overflow-hidden rounded-xl bg-color-3/70 p-2">
            <LocalImage
              className="max-h-[30rem] w-full object-contain"
              src={data.value}
            />
          </div>
        );
      case "files":
        return (
          <div className="max-h-58 space-y-2 overflow-auto">
            {data.value.map((path) => {
              return (
                <div className="rounded-xl bg-color-3/70 px-3 py-2" key={path}>
                  <div className="truncate font-medium text-sm">
                    {getFileName(path)}
                  </div>
                  <div className="mt-1 break-all text-color-2 text-xs opacity-75">
                    {path}
                  </div>
                </div>
              );
            })}
          </div>
        );
    }
  };

  return (
    <div
      className="b b-color-2 pointer-events-none fixed z-50 overflow-hidden rounded-[20px] bg-color-1/96 p-3 shadow-2xl shadow-black/28 backdrop-blur-md"
      style={{
        left: `${position.left}px`,
        maxHeight: `${position.maxHeight}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
      }}
    >
      {renderContent()}
    </div>
  );
};

export default HoverPreview;
