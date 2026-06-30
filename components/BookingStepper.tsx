"use client";

import { Fragment } from "react";
import { motion } from "motion/react";
import { CheckIcon } from "@/components/icons";

const STEPS = ["Stay Details", "Room Selection", "Payment"];

export function BookingStepper({ current }: { current: number }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <Fragment key={label}>
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  backgroundColor: done || active ? "#0F5A46" : "#ffffff",
                  borderColor: done || active ? "#0F5A46" : "#cbd5e1",
                  color: done || active ? "#ffffff" : "#94a3b8",
                  scale: active ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
                className="grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-bold"
              >
                {done ? <CheckIcon className="h-4 w-4" /> : n}
              </motion.div>
              <span
                className={`mt-2 whitespace-nowrap text-xs font-semibold ${
                  active ? "text-brand-600" : done ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-2 mt-[18px] h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full rounded-full bg-brand-500"
                  initial={false}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
