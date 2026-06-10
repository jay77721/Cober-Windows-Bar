import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import type { DesktopStatusKind } from "../../../types/hub";

type DesktopStatusTransitionProps = {
  statusKind: DesktopStatusKind;
  children: ReactNode;
};

const statusTransition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
} as const;

export function DesktopStatusTransition({
  statusKind,
  children,
}: DesktopStatusTransitionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="product-status-stage">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={statusKind}
          className="product-status-motion"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.985 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.985 }}
          transition={reduceMotion ? { duration: 0.01 } : statusTransition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
