"use client";

import { Reorder, useDragControls } from "framer-motion";
import type { ReactNode } from "react";
import { spring } from "@/lib/motion";

type Item = { id: string };

type Props<T extends Item> = {
  items: T[];
  onReorder: (next: T[]) => void;
  reduceMotion?: boolean;
  className?: string;
  renderItem: (item: T, controls: ReturnType<typeof useDragControls>) => ReactNode;
};

/**
 * List reorder with layout spring. Keyboard callers should call onReorder
 * directly; drag uses Reorder.Group. Under reduceMotion, drag is disabled
 * and layout animation is off — still keyboard-reorderable via parent.
 */
export function ListReorderHint<T extends Item>({
  items,
  onReorder,
  reduceMotion = false,
  className,
  renderItem,
}: Props<T>) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className={className}
      as="ul"
    >
      {items.map((item) => (
        <ReorderItem
          key={item.id}
          item={item}
          reduceMotion={reduceMotion}
          renderItem={renderItem}
        />
      ))}
    </Reorder.Group>
  );
}

function ReorderItem<T extends Item>({
  item,
  reduceMotion,
  renderItem,
}: {
  item: T;
  reduceMotion: boolean;
  renderItem: (item: T, controls: ReturnType<typeof useDragControls>) => ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={!reduceMotion}
      dragControls={controls}
      layout={reduceMotion ? undefined : true}
      transition={reduceMotion ? { duration: 0 } : spring.layout}
      as="li"
      style={{ listStyle: "none" }}
    >
      {renderItem(item, controls)}
    </Reorder.Item>
  );
}
