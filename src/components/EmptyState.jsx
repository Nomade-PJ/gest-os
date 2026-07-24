import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  compact = false
}) => {
  return <motion.div initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3
  }} className={cn("flex flex-col items-center justify-center text-center", compact ? "py-10 px-4" : "py-16 px-6", className)}>
      <div className={cn("rounded-2xl bg-muted flex items-center justify-center mb-4", compact ? "w-12 h-12" : "w-16 h-16")}>
        <Icon className={cn("text-muted-foreground/60", compact ? "h-6 w-6" : "h-8 w-8")} />
      </div>

      <h3 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
        {title}
      </h3>

      {description && <p className={cn("text-muted-foreground mt-1.5 max-w-sm leading-relaxed", compact ? "text-xs" : "text-sm")}>
          {description}
        </p>}

      {(actionLabel || secondaryActionLabel) && <div className="flex items-center gap-2 mt-5">
          {secondaryActionLabel && onSecondaryAction && <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>}
          {actionLabel && onAction && <Button size="sm" onClick={onAction} className="shadow-primary">
              {actionLabel}
            </Button>}
        </div>}
    </motion.div>;
};
export default EmptyState;
